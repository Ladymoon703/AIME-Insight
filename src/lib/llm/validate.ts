/**
 * Interpreter 校验 + 模板降级（纯函数，无运行时别名依赖，可独立测试）。
 * 校验目标：schema 结构、Evidence ID 引用、数字溯源（防止 LLM 编造数字）。
 */
import type { Evidence, DeepAnalysis, DimensionInsight, StateUpdate } from "@/lib/types";
import type {
  InterpreterInput,
  InterpreterOutput,
  EvidenceReference,
} from "./schema";

// ---------------- 校验 ----------------

export interface ValidationResult {
  ok: boolean;
  output?: InterpreterOutput;
  errors: string[];
}

export function extractNumbers(text: string): number[] {
  const matches = text.match(/-?\d+(?:\.\d+)?/g) ?? [];
  return matches.map(Number).filter((n) => !Number.isNaN(n));
}

/** 只提取带金融单位（%/x/倍/亿/万）的数字，用于判断 LLM 是否编造金融指标 */
export function extractMetricNumbers(text: string): number[] {
  const matches = text.match(/-?\d+(?:\.\d+)?\s*(?:%|x|倍|亿|万)/g) ?? [];
  return matches.map((m) => Number(m.replace(/[^\d.\-]/g, ""))).filter(
    (n) => !Number.isNaN(n),
  );
}

export function collectAllowedNumbers(evidence: Evidence[]): number[] {
  const nums: number[] = [];
  for (const e of evidence) {
    if (typeof e.value === "number") nums.push(e.value);
    else if (typeof e.value === "string") nums.push(...extractNumbers(e.value));
  }
  return nums;
}

export function isAllowedNumber(n: number, allowed: number[]): boolean {
  return allowed.some(
    (a) => Math.abs(a - n) <= Math.max(Math.abs(a), Math.abs(n)) * 0.01 + 0.01,
  );
}

function collectReferencedIds(output: unknown): string[] {
  const ids = new Set<string>();
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (typeof obj.evidenceId === "string") ids.add(obj.evidenceId);
      for (const key of [
        "supportingEvidenceIds",
        "opposingEvidenceIds",
        "unknownEvidenceIds",
        "evidenceIds",
      ]) {
        if (Array.isArray(obj[key])) {
          (obj[key] as unknown[]).forEach((id) => {
            if (typeof id === "string") ids.add(id);
          });
        }
      }
      for (const v of Object.values(obj)) walk(v);
    }
  };
  walk(output);
  return Array.from(ids);
}

function collectText(node: unknown): string {
  const parts: string[] = [];
  const walk = (n: unknown) => {
    if (typeof n === "string") parts.push(n);
    else if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === "object") {
      Object.values(n as Record<string, unknown>).forEach(walk);
    }
  };
  walk(node);
  return parts.join(" ");
}

function validateStructure(obj: unknown): obj is InterpreterOutput {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.summary !== "string") return false;
  if (!Array.isArray(o.dimensionInsights)) return false;
  if (!Array.isArray(o.evidenceReferences)) return false;
  if (!Array.isArray(o.contradictions)) return false;
  if (!Array.isArray(o.unknowns)) return false;
  if (!Array.isArray(o.nextQuestions)) return false;
  if (!o.stateUpdate || typeof o.stateUpdate !== "object") return false;
  const su = o.stateUpdate as Record<string, unknown>;
  if (typeof su.conclusion !== "string") return false;
  return true;
}

