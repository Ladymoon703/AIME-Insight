import type { ResearchEvent } from "@/lib/types";

export default function EventsSection({
  events,
  source,
}: {
  events: ResearchEvent[] | null;
  source: string;
}) {
  return (
    <section className="rounded-xl border border-black/5 bg-white p-5">
      <h2 className="text-lg font-semibold">事件与风险</h2>
      <p className="text-sm text-zinc-500">最近有哪些重要信息可能改变研究判断？</p>

      {!events || events.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-black/10 bg-zinc-50 p-4 text-sm text-zinc-500">
          <div className="font-medium text-zinc-700">暂无事件数据</div>
          <p className="mt-1">
            公告、新闻与研报需通过 iFinD MCP 接入，当前未接入，因此事件与风险维度暂无法完整验证，不生成结论。
          </p>
          <p className="mt-1 text-xs text-zinc-400">数据来源：{source}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {events.map((e) => (
            <div key={e.id} className="relative border-l-2 border-black/10 pl-4">
              <div className="flex items-center gap-2">
                <span className="text-xs tabular-nums text-zinc-400">{e.date}</span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                  {e.type}
                </span>
              </div>
              <div className="mt-1 text-sm font-medium text-zinc-800">{e.title}</div>
              {e.fact && (
                <div className="mt-1 text-sm text-zinc-600">
                  <span className="text-xs font-medium text-zinc-400">事实 · </span>
                  {e.fact}
                </div>
              )}
              {e.possibleImpact && (
                <div className="mt-1 text-sm text-zinc-600">
                  <span className="text-xs font-medium text-zinc-400">可能影响 · </span>
                  {e.possibleImpact}
                </div>
              )}
              {e.unknown && (
                <div className="mt-1 text-sm text-zinc-500">
                  <span className="text-xs font-medium text-zinc-400">未知 · </span>
                  {e.unknown}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
