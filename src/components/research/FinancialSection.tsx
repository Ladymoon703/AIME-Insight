import EChart from "@/components/charts/EChart";
import { buildFinancialLineChart } from "@/lib/charts";
import type { ResearchResult, Evidence } from "@/lib/types";
import { SourceNote, evNum, fmtPct } from "./helpers";
import EvidenceItem from "./EvidenceItem";

export default function FinancialSection({
  financial,
  evidence,
  source,
}: {
  financial: NonNullable<ResearchResult["financial"]>;
  evidence: ResearchResult["evidence"];
  source: string;
}) {
  const revYoY = evNum(evidence.facts, "operating_income_yoy_growth_ratio");
  const npYoY = evNum(evidence.facts, "net_profit_yoy_growth_ratio");
  const grossMargin = evNum(evidence.facts, "sale_gross_margin");
  const roe = evNum(evidence.facts, "index_weighted_avg_roe");

  const observation =
    npYoY != null
      ? `过去多个报告期营业收入与净利润整体保持增长，最新一期净利润同比 ${fmtPct(npYoY)}、营收同比 ${fmtPct(revYoY)}。`
      : "财务数据不足，暂无法形成观察。";

  const relevant = (dims: string[]) =>
    evidence.facts.filter((e) => dims.includes(e.dimension));
  const financialFacts = relevant(["financial", "profit_quality"]);
  const supporting = financialFacts.filter((e) => e.evidenceClass === "positive");
  const contradictory = financialFacts.filter((e) => e.evidenceClass === "contradictory");
  const unknown = financialFacts.filter((e) => e.evidenceClass === "unknown");

  return (
    <section className="rounded-xl border border-black/5 bg-white p-5">
      <h2 className="text-lg font-semibold">经营与财务</h2>
      <p className="text-sm text-zinc-500">收入、利润和盈利能力最近如何变化？</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumCard label="营收同比" value={fmtPct(revYoY)} />
        <NumCard label="净利润同比" value={fmtPct(npYoY)} />
        <NumCard label="毛利率" value={grossMargin == null ? "--" : grossMargin.toFixed(1) + "%"} />
        <NumCard label="ROE" value={roe == null ? "--" : roe.toFixed(1) + "%"} />
      </div>

      <div className="mt-4">
        <EChart
          option={buildFinancialLineChart(financial.chart)}
          height={320}
        />
        <SourceNote source={source} />
      </div>

      <div className="mt-4 rounded-lg bg-accent-soft p-3">
        <div className="text-xs font-medium text-accent">AI 观察</div>
        <p className="mt-1 text-sm text-zinc-700">{observation}</p>
      </div>

      <EvidenceGroup title="支持证据" items={supporting} />
      <EvidenceGroup title="矛盾证据" items={contradictory} />
      <EvidenceGroup title="未知" items={unknown} />
    </section>
  );
}

function NumCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function EvidenceGroup({ title, items }: { title: string; items: Evidence[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="text-xs font-medium text-zinc-400">{title}</div>
      {items.map((e) => (
        <EvidenceItem key={e.id} e={e} />
      ))}
    </div>
  );
}
