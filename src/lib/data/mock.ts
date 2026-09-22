/**
 * 演示数据（Mock / Fixture）。
 * 仅用于：未配置 FUYAO_API_KEY 时的开发与降级模式。
 * 所有由本模块产生的数据，其 source 都会被标注「（演示数据）」，
 * 严禁伪装成扶摇 / iFinD 真实数据。真实数据接入后本模块不再被调用。
 */
import type {
  Company,
  Quote,
  PriceBar,
  FinancialPeriod,
  FinancialIndicatorReport,
  Valuation,
  Peer,
  ResearchEvent,
} from "@/lib/types";

// ---------------- 标的注册表 ----------------

interface MockCompanyMeta {
  thscode: string;
  ticker: string;
  name: string;
  exchange: string;
  industry: string;
}

const MOCK_COMPANIES: MockCompanyMeta[] = [
  { thscode: "300750.SZ", ticker: "300750", name: "宁德时代", exchange: "SZ", industry: "电力设备" },
  { thscode: "600519.SH", ticker: "600519", name: "贵州茅台", exchange: "SH", industry: "食品饮料" },
  { thscode: "000858.SZ", ticker: "000858", name: "五粮液", exchange: "SZ", industry: "食品饮料" },
  { thscode: "002594.SZ", ticker: "002594", name: "比亚迪", exchange: "SZ", industry: "汽车" },
];

const PEERS: Record<string, string[]> = {
  "300750.SZ": ["002594.SZ", "300014.SZ", "002812.SZ", "300207.SZ"],
  "600519.SH": ["000858.SZ", "000568.SZ", "600809.SH", "603369.SH"],
};

const PEER_META: MockCompanyMeta[] = [
  { thscode: "300014.SZ", ticker: "300014", name: "亿纬锂能", exchange: "SZ", industry: "电力设备" },
  { thscode: "002812.SZ", ticker: "002812", name: "恩捷股份", exchange: "SZ", industry: "电力设备" },
  { thscode: "300207.SZ", ticker: "300207", name: "欣旺达", exchange: "SZ", industry: "电力设备" },
  { thscode: "000568.SZ", ticker: "000568", name: "泸州老窖", exchange: "SZ", industry: "食品饮料" },
  { thscode: "600809.SH", ticker: "600809", name: "山西汾酒", exchange: "SH", industry: "食品饮料" },
  { thscode: "603369.SH", ticker: "603369", name: "今世缘", exchange: "SH", industry: "食品饮料" },
];

function findMeta(thscode: string): MockCompanyMeta {
  return (
    MOCK_COMPANIES.find((c) => c.thscode === thscode) ??
    PEER_META.find((c) => c.thscode === thscode) ?? {
      thscode,
      ticker: thscode.split(".")[0],
      name: thscode,
      exchange: thscode.split(".")[1],
      industry: "其他",
    }
  );
}

export function mockSearch(q: string): Company[] {
  const kw = q.trim().toUpperCase();
  return MOCK_COMPANIES.filter(
    (c) =>
      c.name.includes(q.trim()) ||
      c.ticker.includes(kw) ||
      c.thscode.toUpperCase().includes(kw),
  ).map(toCompany);
}

function toCompany(m: MockCompanyMeta): Company {
  return { thscode: m.thscode, ticker: m.ticker, name: m.name, exchange: m.exchange };
}

// ---------------- 伪随机序列（确定性，可复现） ----------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function tradingDays(startMs: number, endMs: number): number[] {
  const days: number[] = [];
  const d = new Date(startMs);
  while (d.getTime() <= endMs) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(d.getTime());
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// ---------------- 行情 / K 线 ----------------

const DEMO_BASE_PRICE: Record<string, number> = {
  "300750.SZ": 212,
  "600519.SH": 1280,
  "000858.SZ": 138,
  "002594.SZ": 265,
};

export function mockQuote(thscode: string): Quote {
  const base = DEMO_BASE_PRICE[thscode] ?? 50;
  const rand = seededRandom(hash(thscode));
  const changePct = -1.2 - rand() * 3; // 演示：近期偏弱
  const last = base;
  const prev = last / (1 + changePct / 100);
  return {
    lastPrice: round(last),
    priceChange: round(last - prev),
    priceChangeRatioPct: round(changePct),
    openPrice: round(prev * (1 + (rand() - 0.5) * 0.01)),
    highPrice: round(last * (1 + rand() * 0.02)),
    lowPrice: round(last * (1 - rand() * 0.02)),
    prevPrice: round(prev),
    volume: Math.round(1e7 + rand() * 8e7),
    turnover: Math.round((1e9 + rand() * 2e10) / 100) * 100,
  };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h || 1;
}

