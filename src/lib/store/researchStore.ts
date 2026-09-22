/**
 * Research / Research State / Research Version 持久化。
 * Evidence Snapshot 不可变：版本快照以 JSON 字符串保存，永不 UPDATE，只 INSERT 新版本。
 */
import { getDb, newId, now } from "./db.ts";
import type { ResearchResult, CurrentStateItem } from "@/lib/types";

export interface ResearchVersionRow {
  id: string;
  researchId: string;
  version: number;
  createdAt: string;
  snapshot: ResearchResult;
}

export interface ResearchListItem {
  thscode: string;
  ticker: string;
  companyName: string;
  researchGoal: string;
  timeWindow: string;
  updatedAt: string;
  version: number;
  latest: ResearchResult;
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

export function saveResearch(result: ResearchResult): {
  researchId: string;
  version: number;
} {
  const errors = validateResearchResult(result);
  if (errors.length > 0) {
    throw new Error("研究快照校验失败：" + errors.join("；"));
  }
  const db = getDb();
  const ts = now();
  const snapshot = JSON.stringify(result);

  // upsert research（按 thscode 唯一）
  const existing = db
    .prepare("SELECT id FROM researches WHERE thscode = ?")
    .get(result.company.thscode) as { id: string } | undefined;
  let researchId: string;
  if (existing) {
    researchId = existing.id;
    db.prepare(
      "UPDATE researches SET research_goal = ?, time_window = ?, updated_at = ? WHERE id = ?",
    ).run(result.researchGoal, result.timeWindow, ts, researchId);
  } else {
    researchId = newId();
    db.prepare(
      "INSERT INTO researches (id, thscode, company_name, ticker, research_goal, time_window, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      researchId,
      result.company.thscode,
      result.company.name,
      result.company.ticker,
      result.researchGoal,
      result.timeWindow,
      ts,
      ts,
    );
  }

  // 计算下一个版本号
  const row = db
    .prepare("SELECT COALESCE(MAX(version), 0) AS v FROM research_versions WHERE research_id = ?")
    .get(researchId) as { v: number };
  const version = row.v + 1;

  db.prepare(
    "INSERT INTO research_versions (id, research_id, version, snapshot, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(newId(), researchId, version, snapshot, ts);

  return { researchId, version };
}

export function listResearches(): ResearchListItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, thscode, company_name, ticker, research_goal, time_window, updated_at FROM researches ORDER BY updated_at DESC",
    )
    .all() as Array<{
    id: string;
    thscode: string;
    company_name: string;
    ticker: string;
    research_goal: string;
    time_window: string;
    updated_at: string;
  }>;

  return rows
    .map((r) => {
      const latest = getLatestSnapshot(r.thscode);
      if (!latest) return null;
      return {
        thscode: r.thscode,
        ticker: r.ticker,
        companyName: r.company_name,
        researchGoal: r.research_goal,
        timeWindow: r.time_window,
        updatedAt: r.updated_at,
        version: getVersionCount(r.id),
        latest,
      };
    })
    .filter((x): x is ResearchListItem => x !== null);
}

function getVersionCount(researchId: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS c FROM research_versions WHERE research_id = ?")
    .get(researchId) as { c: number };
  return row.c;
}

export function getResearchVersions(thscode: string): Array<{
  id: string;
  version: number;
  createdAt: string;
  conclusion: string;
  currentState: CurrentStateItem[];
}> {
  const db = getDb();
  const research = db
    .prepare("SELECT id FROM researches WHERE thscode = ?")
    .get(thscode) as { id: string } | undefined;
  if (!research) return [];
  const rows = db
    .prepare(
      "SELECT id, version, snapshot, created_at FROM research_versions WHERE research_id = ? ORDER BY version DESC",
    )
    .all(research.id) as Array<{
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

export function getVersionSnapshot(versionId: string): ResearchResult | null {
  const db = getDb();
  const row = db
    .prepare("SELECT snapshot FROM research_versions WHERE id = ?")
    .get(versionId) as { snapshot: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.snapshot) as ResearchResult;
}

export function getLatestSnapshot(thscode: string): ResearchResult | null {
  const db = getDb();
  const research = db
    .prepare("SELECT id FROM researches WHERE thscode = ?")
    .get(thscode) as { id: string } | undefined;
  if (!research) return null;
  const row = db
    .prepare(
      "SELECT snapshot FROM research_versions WHERE research_id = ? ORDER BY version DESC LIMIT 1",
    )
    .get(research.id) as { snapshot: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.snapshot) as ResearchResult;
}

/** 获取指定 thscode 最新的两个版本快照（用于比较） */
export function getLastTwoSnapshots(
  thscode: string,
): { old: ResearchResult | null; new: ResearchResult | null; oldAt: string; newAt: string } {
  const db = getDb();
  const research = db
    .prepare("SELECT id FROM researches WHERE thscode = ?")
    .get(thscode) as { id: string } | undefined;
  if (!research) return { old: null, new: null, oldAt: "", newAt: "" };
  const rows = db
    .prepare(
      "SELECT snapshot, created_at FROM research_versions WHERE research_id = ? ORDER BY version DESC LIMIT 2",
    )
    .all(research.id) as Array<{ snapshot: string; created_at: string }>;
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
