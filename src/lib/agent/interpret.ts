/**
 * Template Interpreter — Phase 3 的确定性「AI 观察」生成器。
 * 基于已计算的指标与证据，生成诚实、可追溯的自然语言文本；不产生任何未经数据支撑的数字。
 * Phase 4 将替换为 LLM Interpreter（DeepSeek），保持相同接口。
 */
import type { DeepAnalysis, DeepAnalysisSection } from "@/lib/types";
import { formatPct, formatRatio } from "@/lib/engine/metrics";

export interface InterpretationContext {
  companyName: string;
  dataMode: "live" | "mock";
  revenueYoY: number | null;
  netProfitYoY: number | null;
  cashFlowYoY: number | null;
  netProfitCashContent: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  roe: number | null;
  peTtm: number | null;
  pbMrq: number | null;
  priceReturnPct: number | null;
  maxDrawdownPct: number | null;
  volatilityPct: number | null;
  peerCount: number;
  evidenceIds: {
    positive: string[];
    negative: string[];
    contradictory: string[];
    unknown: string[];
  };
  hasValuation: boolean;
  hasIndustry: boolean;
  hasEvents: boolean;
  hasFinancials: boolean;
}

export interface Interpretation {
  summary: string;
  deepAnalysis: DeepAnalysis;
}

function pct(v: number | null): string {
  return v == null ? "暂无数据" : formatPct(v);
}

function ratio(v: number | null): string {
  return v == null ? "暂无数据" : formatRatio(v);
}

export function interpret(ctx: InterpretationContext): Interpretation {
  const summary = buildSummary(ctx);
  const deepAnalysis: DeepAnalysis = {
    coreConclusion: buildCoreConclusion(ctx),
    sections: buildSections(ctx),
    evidenceIds: [
      ...ctx.evidenceIds.positive,
      ...ctx.evidenceIds.negative,
      ...ctx.evidenceIds.contradictory,
      ...ctx.evidenceIds.unknown,
    ],
  };
  return { summary, deepAnalysis };
}

function buildSummary(ctx: InterpretationContext): string {
  const lines: string[] = [];
  if (ctx.hasFinancials) {
    lines.push(
      `${ctx.companyName}营业收入同比 ${pct(ctx.revenueYoY)}，净利润同比 ${pct(ctx.netProfitYoY)}，盈利保持增长。`,
    );
    if (ctx.cashFlowYoY != null && ctx.netProfitYoY != null) {
      if (ctx.cashFlowYoY < ctx.netProfitYoY - 10) {
        lines.push(
          `但经营现金流同比 ${pct(ctx.cashFlowYoY)}，明显低于净利润增速，盈利质量需要验证。`,
        );
      } else {
        lines.push(`经营现金流同比 ${pct(ctx.cashFlowYoY)}，与利润增速基本同步。`);
      }
    }
  } else {
    lines.push(`${ctx.companyName}当前财务数据不足，无法完成经营与盈利质量判断。`);
  }
  if (ctx.hasValuation) {
    lines.push(`当前 PE-TTM ${ratio(ctx.peTtm)}，PB-MRQ ${ratio(ctx.pbMrq)}。`);
  }
  if (ctx.priceReturnPct != null) {
    lines.push(`近期区间收益 ${pct(ctx.priceReturnPct)}，最大回撤 ${pct(ctx.maxDrawdownPct)}。`);
  }
  lines.push(
    ctx.hasEvents
      ? "事件模块已按可得数据整理，部分公告/新闻信息可能不完整。"
      : "公告/新闻信息当前未接入，事件维度暂无法完整验证。",
  );
  return lines.join(" ");
}

function buildCoreConclusion(ctx: InterpretationContext): string {
  if (!ctx.hasFinancials) {
    return `当前财务数据不足，无法对 ${ctx.companyName} 的经营质量形成结论。`;
  }
  const improving = (ctx.netProfitYoY ?? 0) > 0;
  const cashDiverge =
    ctx.cashFlowYoY != null &&
    ctx.netProfitYoY != null &&
    ctx.cashFlowYoY < ctx.netProfitYoY - 10;
  if (improving && cashDiverge) {
    return `${ctx.companyName} 盈利保持改善，但经营现金流增速低于净利润增速，盈利质量仍需观察。`;
  }
  if (improving) {
    return `${ctx.companyName} 盈利保持改善，利润与现金流增长基本同步。`;
  }
  return `${ctx.companyName} 盈利增长放缓或承压，需要结合后续报告期进一步验证。`;
}

function buildSections(ctx: InterpretationContext): DeepAnalysisSection[] {
  const sections: DeepAnalysisSection[] = [
    {
      title: "经营质量",
      content: sectionBusinessQuality(ctx),
    },
    {
      title: "财务趋势",
      content: sectionFinancialTrend(ctx),
    },
    {
      title: "盈利质量",
      content: sectionProfitQuality(ctx),
    },
    {
      title: "估值",
      content: sectionValuation(ctx),
    },
    {
      title: "行情",
      content: sectionMarket(ctx),
    },
    {
      title: "行业位置",
      content: sectionIndustry(ctx),
    },
    {
      title: "事件与风险",
      content: sectionEvents(ctx),
    },
    {
      title: "未知信息",
      content: sectionUnknowns(ctx),
    },
    {
      title: "后续观察",
      content: sectionNextWatch(),
    },
  ];
  return sections;
}

