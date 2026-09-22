"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Company, ResearchMap, ResearchDimension, ResearchPriority } from "@/lib/types";
import { DIMENSION_CATALOG, TIME_WINDOWS, type DimensionDef } from "@/lib/agent/dimensions";

const PRIORITY_LABEL: Record<ResearchPriority, string> = {
  core: "Core · 必须研究",
  supporting: "Supporting · 辅助验证",
  optional: "Optional · 可选深入",
};

const PRIORITY_ORDER: ResearchPriority[] = ["core", "supporting", "optional"];

export default function ResearchMapView({
  company,
  researchMap,
  query,
}: {
  company: Company;
  researchMap: ResearchMap;
  query: string;
}) {
  const router = useRouter();
  const [goal, setGoal] = useState(researchMap.researchGoal);
  const [timeWindow, setTimeWindow] = useState(researchMap.timeWindow);
  const [dims, setDims] = useState<ResearchDimension[]>(researchMap.dimensions);

  const usedKeys = useMemo(() => new Set(dims.map((d) => d.key)), [dims]);
  const addable: DimensionDef[] = DIMENSION_CATALOG.filter(
    (d) => !usedKeys.has(d.key),
  );

  function removeDimension(key: string) {
    setDims((prev) => prev.filter((d) => d.key !== key));
  }

  function addDimension(key: string) {
    const def = DIMENSION_CATALOG.find((d) => d.key === key);
    if (!def) return;
    setDims((prev) => [
      ...prev,
      {
        key: def.key,
        name: def.name,
        priority: def.priority,
        reason: def.reason.replaceAll("{name}", company.name),
        metrics: def.metrics,
      },
    ]);
  }

  function changePriority(key: string, priority: ResearchPriority) {
    setDims((prev) =>
      prev.map((d) => (d.key === key ? { ...d, priority } : d)),
    );
  }

  function start() {
    const dimKeys = dims.map((d) => d.key).join(",");
    const params = new URLSearchParams({
      goal,
      window: timeWindow,
      dims: dimKeys,
    });
    router.push(`/research/${company.thscode}?${params.toString()}`);
  }

  const grouped = PRIORITY_ORDER.map((p) => ({
    priority: p,
    items: dims.filter((d) => d.priority === p),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-1 text-xs text-zinc-400">
        {company.name} · {company.thscode}
      </div>
      <h1 className="text-2xl font-semibold">我准备这样帮你研究</h1>

      {/* 用户问题 */}
      <div className="mt-6 rounded-xl border border-black/5 bg-white p-5">
        <div className="text-xs font-medium text-zinc-400">你的问题</div>
        <div className="mt-1 text-base text-zinc-800">{query}</div>
        <Link
          href="/"
          className="mt-2 inline-block text-xs text-accent hover:underline"
        >
          ← 返回修改问题
        </Link>
      </div>

      {/* 研究目标（可编辑） */}
      <div className="mt-4 rounded-xl border border-black/5 bg-white p-5">
        <div className="text-xs font-medium text-zinc-400">
          我理解的研究目标
        </div>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
          className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-accent"
        />
      </div>

      {/* 研究维度 */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">研究维度</h2>
          <span className="text-xs text-zinc-400">
            Agent 自动规划，你可以增删或调整优先级
          </span>
        </div>

        {grouped.map((g) => (
          <div key={g.priority} className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {PRIORITY_LABEL[g.priority]}
            </div>
            <div className="space-y-2">
              {g.items.map((d) => (
                <DimensionCard
                  key={d.key}
                  dim={d}
                  onRemove={() => removeDimension(d.key)}
                  onPriority={(p) => changePriority(d.key, p)}
                />
              ))}
            </div>
          </div>
        ))}

        {addable.length > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-zinc-500">+ 添加研究维度</span>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) addDimension(e.target.value);
                e.target.value = "";
              }}
              className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm"
            >
              <option value="">选择维度…</option>
              {addable.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 时间范围 */}
      <div className="mt-6 rounded-xl border border-black/5 bg-white p-5">
        <div className="text-xs font-medium text-zinc-400">研究时间范围</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIME_WINDOWS.map((w) => (
            <button
              key={w.key}
              onClick={() => setTimeWindow(w.key)}
              className={`rounded-lg px-4 py-1.5 text-sm ${
                timeWindow === w.key
                  ? "bg-accent text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agent 透明度：为什么研究这些 */}
      <div className="mt-4 rounded-xl border border-black/5 bg-accent-soft p-5">
        <div className="text-xs font-medium text-accent">为什么研究这些维度？</div>
        <p className="mt-1 text-sm text-zinc-700">{researchMap.planRationale}</p>
      </div>

      {/* CTA */}
      <div className="sticky bottom-0 mt-6 flex items-center justify-between rounded-xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="text-xs text-zinc-500">
          本次研究：{dims.length} 个维度 ·{" "}
          {TIME_WINDOWS.find((w) => w.key === timeWindow)?.label}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            调整研究计划
          </Link>
          <button
            onClick={start}
            disabled={dims.length === 0}
            className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            开始研究
          </button>
        </div>
      </div>
    </div>
  );
}

function DimensionCard({
  dim,
  onRemove,
  onPriority,
}: {
  dim: ResearchDimension;
  onRemove: () => void;
  onPriority: (p: ResearchPriority) => void;
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-800">{dim.name}</span>
          <select
            value={dim.priority}
            onChange={(e) => onPriority(e.target.value as ResearchPriority)}
            className="rounded border border-black/10 bg-zinc-50 px-1.5 py-0.5 text-xs text-zinc-600"
          >
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {p === "core" ? "Core" : p === "supporting" ? "Supporting" : "Optional"}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onRemove}
          className="rounded px-1.5 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-600"
          aria-label={`移除 ${dim.name}`}
        >
          ×
        </button>
      </div>
      <p className="mt-1.5 text-sm text-zinc-500">{dim.reason}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {dim.metrics.map((m) => (
          <span
            key={m}
            className="rounded bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500"
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
