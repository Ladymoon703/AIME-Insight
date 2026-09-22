import type { ResearchResult } from "@/lib/types";
import { EvidenceItem, evNum, fmtPct } from "./helpers";

export default function ProfitQualitySection({
  evidence,
  contradiction,
}: {
  evidence: ResearchResult["evidence"];
  contradiction: ResearchResult["contradiction"];
}) {
  const npYoY = evNum(evidence.facts, "net_profit_yoy_growth_ratio");
  const cfYoY = evNum(evidence.facts, "operating_cash_net_yoy_growth_ratio");
  const cashContent = evNum(evidence.facts, "net_profit_cash_content");

  const diverged = contradiction?.detected ?? false;

  return (
    <section className="rounded-xl border border-black/5 bg-white p-5">
      <h2 className="text-lg font-semibold">盈利质量</h2>
      <p className="text-sm text-zinc-500">利润增长是否同步转化为现金创造？</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <NumCard label="净利润同比" value={fmtPct(npYoY)} />
        <NumCard label="经营现金流同比" value={fmtPct(cfYoY)} />
        <NumCard
          label="净利润现金含量"
          value={cashContent == null ? "--" : cashContent.toFixed(2)}
        />
      </div>

      {diverged && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-sm font-medium text-amber-800">
            ⚠️ 发现多维信号分化
          </div>
          <p className="mt-1 text-sm text-amber-700">{contradiction?.description}</p>
          <ul className="mt-2 list-inside list-disc text-xs text-amber-700">
            {contradiction?.possibleReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <div className="text-xs font-medium text-zinc-400">相关证据</div>
        {evidence.contradictory.map((e) => (
          <EvidenceItem key={e.id} e={e} />
        ))}
        {evidence.facts
          .filter((e) => e.metric === "net_profit_cash_content")
          .map((e) => (
            <EvidenceItem key={e.id} e={e} />
          ))}
      </div>
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