export function mockHistorical(
  thscode: string,
  startMs: number,
  endMs: number,
): PriceBar[] {
  const base = DEMO_BASE_PRICE[thscode] ?? 50;
  const rand = seededRandom(hash(thscode + ":hist"));
  const days = tradingDays(startMs, endMs);
  // 演示：整体下行趋势（用于「行情承压」故事）
  const drift = -0.0018;
  let price = base * 1.12;
  return days.map((ms) => {
    const noise = (rand() - 0.5) * 0.03;
    const open = price;
    const close = Math.max(0.01, price * (1 + drift + noise));
    const high = Math.max(open, close) * (1 + rand() * 0.012);
    const low = Math.min(open, close) * (1 - rand() * 0.012);
    price = close;
    const volume = Math.round((0.6 + rand()) * 3e7);
    return {
      dateMs: ms,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume,
      turnover: round(volume * close),
    };
  });
}

// ---------------- 财务报表（累计口径） ----------------

interface QuarterSpec {
  fy: number;
  period: string;
  revenue: number; // 累计
  netProfit: number; // 累计
  cashFlow: number; // 累计经营现金流净额
  assets: number;
  equity: number;
  debt: number;
}

/** 演示：宁德时代——利润上行、经营现金流基本走平（制造背离） */
const CATL_QUARTERS: QuarterSpec[] = [
  { fy: 2024, period: "Q3", revenue: 2590, netProfit: 360, cashFlow: 480, assets: 7100, equity: 2200, debt: 4600 },
  { fy: 2024, period: "Q4", revenue: 3620, netProfit: 507, cashFlow: 970, assets: 7300, equity: 2350, debt: 4650 },
  { fy: 2025, period: "Q1", revenue: 850, netProfit: 120, cashFlow: 130, assets: 7450, equity: 2430, debt: 4700 },
  { fy: 2025, period: "Q2", revenue: 1830, netProfit: 265, cashFlow: 320, assets: 7600, equity: 2520, debt: 4780 },
  { fy: 2025, period: "Q3", revenue: 2980, netProfit: 428, cashFlow: 545, assets: 7800, equity: 2630, debt: 4900 },
  { fy: 2025, period: "Q4", revenue: 4160, netProfit: 590, cashFlow: 990, assets: 8100, equity: 2780, debt: 5050 },
  { fy: 2026, period: "Q1", revenue: 1010, netProfit: 148, cashFlow: 135, assets: 8300, equity: 2890, debt: 5120 },
  { fy: 2026, period: "Q2", revenue: 2190, netProfit: 328, cashFlow: 335, assets: 8500, equity: 3000, debt: 5200 },
];

function periodEndMs(fy: number, period: string): number {
  const map: Record<string, [number, number]> = {
    Q1: [2, 31],
    Q2: [5, 30],
    Q3: [8, 30],
    Q4: [11, 31],
  };
  const [m, d] = map[period] ?? map.Q4;
  return new Date(fy, m, d).getTime();
}

function toFinancialPeriod(q: QuarterSpec): FinancialPeriod {
  return {
    fiscalYear: q.fy,
    fiscalPeriod: q.period,
    periodEndMs: periodEndMs(q.fy, q.period),
    reportDateMs: periodEndMs(q.fy, q.period),
    operatingIncome: q.revenue * 1e8,
    operatingCosts: q.revenue * 0.72 * 1e8,
    netProfit: q.netProfit * 1e8,
    parentHolderNetProfit: q.netProfit * 0.98 * 1e8,
    basicEps: round((q.netProfit * 1e8) / 4.4e9, 2),
    actCashFlowNet: q.cashFlow * 1e8,
    assetsTotal: q.assets * 1e8,
    holderEquityTotal: q.equity * 1e8,
    totalDebt: q.debt * 1e8,
  };
}

export function mockFinancials(thscode: string): FinancialPeriod[] {
  if (thscode === "300750.SZ") return CATL_QUARTERS.map(toFinancialPeriod);
  // 其他标的：按比例生成一个温和上行序列
  const scale = thscode === "600519.SH" ? 0.4 : 0.25;
  return CATL_QUARTERS.map((q) =>
    toFinancialPeriod({
      ...q,
      revenue: q.revenue * scale,
      netProfit: q.netProfit * scale * 1.1,
      cashFlow: q.cashFlow * scale,
      assets: q.assets * scale,
      equity: q.equity * scale,
      debt: q.debt * scale,
    }),
  );
}

// ---------------- 财务指标 ----------------

