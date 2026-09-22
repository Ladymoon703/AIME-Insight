import { runResearch } from "@/lib/agent/research";
import { compareResearch } from "@/lib/agent/update";
import { explainUpdate } from "@/lib/llm/updateExplain";
import { saveResearch, getLatestSnapshot } from "@/lib/store/researchStore";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { thscode?: string };
    const thscode = body.thscode;
    if (!thscode) {
      return Response.json({ ok: false, error: "缺少 thscode" }, { status: 400 });
    }
    const old = getLatestSnapshot(thscode);
    if (!old) {
      return Response.json(
        { ok: false, error: "未找到已保存的研究" },
        { status: 404 },
      );
    }
    const dims = old.currentState.map((s) => s.dimension);
    const newResult = await runResearch({
      company: old.company,
      goal: old.researchGoal,
      dims,
      timeWindow: old.timeWindow,
    });
    const { version } = saveResearch(newResult);

    const changes = compareResearch(old, newResult);
    const explained = await explainUpdate({
      changes,
      companyName: old.company.name,
      oldConclusion: old.stateUpdate?.conclusion ?? "",
      newConclusion: newResult.stateUpdate?.conclusion ?? "",
    });

    return Response.json({
      ok: true,
      version,
      changes,
      summary: explained.summary,
      llmMode: explained.mode,
      newResult,
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
