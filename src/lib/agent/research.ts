/**
 * Research Runner — 公司研究台的核心编排器。
 * 流程：获取数据 → 确定性计算 → 证据结构化 → 背离检测 → 状态/摘要/深度分析 → 下一步动作。
 * 数据一律通过 DataSource（adapter）获取，指标一律由 Deterministic Engine 计算。
 * Phase 4 将在此接入 LLM Interpreter（替换 interpret 的模板实现）。
 */
import { createDataSource, type DataResult } from "@/lib/data/adapter";
import { TIME_WINDOWS } from "@/lib/agent/dimensions";
import {
  calculateReturn,
  calculateMaxDrawdown,
  calculateVolatility,
  calculateTrend,
} from "@/lib/engine/metrics";
import { createEvidence, detectDivergence, sourceName } from "@/lib/engine/evidence";
import { runInterpreter, buildDeepAnalysis, type InterpreterInput } from "@/lib/llm/interpreter";
import type {
  Company,
  ResearchResult,
  FinancialPeriod,
  FinancialIndicatorReport,
  CurrentStateItem,
  Evidence,
  KeyChange,
  DataStatus,
  DimensionStatus,
  SourceInfo,
  Valuation,
  Peer,
  PriceBar,
  ResearchEvent,
} from "@/lib/types";

const DIMENSION_LABEL: Record<string, string> = {
  business_quality: "经营质量",
  financial_trend: "财务趋势",
  profit_quality: "盈利质量",
  valuation: "估值",
  market: "行情特征",
  industry: "行业位置",
  events: "事件与风险",
  strategy: "战略信号",
  policy: "政策影响",
};

function resolveTimeRange(key: string): { startMs: number; endMs: number } {
  const w = TIME_WINDOWS.find((x) => x.key === key) ?? TIME_WINDOWS[2];
  const endMs = Date.now();
  const startMs = endMs - w.days * 86400000;
  return { startMs, endMs };
}

function reportFromPeriod(p: FinancialPeriod): string {
  const q = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 }[p.fiscalPeriod] ?? 4;
  return `${p.fiscalYear}-${q}`;
}

interface IndicatorsSnapshot {
  revenueYoY: number | null;
  netProfitYoY: number | null;
  cashFlowYoY: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  roe: number | null;
  netProfitCashContent: number | null;
}

function snapshot(indicators: FinancialIndicatorReport | null): IndicatorsSnapshot {
  if (!indicators) {
    return {
      revenueYoY: null,
      netProfitYoY: null,
      cashFlowYoY: null,
      grossMargin: null,
      netMargin: null,
      roe: null,
      netProfitCashContent: null,
    };
  }
  return {
    revenueYoY: indicators.growth.operating_income_yoy_growth_ratio ?? null,
    netProfitYoY: indicators.growth.net_profit_yoy_growth_ratio ?? null,
    cashFlowYoY: indicators.cashFlow.operating_cash_net_yoy_growth_ratio ?? null,
    grossMargin: indicators.profitability.sale_gross_margin ?? null,
    netMargin: indicators.profitability.sale_net_interest_ratio ?? null,
    roe: indicators.profitability.index_weighted_avg_roe ?? null,
    netProfitCashContent: indicators.cashFlow.net_profit_cash_content ?? null,
  };
}

