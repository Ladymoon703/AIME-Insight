"use client";

import { useState } from "react";

const CHANGE_META: Record<string, { label: string; cls: string }> = {
  strengthened: { label: "判断强化", cls: "evidence-positive" },
  weakened: { label: "判断弱化", cls: "evidence-negative" },
  new_positive: { label: "新增正向证据", cls: "evidence-positive" },
  new_negative: { label: "新增负向证据", cls: "evidence-negative" },
  new_contradiction: { label: "新增矛盾", cls: "evidence-contradictory" },
  new_unknown: { label: "新增未知", cls: "evidence-unknown" },
  stale: { label: "证据失效/过期", cls: "evidence-neutral" },
  no_change: { label: "无明显变化", cls: "evidence-neutral" },
};

interface RerunResult {
  ok: boolean;
  version?: number;
  changes?: Array<{
    type: string;
    description: string;
    oldValue: number | string | null;
    newValue: number | string | null;
  }>;
  summary?: string;
  error?: string;
}

export default function ReRunSection({ researchId }: { researchId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RerunResult | null>(null);

  async function rerun() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/research/rerun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchId }),
      });
      const data = (await res.json()) as RerunResult;
      setResult(data);
    } catch {
      setResult({ ok: false, error: "重新研究失败，请稍后重试" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={rerun}
        disabled={loading}
        className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
      >
        {loading ? "重新研究中…" : "重新研究"}
      </button>

      {result && result.ok && result.changes && (
        <div className="mt-4 rounded-xl border border-black/5 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">研究更新（v{result.version}）</h3>
            <span className="text-xs text-zinc-400">旧 → 新</span>
          </div>
          <div className="mt-3 space-y-2">
            {result.changes.map((c, i) => {
              const meta = CHANGE_META[c.type] ?? {
                label: c.type,
                cls: "evidence-neutral",
              };
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg bg-zinc-50 p-2.5 text-sm"
                >
                  <span className={`shrink-0 ${meta.cls}`}>{meta.label}</span>
                  <span className="text-zinc-700">{c.description}</span>
                </div>
              );
            })}
          </div>
          {result.summary && (
            <p className="mt-3 text-sm leading-6 text-zinc-600">{result.summary}</p>
          )}
        </div>
      )}
      {result && !result.ok && (
        <div className="mt-3 text-sm text-amber-600">{result.error}</div>
      )}
    </div>
  );
}
