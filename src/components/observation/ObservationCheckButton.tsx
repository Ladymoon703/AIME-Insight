"use client";

import { useState } from "react";

interface CheckResult {
  ok: boolean;
  checkedAt?: string;
  changes?: Array<{ type: string; description: string }>;
  summary?: string;
  error?: string;
}

export default function ObservationCheckButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  async function check() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/observations/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as CheckResult;
      setResult(data);
    } catch {
      setResult({ ok: false, error: "检查失败，请稍后重试" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={check}
        disabled={loading}
        className="rounded-lg border border-accent/20 px-4 py-1.5 text-sm text-accent hover:bg-accent-soft disabled:opacity-50"
      >
        {loading ? "检查中…" : "检查最新情况"}
      </button>

      {result && result.ok && result.changes && (
        <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm">
          <div className="text-xs text-zinc-400">
            本次检查发现（{result.changes.length} 项变化）
          </div>
          <ul className="mt-1 space-y-1">
            {result.changes.map((c, i) => (
              <li key={i} className="text-zinc-600">
                · {c.description}
              </li>
            ))}
          </ul>
          {result.summary && (
            <p className="mt-2 text-xs text-zinc-500">{result.summary}</p>
          )}
        </div>
      )}
      {result && !result.ok && (
        <div className="mt-3 text-sm text-amber-600">{result.error}</div>
      )}
    </div>
  );
}
