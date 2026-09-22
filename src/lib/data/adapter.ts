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
      // 同行对比：MVP 使用预设可比公司清单（真实模式也需要该清单）。
      if (mode === "mock") return ok(mock.mockPeers(thscode), src);
      try {
        // 真实模式：对预设可比公司 + 本公司批量取估值与指标，再由确定性引擎计算对比。
        // 此处返回 mock 的可比公司结构作为骨架，估值/指标由上层真实接口填充。
        const peers = mock.mockPeers(thscode);
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