export function parseAndValidate(
  content: string,
  input: InterpreterInput,
): ValidationResult {
  const errors: string[] = [];
  let obj: unknown;
  try {
    obj = JSON.parse(content);
  } catch {
    return { ok: false, errors: ["LLM 返回内容不是合法 JSON"] };
  }

  if (!validateStructure(obj)) {
    return { ok: false, errors: ["LLM 输出结构不符合 schema"] };
  }
  const output = obj as InterpreterOutput;

  const validIds = new Set(input.evidence.map((e) => e.id));
  const referenced = collectReferencedIds(output);
  const invalidIds = referenced.filter((id) => !validIds.has(id));
  if (invalidIds.length > 0) {
    errors.push(`LLM 引用了不存在的 Evidence ID: ${invalidIds.join(", ")}`);
  }

  const allowed = collectAllowedNumbers(input.evidence);
  const text = collectText(output);
  const numbers = extractMetricNumbers(text);
  const suspicious = numbers.filter((n) => !isAllowedNumber(n, allowed));
  if (suspicious.length > 0) {
    errors.push(`LLM 输出包含未经 Evidence 支持的数字: ${suspicious.join(", ")}`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, output, errors: [] };
}

// ---------------- 模板降级 ----------------

function evNum(evidence: Evidence[], metric: string): number | null {
  const e = evidence.find((f) => f.metric === metric);
  return typeof e?.value === "number" ? e.value : null;
}

function fmtPct(v: number | null): string {
  return v == null ? "暂无数据" : (v > 0 ? "+" : "") + v.toFixed(1) + "%";
}

export function templateInterpret(input: InterpreterInput): InterpreterOutput {
  const { company, currentState, evidence } = input;
  const npYoY = evNum(evidence, "net_profit_yoy_growth_ratio");
  const revYoY = evNum(evidence, "operating_income_yoy_growth_ratio");
  const cfYoY = evNum(evidence, "operating_cash_net_yoy_growth_ratio");
  const cashContent = evNum(evidence, "net_profit_cash_content");
  const peTtm = evNum(evidence, "pe_ttm");
  const priceReturn = evNum(evidence, "interval_return");

  const positive = evidence.filter((e) => e.evidenceClass === "positive");
  const negative = evidence.filter((e) => e.evidenceClass === "negative");
  const contradictory = evidence.filter((e) => e.evidenceClass === "contradictory");
  const unknown = evidence.filter((e) => e.evidenceClass === "unknown");

  const summary = buildSummaryText(company.name, npYoY, revYoY, cfYoY, peTtm, priceReturn, unknown.length > 0);

  const dimensionInsights: DimensionInsight[] = currentState.map((s) => {
    const rel = evidence.filter((e) => e.dimension === s.dimension);
    return {
      dimension: s.dimension,
      status: s.status,
      statement: statementFor(s.dimension, { npYoY, revYoY, cfYoY, cashContent, peTtm, priceReturn }),
      supportingEvidenceIds: rel.filter((e) => e.evidenceClass === "positive").map((e) => e.id),
      opposingEvidenceIds: rel.filter((e) => e.evidenceClass === "negative").map((e) => e.id),
      unknownEvidenceIds: rel.filter((e) => e.evidenceClass === "unknown").map((e) => e.id),
    };
  });

  const evidenceReferences: EvidenceReference[] = evidence.map((e) => ({
    evidenceId: e.id,
    relation:
      e.evidenceClass === "neutral"
        ? "supporting"
        : (e.evidenceClass as EvidenceReference["relation"]),
    note: `${e.label}${typeof e.value === "number" ? " " + e.value : ""}${e.unit}${e.period ? "（" + e.period + "）" : ""}`,
  }));

  const contradictions = contradictory.map((e) => ({
    description: e.claim ?? e.label,
    evidenceIds: [e.id],
  }));

  const unknowns = unknown.map((e) => ({
    description: e.claim ?? e.label,
    evidenceIds: [e.id],
  }));

  const nextQuestions = buildNextQuestions({
    cfYoY,
    peTtm,
    hasContradiction: contradictory.length > 0,
    hasUnknown: unknown.length > 0,
  });

  const stateUpdate: StateUpdate = {
    conclusion: buildConclusion(npYoY, contradictory.length > 0),
    positiveSummary: positive.length > 0 ? positive.map((e) => e.label).join("、") : "暂无明显支持证据。",
    negativeSummary: negative.length > 0 ? negative.map((e) => e.label).join("、") : "暂无明显反向证据。",
    contradictorySummary: contradictory.length > 0 ? contradictory.map((e) => e.label).join("、") : "暂无矛盾证据。",
    unknownSummary: unknown.length > 0 ? unknown.map((e) => e.label).join("、") : "暂无未知事项。",
  };

  return {
    summary,
    dimensionInsights,
    evidenceReferences,
    contradictions,
    unknowns,
    nextQuestions,
    stateUpdate,
  };
}

function buildSummaryText(
  name: string,
  npYoY: number | null,
  revYoY: number | null,
  cfYoY: number | null,
  peTtm: number | null,
  priceReturn: number | null,
  hasUnknown: boolean,
): string {
  const parts: string[] = [];
  if (npYoY != null) {
    parts.push(`${name}净利润同比 ${fmtPct(npYoY)}、营收同比 ${fmtPct(revYoY)}。`);
    if (cfYoY != null && npYoY > cfYoY + 10) {
      parts.push(`但经营现金流同比仅 ${fmtPct(cfYoY)}，明显低于净利润增速，盈利质量出现分化。`);
    } else {
      parts.push(`经营现金流同比 ${fmtPct(cfYoY)}。`);
    }
  }
  if (peTtm != null) parts.push(`当前 PE-TTM ${peTtm.toFixed(2)}x。`);
  if (priceReturn != null) parts.push(`近期区间收益 ${fmtPct(priceReturn)}。`);
  if (hasUnknown) parts.push("部分数据缺失或未接入，相关维度暂无法完整验证。");
  return parts.join(" ");
}

function statementFor(
  dimension: string,
  v: {
    npYoY: number | null;
    revYoY: number | null;
    cfYoY: number | null;
    cashContent: number | null;
    peTtm: number | null;
    priceReturn: number | null;
  },
): string {
  switch (dimension) {
    case "business_quality":
      return v.npYoY == null ? "财务数据不足，暂无法判断经营质量。" : `净利润同比 ${fmtPct(v.npYoY)}，经营质量${v.npYoY > 0 ? "改善" : "承压"}。`;
    case "financial_trend":
      return v.revYoY == null ? "财务数据不足。" : `营收同比 ${fmtPct(v.revYoY)}、净利润同比 ${fmtPct(v.npYoY)}，财务趋势${v.revYoY > 0 ? "改善" : "承压"}。`;
    case "profit_quality":
      if (v.cfYoY == null) return "经营现金流数据不足，无法判断盈利质量。";
      return v.npYoY != null && v.npYoY > v.cfYoY + 10
        ? `净利润同比 ${fmtPct(v.npYoY)}、经营现金流同比 ${fmtPct(v.cfYoY)}，存在多维信号分化。`
        : "净利润与经营现金流增速基本同步，盈利质量正常。";
    case "valuation":
      return v.peTtm == null ? "估值数据不可用。" : `当前 PE-TTM ${v.peTtm.toFixed(2)}x，历史估值序列不可用，无法判断历史分位。`;
    case "market":
      return v.priceReturn == null ? "行情数据不足。" : `近期区间收益 ${fmtPct(v.priceReturn)}，行情${v.priceReturn < 0 ? "承压" : "改善"}。`;
    case "industry":
      return "已选取可比公司进行对比，行业位置需结合 ROE、增速与估值综合判断。";
    case "events":
      return "公告/新闻信息需 iFinD MCP，当前未接入，事件维度暂无法完整验证。";
    default:
      return "暂无可解释的维度洞察。";
  }
}

function buildConclusion(npYoY: number | null, hasContradiction: boolean): string {
  if (npYoY == null) return "当前财务数据不足，无法形成结论。";
  if (hasContradiction) return "盈利保持改善，但经营现金流增速低于净利润增速，盈利质量仍需观察。";
  return npYoY > 0 ? "盈利保持改善，利润与现金流增长基本同步。" : "盈利增长承压，需结合后续报告期验证。";
}

function buildNextQuestions(v: {
  cfYoY: number | null;
  peTtm: number | null;
  hasContradiction: boolean;
  hasUnknown: boolean;
}): string[] {
  const q: string[] = [];
  if (v.hasContradiction) q.push("经营现金流增速明显低于净利润增速，建议进一步验证下一期现金流变化。");
  if (v.peTtm != null) q.push("当前 PE 缺乏历史序列和行业中位数基线，暂时无法判断估值是否处于历史高位，建议补充行业估值对比。");
  if (v.hasUnknown) q.push("部分事件/公告信息未接入，建议在数据接入后补充验证。");
  if (q.length === 0) q.push("建议关注下一报告期的收入与利润变化。");
  return q;
}

// ---------------- 深度分析构建 ----------------

export function buildDeepAnalysis(
  output: InterpreterOutput,
  evidence: Evidence[],
): DeepAnalysis {
  const byClass = (cls: string) =>
    evidence.filter((e) => e.evidenceClass === cls).map((e) => e.id);
  const sections = [
    { title: "支持结论的主要证据", content: output.stateUpdate.positiveSummary, evidenceIds: byClass("positive") },
    { title: "反向证据", content: output.stateUpdate.negativeSummary, evidenceIds: byClass("negative") },
    {
      title: "存在的矛盾",
      content: output.contradictions.length > 0 ? output.contradictions.map((c) => c.description).join(" ") : "暂无矛盾证据。",
      evidenceIds: byClass("contradictory"),
    },
    {
      title: "当前未知",
      content: output.unknowns.length > 0 ? output.unknowns.map((u) => u.description).join(" ") : "暂无未知事项。",
      evidenceIds: byClass("unknown"),
    },
    { title: "对研究目标的回答", content: output.summary, evidenceIds: evidence.map((e) => e.id) },
    { title: "还需要验证什么", content: output.nextQuestions.join(" "), evidenceIds: [] },
  ];
  return {
    coreConclusion: output.stateUpdate.conclusion,
    sections,
    evidenceIds: evidence.map((e) => e.id),
  };
}
