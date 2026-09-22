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
