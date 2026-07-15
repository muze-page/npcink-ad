# Npcink Ad 0.1 Architecture Overview

## 1. 核心链路

1. 编辑者在 `npcink_promotion` 的原生区块编辑器中完成创意和展示规则。
2. 编辑器侧栏通过 Core REST 保存 typed meta；发布或排程请求先用同一 evaluator 做配置预检。浏览器只镜像非阻断的即时检查与重叠提示，PHP 仍是最终依据。
3. 推广列表、真实页面预览与正式前台都复用 `Eligibility_Evaluator`，列表只报告规则状态，不声称某次访问一定正在展示。
4. 判断通过后由服务端 Renderer 输出区块内容；匿名访问不会看到诊断信息或未发布创意。
5. Promotion 改为草稿即暂停，开始/结束时间由站点时区解释；列表可通过受 nonce 保护的 POST 操作快速暂停/恢复。

没有浏览器端权威投放资格判定、访客追踪、异步事件管线或自定义数据表。

## 2. 数据模型

唯一 CPT 是 `npcink_promotion`：

- `post_title`、`post_content`：标题和原生区块创意；
- `post_status`：草稿/发布的唯一状态真相；
- `_npcink_ad_location`：`block | content_before | content_after`；
- `_npcink_ad_page_scope`：`all | selected`；
- `_npcink_ad_include_ids`、`_npcink_ad_exclude_ids`：去重、最多 50 个正整数 ID；
- `_npcink_ad_device`：`all | desktop | mobile`；
- `_npcink_ad_start_at`、`_npcink_ad_end_at`：可选的 WordPress 本地时间。

全部 meta 都有 REST schema、sanitize callback、auth callback 和 revision 支持。管理路由要求 `manage_npcink_ads`，该能力默认授予 administrator 和 editor。

## 3. 模块边界

- `Post_Types`：唯一 CPT、typed meta 与输入规范化；
- `Repository`：把 WordPress Post/meta 映射为领域数组；
- `Eligibility_Evaluator`：无 WordPress 调用的纯策略，依次提供配置、就绪度和完整请求判定；
- `Overlap_Detector`：无 WordPress 调用的纯提示策略，只判断两个自动投放规则是否可能同时展示，不改变资格或发布结果；
- `Delivery`：构造页面、位置、时间和预览设备上下文；
- `Renderer`：安全渲染创意、管理占位和预览结论；
- `Eligibility_Messages`：把稳定 reason codes 映射为所有管理/预览界面共用的文案；
- `Preview_Request`：校验 capability + nonce，关闭缓存并在真实页面强制显示预览；
- `Promotion_Preflight`：在 Core REST 发布/排程前合并完整候选记录并拒绝无效配置；
- `Promotion_List` / `Promotion_Status_Action`：规则摘要与严格的 publish ↔ draft 状态操作；
- `Editor` / `Preview_Page`：侧栏设置、即时预检、非阻断重叠提示与桌面/移动 iframe 画布；
- `Blocks` / `Patterns`：一个动态引用区块和三个 Core block 起步样式。

## 4. 稳定 reason codes

- `promotion_not_published`
- `promotion_not_started`
- `promotion_expired`
- `promotion_content_empty`
- `promotion_targets_empty`
- `promotion_schedule_invalid`
- `page_not_included`
- `page_excluded`
- `location_mismatch`
- `device_mismatch`（只用于显式预览设备上下文）

协调层还可产生 `promotion_missing` 与 `recursive_promotion`。新增规则必须先扩充 evaluator 的表驱动测试。

## 5. 预览、安全和缓存

- 预览 URL 绑定 Promotion nonce，只允许拥有 `manage_npcink_ads` 的登录用户；
- 预览响应发送 no-cache 与 noindex 头，匿名请求返回 403；
- 预览与正式投放共用 evaluator/renderer，唯一差异是管理者可强制看见被规则阻止的创意；
- 正式设备规则使用 CSS 断点，HTML 不按 User-Agent 分叉；
- 第三方整页缓存可能延迟发布、暂停和时间边界，0.1 要求站点配置 TTL 或主动清理缓存，不宣称穿透任意缓存。

## 6. 质量和发布

- PHPUnit：配置、页面、时间边界、位置、列表状态和恢复状态机；
- PHPCS / PHPStan：WordPress 编码、安全与类型边界；
- TypeScript / JS / CSS lint：编辑器与动态区块；
- Playground：WP 6.5/PHP 8.1 和当前版本的打包插件集成、REST 发布预检、时区/排期边界、无表/Options、卸载；
- Local 浏览器：同一编辑页创建规则、真实主题预览、发布/暂停和匿名前台。

发布包固定为 `npcink-ad/`，包含构建产物、运行 PHP、前端/预览 CSS、`readme.txt` 和许可证，不包含源码 JS、测试、文档或旧品牌运行标识。
