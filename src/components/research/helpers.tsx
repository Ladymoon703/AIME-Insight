import type { Evidence } from "@/lib/types";

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

export function SourceNote({ source }: { source: string }) {
  return (
    <div className="text-right text-xs text-zinc-400">数据来源：{source}</div>
  );
}
