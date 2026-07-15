# Magick AD WP

Magick AD 0.2 是一个处于 pre-GA 阶段的原生 WordPress 广告投放基线。它刻意只保留“创建广告、关联投放位、服务端判断、服务端渲染”这一条闭环。

> 0.2 是破坏性重置，不提供 0.1 开发数据、REST API、Options 或自定义表迁移。升级测试环境前请清除旧数据。

## 当前边界

- 广告：`magick_ad` CPT；广告内容使用区块内容，`_magick_ad_end_at` 保存可选的 WordPress 本地日期时间字符串。
- 投放位：`magick_ad_placement` CPT；typed meta 为 `_magick_ad_ad_id`、`_magick_ad_location` 和 `_magick_ad_device`。
- 两个 CPT 使用 WordPress 核心 REST 支撑编辑器，但所有相关端点均要求 `manage_magick_ads`，广告创意不是匿名公开 API。
- 展示决策：纯 PHP evaluator 返回 `allowed` 和稳定 reason codes。
- 渲染：动态区块和自动位置都在服务端执行相同的发布状态、过期时间和设备判断。
- 区块只保存 `placementId`、`reserveHeight` 和 `preview`，不复制广告内容。

架构决策见 [ADR 001](docs/decisions/001-pre-ga-native-wordpress-baseline.md)，模块边界见 [架构总览](docs/architecture-overview.md)。

## 明确不做

0.2 不包含统计追踪、报表、A/B 测试、CMP/同意检测、Popup 搭建器、任意自定义 JavaScript、模板迁移、自定义 REST 控制器、自定义数据库表或管理端 SPA。这些能力只有在真实使用需求和隐私边界明确后才会重新评估。

## 开发

要求 PHP 8.1+、Node.js 20+、pnpm 10 和 Composer 2。

```bash
composer install
pnpm install --frozen-lockfile

composer check
pnpm check
pnpm run build
```

`composer check` 依次运行 PHPUnit、WordPress Coding Standards 和 PHPStan。PHPUnit 覆盖纯展示决策；`tests/playground/` 提供可复用的打包插件集成 fixture，验证激活、CPT/meta、动态区块、短代码、服务端渲染、匿名 REST 边界和过期广告拒绝。浏览器中的编辑器交互仍需发布前人工 smoke test。

```bash
bash scripts/release-gate.sh
WP_VERSION=6.5 PHP_VERSION=8.1 tests/playground/run.sh
WP_VERSION=latest PHP_VERSION=8.5 tests/playground/run.sh
```

## 发布包

```bash
bash scripts/release-gate.sh
```

发布门禁执行 PHP 语法检查、Composer 检查、前端 type/lint 检查、一次生产构建、严格包体预算、固定目录打包和 zip 内容校验。产物位于 `dist/magick-ad-<version>.zip`，包内顶层目录固定为 `magick-ad`。

POT 生成不属于可重复发布打包过程，需要时单独运行：

```bash
wp i18n make-pot . languages/magick-ad.pot \
  --domain=magick-ad \
  --exclude=node_modules,build,assets/js,docs,dist,vendor
```
