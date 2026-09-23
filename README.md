# AIME Insight

> AI 证据驱动个股研究 Agent —— 看见变化 · 理解变化 · 验证判断 · 持续研究

面向有明确关注标的的个人投资者，AIME Insight 通过多维金融数据、可视化分析、证据链和 AI Agent，帮助用户建立、验证并持续更新对一家上市公司的研究判断。

**AIME Insight 不是**：AI 聊天机器人、股票信息聚合器、股票评分器、买卖建议工具。

**AIME Insight 是**：AI 公司研究工作台。

---

## 1. 核心产品逻辑

```
输入公司/研究问题
  → Agent 理解研究目标
  → Research Map（研究规划，用户可增删维度/改时间窗）
  → 获取金融数据（扶摇 API）
  → Deterministic Metric Engine（确定性指标计算）
  → Evidence Engine（证据结构化）
  → LLM Interpreter（解释证据，不生成数据）
  → 正/负/矛盾/未知 证据
  → 当前研究状态 + AI 解释
  → 保存 Research State / 建立 Observation
  → 重新研究 → Research Update（旧 vs 新）
```

核心原则：**LLM 负责解释 Evidence，不负责创造 Evidence。**

---

## 2. 技术架构

| 层 | 技术 |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 |
| Charts | ECharts（自行封装 wrapper） |
| Backend | Next.js Route Handlers（服务端，不暴露 Key） |
| Storage | `@libsql/client`（Turso 远程 / 本地 `file:`；Vercel 上持久化） |
| 数据源 | 扶摇金融数据 API（REST，`X-api-key` 鉴权） |
| LLM | DeepSeek（OpenAI 兼容 HTTP API） |

架构分工：

- **Data Adapter**（`src/lib/data/`）——统一数据访问，页面/Agent 不直接调第三方接口
- **Deterministic Metric Engine**（`src/lib/engine/metrics.ts`）——同比/环比/收益/回撤/波动率等
- **Evidence Engine**（`src/lib/engine/evidence.ts`）——`结论 → 证据 → 指标 → 期次 → 来源 → 方法`
- **Agent**（`src/lib/agent/`）——Planner（研究规划）+ research runner（编排）+ update（新旧比较）
- **LLM Interpreter**（`src/lib/llm/`）——DeepSeek 适配 + schema 校验 + 模板降级
- **Store**（`src/lib/store/`）——Research / Version / Observation 持久化

---

## 3. 项目目录结构

```
src/
├── app/                    # 页面 + API 路由
│   ├── page.tsx            # 首页（研究入口）
│   ├── map/                # Research Map
│   ├── research/           # 公司研究台 + 我的研究 + 历史版本
│   ├── observations/       # 我的观察
│   └── api/                # save / rerun / observations 等接口
├── components/             # UI 组件（图表、Evidence Drawer、区块组件）
├── lib/
│   ├── agent/              # planner / research / update / dimensions
│   ├── data/               # adapter / fuyao / mock
│   ├── engine/             # metrics / evidence（确定性、纯函数）
│   ├── llm/                # deepseek / interpreter / validate / updateExplain
│   └── store/              # db / researchStore / observationStore
└── types.ts                # 核心共享类型
tests/unit/                 # 单元测试
docs/                       # PRD 参考文档
```

---

## 4. 本地启动

```bash
npm install
cp .env.example .env.local   # 填写真实 API Key（见下）
npm run dev                  # 开发模式，默认 http://localhost:3000
```

生产构建：

```bash
npm run build
npm start
```

---

## 5. 环境变量

复制 `.env.example` 为 `.env.local`：

