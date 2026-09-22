/**
 * Research Update — 确定性比较旧/新 Research State。
 * 事实变化由代码计算，LLM 只负责解释「变化意味着什么」。
 * 绝不把 failed/missing 的新数据误判为「判断弱化」。
 */
import type {
  ResearchResult,
  CurrentStateItem,
  Evidence,
  EvidenceClass,
} from "@/lib/types";

export type ChangeType =
  | "strengthened"
  | "weakened"
  | "new_positive"
  | "new_negative"
  | "new_contradiction"
  | "new_unknown"
  | "stale"
  | "no_change";

export interface ResearchChange {
  type: ChangeType;
  dimension: string | null;
  metric: string | null;
  oldValue: number | string | null;
  newValue: number | string | null;
  description: string;
  oldEvidenceIds: string[];
  newEvidenceIds: string[];
}

export interface ResearchUpdate {
  oldUpdatedAt: string;
  newUpdatedAt: string;
  changes: ResearchChange[];
  /** 模板/LLM 生成的变化解释 */
  summary: string;
  llmMode: "live" | "template";
}

const DIMENSION_LABEL: Record<string, string> = {
  business_quality: "经营质量",
  financial_trend: "财务趋势",
  profit_quality: "盈利质量",
  valuation: "估值",
  market: "行情特征",
  industry: "行业位置",
  events: "事件与风险",
};

function label(dimension: string): string {
  return DIMENSION_LABEL[dimension] ?? dimension;
}

function classToChangeType(cls: EvidenceClass): ChangeType | null {
  switch (cls) {
    case "positive":
      return "new_positive";
    case "negative":
      return "new_negative";
    case "contradictory":
      return "new_contradiction";
    case "unknown":
      return "new_unknown";
    default:
      return null;
  }
}

