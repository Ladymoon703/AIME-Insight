/**
 * Research Planner — 基于规则的 Agent 规划（Phase 2 不引入 LLM）。
 * 职责：理解用户输入 → 解析标的 → 识别意图 → 生成 Research Map。
 * 只产出「研究计划与可解释理由」，不产出投资结论，不暴露内部思维链。
 */
import { createDataSource } from "@/lib/data/adapter";
import { DIMENSION_MAP } from "./dimensions";
import type {
  Company,
  ResearchMap,
  ResearchDimension,
  ResearchPriority,
} from "@/lib/types";

// ---------------- 意图识别（规则） ----------------

type Intent =
  | "company" // 直接输入公司/代码 → 全维度快研
  | "financial" // 财报/经营 → 财务聚焦
  | "market_weak" // 股价走弱/异常波动 → 行情+财务+估值+行业+事件
  | "compare" // 同行对比 → 行业聚焦
  | "valuation"; // 估值

const KEYWORDS: Record<Intent, string[]> = {
  company: [],
  financial: ["财报", "营收", "利润", "盈利", "现金流", "经营", "财务"],
  market_weak: ["跌", "涨", "股价", "行情", "波动", "走势", "弱", "跳水", "异动", "为什么"],
  compare: ["同行", "行业", "对比", "比较", "龙头", "竞争"],
  valuation: ["估值", "PE", "市盈率", "市净率", "贵", "便宜"],
};

export function detectIntent(query: string): Intent {
  const q = query;
  const score: Record<Intent, number> = {
    company: 0,
    financial: 0,
    market_weak: 0,
    compare: 0,
    valuation: 0,
  };
  for (const [intent, words] of Object.entries(KEYWORDS) as [Intent, string[]][]) {
    for (const w of words) {
      if (q.includes(w)) score[intent] += 1;
    }
  }
  // market_weak 的「为什么」是弱信号，若命中其他强意图则让位
  const ranked = (Object.keys(score) as Intent[]).sort(
    (a, b) => score[b] - score[a],
  );
  if (score[ranked[0]] === 0) return "company";
  return ranked[0];
}

// ---------------- 公司类型识别（启发式，回退通用） ----------------

const TYPE_KEYWORDS: Array<{ type: string; words: string[] }> = [
  { type: "金融", words: ["银行", "证券", "保险", "信托", "金融"] },
  { type: "医药", words: ["医药", "生物", "制药", "医疗", "疫苗"] },
  { type: "科技", words: ["科技", "电子", "半导体", "软件", "芯片", "通信", "计算机", "互联网", "智能"] },
  { type: "消费", words: ["酒", "食品", "饮料", "乳业", "消费", "家电", "零售", "旅游"] },
  { type: "制造", words: ["制造", "汽车", "设备", "机械", "材料", "能源", "电力", "电池", "锂"] },
];

export function detectCompanyType(name: string): string {
  for (const { type, words } of TYPE_KEYWORDS) {
    if (words.some((w) => name.includes(w))) return type;
  }
  return "其他";
}

// ---------------- 标的解析 ----------------

const STOPWORDS = [
  "为什么", "最近", "股价", "表现", "比较", "较弱", "走弱", "下跌", "上涨",
  "跌", "涨", "怎么", "怎么样", "如何", "是什么", "原因", "这只", "股票",
  "公司", "今天", "现在", "的", "了", "吗", "呢", "值得", "关注", "分析",
];

function stripStopwords(query: string): string {
  let s = query;
  for (const w of STOPWORDS) s = s.split(w).join(" ");
  return s.replace(/\s+/g, " ").trim();
}

async function pickCompany(
  candidates: Company[],
  query: string,
): Promise<Company | null> {
  if (candidates.length === 0) return null;
  const q = query.trim();
  // 精确 ticker 优先
  const exactTicker = candidates.find((c) => c.ticker === q);
  if (exactTicker) return exactTicker;
  // 名称完全匹配优先
  const exactName = candidates.find((c) => c.name === q);
  if (exactName) return exactName;
  return candidates[0];
}

export async function resolveByThscode(thscode: string): Promise<Company> {
  const ds = createDataSource();
  const res = await ds.search(thscode);
  if (res.data && res.data.length > 0) {
    return res.data.find((c) => c.thscode === thscode) ?? res.data[0];
  }
  return {
    thscode,
    ticker: thscode.split(".")[0],
    name: thscode,
    exchange: thscode.split(".")[1] ?? null,
  };
}

