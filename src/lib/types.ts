/**
 * AIME Insight 核心共享类型定义。
 * 后端结构化输出，前端负责渲染为图表 / 证据卡 / Drawer / 文本。
 */

export type DataMode = "live" | "mock";

export type DataStatus =
  | "verified"
  | "missing"
  | "stale"
  | "failed"
  | "conflict";

export type EvidenceClass = "positive" | "negative" | "contradictory" | "unknown" | "neutral";

/** fact=客观事实（来自数据），inference=分析推断，unverified=暂无法验证 */
export type FactKind = "fact" | "inference" | "unverified";

export type EvidenceType = "metric" | "source";

export type DimensionStatus =
  | "positive"
  | "negative"
  | "contradictory"
  | "unknown"
  | "neutral";

export interface Company {
  thscode: string;
  ticker: string;
  name: string;
  exchange: string | null;
  listDate?: string | null;
}

export interface Quote {
  lastPrice: number | null;
  priceChange: number | null;
  priceChangeRatioPct: number | null;
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  prevPrice: number | null;
  volume: number | null;
  turnover: number | null;
}

export interface PriceBar {
  dateMs: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
}

export interface FinancialPeriod {
  fiscalYear: number;
  fiscalPeriod: string; // FY | Q1 | Q2 | Q3 | Q4
  periodEndMs: number;
  reportDateMs: number;
  operatingIncome: number | null;
  operatingCosts: number | null;
  netProfit: number | null;
  parentHolderNetProfit: number | null;
  basicEps: number | null;
  actCashFlowNet: number | null;
  assetsTotal: number | null;
  holderEquityTotal: number | null;
  totalDebt: number | null;
}

/** 财务指标（来自 /financials/indicators 五类能力，value 为原始数值） */
export type IndicatorMap = Record<string, number | null>;

export interface FinancialIndicatorReport {
  report: string; // 如 "2025-1"
  growth: IndicatorMap;
  profitability: IndicatorMap;
  solvency: IndicatorMap;
  operation: IndicatorMap;
  cashFlow: IndicatorMap;
}

export interface Valuation {
  thscode: string;
  name: string | null;
  peTtm: number | null;
  peMrq: number | null;
  pbMrq: number | null;
  psTtm: number | null;
  pcfTtm: number | null;
}

export interface Peer {
  thscode: string;
  ticker: string;
  name: string;
  roe: number | null;
  revenueGrowth: number | null;
  netMargin: number | null;
  peTtm: number | null;
  intervalReturn: number | null;
}

export interface IndustryPosition {
  peers: Peer[];
  indexName: string | null;
  indexIntervalReturn: number | null;
}

/** Evidence：所有 AI 结论只能引用 Evidence id */
export interface Evidence {
  id: string;
  type: EvidenceType;
  status: DataStatus;
  evidenceClass: EvidenceClass;
  factKind: FactKind;
  dimension: string; // 研究维度 key
  metric: string; // 指标 key
  label: string; // 展示名
  value: number | string | null;
  unit: string;
  period: string | null;
  source: string; // 数据来源名称
  updatedAt: string | null;
  method: "deterministic" | "source" | "llm";
  claim?: string; // 自然语言表述
  rawField?: string; // 原始字段名
}

export type ResearchPriority = "core" | "supporting" | "optional";

export interface ResearchDimension {
  key: string;
  name: string;
  priority: ResearchPriority;
  reason: string;
  metrics: string[];
}

export interface ResearchMap {
  researchGoal: string;
  companyType: string;
  timeWindow: string;
  dimensions: ResearchDimension[];
  keyQuestions: string[];
  /** Agent 只解释研究计划本身，不暴露内部思维链 */
  planRationale: string;
}

export interface CurrentStateItem {
  dimension: string;
  label: string;
  status: DimensionStatus;
  summary: string;
}

export interface KeyChange {
  title: string;
  value: string;
  evidenceIds: string[];
}

export interface ContradictionResult {
  detected: boolean;
  description: string;
  possibleReasons: string[];
  evidenceIds: string[];
  nextActions: string[];
}

export interface DeepAnalysisSection {
  title: string;
  content: string;
}

export interface DeepAnalysis {
  coreConclusion: string;
  sections: DeepAnalysisSection[];
  /** 关联证据 id，用于可点击钻取 */
  evidenceIds: string[];
}

export interface SourceInfo {
  name: string;
  asOf: string | null;
  updatedAt: string | null;
}

/** 后端一次研究的完整结构化结果（公司研究台渲染数据源） */
export interface ResearchResult {
  dataMode: DataMode;
  company: Company;
  quote: Quote | null;
  researchGoal: string;
  timeWindow: string;
  currentState: CurrentStateItem[];
  keyChanges: KeyChange[];
  financial: {
    periods: FinancialPeriod[];
    indicators: FinancialIndicatorReport[];
    chart: FinancialChartSeries;
  } | null;
  valuation: Valuation | null;
  valuationPeers: Valuation[] | null;
  market: {
    bars: PriceBar[];
    stats: MarketStats;
    relative: RelativePerformance | null;
  } | null;
  industry: IndustryPosition | null;
  events: ResearchEvent[] | null;
  evidence: {
    facts: Evidence[];
    positive: Evidence[];
    negative: Evidence[];
    contradictory: Evidence[];
    unknown: Evidence[];
  };
  contradiction: ContradictionResult | null;
  summary: string | null;
  deepAnalysis: DeepAnalysis | null;
  nextActions: string[];
  openQuestions: string[];
  sources: SourceInfo[];
  dataStatus: DataStatus[];
  llmMode: "live" | "template";
}

export interface FinancialChartSeries {
  /** 每个报告期的标签（如 2024Q1） */
  labels: string[];
  series: Array<{
    name: string;
    unit: string;
    data: (number | null)[];
  }>;
}

export interface MarketStats {
  intervalReturnPct: number | null;
  maxDrawdownPct: number | null;
  volatilityPct: number | null;
  high: number | null;
  low: number | null;
}

export interface RelativePerformance {
  companyPct: number | null;
  industryPct: number | null;
  benchmarkPct: number | null;
  benchmarkName: string;
}

export interface ResearchEvent {
  id: string;
  date: string;
  type: string;
  title: string;
  fact: string | null;
  possibleImpact: string | null;
  unknown: string | null;
  source: string;
}

/** 保存的研究档案（Research State） */
export interface SavedResearch {
  id: string;
  company: Company;
  researchGoal: string;
  timeWindow: string;
  dataMode: DataMode;
  createdAt: string;
  updatedAt: string;
  currentState: CurrentStateItem[];
  summary: string | null;
  openQuestions: string[];
  positiveCount: number;
  negativeCount: number;
  contradictoryCount: number;
  unknownCount: number;
  /** 完整研究结果快照（JSON 字符串） */
  snapshot: string;
}

/** 观察任务 */
export interface Observation {
  id: string;
  companyThscode: string;
  companyName: string;
  target: string;
  metrics: string[];
  events: string[];
  createdAt: string;
  lastCheckedAt: string | null;
  status: "normal" | "changed" | "needs_review";
}