function isNumeric(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

/** 维度状态迁移 → 变化类型（以新状态为主） */
function transitionType(
  oldStatus: string,
  newStatus: string,
): ChangeType | null {
  if (newStatus === "contradictory") return "new_contradiction";
  if (newStatus === "unknown") return "new_unknown";
  if (newStatus === "positive") return "strengthened";
  if (newStatus === "negative") return "weakened";
  if (newStatus === "neutral") {
    if (oldStatus === "positive") return "weakened";
    if (oldStatus === "negative" || oldStatus === "unknown") return "strengthened";
  }
  return null;
}

/** 维度状态变化：强化 / 弱化 / 新增矛盾 / 新增未知 */
export function detectDimensionChanges(
  oldStates: CurrentStateItem[],
  newStates: CurrentStateItem[],
): ResearchChange[] {
  const changes: ResearchChange[] = [];
  for (const ns of newStates) {
    const os = oldStates.find((s) => s.dimension === ns.dimension);
    if (!os || os.status === ns.status) continue;
    const type = transitionType(os.status, ns.status);
    if (!type) continue;
    const typeLabel: Record<ChangeType, string> = {
      strengthened: "判断强化",
      weakened: "判断弱化",
      new_positive: "新增正向证据",
      new_negative: "新增负向证据",
      new_contradiction: "新增矛盾/分化",
      new_unknown: "新增未知",
      stale: "失效",
      no_change: "无变化",
    };
    changes.push({
      type,
      dimension: ns.dimension,
      metric: null,
      oldValue: os.summary,
      newValue: ns.summary,
      description: `${label(ns.dimension)}：${os.summary} → ${ns.summary}（${typeLabel[type]}）`,
      oldEvidenceIds: [],
      newEvidenceIds: [],
    });
  }
  return changes;
}

/** 证据变化（按 metric）：新增 / 失效 / 数值变化 / 数据失败保护 */
export function detectEvidenceChanges(
  oldEvidence: Evidence[],
  newEvidence: Evidence[],
): ResearchChange[] {
  const changes: ResearchChange[] = [];
  const oldByMetric = new Map(
    oldEvidence.filter((e) => e.metric).map((e) => [e.metric, e]),
  );
  const newByMetric = new Map(
    newEvidence.filter((e) => e.metric).map((e) => [e.metric, e]),
  );

  // 新增证据
  for (const [metric, ne] of newByMetric) {
    const oe = oldByMetric.get(metric);
    if (oe) continue;
    const type = classToChangeType(ne.evidenceClass);
    if (!type) continue;
    changes.push({
      type,
      dimension: ne.dimension,
      metric,
      oldValue: null,
      newValue: ne.value,
      description: `新增证据：${ne.label} ${ne.value ?? ""}${ne.unit}`,
      oldEvidenceIds: [],
      newEvidenceIds: [ne.id],
    });
  }

  // 同 metric：数值变化
  for (const [metric, ne] of newByMetric) {
    const oe = oldByMetric.get(metric);
    if (!oe) continue;
    // 数据失败保护：新数据 failed/missing，旧数据 verified → 标记 stale，不判弱化
    if (
      (ne.status === "failed" || ne.status === "missing") &&
      oe.status === "verified"
    ) {
      changes.push({
        type: "stale",
        dimension: ne.dimension,
        metric,
        oldValue: oe.value,
        newValue: null,
        description: `本次无法获取 ${ne.label} 最新数据，暂保留旧判断`,
        oldEvidenceIds: [oe.id],
        newEvidenceIds: [],
      });
      continue;
    }
    if (isNumeric(oe.value) && isNumeric(ne.value) && oe.value !== ne.value) {
      const improved =
        oe.evidenceClass === "positive"
          ? ne.value > oe.value
          : oe.evidenceClass === "negative"
            ? ne.value < oe.value
            : null;
      const dir =
        improved === null
          ? "changed"
          : improved
            ? "strengthened"
            : "weakened";
      changes.push({
        type: dir as ChangeType,
        dimension: ne.dimension,
        metric,
        oldValue: oe.value,
        newValue: ne.value,
        description: `${ne.label}：${oe.value}${oe.unit} → ${ne.value}${ne.unit}`,
        oldEvidenceIds: [oe.id],
        newEvidenceIds: [ne.id],
      });
    }
  }

  // 失效：旧 metric 不再出现
  for (const [metric, oe] of oldByMetric) {
    if (newByMetric.has(metric)) continue;
    changes.push({
      type: "stale",
      dimension: oe.dimension,
      metric,
      oldValue: oe.value,
      newValue: null,
      description: `证据失效/过期：${oe.label}`,
      oldEvidenceIds: [oe.id],
      newEvidenceIds: [],
    });
  }

  return changes;
}

export function compareResearch(
  oldResult: ResearchResult,
  newResult: ResearchResult,
): ResearchChange[] {
  const changes: ResearchChange[] = [];
  changes.push(
    ...detectDimensionChanges(oldResult.currentState, newResult.currentState),
  );
  changes.push(
    ...detectEvidenceChanges(oldResult.evidence.facts, newResult.evidence.facts),
  );
  if (changes.length === 0) {
    changes.push({
      type: "no_change",
      dimension: null,
      metric: null,
      oldValue: null,
      newValue: null,
      description: "与上次研究相比，没有发现明显变化。",
      oldEvidenceIds: [],
      newEvidenceIds: [],
    });
  }
  return changes;
}

/** 模板生成变化解释（LLM 可用时替换） */
export function templateUpdateSummary(changes: ResearchChange[]): string {
  if (changes.length === 0) return "没有发现明显变化。";
  const counts = new Map<ChangeType, number>();
  for (const c of changes) counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
  const parts: string[] = [];
  const labelMap: Record<ChangeType, string> = {
    strengthened: "判断被强化",
    weakened: "判断被削弱",
    new_positive: "新增正向证据",
    new_negative: "新增负向证据",
    new_contradiction: "新增矛盾",
    new_unknown: "新增未知",
    stale: "证据失效/过期",
    no_change: "无变化",
  };
  for (const [type, n] of counts) {
    parts.push(`${labelMap[type]} ${n} 项`);
  }
  return parts.join("，") + "。";
}
