import EChart from "@/components/charts/EChart";
import { buildPeerBarChart } from "@/lib/charts";
import type { IndustryPosition, Peer } from "@/lib/types";
import { SourceNote } from "./helpers";

function pct(v: number | null): string {
  return v == null ? "--" : (v > 0 ? "+" : "") + v.toFixed(1) + "%";
}

export default function IndustrySection({
  industry,
  source,
}: {
  industry: IndustryPosition;
  source: string;
}) {
  const peers = industry.peers;
  const names = peers.map((p) => p.name);
  const roes = peers.map((p) => p.roe);

  return (
    <section className="rounded-xl border border-black/5 bg-white p-5">
      <h2 className="text-lg font-semibold">行业位置</h2>
      <p className="text-sm text-zinc-500">放到行业里，它处于什么位置？</p>

      <div className="mt-4">
        <div className="mb-1 text-xs font-medium text-zinc-400">ROE 对比</div>
        <EChart
          option={buildPeerBarChart({ metricLabel: "ROE", unit: "%", names, values: roes })}
          height={Math.max(180, peers.length * 44 + 60)}
        />
        <SourceNote source={source} />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs text-zinc-400">
              <th className="py-2 pr-3 font-medium">公司</th>
              <th className="py-2 pr-3 font-medium">ROE</th>
              <th className="py-2 pr-3 font-medium">营收增速</th>
              <th className="py-2 pr-3 font-medium">净利率</th>
              <th className="py-2 pr-3 font-medium">PE-TTM</th>
              <th className="py-2 font-medium">区间涨跌幅</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p) => (
              <PeerRow key={p.thscode} p={p} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PeerRow({ p }: { p: Peer }) {
  return (
    <tr className="border-b border-black/5">
      <td className="py-2 pr-3 font-medium text-zinc-800">{p.name}</td>
      <td className="py-2 pr-3 tabular-nums">{p.roe == null ? "--" : p.roe.toFixed(1) + "%"}</td>
      <td className="py-2 pr-3 tabular-nums">{pct(p.revenueGrowth)}</td>
      <td className="py-2 pr-3 tabular-nums">{p.netMargin == null ? "--" : p.netMargin.toFixed(1) + "%"}</td>
      <td className="py-2 pr-3 tabular-nums">{p.peTtm == null ? "--" : p.peTtm.toFixed(1) + "x"}</td>
      <td className="py-2 tabular-nums">{pct(p.intervalReturn)}</td>
    </tr>
  );
}
