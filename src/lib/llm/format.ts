/**
 * LLM 提示词中的数值格式化：只优化 presentation，不修改底层真实值。
 * 底层真实值保留在 Evidence 中（Drawer 可查看完整原始值），
 * 传给 LLM 的数值统一四舍五入到 2 位小数，避免 LLM 回显过高精度（如 158.795382）。
 */
import type { Evidence } from "@/lib/types";

export function roundValue(v: unknown): unknown {
  if (typeof v === "number") {
    return Math.round(v * 100) / 100;
  }
  return v;
}

/** 复制 Evidence 数组并四舍五入 value，供 LLM 提示词使用 */
export function roundEvidenceForPrompt(evidence: Evidence[]): Evidence[] {
  return evidence.map((e) => ({
    ...e,
    value:
      typeof e.value === "number" ? Math.round(e.value * 100) / 100 : e.value,
  }));
}
