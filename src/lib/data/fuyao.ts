/**
 * 扶摇金融数据 API 适配器（真实 HTTP 接入）。
 * Base URL: https://fuyao.aicubes.cn ，鉴权请求头 X-api-key。
 * 所有方法返回规范化类型；业务错误通过抛出 DataError 表达，由上层降级为 honest 状态。
 */
import { FUYAO_BASE_URL, fuyaoApiKey } from "@/lib/config";
import type {
  Company,
  Quote,
  PriceBar,
  FinancialPeriod,
  FinancialIndicatorReport,
  Valuation,
} from "@/lib/types";

export class DataError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

interface Envelope<T> {
  code: number;
  message: string;
  request_id?: string;
  data: T;
}

async function fuyaoGet<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  const url = `${FUYAO_BASE_URL}${path}${qs ? "?" + qs : ""}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-api-key": fuyaoApiKey() },
      cache: "no-store",
    });
  } catch (e) {
    throw new DataError(-1, `网络请求失败: ${(e as Error).message}`);
  }
  if (res.status === 429) {
    throw new DataError(4001, "触发限流，请稍后重试");
  }
  const body = (await res.json()) as Envelope<T>;
  if (body.code !== 0) {
    throw new DataError(body.code, body.message ?? "未知错误");
  }
  return body.data;
}

/** 标的检索：按名称/代码模糊匹配 */
export async function searchTicker(q: string): Promise<Company[]> {
  const data = await fuyaoGet<{ item: any[] }>("/api/meta/tickers/search", {
    q,
    asset_type: "a-share",
    limit: 10,
  });
  return (data.item ?? []).map((it) => ({
    thscode: it.thscode,
    ticker: it.ticker,
    name: it.name,
    exchange: it.exchange ?? null,
    listDate: it.list_date ?? null,
  }));
}

/** 行情快照（批量） */
export async function getQuote(thscodes: string[]): Promise<Quote[]> {
  const data = await fuyaoGet<{ item: any[] }>(
    "/api/a-share/prices/snapshot",
    { thscodes: thscodes.join(",") },
  );
  return (data.item ?? []).map((it) => ({
    lastPrice: it.last_price ?? null,
    priceChange: it.price_change ?? null,
    priceChangeRatioPct: it.price_change_ratio_pct ?? null,
    openPrice: it.open_price ?? null,
    highPrice: it.high_price ?? null,
    lowPrice: it.low_price ?? null,
    prevPrice: it.prev_price ?? null,
    volume: it.volume ?? null,
    turnover: it.turnover ?? null,
  }));
}

/** 历史日 K 线（前复权） */
export async function getHistorical(
  thscode: string,
  startMs: number,
  endMs: number,
): Promise<PriceBar[]> {
  const data = await fuyaoGet<{ item: any[] }>(
    "/api/a-share/prices/historical",
    { thscode, interval: "1d", start: startMs, end: endMs, adjust: "forward" },
  );
  return (data.item ?? []).map((it) => ({
    dateMs: it.date_ms,
    open: it.open_price,
    high: it.high_price,
    low: it.low_price,
    close: it.close_price,
    volume: it.volume ?? 0,
    turnover: it.turnover ?? 0,
  }));
}

type PeriodEnum = "annual" | "quarterly";

async function getStatements(
  endpoint: "income-statements" | "balance-sheets" | "cash-flow-statements",
  thscode: string,
  period: PeriodEnum,
  limit: number,
): Promise<any[]> {
  const data = await fuyaoGet<{ item: any[] }>(
    `/api/a-share/financials/${endpoint}`,
    { thscode, period, limit },
  );
  return data.item ?? [];
}

/** 合并多表为 FinancialPeriod 序列（按报告期末对齐） */
export async function getFinancials(
  thscode: string,
  period: PeriodEnum = "quarterly",
  limit = 8,
): Promise<FinancialPeriod[]> {
  const [income, balance, cashflow] = await Promise.all([
    getStatements("income-statements", thscode, period, limit),
    getStatements("balance-sheets", thscode, period, limit),
    getStatements("cash-flow-statements", thscode, period, limit),
  ]);
  const map = new Map<number, FinancialPeriod>();
  const ensure = (key: number): FinancialPeriod => {
    if (!map.has(key)) {
      map.set(key, {
        fiscalYear: 0,
        fiscalPeriod: "",
        periodEndMs: key,
        reportDateMs: 0,
        operatingIncome: null,
        operatingCosts: null,
        netProfit: null,
        parentHolderNetProfit: null,
        basicEps: null,
        actCashFlowNet: null,
        assetsTotal: null,
        holderEquityTotal: null,
        totalDebt: null,
      });
    }
    return map.get(key)!;
  };
  for (const it of income) {
    const p = ensure(it.period_end_ms);
    p.fiscalYear = it.fiscal_year;
    p.fiscalPeriod = it.fiscal_period;
    p.reportDateMs = it.report_date_ms;
    p.operatingIncome = it.operating_income ?? null;
    p.operatingCosts = it.operating_costs ?? null;
    p.netProfit = it.net_profit ?? null;
    p.parentHolderNetProfit = it.parent_holder_net_profit ?? null;
    p.basicEps = it.basic_eps ?? null;
  }
  for (const it of balance) {
    const p = ensure(it.period_end_ms);
    p.assetsTotal = it.assets_total ?? null;
    p.holderEquityTotal = it.holder_equity_total ?? null;
    p.totalDebt = it.total_debt ?? null;
  }
  for (const it of cashflow) {
    const p = ensure(it.period_end_ms);
    p.actCashFlowNet = it.act_cash_flow_net ?? null;
  }
  return Array.from(map.values()).sort((a, b) => a.periodEndMs - b.periodEndMs);
}

/** 财务指标（单报告期五类能力） */
export async function getIndicators(
  thscode: string,
  report: string,
): Promise<FinancialIndicatorReport> {
  const data = await fuyaoGet<{ abilities: any[] }>(
    "/api/a-share/financials/indicators",
    { thscode, report },
  );
  const toMap = (list: any[] | undefined): Record<string, number | null> => {
    const m: Record<string, number | null> = {};
    for (const ind of list ?? []) {
      m[ind.index_id] = ind.value == null ? null : Number(ind.value);
    }
    return m;
  };
  const abilities = new Map<string, any[]>();
  for (const a of data.abilities ?? []) abilities.set(a.ability, a.indicators ?? []);
  return {
    report,
    growth: toMap(abilities.get("growth")),
    profitability: toMap(abilities.get("profitability")),
    solvency: toMap(abilities.get("solvency")),
    operation: toMap(abilities.get("operation")),
    cashFlow: toMap(abilities.get("cash-flow")),
  };
}

/** 估值快照（批量） */
export async function getValuation(thscodes: string[]): Promise<Valuation[]> {
  const data = await fuyaoGet<{ item: any[] }>(
    "/api/a-share/valuations/snapshot",
    { thscodes: thscodes.join(",") },
  );
  return (data.item ?? []).map((it) => ({
    thscode: it.thscode,
    name: it.name ?? null,
    peTtm: it.pe_ttm ?? null,
    peMrq: it.pe_mrq ?? null,
    pbMrq: it.pb_mrq ?? null,
    psTtm: it.ps_ttm ?? null,
    pcfTtm: it.pcf_ttm ?? null,
  }));
}

/** 同花顺行业指数列表 */
export async function getIndexList(tag = "industry"): Promise<{ thscode: string; name: string }[]> {
  const data = await fuyaoGet<{ item: any[] }>(
    "/api/a-share-index/catalog/ths-index-list",
    { tag },
  );
  return (data.item ?? []).map((it) => ({ thscode: it.thscode, name: it.name }));
}

/** 指数历史 K 线 */
export async function getIndexHistorical(
  thscode: string,
  startMs: number,
  endMs: number,
): Promise<PriceBar[]> {
  const data = await fuyaoGet<{ item: any[] }>(
    "/api/a-share-index/prices/historical",
    { thscode, interval: "1d", start: startMs, end: endMs },
  );
  return (data.item ?? []).map((it) => ({
    dateMs: it.date_ms,
    open: it.open_price,
    high: it.high_price,
    low: it.low_price,
    close: it.close_price,
    volume: it.volume ?? 0,
    turnover: it.turnover ?? 0,
  }));
}