export async function runResearch(input: {
  company: Company;
  goal: string;
  dims: string[];
  timeWindow: string;
}): Promise<ResearchResult> {
  const ds = createDataSource();
  const { company, goal, dims, timeWindow } = input;
  const src = sourceName(ds.mode, "扶摇金融数据 API");
  const has = (k: string) => dims.includes(k);

  const { startMs, endMs } = resolveTimeRange(timeWindow);
  const needFinancial =
    has("business_quality") || has("financial_trend") || has("profit_quality");

  // ---- 1. 并行获取数据 ----
  const [quoteRes, histRes, finRes, valRes, peerRes, eventRes] =
    await Promise.all([
      ds.getQuote(company.thscode),
      has("market")
        ? ds.getHistorical(company.thscode, startMs, endMs)
        : Promise.resolve<DataResult<PriceBar[]> | null>(null),
      needFinancial
        ? ds.getFinancials(company.thscode)
        : Promise.resolve<DataResult<FinancialPeriod[]> | null>(null),
      has("valuation")
        ? ds.getValuation(company.thscode)
        : Promise.resolve<DataResult<Valuation> | null>(null),
      has("industry")
        ? ds.getPeers(company.thscode)
        : Promise.resolve<DataResult<Peer[]> | null>(null),
      has("events")
        ? ds.getEvents(company.thscode)
        : Promise.resolve<DataResult<ResearchEvent[]> | null>(null),
    ]);

  // 财务指标：依赖最新报告期，单独获取
  const periods = finRes?.data ?? [];
  let indicators: FinancialIndicatorReport | null = null;
  let indRes: DataResult<FinancialIndicatorReport[]> | null = null;
  if (periods.length > 0) {
    const latest = periods[periods.length - 1];
    indRes = await ds.getIndicatorsSeries(company.thscode, [
      reportFromPeriod(latest),
    ]);
    indicators = indRes.data?.[0] ?? null;
  }
  const ind = snapshot(indicators);

  const bars = histRes?.data ?? [];
  const closes = bars.map((b) => b.close);

  // ---- 2. 确定性指标计算 ----
  const priceReturnPct = calculateReturn(closes);
  const maxDrawdownPct = calculateMaxDrawdown(closes);
  const volatilityPct = calculateVolatility(closes);
  const netProfitTrend = calculateTrend(periods.map((p) => p.netProfit));
  const cashFlowTrend = calculateTrend(periods.map((p) => p.actCashFlowNet));

  const latestPeriod =
    periods.length > 0 ? labelPeriod(periods[periods.length - 1]) : null;

  // ---- 3. 证据结构化 ----
  const evidence = buildEvidence({
    src,
    ind,
    priceReturnPct,
    maxDrawdownPct,
    valRes,
    hasValuation: has("valuation") && valRes?.data != null,
    hasEvents: has("events"),
    eventsAvailable: (eventRes?.data?.length ?? 0) > 0,
    latestPeriod,
  });

  // ---- 4. 背离检测 ----
  const divergence = detectDivergence({
    netProfitTrend,
    cashFlowTrend,
    priceReturnPct,
  });

  // ---- 5. 当前研究状态 ----
  const currentState = buildCurrentState({
    dims,
    ind,
    priceReturnPct,
    divergence,
    hasValuation: valRes?.data != null,
    hasIndustry: (peerRes?.data?.length ?? 0) > 1,
  });

  // ---- 6. 关键变化 ----
  const keyChanges = buildKeyChanges({
    ind,
    priceReturnPct,
    valRes,
    eventsAvailable: (eventRes?.data?.length ?? 0) > 0,
    evidence,
  });

  // ---- 7. LLM 解释（Evidence → 自然语言；未配置/失败时降级模板） ----
  const interpreterInput: InterpreterInput = {
    company,
    researchGoal: goal,
    timeWindow,
    currentState,
    evidence: evidence.facts,
    keyQuestions: buildOpenQuestions({ ind, divergence, hasValuation: valRes?.data != null }),
  };
  const interpretation = await runInterpreter(interpreterInput);
  const deepAnalysis = buildDeepAnalysis(interpretation.output, evidence.facts);

  // ---- 8. 图表数据 ----
  const financial = periods.length > 0 ? buildFinancialData(periods) : null;
  const market =
    bars.length > 0
      ? {
          bars,
          stats: {
            intervalReturnPct: priceReturnPct,
            maxDrawdownPct,
            volatilityPct,
            high: Math.max(...bars.map((b) => b.high)),
            low: Math.min(...bars.map((b) => b.low)),
          },
          relative: null,
        }
      : null;
  const industry =
    (peerRes?.data?.length ?? 0) > 1
      ? { peers: peerRes!.data!, indexName: null, indexIntervalReturn: null }
      : null;

  // ---- 9. 数据状态与来源 ----
  const dataStatus: DataStatus[] = Array.from(
    new Set(
      [
        quoteRes.status,
        histRes?.status,
        finRes?.status,
        indRes?.status,
        valRes?.status,
        peerRes?.status,
        eventRes?.status,
      ].filter((s): s is DataStatus => s != null && s !== "verified"),
    ),
  );

  const sources: SourceInfo[] = [
    { name: src, asOf: null, updatedAt: new Date().toISOString().slice(0, 10) },
  ];

  return {
    dataMode: ds.mode,
    company,
    quote: quoteRes.data,
    researchGoal: goal,
    timeWindow,
    currentState,
    keyChanges,
    financial,
    valuation: valRes?.data ?? null,
    valuationPeers: null,
    market,
    industry,
    events: eventRes?.data ?? null,
    evidence,
    contradiction: divergence
      ? {
          detected: true,
          description: "基本面、现金流与市场表现未完全同步，发现多维信号分化。",
          possibleReasons: [
            "经营现金流与净利润的确认节奏存在差异（回款/备货/确认时点）。",
            "市场定价领先或滞后于基本面变化。",
            "行业或事件因素影响市场情绪。",
          ],
          evidenceIds: evidence.contradictory.map((e) => e.id),
          nextActions: ["验证盈利质量", "查看同行比较", "查看事件与风险"],
        }
      : null,
    summary: interpretation.output.summary,
    deepAnalysis,
    nextActions: buildNextActions({ dims, divergence }),
    openQuestions: buildOpenQuestions({ ind, divergence, hasValuation: valRes?.data != null }),
    nextQuestions: interpretation.output.nextQuestions,
    dimensionInsights: interpretation.output.dimensionInsights,
    stateUpdate: interpretation.output.stateUpdate,
    sources,
    dataStatus,
    llmMode: interpretation.mode,
  };
}

