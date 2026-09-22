import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEvidence,
  classifyGrowth,
  detectDivergence,
  sourceName,
} from "../../src/lib/engine/evidence.ts";

test("createEvidence 生成完整证据对象", () => {
  const ev = createEvidence({
    evidenceClass: "positive",
    factKind: "fact",
    dimension: "financial",
    metric: "net_profit_yoy",
    label: "净利润同比",
    value: 27.1,
    unit: "%",
    period: "2026Q2",
    source: "扶摇金融数据 API",
  });
  assert.ok(ev.id.startsWith("ev_"));
  assert.equal(ev.evidenceClass, "positive");
  assert.equal(ev.factKind, "fact");
  assert.equal(ev.status, "verified");
  assert.equal(ev.method, "deterministic");
});

test("classifyGrowth 按方向分类", () => {
  assert.equal(classifyGrowth(27.1), "positive");
  assert.equal(classifyGrowth(-8.2), "negative");
  assert.equal(classifyGrowth(null), "unknown");
  // 反向指标：估值过高视为负面
  assert.equal(classifyGrowth(50, false), "negative");
  assert.equal(classifyGrowth(-5, false), "positive");
});

test("detectDivergence 识别多维信号分化", () => {
  // 利润上行 + 现金流走平 + 价格下跌 => 分化
  assert.equal(
    detectDivergence({
      netProfitTrend: "up",
      cashFlowTrend: "flat",
      priceReturnPct: -8.2,
    }),
    true,
  );
  // 全部同步上行 => 无分化
  assert.equal(
    detectDivergence({
      netProfitTrend: "up",
      cashFlowTrend: "up",
      priceReturnPct: 5,
    }),
    false,
  );
});

test("sourceName 演示数据必须明确标识", () => {
  assert.equal(sourceName("live", "扶摇金融数据 API"), "扶摇金融数据 API");
  assert.equal(sourceName("mock", "扶摇金融数据 API"), "扶摇金融数据 API（演示数据）");
});

test("unverified 证据默认 status 为 missing，而非 verified", () => {
  const ev = createEvidence({
    evidenceClass: "unknown",
    factKind: "unverified",
    dimension: "profit_quality",
    metric: "profit_source",
    label: "利润增长来源",
    value: null,
    unit: "",
    source: "扶摇金融数据 API",
    method: "llm",
  });
  assert.equal(ev.evidenceClass, "unknown");
  assert.equal(ev.factKind, "unverified");
  assert.equal(ev.status, "missing");
  assert.equal(ev.value, null);
});

test("unverified 证据显式指定 status 时以显式值为准", () => {
  const ev = createEvidence({
    evidenceClass: "unknown",
    factKind: "unverified",
    dimension: "events",
    metric: "events",
    label: "公告/新闻",
    value: null,
    unit: "",
    source: "扶摇金融数据 API",
    status: "failed",
  });
  assert.equal(ev.status, "failed");
});

test("contradictory 证据是确定性比较（fact + deterministic + 双值表述）", () => {
  const ev = createEvidence({
    evidenceClass: "contradictory",
    factKind: "fact",
    dimension: "profit_quality",
    metric: "profit_cash_divergence",
    label: "利润增速明显高于现金流增速",
    value: "23.8% vs 4.7%",
    unit: "",
    source: "扶摇金融数据 API",
    method: "deterministic",
  });
  assert.equal(ev.evidenceClass, "contradictory");
  assert.equal(ev.factKind, "fact");
  assert.equal(ev.method, "deterministic");
  assert.equal(ev.status, "verified");
  // 值是两个已验证指标的确定性比较，而非无法解释的字段
  assert.match(ev.value as string, /vs/);
});
