import { createObservation } from "@/lib/store/observationStore";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      thscode?: string;
      companyName?: string;
      title?: string;
      description?: string;
      dimensions?: string[];
      metrics?: string[];
    };
    if (!body.thscode || !body.companyName || !body.title) {
      return Response.json(
        { ok: false, error: "缺少必要字段" },
        { status: 400 },
      );
    }
    const observation = createObservation({
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