function sectionBusinessQuality(ctx: InterpretationContext): string {
  if (!ctx.hasFinancials) return "财务数据不足，暂无法判断经营质量。";
  return (
    `从已披露数据看，${ctx.companyName} 营业收入同比 ${pct(ctx.revenueYoY)}，净利润同比 ${pct(ctx.netProfitYoY)}。` +
    `销售毛利率 ${pct(ctx.grossMargin)}，销售净利率 ${pct(ctx.netMargin)}，ROE ${pct(ctx.roe)}。` +
    `以上为财务指标数据源提供的事实数值；对盈利改善持续性的判断属于推断，需结合后续报告期验证。`
  );
}

function sectionFinancialTrend(ctx: InterpretationContext): string {
  if (!ctx.hasFinancials) return "财务数据不足，暂无法判断财务趋势的连续性。";
  const revUp = (ctx.revenueYoY ?? 0) > 0;
  const profitUp = (ctx.netProfitYoY ?? 0) > 0;
  return (
    `收入增速 ${pct(ctx.revenueYoY)}、利润增速 ${pct(ctx.netProfitYoY)}。` +
    (revUp && profitUp
      ? "两者均为正，变化方向一致，趋势具有连续性的证据相对充分。"
      : "收入与利润方向不完全一致，趋势连续性需要进一步观察。")
  );
}

function sectionProfitQuality(ctx: InterpretationContext): string {
  if (ctx.netProfitCashContent == null && ctx.cashFlowYoY == null) {
    return "经营现金流数据不足，本次无法完成盈利质量判断，不生成结论。";
  }
  const content = ctx.netProfitCashContent;
  const diverge =
    ctx.cashFlowYoY != null &&
    ctx.netProfitYoY != null &&
    ctx.cashFlowYoY < ctx.netProfitYoY - 10;
  if (diverge) {
    return (
      `净利润同比 ${pct(ctx.netProfitYoY)}，但经营现金流同比仅 ${pct(ctx.cashFlowYoY)}，` +
      `净利润现金含量 ${content == null ? "暂无数据" : content.toFixed(2)}，利润增速明显高于现金流增速，存在多维信号分化。` +
      `这可能反映回款、备货或确认节奏等因素，但当前数据不足以确认具体原因。`
    );
  }
  return (
    `净利润同比 ${pct(ctx.netProfitYoY)}，经营现金流同比 ${pct(ctx.cashFlowYoY)}，` +
    `净利润现金含量 ${content == null ? "暂无数据" : content.toFixed(2)}，利润与现金流增长基本同步。`
  );
}

function sectionValuation(ctx: InterpretationContext): string {
  if (!ctx.hasValuation) {
    return "估值快照数据不可用，暂无法判断当前估值水平。";
  }
  return (
    `当前 PE-TTM ${ratio(ctx.peTtm)}、PB-MRQ ${ratio(ctx.pbMrq)}。` +
    `估值反映的是市场价格与公司盈利/净资产之间的关系，需要结合盈利增长与行业环境综合判断，单一估值指标不能直接决定公司价值。` +
    `当前接口不提供历史 PE 序列，因此不展示历史估值分位曲线，避免伪造历史数据。`
  );
}

function sectionMarket(ctx: InterpretationContext): string {
  if (ctx.priceReturnPct == null) return "行情数据不足，暂无法判断近期市场表现。";
  return (
    `近区间收益 ${pct(ctx.priceReturnPct)}，最大回撤 ${pct(ctx.maxDrawdownPct)}，年化波动率 ${pct(ctx.volatilityPct)}。` +
    `这些为确定性引擎基于日 K 线计算的结果，反映近期市场对该公司的定价变化。`
  );
}

function sectionIndustry(ctx: InterpretationContext): string {
  if (!ctx.hasIndustry) return "同行对比数据不可用，暂无法判断行业位置。";
  return (
    `已选取 ${ctx.peerCount} 家可比公司进行对比。` +
    `行业对比用于区分「公司自身变化」与「行业共同变化」，对比结论需结合 ROE、营收增速、净利率与估值综合判断。`
  );
}

function sectionEvents(ctx: InterpretationContext): string {
  if (!ctx.hasEvents) {
    return "公告/新闻/研报需 iFinD MCP，当前未接入，因此事件与风险维度暂无法完整验证，不生成结论。";
  }
  return "事件时间线已按可得数据整理；对事件影响的判断属于推断，具体影响需结合后续披露验证。";
}

function sectionUnknowns(ctx: InterpretationContext): string {
  const items: string[] = [];
  if (ctx.hasFinancials) items.push("利润增长的具体来源结构尚无法从当前数据确认。");
  items.push("历史估值序列不可用，无法计算历史 PE 分位。");
  if (!ctx.hasEvents) items.push("公告/新闻等文本信息未接入，事件影响无法完整评估。");
  if (items.length === 0) items.push("当前未发现明显的数据缺口。");
  return items.join(" ");
}

function sectionNextWatch(): string {
  return (
    `建议持续关注：下一报告期的营收与净利润变化、经营现金流与净利润的匹配程度、` +
    `估值与盈利增长的匹配情况，以及是否有新公告或行业事件改变现有判断。`
  );
}
