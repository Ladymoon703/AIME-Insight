import Link from "next/link";
import DataModeBanner from "@/components/DataModeBanner";
import { listResearches } from "@/lib/store/researchStore";
import { statusMeta } from "@/lib/ui";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd} ${hh}:${mi}`;
}

export default async function ResearchListPage() {
  const researches = await listResearches();

  // 按公司分组展示：同一公司可有多个研究目标
  const grouped = new Map<string, typeof researches>();
  for (const r of researches) {
    const key = r.thscode;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  return (
    <>
      <DataModeBanner />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">我的研究</h1>
        <p className="mt-1 text-sm text-zinc-500">
          同一家公司可以有多个研究任务，你保存的是研究状态而不是股票收藏。
        </p>

        {researches.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-black/10 bg-white p-10 text-center">
            <p className="text-zinc-500">还没有研究记录</p>
            <p className="mt-1 text-sm text-zinc-400">
              输入一家你正在关注的公司，开始建立第一份研究。
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90"
            >
              开始研究
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {Array.from(grouped.entries()).map(([thscode, items]) => (
              <div key={thscode}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-800">
                    {items[0].companyName}
                  </span>
                  <span className="text-xs text-zinc-400">{thscode}</span>
                </div>
                <div className="mt-2 space-y-2">
                  {items.map((r) => {
                    const conclusion =
                      r.latest.stateUpdate?.conclusion ??
                      r.latest.deepAnalysis?.coreConclusion ??
                      "暂无结论";
                    const unknownCount = r.latest.evidence.unknown.length;
                    const contradictionCount =
                      r.latest.evidence.contradictory.length;
                    return (
                      <Link
                        key={r.researchId}
                        href={`/research/${r.thscode}/history?researchId=${r.researchId}`}
                        className="block rounded-xl border border-black/5 bg-white p-4 transition-colors hover:border-accent/30"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-zinc-800">
                              {r.researchGoal}
                            </div>
                            <p className="mt-1 text-sm text-zinc-600">
                              {conclusion}
                            </p>
                          </div>
                          <div className="shrink-0 text-right text-xs text-zinc-400">
                            <div>版本 v{r.version}</div>
                            <div className="mt-1">更新 {fmtDate(r.updatedAt)}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {r.latest.currentState.map((s) => {
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

                        {(unknownCount > 0 || contradictionCount > 0) && (
                          <div className="mt-2 text-xs text-zinc-500">
                            {contradictionCount > 0 && (
                              <span className="mr-3 evidence-contradictory">
                                🟠 {contradictionCount} 项矛盾
                              </span>
                            )}
                            {unknownCount > 0 && (
                              <span className="evidence-unknown">
                                ⚪ {unknownCount} 项未知
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
