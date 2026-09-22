"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Evidence } from "@/lib/types";
import { statusMeta } from "@/lib/ui";

interface DrawerContextValue {
  openEvidence: (e: Evidence) => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function useEvidenceDrawer(): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  if (!ctx) {
    return { openEvidence: () => {} };
  }
  return ctx;
}

export function EvidenceDrawerProvider({ children }: { children: ReactNode }) {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  return (
    <DrawerContext.Provider value={{ openEvidence: setEvidence }}>
      {children}
      {evidence && (
        <DrawerPanel evidence={evidence} onClose={() => setEvidence(null)} />
      )}
    </DrawerContext.Provider>
  );
}

const FACT_KIND_LABEL: Record<string, string> = {
  fact: "客观事实",
  inference: "分析推断",
  unverified: "暂无法验证",
};

const METHOD_LABEL: Record<string, string> = {
  deterministic: "确定性计算",
  source: "数据源",
  llm: "LLM 推断",
};

const STATUS_LABEL: Record<string, string> = {
  verified: "数据正常",
  missing: "暂无数据",
  stale: "数据可能过期",
  failed: "接口失败",
  conflict: "来源冲突",
};

const TYPE_LABEL: Record<string, string> = {
  metric: "指标",
  source: "原文/来源",
};

function DrawerPanel({
  evidence: e,
  onClose,
}: {
  evidence: Evidence;
  onClose: () => void;
}) {
  const cls = statusMeta(e.evidenceClass);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-zinc-400">Evidence Drawer</div>
            <h3 className="text-lg font-semibold">{e.label}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-100"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          <Row label="Evidence ID" value={e.id} />
          <Row label="证据类型" value={TYPE_LABEL[e.type] ?? e.type} />
          <Row
            label="证据分类"
            value={`${cls.emoji} ${cls.label}`}
            valueClass={cls.className}
          />
          <Row label="数据状态" value={STATUS_LABEL[e.status] ?? e.status} />
          <Row label="指标名称" value={e.label} />
          <Row
            label="数值"
            value={
              typeof e.value === "number"
                ? String(e.value)
                : e.value ?? "--"
            }
          />
          <Row label="单位" value={e.unit || "—"} />
          <Row label="期间" value={e.period ?? "—"} />
          <Row label="数据来源" value={e.source} />
          <Row label="原始字段" value={e.rawField ?? "—"} />
          <Row label="计算方法" value={METHOD_LABEL[e.method] ?? e.method} />
          <Row
            label="事实/推断"
            value={FACT_KIND_LABEL[e.factKind] ?? e.factKind}
          />
          {e.claim && <Row label="说明" value={e.claim} />}
        </dl>

        <div className="mt-5 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
          此证据由 Deterministic Engine / Evidence Engine 生成，可追溯到原始字段与数据来源。
          点击来源可继续向更底层数据钻取（原始数据能力将在后续阶段接入）。
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 pb-2">
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className={`text-right text-zinc-800 ${valueClass ?? ""}`}>{value}</dd>
    </div>
  );
}
