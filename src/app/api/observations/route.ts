import { createObservation } from "@/lib/store/observationStore";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      researchId?: string;
      thscode?: string;
      companyName?: string;
      title?: string;
      description?: string;
      dimensions?: string[];
      metrics?: string[];
    };
    if (!body.researchId || !body.thscode || !body.companyName || !body.title) {
      return Response.json(
        { ok: false, error: "缺少必要字段（researchId/thscode/companyName/title）" },
        { status: 400 },
      );
    }
    const observation = await createObservation({
      researchId: body.researchId,
      thscode: body.thscode,
      companyName: body.companyName,
      title: body.title,
      description: body.description ?? "",
      dimensions: body.dimensions ?? [],
      metrics: body.metrics ?? [],
    });
    return Response.json({ ok: true, observation });
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
