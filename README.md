# Npcink Ad

Npcink Ad 0.1 是一个 WordPress 原生、隐私优先的站内推广发布工具。核心流程只有一条：**创建推广内容 → 设置展示规则 → 在真实页面预览运行结论 → 发布或暂停**。

> 0.1 是全新的 pre-GA 契约，不提供旧开发数据、API、区块或存储标识的兼容层。

## 产品边界

- 唯一内容类型：`npcink_promotion`。标题、区块内容、草稿/发布状态和全部展示规则都在同一条记录中。
- 规则 meta：位置、页面范围、包含/排除页面、设备、开始时间和结束时间，全部通过 typed meta 注册。
- 位置只有手动区块、正文前和正文后三种；区块和短代码直接引用 Promotion ID。
- 真实页面预览使用站点主题和同一套 PHP evaluator；预览可以让管理者看见被规则阻止的创意，但运行结论不会伪造为成功。
- 正式投放由服务端判断发布状态、页面和时间；设备可见性使用 CSS 断点，避免全页缓存按 User-Agent 串设备。
- 管理 REST 需要 `manage_npcink_ads`；插件激活时把该能力授予 administrator 和 editor。
- 默认没有追踪请求、访客 Cookie、自定义表、统计队列或必需的前端 JavaScript。

产品取舍见 [产品契约](docs/product-contract.md)，数据模型见 [ADR 003](docs/decisions/003-single-promotion-record.md)，模块边界见 [架构总览](docs/architecture-overview.md)。

## 明确不做

0.1 不包含 AdSense 管理、统计追踪、报表、A/B 测试、CMP、Popup、频控、地理定向、任意 PHP/JavaScript、模板市场、自定义数据库表或旧管理端 SPA。新增能力必须先证明它能缩短或降低“正确发布一条推广”的成本。

## 开发与验证

要求 PHP 8.1+、Node.js 20+、pnpm 10 和 Composer 2。

```bash
composer install
pnpm install --frozen-lockfile

composer check
pnpm check
bash scripts/release-gate.sh
```

WordPress Playground 覆盖最低和当前版本：

```bash
WP_VERSION=6.5 PHP_VERSION=8.1 tests/playground/run.sh
WP_VERSION=latest PHP_VERSION=8.5 tests/playground/run.sh
```

Playground 会验证单 Promotion 数据模型、typed meta、页面/时间/设备规则、区块/短代码/自动位置、匿名 REST 拒绝、无 Placement/Options/自定义表以及显式卸载清理。真实编辑器与主题页面交互仍需在 Local 中做浏览器验收。

## 发布包

```bash
bash scripts/release-gate.sh
```

产物为 `dist/npcink-ad-0.1.0.zip`，包内顶层目录固定为 `npcink-ad/`。发布门禁会校验构建体积、必需文件、禁止内容及发布包中不存在旧品牌运行标识。

排期依赖页面在时间边界后重新生成。使用第三方整页缓存时，需要配置相应缓存 TTL 或在 Promotion 变更和排期边界清理缓存；0.1 不宣称能穿透任意缓存实现分钟级排期。
