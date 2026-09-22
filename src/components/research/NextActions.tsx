import Link from "next/link";

const ACTION_ANCHORS: Record<string, string> = {
  验证盈利质量: "#profit-quality",
  查看同行比较: "#industry",
  解释近期市场表现: "#market",
  查看估值证据: "#valuation",
  查看事件与风险: "#events",
  查看原始证据: "#evidence-board",
};

export default function NextActions({
  actions,
  thscode,
}: {
  actions: string[];
  thscode: string;
}) {
  return (
    <section className="rounded-xl border border-black/5 bg-white p-5">
      <h2 className="text-lg font-semibold">下一步，你想研究什么？</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((a) => {
          const anchor = ACTION_ANCHORS[a];
          if (a === "建立持续观察") {
            return (
              <Link
                key={a}
                href={`/observations?company=${thscode}`}
                className="rounded-lg border border-accent/20 px-4 py-2 text-sm text-accent hover:bg-accent-soft"
              >
                {a}
              </Link>
            );
          }
          if (anchor) {
            return (
              <a
                key={a}
                href={anchor}
                className="rounded-lg border border-black/10 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                {a}
              </a>
            );
          }
          return (
            <span
              key={a}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm text-zinc-500"
            >
              {a}
            </span>
          );
        })}
      </div>
    </section>
  );
}
