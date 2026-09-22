import type { ResearchResult, Evidence } from "@/lib/types";
import EvidenceItem from "./EvidenceItem";

export default function EvidenceBoard({
  evidence,
  conclusion,
}: {
  evidence: ResearchResult["evidence"];
  conclusion: string | null;
}) {
  return (
    <section className="rounded-xl border border-black/5 bg-white p-5">
      <h2 className="text-lg font-semibold">为什么得到这个结论？</h2>

      {conclusion && (
        <div className="mt-3 rounded-lg bg-zinc-50 p-3">
          <div className="text-xs font-medium text-zinc-400">当前判断</div>
          <p className="mt-1 text-sm font-medium text-zinc-800">{conclusion}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Bucket title="🟢 支持证据" items={evidence.positive} />
        <Bucket title="🔴 反向证据" items={evidence.negative} />
        <Bucket title="🟠 矛盾证据" items={evidence.contradictory} />
        <Bucket title="⚪ 未知信息" items={evidence.unknown} />
      </div>
    </section>
  );
}

function Bucket({ title, items }: { title: string; items: Evidence[] }) {
  return (
    <div className="rounded-lg border border-black/5 p-3">
      <div className="text-sm font-medium text-zinc-700">{title}</div>
      {items.length === 0 ? (
        <div className="mt-1 text-xs text-zinc-400">无</div>
      ) : (
        items.map((e) => <EvidenceItem key={e.id} e={e} />)
      )}
    </div>
  );
}
