import type { Evidence } from "@/lib/types";
import { statusMeta } from "@/lib/ui";

export function evNum(facts: Evidence[], metric: string): number | null {
  const e = facts.find((f) => f.metric === metric);
  return typeof e?.value === "number" ? e.value : null;
}

export function fmtPct(v: number | null, digits = 1): string {
  if (v == null) return "--";
  return (v > 0 ? "+" : "") + v.toFixed(digits) + "%";
}

export function fmtRatio(v: number | null): string {
  return v == null ? "--" : v.toFixed(2) + "x";
}

/** 单条证据（Phase 4 将支持点击打开 Evidence Drawer） */
export function EvidenceItem({ e }: { e: Evidence }) {
  const meta = statusMeta(e.evidenceClass);
  const valueText =
    typeof e.value === "number"
      ? e.value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })
      : e.value ?? "--";
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="mt-0.5 text-sm leading-none">{meta.emoji}</span>
      <div className="text-sm text-zinc-700">
        <span className="font-medium">{e.label}</span>
        <span className="ml-2 tabular-nums text-zinc-900">{valueText}</span>
        {e.unit && <span className="ml-0.5 text-xs text-zinc-400">{e.unit}</span>}
        {e.period && <span className="ml-2 text-xs text-zinc-400">{e.period}</span>}
        {e.claim && <span className="ml-2 text-xs text-zinc-400">{e.claim}</span>}
      </div>
    </div>
  );
}

export function SourceNote({ source }: { source: string }) {
  return (
    <div className="text-right text-xs text-zinc-400">数据来源：{source}</div>
  );
}
