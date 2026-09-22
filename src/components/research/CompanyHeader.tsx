import type { Company, Quote, SourceInfo, DataStatus } from "@/lib/types";
import { DATA_STATUS_LABEL } from "@/lib/ui";

function fmtPct(v: number | null): string {
  if (v == null) return "--";
  return (v > 0 ? "+" : "") + v.toFixed(2) + "%";
}

export default function CompanyHeader({
  company,
  quote,
  sources,
  dataStatus,
}: {
  company: Company;
  quote: Quote | null;
  sources: SourceInfo[];
  dataStatus: DataStatus[];
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{company.name}</h1>
            <span className="text-sm text-zinc-400">{company.thscode}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            {company.exchange ? `交易所：${company.exchange}` : ""}
            {company.listDate ? ` · 上市：${company.listDate}` : ""}
          </div>
        </div>

        <div className="text-right">
          {quote ? (
            <>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-2xl font-semibold tabular-nums">
                  {quote.lastPrice?.toFixed(2) ?? "--"}
                </span>
                <span
                  className={`text-sm font-medium tabular-nums ${
                    (quote.priceChange ?? 0) >= 0
                      ? "evidence-positive"
                      : "evidence-negative"
                  }`}
                >
                  {(quote.priceChange ?? 0) >= 0 ? "+" : ""}
                  {quote.priceChange?.toFixed(2) ?? "--"}
                </span>
                <span
                  className={`text-sm font-medium tabular-nums ${
                    (quote.priceChangeRatioPct ?? 0) >= 0
                      ? "evidence-positive"
                      : "evidence-negative"
                  }`}
                >
                  {fmtPct(quote.priceChangeRatioPct)}
                </span>
              </div>
              <div className="mt-1 text-xs text-zinc-400 tabular-nums">
                成交额 {quote.turnover != null ? (quote.turnover / 1e8).toFixed(2) + " 亿" : "--"}
              </div>
            </>
          ) : (
            <div className="text-sm text-zinc-400">行情暂无数据</div>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-black/5 pt-3 text-xs text-zinc-400">
        {sources.length > 0 && (
          <span className="mr-4">数据来源：{sources[0].name}</span>
        )}
        {sources[0]?.updatedAt && <span>数据截至：{sources[0].updatedAt}</span>}
        {dataStatus.length > 0 && (
          <span className="ml-4 text-amber-600">
            {dataStatus.map((s) => DATA_STATUS_LABEL[s] ?? s).join("、")}
          </span>
        )}
      </div>
    </div>
  );
}