// ---------------- 证据构建 ----------------

interface EvidenceInput {
  src: string;
  ind: IndicatorsSnapshot;
  priceReturnPct: number | null;
  maxDrawdownPct: number | null;
  valRes: DataResult<Valuation> | null;
  hasValuation: boolean;
  hasEvents: boolean;
  eventsAvailable: boolean;
  latestPeriod: string | null;
}

function buildEvidence(input: EvidenceInput): {
  facts: Evidence[];
  positive: Evidence[];
  negative: Evidence[];
  contradictory: Evidence[];
  unknown: Evidence[];
} {
  const positive: Evidence[] = [];
  const negative: Evidence[] = [];
  const contradictory: Evidence[] = [];
  const unknown: Evidence[] = [];
  const facts: Evidence[] = [];
  const push = (e: Evidence) => {
    facts.push(e);
    if (e.evidenceClass === "positive") positive.push(e);
    else if (e.evidenceClass === "negative") negative.push(e);
    else if (e.evidenceClass === "contradictory") contradictory.push(e);
    else if (e.evidenceClass === "unknown") unknown.push(e);
    // neutral：仅入 facts，不进四类桶
  };

  const period = input.latestPeriod;
  const financial = (key: string, label: string, value: number | null, unit: string) =>
    createEvidence({
      dimension: "financial",
      metric: key,
      label,
      value,
      unit,
      period,
      source: input.src,
      factKind: "fact",
      evidenceClass: value == null ? "unknown" : value > 0 ? "positive" : "negative",
      rawField: key,
    });

  push(financial("operating_income_yoy_growth_ratio", "营收同比", input.ind.revenueYoY, "%"));
  push(financial("net_profit_yoy_growth_ratio", "净利润同比", input.ind.netProfitYoY, "%"));
  push(financial("operating_cash_net_yoy_growth_ratio", "经营现金流同比", input.ind.cashFlowYoY, "%"));
  if (input.ind.grossMargin != null) {
    push(createEvidence({
      dimension: "financial", metric: "sale_gross_margin", label: "毛利率", value: input.ind.grossMargin, unit: "%",
      period, source: input.src, factKind: "fact", evidenceClass: "positive", rawField: "sale_gross_margin",
    }));
  }
  if (input.ind.roe != null) {
    push(createEvidence({
      dimension: "financial", metric: "index_weighted_avg_roe", label: "ROE", value: input.ind.roe, unit: "%",
      period, source: input.src, factKind: "fact", evidenceClass: "positive", rawField: "index_weighted_avg_roe",
    }));
  }
  if (input.ind.netProfitCashContent != null) {
    push(createEvidence({
      dimension: "profit_quality", metric: "net_profit_cash_content", label: "净利润现金含量", value: input.ind.netProfitCashContent, unit: "",
      period, source: input.src, factKind: "fact", evidenceClass: "neutral", rawField: "net_profit_cash_content",
    }));
  }

  // 估值事实（中性，不直接判好/坏）
  if (input.hasValuation && input.valRes?.data) {
    const v = input.valRes.data;
    if (v.peTtm != null) {
      push(createEvidence({
        dimension: "valuation", metric: "pe_ttm", label: "PE-TTM", value: v.peTtm, unit: "倍",
        period: null, source: input.src, factKind: "fact", evidenceClass: "neutral", rawField: "pe_ttm",
      }));
    }
    if (v.pbMrq != null) {
      push(createEvidence({
        dimension: "valuation", metric: "pb_mrq", label: "PB-MRQ", value: v.pbMrq, unit: "倍",
        period: null, source: input.src, factKind: "fact", evidenceClass: "neutral", rawField: "pb_mrq",
      }));
    }
  }

  // 行情事实
  if (input.priceReturnPct != null) {
    push(createEvidence({
      dimension: "market", metric: "interval_return", label: "区间收益", value: input.priceReturnPct, unit: "%",
      period: null, source: input.src, factKind: "fact",
      evidenceClass: input.priceReturnPct < 0 ? "negative" : "positive", rawField: "close_price",
    }));
  }
  if (input.maxDrawdownPct != null) {
    push(createEvidence({
      dimension: "market", metric: "max_drawdown", label: "最大回撤", value: input.maxDrawdownPct, unit: "%",
      period: null, source: input.src, factKind: "fact",
      evidenceClass: input.maxDrawdownPct > 20 ? "negative" : "positive", rawField: "close_price",
    }));
  }

  // 矛盾证据：利润上行但现金流走平/下行
  if (
    input.ind.netProfitYoY != null &&
    input.ind.cashFlowYoY != null &&
    input.ind.netProfitYoY > 0 &&
    input.ind.cashFlowYoY < input.ind.netProfitYoY - 10
  ) {
    push(createEvidence({
      dimension: "profit_quality", metric: "profit_cash_divergence",
      label: "利润增速明显高于现金流增速",
      value: `${input.ind.netProfitYoY.toFixed(1)}% vs ${input.ind.cashFlowYoY.toFixed(1)}%`, unit: "",
      period, source: input.src, factKind: "fact", evidenceClass: "contradictory", method: "deterministic",
    }));
  }

  // 未知：利润增长来源
  if (input.ind.netProfitYoY != null && input.ind.netProfitYoY > 0) {
    push(createEvidence({
      dimension: "profit_quality", metric: "profit_source", label: "利润增长来源", value: null, unit: "",
      period, source: input.src, factKind: "unverified", evidenceClass: "unknown", method: "llm",
      claim: "当前数据不足以确认利润增长的主要来源结构。",
    }));
  }

  // 未知：历史估值序列
  if (input.hasValuation) {
    push(createEvidence({
      dimension: "valuation", metric: "historical_pe", label: "历史 PE 序列", value: null, unit: "",
      period: null, source: input.src, factKind: "unverified", evidenceClass: "unknown", method: "source",
      claim: "当前数据源不提供历史估值序列，无法计算历史 PE 分位。",
    }));
  }

  // 未知：事件/公告
  if (input.hasEvents && !input.eventsAvailable) {
    push(createEvidence({
      dimension: "events", metric: "events", label: "公告/新闻", value: null, unit: "",
      period: null, source: input.src, factKind: "unverified", evidenceClass: "unknown", method: "source",
      claim: "公告/新闻需 iFinD MCP，当前未接入，事件维度暂无法完整验证。",
    }));
  }

  return { facts, positive, negative, contradictory, unknown };
}

