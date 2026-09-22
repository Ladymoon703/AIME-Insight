import DataModeBanner from "@/components/DataModeBanner";
import CompanyHeader from "@/components/research/CompanyHeader";
import CurrentState from "@/components/research/CurrentState";
import KeyChanges from "@/components/research/KeyChanges";
import FinancialSection from "@/components/research/FinancialSection";
import ProfitQualitySection from "@/components/research/ProfitQualitySection";
import ValuationSection from "@/components/research/ValuationSection";
import MarketSection from "@/components/research/MarketSection";
import IndustrySection from "@/components/research/IndustrySection";
import EventsSection from "@/components/research/EventsSection";
import EvidenceBoard from "@/components/research/EvidenceBoard";
import DeepAnalysisSection from "@/components/research/DeepAnalysisSection";
import NextActions from "@/components/research/NextActions";
import { runResearch } from "@/lib/agent/research";
import { resolveByThscode } from "@/lib/agent/planner";

const DEFAULT_DIMS = [
  "business_quality",
  "financial_trend",
  "profit_quality",
  "valuation",
  "market",
  "industry",
  "events",
];

export default async function ResearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ thscode: string }>;
  searchParams: Promise<{ goal?: string; window?: string; dims?: string }>;
}) {
  const { thscode } = await params;
  const sp = await searchParams;
  const goal = sp.goal ?? "";
  const timeWindow = sp.window ?? "60d";
  const dims = (sp.dims ?? "").split(",").filter(Boolean);
  const dimKeys = dims.length > 0 ? dims : DEFAULT_DIMS;
  const has = (k: string) => dimKeys.includes(k);

  const company = await resolveByThscode(thscode);
  const result = await runResearch({ company, goal, dims: dimKeys, timeWindow });
  const source = result.sources[0]?.name ?? "";

  return (
    <>
      <DataModeBanner />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <CompanyHeader
          company={result.company}
          quote={result.quote}
          sources={result.sources}
          dataStatus={result.dataStatus}
        />

        <CurrentState items={result.currentState} goal={result.researchGoal} />

        {result.summary && (
          <section className="rounded-xl border border-black/5 bg-white p-5">
            <h2 className="text-lg font-semibold">AI 研究摘要</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{result.summary}</p>
          </section>
        )}

        <KeyChanges changes={result.keyChanges} />

        {result.financial && has("financial_trend") && (
          <div id="financial">
            <FinancialSection
              financial={result.financial}
              evidence={result.evidence}
              source={source}
            />
          </div>
        )}

        {has("profit_quality") && (
          <div id="profit-quality">
            <ProfitQualitySection
              evidence={result.evidence}
              contradiction={result.contradiction}
            />
          </div>
        )}

        {result.valuation && has("valuation") && (
          <div id="valuation">
            <ValuationSection valuation={result.valuation} />
          </div>
        )}

        {result.market && has("market") && (
          <div id="market">
            <MarketSection market={result.market} source={source} />
          </div>
        )}

        {result.industry && has("industry") && (
          <div id="industry">
            <IndustrySection industry={result.industry} source={source} />
          </div>
        )}

        {has("events") && (
          <div id="events">
            <EventsSection events={result.events} source={source} />
          </div>
        )}

        <div id="evidence-board">
          <EvidenceBoard
            evidence={result.evidence}
            conclusion={result.deepAnalysis?.coreConclusion ?? null}
          />
        </div>

        <DeepAnalysisSection deepAnalysis={result.deepAnalysis} />

        <NextActions actions={result.nextActions} thscode={thscode} />
      </div>
    </>
  );
}
