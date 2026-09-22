import EChart from "@/components/charts/EChart";
import { buildKlineChart } from "@/lib/charts";
import type { ResearchResult } from "@/lib/types";
import { SourceNote, fmtPct } from "./helpers";

function fmtDate(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function MarketSection({
  market,
  source,
}: {
  market: NonNullable<ResearchResult["market"]>;
  source: string;
}) {
  const { bars, stats } = market;
  const dates = bars.map((b) => fmtDate(b.dateMs));
  const kdata: [number, number, number, number][] = bars.map((b) => [
    b.open,
    b.close,
    b.low,
    b.high,
  ]);
  const volumes = bars.map((b) => b.volume);

  return (
    <section className="rounded-xl border border-black/5 bg-white p-5">
      <h2 className="text-lg font-semibold">行情特征</h2>
      <p className="text-sm text-zinc-500">市场最近如何定价这家公司？</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="区间收益" value={fmtPct(stats.intervalReturnPct)} />
        <StatCard label="最大回撤" value={stats.maxDrawdownPct == null ? "--" : stats.maxDrawdownPct.toFixed(1) + "%"} />
        <StatCard label="年化波动率" value={stats.volatilityPct == null ? "--" : stats.volatilityPct.toFixed(1) + "%"} />
        <StatCard
          label="区间高低"
          value={
            stats.high == null || stats.low == null
              ? "--"
              : `${stats.low.toFixed(2)} ~ ${stats.high.toFixed(2)}`
          }
        />
      </div>

      <div className="mt-4">
        <EChart option={buildKlineChart({ dates, kdata, volumes })} height={360} />
        <SourceNote source={source} />
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        区间收益、最大回撤与波动率由确定性引擎基于日 K 线计算（前复权）。
      </p>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
