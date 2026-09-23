/**
 * Research / Research State / Research Version 持久化。
 * Research 不按 thscode 唯一：同一公司可有多个研究任务（按 research_goal 区分）。
 * Evidence Snapshot 不可变：版本快照以 JSON 字符串保存，永不 UPDATE，只 INSERT 新版本。
 */
import { getDb, newId, now } from "./db.ts";
import type { ResearchResult, CurrentStateItem } from "@/lib/types";

export interface ResearchListItem {
  researchId: string;
  thscode: string;
  ticker: string;
  companyName: string;
  researchGoal: string;
  timeWindow: string;
  updatedAt: string;
  version: number;
  latest: ResearchResult;
}

function normalizeGoal(goal: string): string {
  const g = (goal ?? "").trim();
  return g.length > 0 ? g : "公司快速研究";
}

/** 校验 ResearchResult 结构，并拒绝非法 Evidence ID 写入 */
export function validateResearchResult(result: ResearchResult): string[] {
  const errors: string[] = [];
  if (!result || !result.company || !result.company.thscode) {
    errors.push("缺少公司信息");
    return errors;
  }
  if (!Array.isArray(result.evidence?.facts)) {
    errors.push("缺少 evidence.facts");
    return errors;
  }
  const validIds = new Set(result.evidence.facts.map((e) => e.id));
  const referenced: string[] = [];
  for (const d of result.dimensionInsights ?? []) {
    referenced.push(
      ...d.supportingEvidenceIds,
      ...d.opposingEvidenceIds,
      ...d.unknownEvidenceIds,
    );
  }
  for (const s of result.deepAnalysis?.sections ?? []) {
    referenced.push(...s.evidenceIds);
  }
  const invalid = referenced.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    errors.push(`非法 Evidence ID: ${[...new Set(invalid)].join(", ")}`);
  }
  return errors;
}

export async function saveResearch(result: ResearchResult): Promise<{
  researchId: string;
  version: number;
}> {
  const errors = validateResearchResult(result);
  if (errors.length > 0) {
    throw new Error("研究快照校验失败：" + errors.join("；"));
  }
  const db = await getDb();
  const ts = now();
  const snapshot = JSON.stringify(result);
  const thscode = result.company.thscode;
  const goal = normalizeGoal(result.researchGoal);

  // 同一 thscode + 相同 research_goal → 同一 Research（新增版本）
  // 不同 research_goal → 新建 Research
  const existingRs = await db.execute({
    sql: "SELECT id FROM researches WHERE thscode = ? AND research_goal = ?",
    args: [thscode, goal],
  });
  const existing = existingRs.rows[0] as unknown as { id: string } | undefined;

  let researchId: string;
  if (existing) {
    researchId = existing.id;
    await db.execute({
      sql: "UPDATE researches SET time_window = ?, updated_at = ? WHERE id = ?",
      args: [result.timeWindow, ts, researchId],
    });
  } else {
    researchId = newId();
    await db.execute({
      sql: "INSERT INTO researches (id, thscode, company_name, ticker, research_goal, time_window, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        researchId,
        thscode,
        result.company.name,
        result.company.ticker,
        goal,
        result.timeWindow,
        ts,
        ts,
      ],
    });
  }

  // 计算下一个版本号
  const vRs = await db.execute({
    sql: "SELECT COALESCE(MAX(version), 0) AS v FROM research_versions WHERE research_id = ?",
    args: [researchId],
  });
  const version = (vRs.rows[0] as unknown as { v: number }).v + 1;

  await db.execute({
    sql: "INSERT INTO research_versions (id, research_id, version, snapshot, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [newId(), researchId, version, snapshot, ts],
  });

  return { researchId, version };
}

