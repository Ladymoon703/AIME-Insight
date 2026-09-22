import Link from "next/link";
import DataModeBanner from "@/components/DataModeBanner";
import ObservationCheckButton from "@/components/observation/ObservationCheckButton";
import { listObservations } from "@/lib/store/observationStore";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null): string {
  if (!iso) return "从未检查";
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function ObservationsPage() {
  const observations = listObservations();

  return (
    <>
      <DataModeBanner />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">我的观察</h1>
        <p className="mt-1 text-sm text-zinc-500">
          持续关注你希望未来继续验证的研究问题，而不是股票自选。
        </p>

        {observations.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-black/10 bg-white p-10 text-center">
            <p className="text-zinc-500">还没有观察任务</p>
            <p className="mt-1 text-sm text-zinc-400">
              完成一次研究后，可以建立观察持续跟踪关键指标。
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90"
            >
              去研究一家公司
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {observations.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-black/5 bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-800">
                        {o.companyName}
                      </span>
                      <span className="text-xs text-zinc-400">{o.thscode}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-zinc-700">
                      {o.title}
                    </div>
                    {o.description && (
                      <p className="mt-1 text-xs text-zinc-500">{o.description}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-zinc-400">
                    上次检查 {fmtDate(o.lastCheckedAt)}
                  </div>
                </div>

                {o.metrics.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {o.metrics.map((m) => (
                      <span
                        key={m}
                        className="rounded bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                {o.lastResult ? (
                  <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
                    {(o.lastResult as { changesSummary?: string }).changesSummary}
                  </div>
                ) : null}

                <div className="mt-3 flex items-center gap-3">
                  <ObservationCheckButton id={o.id} />
                  <Link
                    href={`/research/${o.thscode}/history?researchId=${o.researchId}`}
                    className="text-sm text-zinc-500 hover:text-accent"
                  >
                    查看研究更新 →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
