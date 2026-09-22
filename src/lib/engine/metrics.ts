/**
 * Deterministic Metric Engine — 所有关键金融计算必须由本引擎完成，
 * LLM 不得自行计算同比/环比/收益率/回撤/波动率/排名/分位数。
 * 全部为纯函数，可独立测试。
 */

/** 同比/环比增长率（百分比数值），任一侧缺失或除数为 0 返回 null */
export function calculateGrowth(
  current: number | null,
  previous: number | null,
): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/** 同比 */
export const calculateYoY = calculateGrowth;
/** 环比 */
export const calculateQoQ = calculateGrowth;

/** 区间收益（百分比数值），首尾任一缺失返回 null */
export function calculateReturn(closes: (number | null)[]): number | null {
  const valid = closes.filter((v): v is number => v != null);
  if (valid.length < 2) return null;
  const first = valid[0];
  const last = valid[valid.length - 1];
  if (first === 0) return null;
  return ((last - first) / first) * 100;
}

/** 最大回撤（百分比数值，取正值表示回撤幅度） */
export function calculateMaxDrawdown(closes: (number | null)[]): number | null {
  const valid = closes.filter((v): v is number => v != null);
  if (valid.length < 2) return null;
  let peak = valid[0];
  let maxDd = 0;
  for (const p of valid) {
    if (p > peak) peak = p;
    const dd = (peak - p) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd * 100;
}

/** 波动率（年化，百分比数值），基于日对数收益率 */
export function calculateVolatility(
  closes: (number | null)[],
  periodsPerYear = 252,
): number | null {
  const valid = closes.filter((v): v is number => v != null);
  if (valid.length < 3) return null;
  const returns: number[] = [];
  for (let i = 1; i < valid.length; i++) {
    if (valid[i - 1] > 0 && valid[i] > 0) {
      returns.push(Math.log(valid[i] / valid[i - 1]));
    }
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - mean) * (b - mean), 0) /
    (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(periodsPerYear) * 100;
}

export type Trend = "up" | "down" | "flat" | "unknown";

/** 简单趋势判断：比较首尾有效值 */
export function calculateTrend(values: (number | null)[]): Trend {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length < 2) return "unknown";
  const first = valid[0];
  const last = valid[valid.length - 1];
  const rel = (last - first) / Math.max(Math.abs(first), 1e-9);
  if (rel > 0.03) return "up";
  if (rel < -0.03) return "down";
  return "flat";
}

/** 净利润现金含量 = 经营现金流净额 / 净利润（比率，可 >1 或为负） */
export function calculateNetProfitCashContent(
  operatingCashFlow: number | null,
  netProfit: number | null,
): number | null {
  if (operatingCashFlow == null || netProfit == null || netProfit === 0)
    return null;
  return operatingCashFlow / netProfit;
}

/** 相对表现：公司收益 - 基准收益（百分点差值） */
export function calculateRelative(
  companyPct: number | null,
  benchmarkPct: number | null,
): number | null {
  if (companyPct == null || benchmarkPct == null) return null;
  return companyPct - benchmarkPct;
}

// ---------------- 格式化 ----------------

/** 金额格式化：>=1亿 用「亿」，>=1万 用「万」，否则原值 */
export function formatYuan(value: number | null, digits = 2): string {
  if (value == null) return "--";
  const abs = Math.abs(value);
  if (abs >= 1e8) return (value / 1e8).toFixed(digits) + " 亿";
  if (abs >= 1e4) return (value / 1e4).toFixed(digits) + " 万";
  return value.toFixed(digits);
}

export function formatPct(value: number | null, digits = 1): string {
  if (value == null) return "--";
  const sign = value > 0 ? "+" : "";
  return sign + value.toFixed(digits) + "%";
}

export function formatRatio(value: number | null, digits = 2): string {
  if (value == null) return "--";
  return value.toFixed(digits) + "x";
}

export function formatSignedNumber(value: number | null, digits = 1): string {
  if (value == null) return "--";
  const sign = value > 0 ? "+" : "";
  return sign + value.toFixed(digits);
}
