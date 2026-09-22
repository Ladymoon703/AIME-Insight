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

function makeResult(thscode: string, value: number, evidenceId = "ev_001"): ResearchResult {
  const facts = [ev(evidenceId, value)];
  return {
    dataMode: "mock",
    company: { thscode, ticker: thscode.split(".")[0], name: "测试公司", exchange: "SH" },
    quote: null,
    researchGoal: "测试目标",
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

// 1/3. Research State create/read + persistence
test("保存研究后可读取最新快照", () => {
  const thscode = "300001.SZ";
  saveResearch(makeResult(thscode, 100));
  const latest = getLatestSnapshot(thscode);
  assert.ok(latest, "应能读取最新快照");
  assert.equal(latest!.evidence.facts[0].value, 100);
  assert.equal(listResearches().length, 1);
});

// 2. Research State update（版本递增）
test("重复保存生成新版本", () => {
  const thscode = "300002.SZ";
  saveResearch(makeResult(thscode, 100));
  const r2 = saveResearch(makeResult(thscode, 200));
  assert.equal(r2.version, 2);
  const latest = getLatestSnapshot(thscode);
  assert.equal(latest!.evidence.facts[0].value, 200);
});

// 5. Evidence snapshot 不可变
test("Evidence snapshot 不可变（旧版本不被新数据覆盖）", () => {
  const thscode = "300003.SZ";
  saveResearch(makeResult(thscode, 111));
  saveResearch(makeResult(thscode, 222));
  const { old, new: latest } = getLastTwoSnapshots(thscode);
  assert.ok(old, "应有旧版本");
  assert.equal(old!.evidence.facts[0].value, 111, "旧快照应保留原值");
  assert.equal(latest!.evidence.facts[0].value, 222);
});

// 14. Research version history
test("研究版本历史列表", () => {
  const thscode = "300004.SZ";
  saveResearch(makeResult(thscode, 1));
  saveResearch(makeResult(thscode, 2));
  const versions = getResearchVersions(thscode);
  assert.equal(versions.length, 2);
  assert.equal(versions[0].version, 2);
});

// 13. 非法 Evidence ID 拒绝写入
test("非法 Evidence ID 拒绝写入", () => {
  const r = makeResult("300005.SZ", 1, "ev_ok");
  r.dimensionInsights[0].supportingEvidenceIds = ["ev_not_exist"];
  assert.throws(() => saveResearch(r), /非法 Evidence ID/);
});

// 4. Observation create/read/update
test("Observation 创建/读取/更新检查", () => {
  const obs = createObservation({
    thscode: "300006.SZ",
    companyName: "测试公司",
    title: "持续关注盈利质量",
    description: "验证现金流",
    dimensions: ["profit_quality"],
    metrics: ["净利润同比", "经营现金流同比"],
  });
  assert.ok(obs.id);
  assert.equal(listObservations().length, 1);

  updateObservationCheck(obs.id, {
    changesSummary: "无明显变化",
    changeCount: 0,
    checkedAt: new Date().toISOString(),
  });
  const got = getObservation(obs.id);
  assert.ok(got);
  assert.equal(got!.lastCheckedAt != null, true);
  assert.equal((got!.lastResult as { changesSummary: string }).changesSummary, "无明显变化");
});
