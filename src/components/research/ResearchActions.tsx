"use client";

import { useState } from "react";
import Link from "next/link";
import type { ResearchResult } from "@/lib/types";

export default function ResearchActions({
  thscode,
  companyName,
  result,
}: {
  thscode: string;
  companyName: string;
  result: ResearchResult;
}) {
  const [researchId, setResearchId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [observed, setObserved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function ensureSaved(): Promise<string | null> {
    if (researchId) return researchId;
    const res = await fetch("/api/research/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      researchId?: string;
      version?: number;
      error?: string;
    };
    if (data.ok && data.researchId) {
      setResearchId(data.researchId);
      setSaved(`研究已保存（v${data.version}）`);
      return data.researchId;
    }
    setSaved(`保存失败：${data.error ?? "未知错误"}`);
    return null;
  }

  async function save() {
    setBusy(true);
    try {
      await ensureSaved();
    } catch {
      setSaved("保存失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function observe() {
    setBusy(true);
    try {
      const rid = await ensureSaved();
      if (!rid) return;
      await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchId: rid,
          thscode,
          companyName,
          title: `持续关注 ${companyName} 盈利质量`,
          description: "验证利润增长是否同步转化为现金创造",
          dimensions: ["profit_quality"],
          metrics: ["净利润同比", "经营现金流同比", "净利润现金含量"],
        }),
      });
      setObserved(true);
    } catch {
      setObserved(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/5 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          保存本次研究
        </button>
        <button
          onClick={observe}
          disabled={busy}
          className="rounded-lg border border-accent/20 px-4 py-2 text-sm text-accent hover:bg-accent-soft disabled:opacity-50"
        >
          {observed ? "已建立观察" : "建立持续观察"}
        </button>
        {researchId && (
          <Link
            href={`/research/${thscode}/history?researchId=${researchId}`}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            查看研究历史
          </Link>
        )}
      </div>
      {saved && <div className="mt-2 text-sm text-accent">{saved}</div>}
      {observed && (
        <div className="mt-2 text-sm text-accent">
          已建立观察，可在「我的观察」中查看。
        </div>
      )}
    </div>
  );
}
