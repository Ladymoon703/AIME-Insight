# AIME Insight 技术架构

本文记录 AIME Insight 的**真实**技术架构，基于当前已实现代码，不含任何未实现部分。

---

## 1. 总览

```
Frontend (Next.js App Router)
        ↓ 用户输入公司 / 研究问题
Agent Planner（生成 Research Map）
        ↓ 用户确认/调整
Research Runner（编排一次完整研究）
        ↓
Data Adapter（扶摇 live / mock 演示）
        ↓
Deterministic Metric Engine（确定性计算）
        ↓
Evidence Engine（证据结构化）
        ↓
LLM Interpreter（DeepSeek 解释 + 校验 + 模板降级）
        ↓
Research State（当前研究状态）
        ↓
Research Memory（SQLite：Research / Version / Observation）
        ↓
Observation（持续观察）→ 重新研究 → Research Update
```

---

## 2. 各层职责

### 2.1 Frontend
- 技术：Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS v4
- 页面：首页 `/`、Research Map `/map`、公司研究台 `/research/[thscode]`、我的研究 `/research`、历史版本 `/research/[thscode]/history`、我的观察 `/observations`
- 图表：ECharts（自行封装 `EChart` wrapper，option 服务端构建、字符串 formatter 序列化）
- 组件边界：Evidence Drawer（client context）供证据钻取；区块组件（server）接收 ResearchResult 切片渲染

### 2.2 Agent Planner（`src/lib/agent/planner.ts`）
- 职责：解析用户输入 → 解析标的 → 识别意图 → 生成 Research Map
- 纯规则实现（无 LLM）：Symbol Resolver（去停用词 + 代码提取 + 检索）、意图识别（关键词）、公司类型识别（启发式，回退「其他」）
- 输出：`{company, researchGoal, timeWindow, dimensions[], keyQuestions[], planRationale}`
- 原则：只展示「研究计划 + 可解释理由」，不暴露内部 Chain-of-Thought

### 2.3 Research Runner（`src/lib/agent/research.ts`）
- 职责：编排一次完整研究的 9 步（取数 → 确定性计算 → 证据 → 背离 → 状态 → 变化 → LLM 解释 → 图表 → 数据状态）
- 输出：完整 `ResearchResult`（含 chart 数据、evidence、summary、deepAnalysis、nextQuestions、stateUpdate 等）

### 2.4 Data Adapter（`src/lib/data/`）
- `adapter.ts`：统一数据访问，按 `FUYAO_API_KEY` 选择 live/mock；所有方法返回 `{data, status, source}`
- `fuyao.ts`：扶摇 REST 真实 HTTP（`X-api-key` 鉴权，响应信封解析，错误码映射）
- `mock.ts`：演示数据（未配置 Key 时），source 强制标注「（演示数据）」
- 原则：页面/Agent 不直接调第三方接口；失败/缺失以 honest 状态表达

### 2.5 Deterministic Metric Engine（`src/lib/engine/metrics.ts`）
- 纯函数，可测试：同比/环比、区间收益、最大回撤、波动率、趋势、现金含量、相对表现、格式化
- **LLM 绝不计算这些指标**

### 2.6 Evidence Engine（`src/lib/engine/evidence.ts`）
- `createEvidence`：构建完整可追溯证据（id/metric/value/unit/period/source/rawField/method/factKind/status）
- 语义规则：`fact + 非null → verified`；`unverified + null → missing`；contradictory = `fact + deterministic + 双值比较`
- 分类：positive / negative / contradictory / unknown / neutral

### 2.7 LLM Interpreter（`src/lib/llm/`）
- `deepseek.ts`：DeepSeek 适配（OpenAI 兼容 HTTP，仅服务端，Key 只读 env）
- `interpreter.ts`：编排（系统提示 + 用户提示 + 调 DeepSeek + 校验 + 模板降级）
- `validate.ts`：三道校验（JSON/schema、Evidence ID、数字溯源）+ 模板解释
- `schema.ts`：Interpreter 输入/输出契约
- `format.ts`：传给 LLM 的数值四舍五入（只优化展示，不改真实值）
- **LLM 只解释 Evidence，不创造 Evidence**

### 2.8 Research State / Memory（`src/lib/store/`）
- `db.ts`：Node 内置 `node:sqlite`，三张表（researches / research_versions / observations），参数化查询
- `researchStore.ts`：Research 按 `(thscode, research_goal)` 区分，版本快照 JSON 不可变
- `observationStore.ts`：Observation 通过 `researchId` 关联具体 Research

---

## 3. Deterministic vs LLM 分工

| 环节 | 归属 |
|---|---|
| 指标计算（同比/回撤/波动率/收益/现金含量） | Deterministic Engine |
| 证据构建、分类、溯源 | Evidence Engine |
| 新旧状态比较（发生了什么变化） | `update.ts` 确定性比较 |
| 理解、解释、总结、发现问题、提出下一步 | LLM Interpreter |

---

## 4. 数据来源

- **扶摇金融数据 API**（REST）：行情快照/历史 K 线/三张财报/财务指标/估值快照/指数成分
- **iFinD MCP**：未接入（公告/新闻/研报需浏览器 Cookie 鉴权，当前显示 missing）
- 边界：无历史 PE 序列；无股票→行业成分股反查（敬请期待）

---

## 5. Fallback 机制

| 场景 | 行为 |
|---|---|
| `FUYAO_API_KEY` 缺失 | 数据层 mock，source 标注「（演示数据）」+ 顶部「演示模式」横幅 |
| `DEEPSEEK_API_KEY` 缺失 / API 失败 / JSON 错误 | 模板解释，标注「模板解释（未连接模型）」 |
| LLM 引用不存在 Evidence ID / 编造数字 | 校验拒绝 → 模板解释 |
| 数据 missing/failed/stale/conflict | 显式状态，绝不补零、绝不伪装正常 |

---

## 6. Evidence 如何贯穿系统

1. Research Runner 用 `createEvidence` 从确定性指标生成 Evidence
2. Evidence 按 class 分入 positive/negative/contradictory/unknown
3. Interpreter 输入只包含 Evidence，输出必须引用 Evidence ID
4. 校验器拒绝「无 Evidence 支撑的数字」和「不存在的 ID」
5. 页面 Evidence Board + 各区块 + Evidence Drawer 展示完整溯源链
6. 保存 Research 时，Evidence 快照随版本 JSON 持久化，不可变

---

## 7. 为什么这样拆

- **确定性计算与 LLM 分离**：金融数字必须可复现、可测试、可追溯，不能交给 LLM
- **Data Adapter 隔离**：换数据源（如接入 iFinD）不影响上层；mock/live 切换不影响产品逻辑
- **Evidence 作为唯一事实载体**：AI 结论只能引用证据，不能凭空生成
- **版本不可变**：历史研究不被新数据覆盖，支持「旧 vs 新」比较
