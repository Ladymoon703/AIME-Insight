import { test } from "node:test";
import assert from "node:assert/strict";
import { mockIndicators, mockFinancials } from "../../src/lib/data/mock.ts";

// 净利润现金含量口径：与扶摇真实接口一致（百分比 = 经营现金流净额 / 归母净利润 × 100）
// 真实交叉验证：贵州茅台 2026Q2 act_cash_flow_net=70,690,750,119.06，
// parent_holder_net_profit=44,516,880,421.86，比值×100=158.795%，扶摇返回 net_profit_cash_content=158.79538200。
test("mock 净利润现金含量为百分比口径，且与财报计算一致", () => {
  const thscode = "300750.SZ";
  const fin = mockFinancials(thscode);
  const latest = fin[fin.length - 1];
  const ind = mockIndicators(thscode, "2026-2");
  const cashContent = ind.cashFlow.net_profit_cash_content;

  assert.ok(cashContent != null, "净利润现金含量不应为空");
  // 百分比语义：应远大于 1（若为 ratio 则会接近 1 或小于 1）
  assert.ok(cashContent > 10, `应为百分比而非 ratio，实际 ${cashContent}`);

  const expected =
    ((latest.actCashFlowNet ?? 0) / (latest.parentHolderNetProfit ?? 1)) * 100;
  assert.ok(
    Math.abs(cashContent - expected) < 0.01,
    `净利润现金含量应与 经营现金流/归母净利润×100 一致：${cashContent} vs ${expected}`,
  );
});

test("mock 非 CATL 标的同样使用百分比口径", () => {
  const ind = mockIndicators("600519.SH", "2026-2");
  const cashContent = ind.cashFlow.net_profit_cash_content;
  assert.ok(cashContent != null && cashContent > 10, "应为百分比而非 ratio");
});
