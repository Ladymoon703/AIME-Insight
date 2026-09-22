/**
 * Observation 持续观察持久化。
 * Observation ≠ 自选股：它保存「我希望未来继续验证的研究问题」，并通过 researchId 关联到具体 Research。
 */
import { getDb, newId, now } from "./db.ts";

export interface ObservationRow {
  id: string;
  researchId: string;
  thscode: string;
  companyName: string;
  title: string;
  description: string;
  dimensions: string[];
  metrics: string[];
  createdAt: string;
  updatedAt: string;
  lastCheckedAt: string | null;
  lastResult: unknown | null;
}

export function createObservation(input: {
  researchId: string;
  thscode: string;
  companyName: string;
  title: string;
  description: string;
  dimensions: string[];
  metrics: string[];
}): ObservationRow {
  const db = getDb();
  const id = newId();
  const ts = now();
  db.prepare(
    "INSERT INTO observations (id, research_id, thscode, company_name, title, description, dimensions, metrics, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    id,
    input.researchId,
    input.thscode,
    input.companyName,
    input.title,
    input.description,
    JSON.stringify(input.dimensions),
    JSON.stringify(input.metrics),
    ts,
    ts,
  );
  return {
    id,
    researchId: input.researchId,
    thscode: input.thscode,
    companyName: input.companyName,
    title: input.title,
    description: input.description,
    dimensions: input.dimensions,
    metrics: input.metrics,
    createdAt: ts,
    updatedAt: ts,
    lastCheckedAt: null,
    lastResult: null,
  };
}

function rowToObservation(r: Record<string, unknown>): ObservationRow {
  return {
    id: r.id as string,
    researchId: r.research_id as string,
    thscode: r.thscode as string,
    companyName: r.company_name as string,
    title: r.title as string,
    description: (r.description as string) ?? "",
    dimensions: JSON.parse((r.dimensions as string) || "[]") as string[],
    metrics: JSON.parse((r.metrics as string) || "[]") as string[],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    lastCheckedAt: (r.last_checked_at as string) ?? null,
    lastResult: r.last_result ? JSON.parse(r.last_result as string) : null,
  };
}

export function listObservations(): ObservationRow[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM observations ORDER BY updated_at DESC")
    .all() as Array<Record<string, unknown>>;
  return rows.map(rowToObservation);
}

export function getObservation(id: string): ObservationRow | null {
  const db = getDb();
  const r = db
    .prepare("SELECT * FROM observations WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  if (!r) return null;
  return rowToObservation(r);
}

/** 更新一次「检查最新情况」的结果 */
export function updateObservationCheck(
  id: string,
  result: { changesSummary: string; changeCount: number; checkedAt: string },
): void {
  const db = getDb();
  const ts = now();
  db.prepare(
    "UPDATE observations SET last_checked_at = ?, last_result = ?, updated_at = ? WHERE id = ?",
  ).run(ts, JSON.stringify(result), ts, id);
}
