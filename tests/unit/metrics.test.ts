import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateGrowth,
  calculateReturn,
  calculateMaxDrawdown,
  calculateVolatility,
  calculateTrend,
  calculateNetProfitCashContent,
  calculateRelative,
  formatYuan,
  formatPct,
} from "../../src/lib/engine/metrics.ts";

test("calculateGrowth 正常计算同比", () => {
  assert.equal(calculateGrowth(120, 100), 20);
  assert.equal(calculateGrowth(80, 100), -20);
});

test("calculateGrowth 缺失或除零返回 null", () => {
  assert.equal(calculateGrowth(null, 100), null);
  assert.equal(calculateGrowth(100, null), null);
  assert.equal(calculateGrowth(100, 0), null);
});

test("calculateReturn 计算区间收益", () => {
  assert.equal(calculateReturn([100, 110, 121]), 21);
  assert.equal(calculateReturn([100]), null);
  assert.equal(calculateReturn([]), null);
  // 忽略中间 null
  assert.equal(calculateReturn([100, null, 90]), -10);
});

test("calculateMaxDrawdown 计算最大回撤", () => {
  // 100 -> 120 -> 90 -> 110：峰值 120，回撤到 90 => (120-90)/120 = 25%
  const dd = calculateMaxDrawdown([100, 120, 90, 110]);
  assert.ok(dd !== null && Math.abs(dd - 25) < 1e-9);
});

test("calculateVolatility 恒定序列为 0", () => {
  const v = calculateVolatility([100, 100, 100, 100]);
  assert.equal(v, 0);
});

test("calculateTrend 判断方向", () => {
  assert.equal(calculateTrend([100, 105, 110]), "up");
  assert.equal(calculateTrend([110, 105, 100]), "down");
  assert.equal(calculateTrend([100, 100.5, 101]), "flat");
  assert.equal(calculateTrend([100]), "unknown");
});

test("calculateNetProfitCashContent 计算现金含量", () => {
  assert.equal(calculateNetProfitCashContent(50, 100), 0.5);
  assert.equal(calculateNetProfitCashContent(null, 100), null);
  assert.equal(calculateNetProfitCashContent(50, 0), null);
});

test("calculateRelative 计算相对表现", () => {
  const r = calculateRelative(-8.2, -3.5);
  assert.ok(r !== null && Math.abs(r - -4.7) < 1e-9);
  assert.equal(calculateRelative(null, -3.5), null);
});

test("formatYuan 格式化金额", () => {
  assert.equal(formatYuan(174144000000), "1741.44 亿");
  assert.equal(formatYuan(50000000), "5000.00 万");
  assert.equal(formatYuan(1234), "1234.00");
  assert.equal(formatYuan(null), "--");
});

test("formatPct 格式化百分比", () => {
  assert.equal(formatPct(27.1), "+27.1%");
  assert.equal(formatPct(-8.2), "-8.2%");
  assert.equal(formatPct(null), "--");
});
