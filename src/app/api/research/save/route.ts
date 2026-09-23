import { saveResearch } from "@/lib/store/researchStore";
import type { ResearchResult } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { result?: ResearchResult };
    if (!body.result) {
      return Response.json({ ok: false, error: "缺少 result" }, { status: 400 });
    }
    const { researchId, version } = await saveResearch(body.result);
    return Response.json({ ok: true, researchId, version });
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message },
      { status: 400 },
    );
  }
}
