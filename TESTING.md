# 测试说明

本文记录 AIME Insight 的测试策略、覆盖范围与关键场景。

---

## 1. Unit Tests（单元测试）

运行：`npm test`（Node 内置 `node:test`，类型剥离直接运行 `.ts`）。

| 文件 | 覆盖 |
|---|---|
| `tests/unit/metrics.test.ts` | 同比/环比、区间收益、最大回撤、波动率、趋势、现金含量、格式化 |
| `tests/unit/evidence.test.ts` | 证据构建、方向分类、背离检测、演示数据标识 |
| `tests/unit/mock.test.ts` | mock 数据口径（净利润现金含量为百分比） |
| `tests/unit/interpreter.test.ts` | schema 校验、Evidence ID 校验、数字溯源、模板降级、合规、prompt injection |
| `tests/unit/update.test.ts` | 新旧状态比较：强化/弱化/新增矛盾/新增未知/失效/失败保护 |
| `tests/unit/store.test.ts` | Research/Version/Observation 持久化、快照不可变、多研究任务 |

**测试目标**：确定性计算正确、证据可追溯、LLM 输出校验可靠、存储一致。

---

## 2. Integration Tests（集成测试）

覆盖 **数据层 → 指标引擎 → 证据引擎 → Interpreter** 的编排（`runResearch`），以及 **保存 → 版本 → 比较 → 观察** 的持久化链路。以单元测试形式落在 `store.test.ts` / `update.test.ts`。

**测试目标**：多模块协作正确，版本与观察互不串扰。

---

## 3. E2E / Smoke Tests（端到端冒烟）

使用 HTTP + node fetch 走通完整链路（见 Phase 6 验收）：

首页 → Research Map → 研究台 → 保存 Research → 建立 Observation → 我的研究 → 重新研究 → Research Update → 历史版本。

**测试方法**：启动生产服务器，POST `/api/research/save`、`/api/research/rerun`、`/api/observations`，GET `/research`、`/observations`、`/research/[thscode]/history`。

**预期/实际**：见下方「实测结果」。

---

## 4. Live Mode Test（真实数据）

配置 `FUYAO_API_KEY` + `DEEPSEEK_API_KEY` 后：

- 数据源为「扶摇金融数据 API」（无「演示数据」标识）
- 摘要标注「由 DeepSeek 生成」
- 真实标的：贵州茅台（600519.SH）行情/财务/估值真实返回
- 同行对比使用预设清单 + 真实估值/财务指标
- 事件维度（公告/新闻未接入 iFinD）诚实显示 missing

---

## 5. Mock Mode Test（演示数据）

未配置 Key 时：

- 顶部横幅「演示模式」
- 数据源标注「（演示数据）」
- 摘要标注「模板解释（未连接模型）」
- 页面正常渲染，不报错

---

## 6. LLM Failure Test

| 场景 | 预期 |
|---|---|
| Key 缺失 | 模板解释 + 明确标识 |
| API 失败/超时 | 模板解释 |
| JSON malformed | 模板解释 |
| 结构不合 schema | 模板解释 |
| 引用不存在 Evidence ID | 拒绝 → 模板解释 |
| 输出未经 Evidence 支持的数字 | 拒绝 → 模板解释 |
| 恶意 Evidence 文本 | 只作数据处理，不执行 |

单测覆盖于 `interpreter.test.ts`。

---

## 7. Evidence Validation Test

- 每条 Evidence 含完整溯源字段（id/metric/value/unit/period/source/rawField/method）
- 非法 Evidence ID 无法写入 Research State（`store.test.ts`）
- Evidence Drawer 展示完整字段（人工/HTTP 验证）

---

## 8. Research Version Test

- 同一 thscode + 相同 goal → 复用同一 Research，版本递增
- 同一 thscode + 不同 goal → 新建 Research，独立版本号
- 快照不可变：旧版本不被新数据覆盖

---

## 9. Observation Test

- Observation 通过 `researchId` 关联具体 Research
- 检查最新情况 → 产生变化结果 → 查看 Research Update
- 同一公司不同 Research 的观察互不串扰

---

## 10. 合规边界测试

- 不输出买卖建议 / 涨跌预测 / 收益承诺 / 评分
- 数据缺失显示 missing/unknown，不补零、不猜测
- failed/missing 不判为 negative

---

## 11. Known Limitations（测试盲区）

- E2E 冒烟依赖真实 API Key，无 Key 时用 mock 模式替代
- 无浏览器自动化（未引入 Playwright 等），UI 交互为人工/HTTP 验证
- 后台定时任务、推送通知不在 MVP 范围，未测试
