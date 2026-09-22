import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectDimensionChanges,
  detectEvidenceChanges,
  compareResearch,
  templateUpdateSummary,
} from "../../src/lib/agent/update.ts";
import type {
  CurrentStateItem,
  Evidence,
  ResearchResult,
} from "../../src/lib/types.ts";

function state(partial: Partial<CurrentStateItem>): CurrentStateItem {
  return {
    dimension: partial.dimension ?? "profit_quality",
    label: partial.label ?? "盈利质量",
    status: partial.status ?? "unknown",
    summary: partial.summary ?? "待观察",
  };
}

let c = 0;
function ev(partial: Partial<Evidence>): Evidence {
  c += 1;
  return {
    id: partial.id ?? `ev_${String(c).padStart(3, "0")}`,
    type: "metric",
    status: partial.status ?? "verified",
    evidenceClass: partial.evidenceClass ?? "neutral",
    factKind: "fact",
    dimension: partial.dimension ?? "financial",
    metric: partial.metric ?? "m",
    label: partial.label ?? "指标",
    value: partial.value ?? null,
    unit: partial.unit ?? "%",
    period: partial.period ?? null,
    source: "测试来源",
    updatedAt: null,
    method: "deterministic",
  };
}

// 7/8. 强化 / 弱化
test("detectDimensionChanges 判断强化与弱化", () => {
  const changes = detectDimensionChanges(
    [state({ dimension: "profit_quality", status: "unknown", summary: "待观察" })],
    [state({ dimension: "profit_quality", status: "positive", summary: "基本同步" })],
  );
  assert.equal(changes[0]?.type, "strengthened");

  const changes2 = detectDimensionChanges(
    [state({ dimension: "market", status: "positive", summary: "改善" })],
    [state({ dimension: "market", status: "negative", summary: "承压" })],
  );
  assert.equal(changes2[0]?.type, "weakened");
});

// 9. 新增矛盾
test("detectDimensionChanges 识别新增矛盾", () => {
  const changes = detectDimensionChanges(
    [state({ dimension: "profit_quality", status: "unknown", summary: "待观察" })],
    [state({ dimension: "profit_quality", status: "contradictory", summary: "分化" })],
  );
  assert.equal(changes[0]?.type, "new_contradiction");
});

// 10. 新增未知
test("detectEvidenceChanges 识别新增未知", () => {
  const changes = detectEvidenceChanges(
    [],
    [ev({ metric: "profit_source", evidenceClass: "unknown", value: null })],
  );
  assert.equal(changes[0]?.type, "new_unknown");
});

// 11. 证据失效/过期
test("detectEvidenceChanges 识别失效证据", () => {
  const changes = detectEvidenceChanges(
    [ev({ metric: "old_metric", evidenceClass: "positive", value: 10 })],
    [],
  );
  assert.equal(changes[0]?.type, "stale");
});

// 12. 失败数据不覆盖旧 verified 状态
test("detectEvidenceChanges 数据失败不判弱化，标记 stale", () => {
  const old = [ev({ metric: "net_profit_yoy", evidenceClass: "positive", value: 23.8, status: "verified" })];
  const nw = [ev({ metric: "net_profit_yoy", evidenceClass: "positive", value: null, status: "failed" })];
  const changes = detectEvidenceChanges(old, nw);
  assert.equal(changes[0]?.type, "stale");
  assert.ok(changes.every((ch) => ch.type !== "weakened"));
});

// 6. 数值变化：正向指标提升 → strengthened
test("detectEvidenceChanges 识别正向指标数值变化", () => {
  const old = [ev({ metric: "net_profit_yoy", evidenceClass: "positive", value: 10 })];
  const nw = [ev({ metric: "net_profit_yoy", evidenceClass: "positive", value: 18 })];
  const changes = detectEvidenceChanges(old, nw);
  assert.equal(changes[0]?.type, "strengthened");
  assert.equal(changes[0]?.oldValue, 10);
  assert.equal(changes[0]?.newValue, 18);
});

// 无变化
test("compareResearch 无变化时返回 no_change", () => {
  const old: ResearchResult = {
    currentState: [state({ dimension: "market", status: "negative", summary: "承压" })],
    evidence: { facts: [ev({ metric: "x", evidenceClass: "positive", value: 5 })], positive: [], negative: [], contradictory: [], unknown: [] },
  } as unknown as ResearchResult;
  const changes = compareResearch(old, JSON.parse(JSON.stringify(old)));
  assert.equal(changes[0]?.type, "no_change");
});

test("templateUpdateSummary 生成变化摘要", () => {
  const summary = templateUpdateSummary([
    { type: "strengthened", dimension: null, metric: null, oldValue: null, newValue: null, description: "", oldEvidenceIds: [], newEvidenceIds: [] },
  ]);
  assert.ok(summary.includes("判断被强化"));
});
