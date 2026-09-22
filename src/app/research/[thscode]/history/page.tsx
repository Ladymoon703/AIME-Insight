import Link from "next/link";
import DataModeBanner from "@/components/DataModeBanner";
import ReRunSection from "@/components/research/ReRunSection";
import {
  getResearch,
  getResearchVersions,
  getLatestSnapshot,
  listResearches,
} from "@/lib/store/researchStore";
import { statusMeta } from "@/lib/ui";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd} ${hh}:${mi}`;
}

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ thscode: string }>;
  searchParams: Promise<{ researchId?: string }>;
}) {
  const { thscode } = await params;
  const sp = await searchParams;

  // 优先使用 searchParams 里的 researchId；否则回退到该 thscode 的最新 research
  let researchId = sp.researchId;
  if (!researchId) {
    const list = listResearches().filter((r) => r.thscode === thscode);
    researchId = list[0]?.researchId;
  }

  const research = researchId ? getResearch(researchId) : null;
  const latest = researchId ? getLatestSnapshot(researchId) : null;
  const versions = researchId ? getResearchVersions(researchId) : [];

  if (!research || !latest || versions.length === 0) {
    return (
      <>
        <DataModeBanner />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-xl font-semibold">还没有保存的研究</h1>
          <p className="mt-2 text-zinc-500">先在公司研究台保存一次研究。</p>
          <Link
            href={`/research/${thscode}`}
            className="mt-6 inline-flex rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            去研究
          </Link>
        </div>
      </>
    );
  }

  const conclusion =
    latest.stateUpdate?.conclusion ?? latest.deepAnalysis?.coreConclusion ?? "";

  return (
    <>
      <DataModeBanner />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400">{research.thscode}</div>
            <h1 className="text-2xl font-semibold">{research.companyName}</h1>
            <p className="mt-1 text-sm text-zinc-500">{research.researchGoal}</p>
          </div>
          <Link
            href={`/research/${thscode}`}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            回到研究台
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-black/5 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">当前研究状态</h2>
            <span className="text-xs text-zinc-400">
              最新版本 v{versions[0].version}
            </span>
          </div>
          {conclusion && (
            <p className="mt-3 text-sm font-medium text-zinc-800">{conclusion}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {latest.currentState.map((s) => {
              const meta = statusMeta(s.status);
              return (
                <span
                  key={s.dimension}
                  className={`inline-flex items-center gap-1 rounded bg-zinc-50 px-2 py-0.5 text-xs ${meta.className}`}
                >
                  <span>{meta.emoji}</span>
                  <span>{s.label}</span>
                  <span className="text-zinc-500">{s.summary}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <ReRunSection researchId={research.id} />
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold">研究历史</h2>
          <div className="mt-3 space-y-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-start gap-3 rounded-xl border border-black/5 bg-white p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                  v{v.version}
                </div>
                <div className="flex-1">
                  <div className="text-xs text-zinc-400">{fmtDate(v.createdAt)}</div>
                  <div className="mt-0.5 text-sm text-zinc-700">{v.conclusion}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.currentState.map((s) => {
                      const meta = statusMeta(s.status);
                      return (
                        <span
                          key={s.dimension}
                          className={`inline-flex items-center gap-0.5 rounded bg-zinc-50 px-1.5 py-0.5 text-[11px] ${meta.className}`}
                        >
                          <span>{meta.emoji}</span>
                          <span>{s.label}:{s.summary}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
