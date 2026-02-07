**整改任务清单版（可直接建工单）**

| ID  | 优先级 | 任务                                     | 主要改动文件                                                                                                       | 交付物                                        | 验收标准                                          | 估时 |
| --- | ------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------- | ---- |
| T01 | P0     | 渲染风格三档（inherit/minimal/isolated） | `src/Data/Settings.php`、`src/Frontend/Frontend.php`、`assets/js/sections/AdsConfig.js`、`assets/js/index.css`     | 新增 `render_profile` 配置与渲染分支          | 同一广告在 3 种风格下均可正常显示，主题切换不破版 | 2d   |
| T02 | P0     | 节点插入预检与回退机制                   | `src/Frontend/Frontend.php`                                                                                        | 节点不存在时自动回退（footer/隐藏可配）       | 节点失效时不报错、不白屏，且有明确回退结果        | 2d   |
| T03 | P0     | “未展示原因码”统一                       | `src/Frontend/Frontend.php`、`src/Utils/Diagnostics.php`、`assets/js/panels/DebugPanel.js`                         | 统一 reason code 字典与展示文案               | 每次未展示都能在调试面板看到标准化原因码          | 2d   |
| T04 | P0     | 简洁模式强约束收口                       | `assets/js/sections/AdsConfig.js`、`assets/js/components/TemplateLibraryModal.js`、`src/Admin/Admin.php`           | 简洁模式仅保留核心能力（插入/基础统计）       | 简洁模式不再暴露可视化、AB、高风险配置            | 1.5d |
| T05 | P0     | 预设模板元数据体系                       | `src/Blocks/Patterns.php`、`assets/js/hooks/useTemplateLibrary.js`、`assets/js/components/TemplateLibraryModal.js` | 每个模板补齐场景、设备建议、风险等级          | 模板库可按“场景/容器/风险”筛选，选择效率提升      | 2d   |
| T06 | P0     | 性能护栏默认值                           | `src/Data/Settings.php`、`src/Frontend/Frontend.php`、`assets/js/frontend/magick-ad-interactivity.ts`              | 默认预留空间、默认非关键延迟、默认 async 统计 | 首页 CLS 增量 < 0.03；无明显首屏抖动              | 2d   |
| T07 | P0     | Site Health 扩展为“兼容体检”             | `src/Admin/Site_Health.php`、`assets/js/panels/SystemSettingsPanel.js`                                             | 新增节点插入可用性、Cron、队列、同意钩子检查  | 体检页可直接给出“问题 + 建议动作”                 | 1.5d |
| T08 | P1     | CMP/同意插件适配层                       | `src/Frontend/Frontend.php`、`src/REST/Controllers/Track_Controller.php`、`docs/`                                  | 常见同意信号适配（先走 filter 适配）          | 未同意时不追踪且不落库；同意后恢复正常            | 2d   |
| T09 | P1     | 统计可靠性与降级策略                     | `src/REST/Controllers/Track_Controller.php`、`src/Utils/Stats_Queue.php`、`src/Utils/Stats_Cron.php`               | 高峰期写入降级与重试策略                      | 峰值下无大量 5xx，队列可回收                      | 2d   |
| T10 | P1     | 模板版本化与迁移                         | `src/Blocks/Patterns.php`、`src/Data/Template_Migrator.php`                                                        | 模板 `version` 字段与迁移策略                 | 旧模板可继续渲染，新模板能力可渐进升级            | 2d   |
| T11 | P1     | 后台“兼容报告”页面                       | `src/Admin/Admin.php`、`assets/js/panels/`                                                                         | 一键导出兼容报告（环境、风险、建议）          | 运维可直接拿报告排查部署环境问题                  | 2d   |
| T12 | P2     | 自动化兼容矩阵（主题/缓存/设备）         | `tests/`（新增）                                                                                                   | E2E 回归基线（至少 10 套组合）                | 每次发布前自动跑兼容回归并产出结果                | 4d   |
| T13 | P2     | 发布门禁与回滚预案                       | `docs/`、CI 配置（新增）                                                                                           | 发布检查清单、回滚脚本、灰度策略              | 出现兼容故障可在 30 分钟内回滚                    | 1.5d |
| T14 | P2     | 文档体系整改（用户/开发/运维）           | `README.md`、`docs/architecture-overview.md`                                                                       | 三套文档：快速上手、兼容指引、排障手册        | 新同学可在 1 天内独立完成部署与排障               | 1.5d |

**建议执行顺序**

1. 先做 T01-T04（把“百搭稳定性”打牢）。
2. 再做 T05-T07（模板与体检能力）。
3. 最后做 T08-T14（生态适配、自动化与发布体系）。

如果你需要，我可以下一步直接输出 Jira 版（Epic -> Story -> Task，含验收用例与字段模板）。
