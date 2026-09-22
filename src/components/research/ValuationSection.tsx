import type { Valuation } from "@/lib/types";

export default function ValuationSection({ valuation }: { valuation: Valuation }) {
  const cards = [
    { label: "PE-TTM", value: valuation.peTtm, fmt: "x" },
    { label: "PE-MRQ", value: valuation.peMrq, fmt: "x" },
    { label: "PB-MRQ", value: valuation.pbMrq, fmt: "x" },
    { label: "PS-TTM", value: valuation.psTtm, fmt: "x" },
    { label: "PCF-TTM", value: valuation.pcfTtm, fmt: "x" },
  ];

  return (
    <section className="rounded-xl border border-black/5 bg-white p-5">
      <h2 className="text-lg font-semibold">估值</h2>
      <p className="text-sm text-zinc-500">市场现在如何给它定价？</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg bg-zinc-50 p-3">
            <div className="text-xs text-zinc-400">{c.label}</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums">
              {c.value == null ? "--" : c.value.toFixed(2) + c.fmt}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
        估值指标反映市场价格与盈利、净资产等财务数据之间的关系。当前数据源仅提供
        <span className="font-medium">最新估值快照</span>，不提供历史估值序列，因此不展示历史
        PE 曲线与历史分位，避免伪造数据。估值水平需结合盈利增长与行业比较综合判断，单一指标不能直接决定公司价值。
      </div>
    </section>
  );
}
