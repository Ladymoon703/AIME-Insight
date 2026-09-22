import type { KeyChange } from "@/lib/types";

export default function KeyChanges({ changes }: { changes: KeyChange[] }) {
  if (changes.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold">最近发生了什么？</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {changes.map((c) => (
          <div key={c.title} className="rounded-xl border border-black/5 bg-white p-3">
            <div className="text-xs text-zinc-400">{c.title}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-800">
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
