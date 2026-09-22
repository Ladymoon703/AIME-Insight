import { test } from "node:test";
import assert from "node:assert/strict";
import { __setDbForTesting } from "../../src/lib/store/db.ts";
import {
  saveResearch,
  listResearches,
  getResearchVersions,
  getLatestSnapshot,
  getLastTwoSnapshots,
} from "../../src/lib/store/researchStore.ts";
import {
  createObservation,
  listObservations,
  getObservation,
  updateObservationCheck,
} from "../../src/lib/store/observationStore.ts";
import type { ResearchResult, Evidence } from "../../src/lib/types.ts";

__setDbForTesting(":memory:");

function ev(id: string, value: number | null, evidenceClass: Evidence["evidenceClass"] = "positive"): Evidence {
  return {
    id,
    type: "metric",
    status: "verified",
    evidenceClass,
    factKind: "fact",
    dimension: "financial",
    metric: "m_" + id,
    label: "指标",
    value,
    unit: "%",
    period: null,
    source: "测试",
    updatedAt: null,
    method: "deterministic",
  };
}

function makeResult(
  thscode: string,
  value: number,
  goal = "测试目标",
  evidenceId = "ev_001",
): ResearchResult {
  const facts = [ev(evidenceId, value)];
  return {
    dataMode: "mock",
    company: { thscode, ticker: thscode.split(".")[0], name: "测试公司", exchange: "SH" },
    quote: null,
    researchGoal: goal,
    timeWindow: "60d",
    currentState: [{ dimension: "financial_trend", label: "财务趋势", status: "positive", summary: "改善" }],
    keyChanges: [],
    financial: null,
    valuation: null,
    valuationPeers: null,
    market: null,
    industry: null,
    industryStatus: null,
    events: null,
    evidence: { facts, positive: facts, negative: [], contradictory: [], unknown: [] },
    contradiction: null,
    summary: "测试摘要",
    deepAnalysis: null,
    nextActions: [],
    openQuestions: [],
    nextQuestions: [],
    dimensionInsights: [
      {
        dimension: "financial_trend",
        status: "positive",
        statement: "改善",
        supportingEvidenceIds: [evidenceId],
        opposingEvidenceIds: [],
        unknownEvidenceIds: [],
      },
    ],
    stateUpdate: {
      conclusion: "测试结论",
      positiveSummary: "",
      negativeSummary: "",
      contradictorySummary: "",
      unknownSummary: "",
    },
    sources: [],
    dataStatus: [],
    llmMode: "template",
  };
}

// 1. Research State create/read
test("保存研究后可读取最新快照", () => {
  const thscode = "300001.SZ";
  const { researchId } = saveResearch(makeResult(thscode, 100, "目标A"));
  const latest = getLatestSnapshot(researchId);
  assert.ok(latest);
  assert.equal(latest!.evidence.facts[0].value, 100);
  assert.equal(listResearches().length, 1);
});

// 2. 相同 thscode + 相同 goal → 同一 research，版本递增
test("相同 thscode + 相同 goal 复用同一 Research", () => {
  const thscode = "300002.SZ";
  const r1 = saveResearch(makeResult(thscode, 100, "目标A"));
  const r2 = saveResearch(makeResult(thscode, 200, "目标A"));
  assert.equal(r1.researchId, r2.researchId);
  assert.equal(r2.version, 2);
  assert.equal(getLatestSnapshot(r1.researchId)!.evidence.facts[0].value, 200);
});

// 3. 相同 thscode + 不同 goal → 创建两个 Research
test("相同 thscode + 不同 goal 创建两个 Research", () => {
  const thscode = "300003.SZ";
  const a = saveResearch(makeResult(thscode, 100, "目标A"));
  const b = saveResearch(makeResult(thscode, 100, "目标B"));
  assert.notEqual(a.researchId, b.researchId);
  assert.equal(listResearches().filter((r) => r.thscode === thscode).length, 2);
});

// 4. 两个 Research 各自独立版本号
test("两个 Research 各自独立版本号", () => {
  const thscode = "300004.SZ";
  const a = saveResearch(makeResult(thscode, 1, "目标A"));
  saveResearch(makeResult(thscode, 2, "目标A")); // A -> v2
  const b = saveResearch(makeResult(thscode, 3, "目标B")); // B -> v1
  assert.equal(getResearchVersions(a.researchId).length, 2);
  assert.equal(getResearchVersions(b.researchId).length, 1);
  assert.equal(getResearchVersions(b.researchId)[0].version, 1);
});

// 5. Evidence snapshot 不可变
test("Evidence snapshot 不可变", () => {
  const thscode = "300005.SZ";
  const a = saveResearch(makeResult(thscode, 111, "目标A"));
  saveResearch(makeResult(thscode, 222, "目标A"));
  const { old, new: latest } = getLastTwoSnapshots(a.researchId);
  assert.ok(old);
  assert.equal(old!.evidence.facts[0].value, 111);
  assert.equal(latest!.evidence.facts[0].value, 222);
});

// 6. Research version history
test("研究版本历史列表", () => {
  const thscode = "300006.SZ";
  const a = saveResearch(makeResult(thscode, 1, "目标A"));
  saveResearch(makeResult(thscode, 2, "目标A"));
  const versions = getResearchVersions(a.researchId);
  assert.equal(versions.length, 2);
  assert.equal(versions[0].version, 2);
});

// 7. 非法 Evidence ID 拒绝写入
test("非法 Evidence ID 拒绝写入", () => {
  const r = makeResult("300007.SZ", 1, "目标A", "ev_ok");
  r.dimensionInsights[0].supportingEvidenceIds = ["ev_not_exist"];
  assert.throws(() => saveResearch(r), /非法 Evidence ID/);
});

// 8. Observation 关联 researchId
test("Observation 正确关联对应 researchId", () => {
  const thscode = "300008.SZ";
  const a = saveResearch(makeResult(thscode, 1, "盈利质量观察"));
  const b = saveResearch(makeResult(thscode, 2, "估值观察"));

  const obsA = createObservation({
    researchId: a.researchId,
    thscode,
    companyName: "测试公司",
    title: "持续关注盈利质量",
    description: "验证现金流",
    dimensions: ["profit_quality"],
    metrics: ["净利润同比"],
  });
  assert.equal(obsA.researchId, a.researchId);
  assert.notEqual(obsA.researchId, b.researchId);

  updateObservationCheck(obsA.id, {
    changesSummary: "无明显变化",
    changeCount: 0,
    checkedAt: new Date().toISOString(),
  });
  const got = getObservation(obsA.id);
  assert.ok(got);
  assert.equal(got!.researchId, a.researchId);
  assert.equal((got!.lastResult as { changesSummary: string }).changesSummary, "无明显变化");
  assert.equal(listObservations().length, 1);
});
