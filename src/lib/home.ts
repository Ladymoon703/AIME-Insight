/**
 * 首页数据：快捷任务 + 今日值得研究。
 * 今日值得研究是「研究触发器」而非新闻流，核心结构 = 变化 + 关键数字 + 为什么 + 研究入口。
 * 当前为演示数据（明确标识），真实监控能力在 Phase 5 / P2。
 */
import { mockQuote, mockIndicators, mockValuation, mockFinancials } from "@/lib/data/mock";

export interface QuickTask {
  title: string;
  description: string;
  query?: string;
  href?: string;
}

export const QUICK_TASKS: QuickTask[] = [
  {
    title: "研究一家公司",
    description: "从经营、财务、估值、行情、行业与事件等维度快速了解一家上市公司。",
    query: "宁德时代",
  },
  {
    title: "看懂最新财报",
    description: "快速查看收入、利润、现金流与盈利能力的变化。",
    query: "宁德时代最新财报表现如何",
  },
  {
    title: "解释异常波动",
    description: "分析近期股价、成交与基本面、事件的变化。",
    query: "为什么宁德时代最近股价表现较弱",
  },
  {
    title: "和同行比一比",
    description: "查看公司与可比公司的经营、盈利与估值差异。",
    query: "宁德时代和同行对比",
  },
  {
    title: "帮我持续关注",
    description: "建立观察任务，出现重要变化时重新验证研究判断。",
    href: "/observations",
  },
  {
    title: "继续我的研究",
    description: "从最近保存的研究状态继续。",
    href: "/research",
  },
];

export interface WorthResearchingCard {
  id: string;
  thscode: string;
  companyName: string;
  changeTitle: string;
  keyNumbers: { label: string; value: string }[];
  why: string;
  query: string;
}

function pct(v: number | null): string {
  if (v == null) return "--";
  return (v > 0 ? "+" : "") + v.toFixed(1) + "%";
}

export function getTodayWorthResearching(): WorthResearchingCard[] {
  const catl = mockIndicators("300750.SZ", "2026-2");
  const catlFin = mockFinancials("300750.SZ");
  const catlLatest = catlFin[catlFin.length - 1];
  const catlPrev = catlFin.find(
    (p) => p.fiscalYear === catlLatest.fiscalYear - 1 && p.fiscalPeriod === catlLatest.fiscalPeriod,
  );
  const catlCfYoY =
    catlLatest && catlPrev && catlLatest.actCashFlowNet != null && catlPrev.actCashFlowNet != null && catlPrev.actCashFlowNet !== 0
      ? ((catlLatest.actCashFlowNet - catlPrev.actCashFlowNet) / Math.abs(catlPrev.actCashFlowNet)) * 100
      : null;
  const moutaiVal = mockValuation("600519.SH");
  const moutaiQuote = mockQuote("600519.SH");
  const bydQuote = mockQuote("002594.SZ");

  return [
    {
      id: "catl",
      thscode: "300750.SZ",
      companyName: "宁德时代",
      changeTitle: "盈利与现金流出现分化",
      keyNumbers: [
        { label: "净利润同比", value: pct(catl.growth.calculate_parent_holder_net_profit_yoy_growth_ratio) },
        { label: "经营现金流同比", value: pct(catlCfYoY) },
        { label: "近60日", value: pct(-8.2) },
      ],
      why: "利润保持增长，但经营现金流增速明显低于利润增速，盈利质量值得验证。",
      query: "为什么宁德时代最近股价表现较弱",
    },
    {
      id: "moutai",
      thscode: "600519.SH",
      companyName: "贵州茅台",
      changeTitle: "估值进入关注区间",
      keyNumbers: [
        {
          label: "PE-TTM",
          value: moutaiVal.peTtm != null ? moutaiVal.peTtm.toFixed(1) + "x" : "--",
        },
        { label: "当日", value: pct(moutaiQuote.priceChangeRatioPct) },
      ],
      why: "当前估值水平与历史区间的关系值得结合盈利趋势进一步确认。",
      query: "贵州茅台",
    },
    {
      id: "byd",
      thscode: "002594.SZ",
      companyName: "比亚迪",
      changeTitle: "行业竞争与价格变化",
      keyNumbers: [{ label: "当日", value: pct(bydQuote.priceChangeRatioPct) }],
      why: "行业价格中枢变化可能影响毛利率与收入增速，需判断是公司问题还是行业问题。",
      query: "比亚迪和同行对比",
    },
  ];
}
