"use client";

import type { Evidence } from "@/lib/types";
import { statusMeta } from "@/lib/ui";
import { useEvidenceDrawer } from "./EvidenceDrawer";

/** 可点击的单条证据：点击打开 Evidence Drawer */
export default function EvidenceItem({ e }: { e: Evidence }) {
  const { openEvidence } = useEvidenceDrawer();
  const meta = statusMeta(e.evidenceClass);
  const valueText =
    typeof e.value === "number"
      ? e.value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })
      : e.value ?? "--";

  return (
    <button
      type="button"
      onClick={() => openEvidence(e)}
      className="flex w-full items-start gap-2 rounded px-1 py-1 text-left hover:bg-accent-soft"
    >
      <span className="mt-0.5 text-sm leading-none">{meta.emoji}</span>
      <span className="text-sm text-zinc-700">
        <span className="font-medium">{e.label}</span>
        <span className="ml-2 tabular-nums text-zinc-900">{valueText}</span>
        {e.unit && <span className="ml-0.5 text-xs text-zinc-400">{e.unit}</span>}
        {e.period && <span className="ml-2 text-xs text-zinc-400">{e.period}</span>}
        {e.claim && <span className="ml-2 text-xs text-zinc-400">{e.claim}</span>}
      </span>
      <span className="ml-auto shrink-0 text-xs text-zinc-300">↗</span>
    </button>
  );
}
