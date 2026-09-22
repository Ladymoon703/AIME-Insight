/**
 * 研究维度目录：Agent 规划时从中选择维度，用户增删也基于此目录。
 * 每个维度有核心问题、指标、默认优先级与选择原因（可含 {name} 占位符）。
 */
import type { ResearchPriority } from "@/lib/types";

export interface DimensionDef {
  key: string;
  name: string;
  priority: ResearchPriority;
  question: string; // 核心问题
  metrics: string[]; // 核心指标（展示名）
  reason: string; // 为什么研究（可含 {name}）
}

export const DIMENSION_CATALOG: DimensionDef[] = [
  {
    key: "business_quality",
    name: "经营质量",
    priority: "core",
    question: "公司生意本身有没有改善？",
    metrics: ["营业收入", "营收同比", "净利润", "净利润同比", "毛利率", "净利率", "ROE"],
    reason: "判断{name}的收入与利润是否保持增长、盈利能力是否改善。",
  },
  {
    key: "financial_trend",
    name: "财务趋势",
    priority: "core",
    question: "变化是否具有连续性？",
    metrics: ["营收趋势", "净利润趋势", "毛利率趋势", "ROE趋势"],
    reason: "检查{name}多个报告期的变化是否连续，而非单期波动。",
  },
  {
    key: "profit_quality",
    name: "盈利质量",
    priority: "core",
    question: "利润增长是否同步转化为现金创造？",
    metrics: ["经营现金流", "经营现金流同比", "净利润现金含量"],
    reason: "验证{name}的利润增长是否有经营现金流支撑。",
  },
  {
    key: "valuation",
    name: "估值",
    priority: "core",
    question: "市场当前如何给它定价？",
    metrics: ["PE-TTM", "PB-MRQ", "PS-TTM", "PCF-TTM"],
    reason: "查看{name}当前估值水平，判断市场定价是否发生明显变化。",
  },
  {
    key: "market",
    name: "行情特征",
    priority: "core",
    question: "市场近期发生了什么？",
    metrics: ["K线", "成交量", "区间收益", "最大回撤", "相对表现"],
    reason: "确认{name}近期的涨跌、成交与相对行业/指数的表现。",
  },
  {
    key: "industry",
    name: "行业位置",
    priority: "supporting",
    question: "是公司问题还是行业问题？",
    metrics: ["ROE", "营收增速", "净利率", "PE-TTM", "区间涨跌幅"],
    reason: "把{name}放到可比公司中，判断是公司自身变化还是行业共同变化。",
  },
  {
    key: "events",
    name: "事件与风险",
    priority: "supporting",
    question: "有没有新信息改变研究判断？",
    metrics: ["公司公告", "财报", "行业政策", "重大事件"],
    reason: "检查{name}同期公告、财报与行业事件是否带来新信息。",
  },
  {
    key: "strategy",
    name: "战略信号",
    priority: "optional",
    question: "公司正在做什么？",
    metrics: ["研发投入", "资本开支", "并购", "产能扩张"],
    reason: "观察{name}的战略动作是否构成中长期变化信号。",
  },
  {
    key: "policy",
    name: "政策影响",
    priority: "optional",
    question: "外部环境可能影响什么？",
    metrics: ["产业政策", "监管变化", "行业影响"],
    reason: "评估外部政策对{name}所处行业与业务的潜在影响。",
  },
];

export const DIMENSION_MAP: Record<string, DimensionDef> = Object.fromEntries(
  DIMENSION_CATALOG.map((d) => [d.key, d]),
);

export interface TimeWindowDef {
  key: string;
  label: string;
  days: number;
}

export const TIME_WINDOWS: TimeWindowDef[] = [
  { key: "5d", label: "近5日", days: 5 },
  { key: "20d", label: "近20日", days: 20 },
  { key: "60d", label: "近60日", days: 60 },
  { key: "120d", label: "近120日", days: 120 },
  { key: "1y", label: "1年", days: 365 },
];

export function timeWindowLabel(key: string): string {
  return TIME_WINDOWS.find((w) => w.key === key)?.label ?? key;
}
