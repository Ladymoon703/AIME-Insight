/**
 * 前端展示用的状态元数据（图标 + 文字 + 颜色）。
 * 颜色不是唯一语义，始终配合 emoji 图标与文字。
 */
export type StatusKind =
  | "positive"
  | "negative"
  | "contradictory"
  | "unknown"
  | "neutral";

export const STATUS_META: Record<
  StatusKind,
  { emoji: string; className: string; label: string }
> = {
  positive: { emoji: "🟢", className: "evidence-positive", label: "正面" },
  negative: { emoji: "🔴", className: "evidence-negative", label: "负面" },
  contradictory: { emoji: "🟠", className: "evidence-contradictory", label: "矛盾" },
  unknown: { emoji: "⚪", className: "evidence-unknown", label: "未知" },
  neutral: { emoji: "🟡", className: "evidence-neutral", label: "中性" },
};

export function statusMeta(kind: string): { emoji: string; className: string; label: string } {
  return STATUS_META[kind as StatusKind] ?? STATUS_META.unknown;
}

/** 数据状态中文映射 */
export const DATA_STATUS_LABEL: Record<string, string> = {
  verified: "数据正常",
  missing: "暂无数据",
  stale: "数据可能过期",
  failed: "接口失败",
  conflict: "来源冲突",
};
