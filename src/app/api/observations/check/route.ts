import { runResearch } from "@/lib/agent/research";
import { compareResearch } from "@/lib/agent/update";
import { explainUpdate } from "@/lib/llm/updateExplain";
import { getLatestSnapshot } from "@/lib/store/researchStore";
import {
  getObservation,
  updateObservationCheck,
} from "@/lib/store/observationStore";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return Response.json({ ok: false, error: "缺少 id" }, { status: 400 });
    }
    const obs = await getObservation(body.id);
    if (!obs) {
      return Response.json(
        { ok: false, error: "未找到该观察" },
        { status: 404 },
      );
    }
    const old = await getLatestSnapshot(obs.researchId);
    if (!old) {
      return Response.json(
        { ok: false, error: "该观察尚无对应的已保存研究" },
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
    const changes = compareResearch(old, newResult);
    const explained = await explainUpdate({
      changes,
      companyName: old.company.name,
      oldConclusion: old.stateUpdate?.conclusion ?? "",
      newConclusion: newResult.stateUpdate?.conclusion ?? "",
    });

    const checkedAt = new Date().toISOString();
    await updateObservationCheck(body.id, {
      changesSummary: explained.summary,
      changeCount: changes.length,
      checkedAt,
    });

    return Response.json({
      ok: true,
      checkedAt,
      changes,
      summary: explained.summary,
      llmMode: explained.mode,
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
