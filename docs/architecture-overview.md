# Npcink Ad Architecture Overview

## 1. 核心链路

1. 编辑者在 `npcink_promotion` 的原生区块编辑器中完成创意和展示规则。
2. 编辑器侧栏通过 Core REST 保存 typed meta；发布或排程请求先用同一 evaluator 做配置预检。发布或排程被 REST 拒绝后，编辑器以 Core 持久 `post_status` 恢复 edited status；浏览器只镜像非阻断的即时检查与重叠提示，PHP 仍是最终依据。
3. 推广列表、真实页面预览与正式前台都复用 `Eligibility_Evaluator`，列表只报告规则状态，不声称某次访问一定正在展示。
4. 判断通过后由服务端 Renderer 输出区块内容；匿名访问不会看到诊断信息或未发布创意。
5. Promotion 改为草稿即暂停，开始/结束时间由站点时区解释；列表可通过受 nonce 保护的 POST 操作快速暂停/恢复。

没有浏览器端权威投放资格判定、访客追踪、异步事件管线或自定义数据表。

## 2. 数据模型

唯一 CPT 是 `npcink_promotion`：

- `post_title`、`post_content`：标题和原生区块创意；
- `post_status`：草稿/发布的唯一状态真相；
- `_npcink_ad_location`：`block | content_before | content_after | content_after_paragraph`；
- `_npcink_ad_paragraph_number`：仅段落位置使用的整数，默认 `3`，有效范围 `1..20`；
- `_npcink_ad_content_scope`：`all | posts | pages | terms | selected`；自动投放使用五种互斥范围，手动区块/短代码只保留 `all | selected`，其他高级值由 PHP 按 `all` 处理；
- `_npcink_ad_include_ids`、`_npcink_ad_exclude_ids`：去重、最多 50 个正整数 ID；
- `_npcink_ad_category_ids`、`_npcink_ad_tag_ids`：仅用于自动 `terms` 范围的 Core 分类/标签 ID；两组正向 term 为 OR，不展开分类后代，也没有 term exclusion；
- `_npcink_ad_device`：`all | desktop | mobile`；正式前台固定以 `781px`/`782px` 为移动/桌面边界；
- `_npcink_ad_start_at`、`_npcink_ad_end_at`：可选的 WordPress 本地时间。

全部 meta 都有 REST schema、sanitize callback、auth callback 和 revision 支持。管理路由要求 `manage_npcink_ads`，该能力默认授予 administrator 和 editor。

### 手动入口与设备边界

- `_npcink_ad_location=block` 同时服务于动态 `npcink-ad/promotion` 区块和 `[npcink_ad promotion="ID"]` 短代码；两者都直接引用同一 Promotion，并复用 `block` location 的 PHP 投放路径。
- 手动 `all` 表示在区块或短代码被显式插入的位置应用其余规则，不继承自动位置的标准 post/page 限制；手动 `selected` 只接受显式选择的已发布标准文章/页面；ID 排除始终优先。
- 编辑器对所选文章正文的区块核验只是非阻断证据。模板、同步样板、短代码和后续内容变更都可能让正文扫描不完整，真实页面预览才是管理者的最终上下文核验。
- 正常投放始终输出 cache-stable HTML 与设备 class；CSS 在 `max-width: 781px` 隐藏 desktop-only，在 `min-width: 782px` 隐藏 mobile-only。没有 User-Agent 分叉、tablet、可配置断点或必需前端 JavaScript。
- 真实页面预览的 mobile iframe 最多 `390px`，只代表一种移动画布宽度，不是正式投放断点；预览仍使用同一 evaluator 并显示真实 verdict。
- 该引导未新增 meta、REST 字段、reason code 或 block attribute；区块 attributes 仍严格为 `promotionId`、`reserveHeight`、`preview`。

## 3. 模块边界

