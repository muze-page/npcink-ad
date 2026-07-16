# Npcink Ad

Npcink Ad 0.2.1 是一个 WordPress 原生、隐私优先的站内推广发布工具。核心流程只有一条：**创建推广内容 → 设置展示规则 → 在真实页面预览运行结论 → 发布或暂停**。

> 0.2.1 延续全新的 pre-GA 契约，不提供旧开发数据、API、区块或存储标识的兼容层。

## 产品边界

- 唯一内容类型：`npcink_promotion`。标题、区块内容、草稿/发布状态和全部展示规则都在同一条记录中。
- 规则 meta：位置、canonical content scope、包含/排除内容、Core 分类/标签、设备、开始时间和结束时间，全部通过 typed meta 注册。
- 位置包括手动区块、正文前、正文后，以及第 1–20 段后（默认第 3 段）。手动位置不会自动创建入口：先保存 Promotion，再在目标位置插入 Npcink Ad Promotion 区块并选择同一 Promotion，或使用现有 `[npcink_ad promotion="ID"]` 专家短代码。
- 手动区块的 Promotion 选择器按服务器标题搜索，每页读取 20 条并可继续加载；已保存的 Promotion ID 会独立解析，因此不会因为不在当前搜索页而被误报为删除。
- Gutenberg 的段落位置只计算顶层段落区块，Classic 内容按实际 `<p>` 元素计算；正文不存在目标段落时正式投放不会偷偷改到文末。
- 真实页面预览使用站点主题和同一套 PHP evaluator；预览可以让管理者看见被规则阻止的创意，但运行结论不会伪造为成功。
- 推广列表直接汇总规则状态、位置、content scope、停止时间和不展示原因，并提供不新增页面的快捷暂停/恢复。
- 发布或排程前由服务端阻止空内容、无有效目标、非法段落号和错误时间范围；编辑器同时给出即时提示，并对手动区块或段落锚点做所选真实页面的非阻断核验。
- 正式投放由服务端判断发布状态、标准内容范围和时间；设备可见性使用固定 CSS 断点：desktop 为 `782px` 及以上，mobile 为 `781px` 及以下，all devices 在所有宽度可见，避免全页缓存按 User-Agent 串设备。预览中的 `390px` mobile 画布只是代表宽度，不是正式断点。
- 管理 REST 需要 `manage_npcink_ads`；插件激活时把该能力授予 administrator 和 editor。
- 默认没有追踪请求、访客 Cookie、自定义表、统计队列或必需的前端 JavaScript。

产品取舍见 [产品契约](docs/product-contract.md)，数据模型见 [ADR 003](docs/decisions/003-single-promotion-record.md)，手动入口与设备边界见 [ADR 008](docs/decisions/008-manual-placement-and-device-guidance.md)，模块边界见 [架构总览](docs/architecture-overview.md)。

0.2.0 建立了 [ADR 005](docs/decisions/005-controlled-delivery-expansion.md) 的受控投放范围：[ADR 006](docs/decisions/006-paragraph-anchor-delivery.md) 的第 N 段后位置、[ADR 007](docs/decisions/007-canonical-editorial-scope.md) 的互斥 content scope，以及 [ADR 008](docs/decisions/008-manual-placement-and-device-guidance.md) 的显式手动入口和固定设备说明。0.2.1 只收口 Issue #8：为手动区块选择器增加服务器标题搜索、真实分页、独立已选 ID 解析和真实 Gutenberg 编辑器 E2E；不改变 Promotion schema、区块属性、REST 契约、资格判定或前台投放。

## 明确不做

0.2.1 不包含 AdSense 管理、统计追踪、报表、A/B 测试、CMP、Popup、频控、地理定向、任意 PHP/JavaScript、模板市场、自定义数据库表或旧管理端 SPA。新增能力必须先证明它能缩短或降低“正确发布一条推广”的成本。

## 开发与验证

要求 PHP 8.1+、Node.js 20+、pnpm 10、Composer 2、WP-CLI 和 GNU gettext。

```bash
composer install
pnpm install --frozen-lockfile

composer check
pnpm check
bash scripts/release-gate.sh
```

插件内置完整的简体中文（`zh_CN`）PHP 与区块编辑器语言包。新增或修改界面文案后执行：

```bash
composer i18n:refresh
composer i18n:check
```

`i18n:refresh` 会从当前 PHP、区块元数据和生产 JavaScript 重新生成翻译模板，并保留已有中文翻译；如出现新字符串，完整性检查会失败，必须先补齐中文译文。

WordPress Playground 覆盖最低和当前版本：

```bash
WP_VERSION=6.5 PHP_VERSION=8.1 tests/playground/run.sh
WP_VERSION=latest PHP_VERSION=8.5 tests/playground/run.sh
```

Playground 会验证单 Promotion 数据模型、typed meta、发布预检、五种 canonical content scope、真实 Core 分类/标签直接关系与动态变更、term fail-closed、时间/设备规则、区块/短代码/自动位置、固定 `781px`/`782px` CSS 边界、区块三属性契约、预览断点说明、顶层区块与 Classic 段落锚点、管理员/订阅者/匿名 REST 边界、绑定 Promotion 的预览 nonce、时区与排期边界、无 Placement/Options/自定义表以及显式卸载清理。打包插件的真实 Gutenberg 编辑器 E2E 另行覆盖选择器键盘操作、服务器搜索、第二页加载、保存后重载和浏览器错误；列表快捷操作与主题页面交互仍需在 Local 中补充验收。

## 发布包

```bash
bash scripts/release-gate.sh
```

产物为 `dist/npcink-ad-<Version>.zip`，包内顶层目录固定为 `npcink-ad/`。发布门禁要求插件头、`NPCINK_AD_VERSION`、`package.json` 和 readme Stable tag 使用同一版本；由标签触发时，`GITHUB_REF_NAME` 必须为 `v<Version>`。门禁还会校验构建体积、必需文件、禁止内容及发布包中不存在旧品牌运行标识。

排期依赖页面在时间边界后重新生成。使用第三方整页缓存时，需要配置相应缓存 TTL，或在 Promotion 变更、开始和停止边界清理受影响页面；0.2.1 不宣称能穿透任意第三方缓存实现分钟级排期。