/** 返回五类指标。演示：利润增速高、现金流增速低（背离）。 */
export function mockIndicators(
  thscode: string,
  report: string,
): FinancialIndicatorReport {
  const isCATL = thscode === "300750.SZ";
  const revenueYoY = isCATL ? 19.7 : 12.5;
  const netProfitYoY = isCATL ? 23.8 : 15.2;
  const cashFlowYoY = isCATL ? 4.7 : 8.0; // 现金流几乎走平
  return {
    report,
    growth: {
      operating_income_yoy_growth_ratio: revenueYoY,
      net_profit_yoy_growth_ratio: netProfitYoY,
      operating_profit_yoy_growth_ratio: netProfitYoY - 1.5,
      total_assets_growth_ratio: 8.4,
    },
    profitability: {
      sale_gross_margin: isCATL ? 24.6 : 48.2,
      sale_net_interest_ratio: isCATL ? 15.0 : 30.1,
      index_weighted_avg_roe: isCATL ? 21.3 : 26.5,
      index_deduct_weighted_avg_roe: isCATL ? 19.8 : 25.1,
      total_assets_net_ratio: isCATL ? 9.2 : 18.4,
    },
    solvency: {
      current_ratio: 1.6,
      quick_ratio: 1.2,
      assets_debt_ratio: isCATL ? 61.2 : 25.8,
      cash_ratio: 0.8,
    },
    operation: {
      total_assets_turnover_ratio: 0.52,
      inventory_turnover_ratio: 4.1,
      current_assets_turnover_ratio: 0.9,
      receive_account_turnover_ratio: 5.2,
    },
    cashFlow: {
      net_profit_cash_content: isCATL ? 1.02 : 1.25,
      operating_cash_net_yoy_growth_ratio: cashFlowYoY,
      cash_operating_index: 0.95,
      operating_cash_flow_net_divide_income: isCATL ? 0.15 : 0.4,
    },
  };
}

// ---------------- 估值 ----------------

export function mockValuation(thscode: string): Valuation {
  const meta = findMeta(thscode);
  const isCATL = thscode === "300750.SZ";
  return {
    thscode,
    name: meta.name,
    peTtm: isCATL ? 32.6 : 21.4,
    peMrq: isCATL ? 31.2 : 20.9,
    pbMrq: isCATL ? 5.4 : 7.2,
    psTtm: isCATL ? 4.8 : 10.3,
    pcfTtm: isCATL ? 28.1 : 19.8,
  };
}

export function mockPeers(thscode: string): Peer[] {
  const meta = findMeta(thscode);
  const self = mockValuation(thscode);
  const selfInd = mockIndicators(thscode, "2026-2");
  const list: Peer[] = [
    {
      thscode,
      ticker: meta.ticker,
      name: meta.name,
      roe: selfInd.profitability.index_weighted_avg_roe,
      revenueGrowth: selfInd.growth.operating_income_yoy_growth_ratio,
      netMargin: selfInd.profitability.sale_net_interest_ratio,
      peTtm: self.peTtm,
      intervalReturn: -8.2,
    },
  ];
  const peers = PEERS[thscode] ?? ["002594.SZ", "300014.SZ", "002812.SZ"];
  peers.forEach((p) => {
    const pm = findMeta(p);
    const rand = seededRandom(hash(p));
    list.push({
      thscode: p,
      ticker: pm.ticker,
      name: pm.name,
      roe: round(10 + rand() * 18),
      revenueGrowth: round(-5 + rand() * 30),
      netMargin: round(5 + rand() * 20),
      peTtm: round(15 + rand() * 40),
      intervalReturn: round(-15 + rand() * 20),
    });
  });
  return list;
}

export function mockEvents(thscode: string): ResearchEvent[] {
  const meta = findMeta(thscode);
  return [
    {
      id: "evt_1",
      date: "2026-08-25",
      type: "财报",
      title: `${meta.name}发布 2026 年半年度报告`,
      fact: "营业收入与净利润同比保持增长，经营活动现金流净额增速低于净利润增速。",
      possibleImpact: "影响盈利质量与估值判断。",
      unknown: "利润增长的具体来源结构仍需进一步验证。",
      source: "公司公告（演示数据）",
    },
    {
      id: "evt_2",
      date: "2026-06-30",
      type: "行业",
      title: "行业竞争格局与价格变化",
      fact: "行业整体价格中枢有所下移，头部公司份额保持稳定。",
      possibleImpact: "可能影响毛利率与收入增速。",
      unknown: "对下一报告期利润的具体影响暂无法量化。",
      source: "行业资讯（演示数据）",
    },
    {
      id: "evt_3",
      date: "2026-05-12",
      type: "政策",
      title: "相关政策与产业支持方向更新",
      fact: "相关政策延续对产业的支持方向。",
      possibleImpact: "可能影响中长期需求预期。",
      unknown: "政策落地节奏与力度存在不确定性。",
      source: "政策信息（演示数据）",
    },
  ];
}

// ---------------- 工具 ----------------

function round(v: number, digits = 2): number {
  const m = Math.pow(10, digits);
  return Math.round(v * m) / m;
}

export function mockCompanyByThscode(thscode: string): Company {
  return toCompany(findMeta(thscode));
}

/** 可比公司清单（含本公司 + 预设同行）：仅为标的清单，不含任何伪造财务数值 */
export function peerUniverse(thscode: string): { thscode: string; name: string }[] {
  const self = findMeta(thscode);
  const list = [{ thscode: self.thscode, name: self.name }];
  const peers = PEERS[thscode] ?? [];
  for (const p of peers) {
    const pm = findMeta(p);
    list.push({ thscode: pm.thscode, name: pm.name });
  }
  return list;
}