// ---------------- 当前研究状态 ----------------

function buildCurrentState(input: {
  dims: string[];
  ind: IndicatorsSnapshot;
  priceReturnPct: number | null;
  divergence: boolean;
  hasValuation: boolean;
  hasIndustry: boolean;
}): CurrentStateItem[] {
  return input.dims.map((key) => {
    const label = DIMENSION_LABEL[key] ?? key;
    return { dimension: key, label, ...stateFor(key, input) };
  });
}

function stateFor(
  key: string,
  input: {
    ind: IndicatorsSnapshot;
    priceReturnPct: number | null;
    divergence: boolean;
    hasValuation: boolean;
    hasIndustry: boolean;
  },
): { status: DimensionStatus; summary: string } {
  switch (key) {
    case "business_quality":
      return input.ind.netProfitYoY == null
        ? { status: "unknown", summary: "数据不足" }
        : input.ind.netProfitYoY > 0
          ? { status: "positive", summary: "盈利改善" }
          : { status: "negative", summary: "盈利承压" };
    case "financial_trend":
      return input.ind.revenueYoY == null
        ? { status: "unknown", summary: "数据不足" }
        : input.ind.revenueYoY > 0
          ? { status: "positive", summary: "改善" }
          : { status: "negative", summary: "承压" };
    case "profit_quality":
      if (input.ind.cashFlowYoY == null) return { status: "unknown", summary: "数据不足" };
      return input.divergence
        ? { status: "contradictory", summary: "待观察" }
        : { status: "positive", summary: "基本同步" };
    case "valuation":
      return input.hasValuation
        ? { status: "neutral", summary: "偏高 / 待比较" }
        : { status: "unknown", summary: "待验证" };
    case "market":
      return input.priceReturnPct == null
        ? { status: "unknown", summary: "数据不足" }
        : input.priceReturnPct < 0
          ? { status: "negative", summary: "承压" }
          : { status: "positive", summary: "改善" };
    case "industry":
      return input.hasIndustry
        ? { status: "neutral", summary: "分化 / 待比较" }
        : { status: "unknown", summary: "待验证" };
    case "events":
      return { status: "unknown", summary: "待验证" };
    default:
      return { status: "unknown", summary: "待验证" };
  }
}

