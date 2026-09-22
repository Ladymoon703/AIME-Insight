import type { DeepAnalysis } from "@/lib/types";

export default function DeepAnalysisSection({
  deepAnalysis,
}: {
  deepAnalysis: DeepAnalysis | null;
}) {
  if (!deepAnalysis) return null;
  return (
    <section className="rounded-xl border border-black/5 bg-white p-5">
      <details>
        <summary className="cursor-pointer text-lg font-semibold text-accent">
          AI 深度研究（点击展开完整分析）
        </summary>
        <div className="mt-4 space-y-4">
          <div className="rounded-lg bg-accent-soft p-3">
            <div className="text-xs font-medium text-accent">核心结论</div>
            <p className="mt-1 text-sm font-medium text-zinc-800">
              {deepAnalysis.coreConclusion}
            </p>
          </div>
          {deepAnalysis.sections.map((s) => (
            <div key={s.title}>
              <h3 className="text-sm font-semibold text-zinc-800">{s.title}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-600">{s.content}</p>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