| 变量 | 必填 | 说明 |
|---|---|---|
| `FUYAO_API_KEY` | 否 | 扶摇金融数据 API Key，见 [fuyao.aicubes.cn/admin](https://fuyao.aicubes.cn/admin) |
| `DEEPSEEK_API_KEY` | 否 | DeepSeek API Key，见 [platform.deepseek.com](https://platform.deepseek.com) |
| `DEEPSEEK_BASE_URL` | 否 | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 否 | 默认 `deepseek-chat` |
| `TURSO_DATABASE_URL` | 否 | Turso 数据库 URL（如 `libsql://xxx.turso.io`）；配置后优先走 Turso，Vercel 上持久化必须配置 |
| `TURSO_AUTH_TOKEN` | 否 | Turso 鉴权 token |
| `AIME_DB_PATH` | 否 | 本地 SQLite 文件路径（未配 Turso 时使用），默认 `data/aime.db` |

> `.env.local` 已被 gitignore，真实密钥不会提交；`.env.example` 只含空占位符。

---

## 6. mock / live 模式

| 模式 | 触发条件 | 表现 |
|---|---|---|
| **live** | 配置 `FUYAO_API_KEY` | 真实扶摇数据，页面不显示「演示数据」 |
| **mock** | 未配置 Key | 演示数据，顶部横幅 + 每处标注「（演示数据）」 |

LLM 同理：

| 模式 | 触发条件 | 表现 |
|---|---|---|
| **live** | 配置 `DEEPSEEK_API_KEY` | 摘要标注「由 DeepSeek 生成」 |
| **template** | 未配置/调用失败/校验失败 | 标注「模板解释（未连接模型）」，绝不伪装成真实 LLM |

---

## 7. 数据真实性原则

1. **不伪造**：无历史 PE 序列、无新闻、无政策数据时，一律显示 `missing / 暂无数据 / 待验证`，绝不补零、绝不猜测、绝不伪造曲线。
2. **失败不静默**：`missing / failed / stale / conflict` 必须显式展示，不得当作 `verified`。
3. **null 不当 0**：上游 `null` 透传，不补零。
4. **failed/missing 不判负面**：数据获取失败时不产生「判断弱化」，保留旧判断并提示「本次无法获取」。
5. **演示数据强制标识**：mock 模式数据源统一带「（演示数据）」后缀。

---

## 8. Evidence 机制

每条 Evidence 完整可追溯：

```
结论 → Evidence ID → metric（指标）→ value（数值）→ unit（单位）
     → period（期次）→ source（来源）→ rawField（原始字段）→ method（计算方法）
```

四类证据：`positive` / `negative` / `contradictory` / `unknown`。

三种事实层级：`fact`（客观事实）/ `inference`（分析推断）/ `unverified`（暂无法验证）。

**状态语义**：`verified`（数据正常）/ `missing`（数据不足或不可得）/ `stale`（过期）/ `failed`（接口失败）/ `conflict`（来源冲突）。`unverified` 证据（value 为 null、信息不足）**绝不默认 `verified`**，而默认 `missing`，避免把「无法验证」伪装成「已验证」。

**contradictory 证据结构**：值为两个已验证指标的确定性比较（如 `23.8% vs 4.7%`），`factKind = fact`、`method = deterministic`，表示「利润增速明显高于现金流增速」这类可计算的分化，而非无法解释的数据字段。

LLM 输出只能引用 Evidence ID，数字溯源校验会拒绝「Evidence 中不存在的数字」和「不存在的 Evidence ID」。

---

## 9. Research State / Observation

- **Research**：一家公司可有多个研究任务（按 `research_goal` 区分），每个任务有独立版本历史（v1/v2/…）。
- **Research Version**：每次保存/重新研究生成一个新版本，快照不可变（旧研究不被新数据覆盖）。
- **Observation**：持续观察绑定到具体 `researchId`，保存「我希望未来继续验证的研究问题」。

---

## 10. 测试方式

```bash
npm test          # 单元测试（node:test）
npm run lint      # ESLint
npx tsc --noEmit  # 类型检查
npm run build     # 生产构建
```

详见 [TESTING.md](./TESTING.md)。

---

## 11. 当前已知限制

- **无历史 PE API**：扶摇仅提供最新估值快照，因此不展示历史 PE 曲线/分位，避免伪造。
- **事件/新闻依赖 iFinD MCP**：未接入时事件维度显示 `missing`，不伪造新闻。
- **同行对比**：使用预设可比公司清单 + 真实估值/财务指标；区间涨跌幅未取数（为控制 API 调用）。
- **重新研究维度派生**：依赖已保存快照的 `currentState`（正常全量研究保存无此问题）。
- **未接入历史 PE / 公告新闻 / 政策原文**：均以诚实 `missing` 表达。

---

## 12. 不支持的能力（明确不提供）

- 买入 / 卖出 / 持有建议
- 股票评分（如「85 分」「强烈看好」）
- 股价 / 涨跌幅 / 收益率预测
- 自动交易、量化回测、组合管理
- 后台定时任务、推送/邮件/微信通知
- 不保证实时行情持续可用

---

## 13. AI 使用说明

开发与产品中 AI 的分工、校验与降级策略，见 [AI_USAGE.md](./AI_USAGE.md)。