export async function resolveSymbol(
  query: string,
): Promise<Company | null> {
  const ds = createDataSource();
  const q = query.trim();

  // 1. 直接搜索完整输入
  let res = await ds.search(q);
  if (res.data && res.data.length > 0) {
    return pickCompany(res.data, q);
  }

  // 2. 去除提问词后搜索（如「为什么宁德时代最近股价较弱」→「宁德时代」）
  const stripped = stripStopwords(q);
  if (stripped && stripped !== q) {
    res = await ds.search(stripped);
    if (res.data && res.data.length > 0) {
      return pickCompany(res.data, stripped);
    }
  }

  // 3. 提取 6 位代码
  const ticker = q.match(/\d{6}/)?.[0];
  if (ticker) {
    res = await ds.search(ticker);
    if (res.data && res.data.length > 0) {
      return pickCompany(res.data, ticker);
    }
  }
  return null;
}

// ---------------- 维度选择 ----------------

interface DimensionPlan {
  keys: string[];
  priorities: Partial<Record<string, ResearchPriority>>;
}

function planForIntent(intent: Intent): DimensionPlan {
  switch (intent) {
    case "financial":
      return {
        keys: ["business_quality", "financial_trend", "profit_quality", "valuation"],
        priorities: {},
      };
    case "market_weak":
      return {
        keys: [
          "market", "financial_trend", "business_quality", "profit_quality",
          "valuation", "industry", "events", "strategy", "policy",
        ],
        priorities: {
          market: "core",
          financial_trend: "core",
          business_quality: "core",
          profit_quality: "core",
          valuation: "core",
          industry: "supporting",
          events: "supporting",
          strategy: "optional",
          policy: "optional",
        },
      };
    case "compare":
      return {
        keys: ["industry", "business_quality", "profit_quality", "valuation"],
        priorities: { industry: "core", business_quality: "core", profit_quality: "supporting", valuation: "supporting" },
      };
    case "valuation":
      return {
        keys: ["valuation", "financial_trend", "industry"],
        priorities: { valuation: "core", financial_trend: "supporting", industry: "supporting" },
      };
    case "company":
    default:
      return {
        keys: [
          "business_quality", "financial_trend", "profit_quality", "valuation",
          "market", "industry", "events", "strategy", "policy",
        ],
        priorities: {
          business_quality: "core",
          financial_trend: "core",
          profit_quality: "core",
          valuation: "core",
          market: "core",
          industry: "supporting",
          events: "supporting",
          strategy: "optional",
          policy: "optional",
        },
      };
  }
}

function goalForIntent(intent: Intent, name: string): string {
  switch (intent) {
    case "financial":
      return `梳理 ${name} 的收入、利润与现金流变化，判断经营质量与财务趋势。`;
    case "market_weak":
      return `判断 ${name} 近期市场表现是否与公司基本面变化一致，并检查估值、行业表现与同期事件对市场定价的可能影响。`;
    case "compare":
      return `将 ${name} 与可比公司进行对比，判断其在行业中的经营、盈利与估值位置。`;
    case "valuation":
      return `评估 ${name} 当前估值水平，并结合盈利趋势与行业比较理解市场定价。`;
    default:
      return `对 ${name} 做一次多维度的快速公司研究，覆盖经营、财务、估值、行情、行业与事件。`;
  }
}

// ---------------- 生成 Research Map ----------------

export async function planResearch(
  query: string,
): Promise<{ company: Company | null; researchMap: ResearchMap | null; error: string | null }> {
  const company = await resolveSymbol(query);
  if (!company) {
    return {
      company: null,
      researchMap: null,
      error: "无法识别公司，请输入公司名称或股票代码（如「宁德时代」或「300750」）。",
    };
  }
  const intent = detectIntent(query);
  const plan = planForIntent(intent);
  const companyType = detectCompanyType(company.name);

  const dimensions: ResearchDimension[] = plan.keys.map((key) => {
    const def = DIMENSION_MAP[key];
    return {
      key,
      name: def.name,
      priority: plan.priorities[key] ?? def.priority,
      reason: def.reason.replaceAll("{name}", company.name),
      metrics: def.metrics,
    };
  });

  const researchMap: ResearchMap = {
    researchGoal: goalForIntent(intent, company.name),
    companyType,
    timeWindow: "60d",
    dimensions,
    keyQuestions: dimensions
      .filter((d) => d.priority !== "optional")
      .map((d) => DIMENSION_MAP[d.key].question),
    planRationale: rationaleForIntent(intent, company.name),
  };

  return { company, researchMap, error: null };
}

function rationaleForIntent(intent: Intent, name: string): string {
  switch (intent) {
    case "market_weak":
      return `用户关注 ${name} 的股价表现，因此优先检查行情与基本面是否一致，并用估值、行业和事件作为辅助验证。`;
    case "financial":
      return `用户关注财报与经营情况，因此聚焦经营质量、财务趋势与盈利质量。`;
    case "compare":
      return `用户想进行同行对比，因此以行业位置为核心，结合经营与估值差异。`;
    case "valuation":
      return `用户关注估值，因此以当前估值水平为核心，结合盈利趋势与行业比较。`;
    default:
      return `用户希望快速了解一家公司，因此按经营、财务、估值、行情、行业与事件的完整框架展开研究。`;
  }
}