export async function listResearches(): Promise<ResearchListItem[]> {
  const db = await getDb();
  const rs = await db.execute(
    "SELECT id, thscode, company_name, ticker, research_goal, time_window, updated_at FROM researches ORDER BY updated_at DESC",
  );
  const rows = rs.rows as unknown as Array<{
    id: string;
    thscode: string;
    company_name: string;
    ticker: string;
    research_goal: string;
    time_window: string;
    updated_at: string;
  }>;

  const list: ResearchListItem[] = [];
  for (const r of rows) {
    const latest = await getLatestSnapshot(r.id);
    if (!latest) continue;
    list.push({
      researchId: r.id,
      thscode: r.thscode,
      ticker: r.ticker,
      companyName: r.company_name,
      researchGoal: r.research_goal,
      timeWindow: r.time_window,
      updatedAt: r.updated_at,
      version: await getVersionCount(r.id),
      latest,
    });
  }
  return list;
}

async function getVersionCount(researchId: string): Promise<number> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT COUNT(*) AS c FROM research_versions WHERE research_id = ?",
    args: [researchId],
  });
  return (rs.rows[0] as unknown as { c: number }).c;
}

export interface ResearchSummary {
  id: string;
  thscode: string;
  companyName: string;
  researchGoal: string;
  timeWindow: string;
}

export async function getResearch(researchId: string): Promise<ResearchSummary | null> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT id, thscode, company_name, research_goal, time_window FROM researches WHERE id = ?",
    args: [researchId],
  });
  const r = rs.rows[0] as unknown as
    | { id: string; thscode: string; company_name: string; research_goal: string; time_window: string }
    | undefined;
  if (!r) return null;
  return {
    id: r.id,
    thscode: r.thscode,
    companyName: r.company_name,
    researchGoal: r.research_goal,
    timeWindow: r.time_window,
  };
}

export async function getResearchVersions(researchId: string): Promise<Array<{
  id: string;
  version: number;
  createdAt: string;
  conclusion: string;
  currentState: CurrentStateItem[];
}>> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT id, version, snapshot, created_at FROM research_versions WHERE research_id = ? ORDER BY version DESC",
    args: [researchId],
  });
  const rows = rs.rows as unknown as Array<{
    id: string;
    version: number;
    snapshot: string;
    created_at: string;
  }>;
  return rows.map((r) => {
    const snap = JSON.parse(r.snapshot) as ResearchResult;
    return {
      id: r.id,
      version: r.version,
      createdAt: r.created_at,
      conclusion:
        snap.stateUpdate?.conclusion ?? snap.deepAnalysis?.coreConclusion ?? "",
      currentState: snap.currentState,
    };
  });
}

export async function getVersionSnapshot(versionId: string): Promise<ResearchResult | null> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT snapshot FROM research_versions WHERE id = ?",
    args: [versionId],
  });
  const row = rs.rows[0] as unknown as { snapshot: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.snapshot) as ResearchResult;
}

export async function getLatestSnapshot(researchId: string): Promise<ResearchResult | null> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT snapshot FROM research_versions WHERE research_id = ? ORDER BY version DESC LIMIT 1",
    args: [researchId],
  });
  const row = rs.rows[0] as unknown as { snapshot: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.snapshot) as ResearchResult;
}

/** 获取指定 researchId 最新的两个版本快照（用于比较） */
export async function getLastTwoSnapshots(
  researchId: string,
): Promise<{ old: ResearchResult | null; new: ResearchResult | null; oldAt: string; newAt: string }> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT snapshot, created_at FROM research_versions WHERE research_id = ? ORDER BY version DESC LIMIT 2",
    args: [researchId],
  });
  const rows = rs.rows as unknown as Array<{ snapshot: string; created_at: string }>;
  if (rows.length === 0) return { old: null, new: null, oldAt: "", newAt: "" };
  const newest = JSON.parse(rows[0].snapshot) as ResearchResult;
  const older = rows.length > 1 ? (JSON.parse(rows[1].snapshot) as ResearchResult) : null;
  return {
    old: older,
    new: newest,
    oldAt: rows.length > 1 ? rows[1].created_at : "",
    newAt: rows[0].created_at,
  };
}
