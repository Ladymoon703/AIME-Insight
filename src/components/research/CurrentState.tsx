import type { CurrentStateItem } from "@/lib/types";
import { statusMeta } from "@/lib/ui";

export default function CurrentState({
  items,
  goal,
}: {
  items: CurrentStateItem[];
  goal: string;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">当前研究状态</h2>
        <span className="text-xs text-zinc-400">不是投资评级，反映当前研究结论</span>
      </div>
      <p className="mt-1 text-sm text-zinc-500">{goal}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((it) => {
          const meta = statusMeta(it.status);
          return (
            <div key={it.dimension} className="rounded-xl border border-black/5 bg-white p-3">
              <div className="text-xs text-zinc-400">{it.label}</div>
              <div className={`mt-1 flex items-center gap-1 text-sm font-medium ${meta.className}`}>
                <span>{meta.emoji}</span>
                <span>{it.summary}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
