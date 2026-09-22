import Link from "next/link";
import { getTodayWorthResearching } from "@/lib/home";

export default function TodayWorthResearching() {
  const cards = getTodayWorthResearching();
  return (
    <section className="mx-auto mt-12 max-w-6xl px-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">今日值得研究</h2>
        <span className="text-xs text-zinc-400">发现变化，而不是浏览更多信息</span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.id}
            className="flex flex-col rounded-xl border border-black/5 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-800">
                {c.companyName}
              </span>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                演示
              </span>
            </div>
            <div className="mt-2 text-base font-semibold text-zinc-900">
              {c.changeTitle}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.keyNumbers.map((n) => (
                <div
                  key={n.label}
                  className="rounded-lg bg-zinc-50 px-2.5 py-1.5"
                >
                  <div className="text-[10px] text-zinc-400">{n.label}</div>
                  <div className="text-sm font-semibold text-zinc-800">
                    {n.value}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 flex-1 text-xs leading-5 text-zinc-500">{c.why}</p>
            <Link
              href={`/map?q=${encodeURIComponent(c.query)}`}
              className="mt-4 inline-flex items-center justify-center rounded-lg border border-accent/20 px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
            >
              查看变化 →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
