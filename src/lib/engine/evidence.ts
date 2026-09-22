/**
 * Evidence Engine — 建立「结论 → 证据 → 指标/来源 → 期次 → 单位 → 方法」的追溯链。
 * 所有 AI 结论只能引用 Evidence id，不能凭空生成数字。
 */
import type {
  Evidence,
  EvidenceClass,
  FactKind,
  DataStatus,
  EvidenceType,
} from "@/lib/types";

let counter = 0;

export function nextEvidenceId(prefix = "ev"): string {
  counter += 1;
  return `${prefix}_${String(counter).padStart(3, "0")}`;
}

export interface EvidenceInput {
  id?: string;
  type?: EvidenceType;
  status?: DataStatus;
  evidenceClass: EvidenceClass;
  factKind: FactKind;
  dimension: string;
  metric: string;
  label: string;
  value: number | string | null;
  unit: string;
  period?: string | null;
  source: string;
  updatedAt?: string | null;
  method?: "deterministic" | "source" | "llm";
  claim?: string;
  rawField?: string;
}

export function createEvidence(input: EvidenceInput): Evidence {
  return {
    id: input.id ?? nextEvidenceId(),
    type: input.type ?? "metric",
    status: input.status ?? "verified",
    evidenceClass: input.evidenceClass,
    factKind: input.factKind,
    dimension: input.dimension,
    metric: input.metric,
    label: input.label,
    value: input.value,
    unit: input.unit,
    period: input.period ?? null,
    source: input.source,
    updatedAt: input.updatedAt ?? null,
    method: input.method ?? "deterministic",
    claim: input.claim,
    rawField: input.rawField,
  };
}

/** 根据增长率符号给证据分类（仅用于事实类指标方向判断，不含投资含义） */
export function classifyGrowth(
  value: number | null,
  positiveWhenUp = true,
): EvidenceClass {
  if (value == null) return "unknown";
  const up = value > 0;
  const positive = positiveWhenUp ? up : !up;
  return positive ? "positive" : "negative";
}

/** 判断是否存在「多维信号分化」：基本面向上但现金流/行情不跟随 */
export function detectDivergence(input: {
  netProfitTrend: "up" | "down" | "flat" | "unknown";
  cashFlowTrend: "up" | "down" | "flat" | "unknown";
  priceReturnPct: number | null;
}): boolean {
  const { netProfitTrend, cashFlowTrend, priceReturnPct } = input;
  const fundamentalUp = netProfitTrend === "up";
  const cashFlatOrDown = cashFlowTrend === "flat" || cashFlowTrend === "down";
  const priceDown = priceReturnPct != null && priceReturnPct < 0;
  // 基本面改善但现金流未同步、价格下跌 —— 至少满足两处不一致
  const signals = [
    fundamentalUp && cashFlatOrDown,
    fundamentalUp && priceDown,
  ];
  return signals.filter(Boolean).length >= 1;
}

/** 归一化来源名称：演示数据必须明确标识，禁止伪装成真实数据源 */
export function sourceName(dataMode: "live" | "mock", base: string): string {
  return dataMode === "mock" ? `${base}（演示数据）` : base;
}