- `Post_Types`：唯一 CPT、typed meta 与输入规范化；
- `Repository`：把 WordPress Post/meta 映射为领域数组，并以当前 Core term 状态解析 `category_ids`、`tag_ids` 与派生的 `terms_valid`；
- `Eligibility_Evaluator`：无 WordPress 调用的纯策略，依次提供配置、就绪度和完整请求判定；
- `Overlap_Detector`：无 WordPress 调用的纯提示策略，只判断两个自动投放规则是否可能同时展示，不改变资格或发布结果；
- `Delivery`：构造内容 ID、标准 post/page 类型、文章直接分类/标签、位置、时间和预览设备上下文；page 不提供 term 上下文，CPT 不进入自动投放；
- `Paragraph_Inserter`：在区块渲染前标记顶层段落锚点，并在渲染后替换为服务端输出；Classic 内容由 Core HTML tokenizer 识别真实 `P` closer，排除 comment、raw-text、template 后代和 attribute 中的伪标签；
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
- `promotion_terms_invalid`
- `promotion_schedule_invalid`
- `promotion_paragraph_invalid`
- `content_not_included`
- `content_excluded`
- `content_type_mismatch`
- `post_terms_mismatch`
- `content_terms_unavailable`
- `location_mismatch`
- `content_anchor_missing`（只在真实页面段落预览提供了锚点上下文时产生）
- `device_mismatch`（只用于显式预览设备上下文）

`content_not_included` 与 `content_excluded` 同时覆盖标准 post/page ID 范围；pre-GA 不保留旧的 page 命名双码。协调层还可产生 `promotion_missing` 与 `recursive_promotion`。新增规则必须先扩充 evaluator 的表驱动测试。

## 5. 预览、安全和缓存

- 预览 URL 绑定 Promotion nonce，只允许拥有 `manage_npcink_ads` 的登录用户；
- 预览响应发送 no-cache 与 noindex 头，匿名请求返回 403；
- 预览与正式投放共用 evaluator/renderer，唯一差异是管理者可强制看见被规则阻止的创意；
- 段落位置在 Gutenberg 中只计算顶层 `core/paragraph`；Classic 内容计算渲染后的 `<p>`；正式投放缺少锚点时不回退，授权预览才会在文末显示创意并明确报告 `content_anchor_missing`；
- 正式设备规则使用固定 CSS 断点：mobile 为 `781px` 及以下，desktop 为 `782px` 及以上，`all` 不隐藏；HTML 不按 User-Agent 分叉；
- 第三方整页缓存可能延迟发布、暂停、开始和停止时间边界；0.2.0 要求站点配置合适的 TTL 或主动清理受影响页面，不宣称穿透任意第三方缓存。

## 6. 质量和发布

- PHPUnit：配置、页面、时间边界、位置、列表状态和恢复状态机；
- PHPCS / PHPStan：WordPress 编码、安全与类型边界；
- TypeScript / JS / CSS lint：编辑器与动态区块；
- Promotion 编辑器 SlotFill 优先使用当前 `@wordpress/editor` 导出及其 `wp-editor` 依赖；WordPress 6.5 保留 `@wordpress/edit-post` / `wp-edit-post` fallback。`Requires at least` 低于 6.6 时，release gate 解析构建资产的 dependency array，要求该 fallback 依赖存在，并拒绝 6.6 之前不可用的 `react-jsx-runtime`；
- Playground：WP 6.5/PHP 8.1 和当前版本的打包插件集成、五种 canonical content scope、真实 Core category/tag 直接关系与动态变更、term fail-closed、REST 发布/恢复预检、真实 `the_content` 优先级 `8 → 9 → 10` 的 marker 复制后单次渲染与残余清理、固定 `781px`/`782px` CSS 契约、区块三属性边界、预览说明、时区/排期边界、无表/Options、卸载；
- Local 浏览器：同一编辑页创建规则、列表范围摘要、真实主题预览、发布/暂停和匿名前台。

发布包固定为 `npcink-ad/`，包含构建产物、运行 PHP、前端/预览 CSS、`readme.txt` 和许可证，不包含源码 JS、测试、文档或旧品牌运行标识。

受控 0.2 产品范围已由 0.2.0 版本事实和发布包统一承载；Git 标签、GitHub Release 与对外发布仍是仓库级发布动作，不能由功能文档提前宣称已经执行。