// ---------------- 关键变化 ----------------

function buildKeyChanges(input: {
  ind: IndicatorsSnapshot;
  priceReturnPct: number | null;
  valRes: DataResult<Valuation> | null;
  eventsAvailable: boolean;
  evidence: { facts: Evidence[]; positive: Evidence[]; negative: Evidence[]; contradictory: Evidence[]; unknown: Evidence[] };
}): KeyChange[] {
  const changes: KeyChange[] = [];
  const fmt = (v: number | null) => (v == null ? "--" : (v > 0 ? "+" : "") + v.toFixed(1) + "%");
  const find = (metric: string) =>
    input.evidence.facts.filter((e) => e.metric === metric).map((e) => e.id);

  if (input.ind.netProfitYoY != null) {
    changes.push({ title: "净利润变化", value: fmt(input.ind.netProfitYoY), evidenceIds: find("net_profit_yoy_growth_ratio") });
  }
  if (input.ind.cashFlowYoY != null) {
    changes.push({ title: "经营现金流变化", value: fmt(input.ind.cashFlowYoY), evidenceIds: find("operating_cash_net_yoy_growth_ratio") });
  }
  if (input.priceReturnPct != null) {
    changes.push({ title: "近期行情", value: fmt(input.priceReturnPct), evidenceIds: find("interval_return") });
  }
  if (input.valRes?.data?.peTtm != null) {
    changes.push({ title: "PE-TTM", value: input.valRes.data.peTtm.toFixed(1) + "x", evidenceIds: find("pe_ttm") });
  }
  if (input.eventsAvailable) {
    changes.push({ title: "事件", value: "有近期事件", evidenceIds: [] });
  }
  return changes.slice(0, 5);
}

// ---------------- 下一步研究 ----------------

function buildNextActions(input: { dims: string[]; divergence: boolean }): string[] {
  const actions: string[] = [];
  if (input.divergence) actions.push("验证盈利质量");
  if (input.dims.includes("industry")) actions.push("查看同行比较");
  if (input.dims.includes("market")) actions.push("解释近期市场表现");
  if (input.dims.includes("valuation")) actions.push("查看估值证据");
  if (input.dims.includes("events")) actions.push("查看事件与风险");
  actions.push("查看原始证据");
  actions.push("建立持续观察");
  return actions;
}

function buildOpenQuestions(input: {
  ind: IndicatorsSnapshot;
  divergence: boolean;
  hasValuation: boolean;
}): string[] {
  const q: string[] = [];
  if (input.ind.netProfitYoY != null) q.push("利润增长是否具有持续性？");
  if (input.divergence) q.push("经营现金流与净利润的分化原因是什么？");
  if (input.hasValuation) q.push("当前估值是否与盈利增长匹配？");
  q.push("是否有新公告或行业事件改变现有判断？");
  return q;
}

// ---------------- 财务图表数据 ----------------

function buildFinancialData(periods: FinancialPeriod[]) {
  const labels = periods.map((p) => `${p.fiscalYear}${p.fiscalPeriod}`);
  const toYi = (v: number | null) => (v == null ? null : Number((v / 1e8).toFixed(2)));
  return {
    periods,
    indicators: [] as FinancialIndicatorReport[],
    chart: {
      labels,
      series: [
        { name: "营业收入", unit: "亿元", data: periods.map((p) => toYi(p.operatingIncome)) },
        { name: "净利润", unit: "亿元", data: periods.map((p) => toYi(p.netProfit)) },
      ],
    },
  };
}

function labelPeriod(p: FinancialPeriod): string {
  return `${p.fiscalYear}${p.fiscalPeriod}`;
}
