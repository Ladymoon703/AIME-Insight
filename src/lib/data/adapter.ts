/**
 * 统一数据适配层：页面 / Agent 只能通过本层访问外部数据，禁止直接调用第三方接口。
 * 根据是否配置 FUYAO_API_KEY 选择 live（扶摇真实接入）或 mock（演示数据）。
 * 所有方法返回 { data, status, source }，缺失/失败以 honest 状态表达，绝不静默补全。
 */
import { hasFuyaoKey } from "@/lib/config";
import * as fuyao from "./fuyao";
import * as mock from "./mock";
import type {
  Company,
  Quote,
  PriceBar,
  FinancialPeriod,
  FinancialIndicatorReport,
  Valuation,
  Peer,
  ResearchEvent,
  DataStatus,
  DataMode,
} from "@/lib/types";

export function getDataMode(): DataMode {
  return hasFuyaoKey() ? "live" : "mock";
}

export interface DataResult<T> {
  data: T | null;
  status: DataStatus;
  source: string;
}

const SOURCE = "扶摇金融数据 API";

function source(mode: DataMode): string {
  return mode === "mock" ? `${SOURCE}（演示数据）` : SOURCE;
}

function ok<T>(data: T, src: string): DataResult<T> {
  return { data, status: "verified", source: src };
}

function missing<T>(src: string, reason: string): DataResult<T> {
  return { data: null, status: "missing", source: `${src}（${reason}）` };
}

function failed<T>(src: string, err: unknown): DataResult<T> {
  const msg = err instanceof Error ? err.message : String(err);
  return { data: null, status: "failed", source: `${src}（${msg}）` };
}

export interface DataSource {
  mode: DataMode;
  search(q: string): Promise<DataResult<Company[]>>;
  getQuote(thscode: string): Promise<DataResult<Quote>>;
  getHistorical(
    thscode: string,
    startMs: number,
    endMs: number,
  ): Promise<DataResult<PriceBar[]>>;
  getFinancials(thscode: string): Promise<DataResult<FinancialPeriod[]>>;
  getIndicatorsSeries(
    thscode: string,
    reports: string[],
  ): Promise<DataResult<FinancialIndicatorReport[]>>;
  getValuation(thscode: string): Promise<DataResult<Valuation>>;
  getPeers(thscode: string): Promise<DataResult<Peer[]>>;
  getEvents(thscode: string): Promise<DataResult<ResearchEvent[]>>;
}

export function createDataSource(): DataSource {
  const mode = getDataMode();
  const src = source(mode);

  return {
    mode,

    async search(q) {
      if (mode === "mock") return ok(mock.mockSearch(q), src);
      try {
        return ok(await fuyao.searchTicker(q), src);
      } catch (e) {
        return failed(src, e);
      }
    },

    async getQuote(thscode) {
      if (mode === "mock") return ok(mock.mockQuote(thscode), src);
      try {
        const list = await fuyao.getQuote([thscode]);
        if (list.length === 0) return missing(src, "暂无行情数据");
        return ok(list[0], src);
      } catch (e) {
        return failed(src, e);
      }
    },

    async getHistorical(thscode, startMs, endMs) {
      if (mode === "mock") return ok(mock.mockHistorical(thscode, startMs, endMs), src);
      try {
        const bars = await fuyao.getHistorical(thscode, startMs, endMs);
        if (bars.length === 0) return missing(src, "暂无历史K线");
        return ok(bars, src);
      } catch (e) {
        return failed(src, e);
      }
    },

    async getFinancials(thscode) {
      if (mode === "mock") return ok(mock.mockFinancials(thscode), src);
      try {
        const periods = await fuyao.getFinancials(thscode, "quarterly", 8);
        if (periods.length === 0) return missing(src, "暂无财务报表数据");
        return ok(periods, src);
      } catch (e) {
        return failed(src, e);
      }
    },

    async getIndicatorsSeries(thscode, reports) {
      if (mode === "mock")
        return ok(reports.map((r) => mock.mockIndicators(thscode, r)), src);
      try {
        const list = await Promise.all(
          reports.map((r) => fuyao.getIndicators(thscode, r)),
        );
        return ok(list, src);
      } catch (e) {
        return failed(src, e);
      }
    },

    async getValuation(thscode) {
      if (mode === "mock") return ok(mock.mockValuation(thscode), src);
      try {
        const list = await fuyao.getValuation([thscode]);
        if (list.length === 0) return missing(src, "暂无估值数据");
        return ok(list[0], src);
      } catch (e) {
        return failed(src, e);
      }
    },

    async getPeers(thscode) {
      if (mode === "mock") return ok(mock.mockPeers(thscode), src);
      try {
        // 真实模式：预设可比公司清单（仅标的），估值与财务指标全部真实取数。
        const universe = mock.peerUniverse(thscode);
        const thscodes = universe.map((u) => u.thscode);
        const valuations = await fuyao.getValuation(thscodes);
        const valMap = new Map(valuations.map((v) => [v.thscode, v]));

        const peers: Peer[] = [];
        for (const u of universe) {
          const val = valMap.get(u.thscode);
          let roe: number | null = null;
          let revenueGrowth: number | null = null;
          let netMargin: number | null = null;
          try {
            const fin = await fuyao.getFinancials(u.thscode, "quarterly", 1);
            const latest = fin[0];
            if (latest) {
              const q = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 }[latest.fiscalPeriod] ?? 4;
              const ind = await fuyao.getIndicators(
                u.thscode,
                `${latest.fiscalYear}-${q}`,
              );
              roe = ind.profitability.index_weighted_avg_roe ?? null;
              revenueGrowth =
                ind.growth.calculate_operating_income_yoy_growth_ratio ?? null;
              netMargin = ind.profitability.sale_net_interest_ratio ?? null;
            }
          } catch {
            // 单个 peer 取数失败时保持 null，不影响整体
          }
          peers.push({
            thscode: u.thscode,
            ticker: u.thscode.split(".")[0],
            name: u.name,
            roe,
            revenueGrowth,
            netMargin,
            peTtm: val?.peTtm ?? null,
            intervalReturn: null,
          });
        }
        return ok(peers, src);
      } catch (e) {
        return failed(src, e);
      }
    },

    async getEvents(thscode) {
      // 公告 / 新闻 / 研报走 iFinD MCP（浏览器 Cookie 鉴权），MVP 未接入。
      if (mode === "mock") return ok(mock.mockEvents(thscode), src);
      return missing(src, "公告/新闻需 iFinD MCP，MVP 未接入");
    },
  };
}
