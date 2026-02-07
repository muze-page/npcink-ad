# Magick AD WP

WordPress 广告插件，提供广告投放配置、前端渲染、统计追踪、兼容体检与调试能力。

## 文档入口

- 快速上手：`docs/quickstart.md`
- 兼容指引：`docs/compatibility-guide.md`
- 排障手册：`docs/troubleshooting.md`
- 架构总览：`docs/architecture-overview.md`

## 主要能力

- 广告配置：页面范围、插入位置、设备、登录态与展示规则
- 模板库：系统预设 + 自定义模板（支持分类、收藏、置顶）
- 统计追踪：曝光/点击、维度统计、失败原因码
- 可靠性：异步队列 + 写入失败回退队列 + Cron 回收
- 兼容体检：节点插入、Cron、队列、同意门控检查
- 兼容报告：后台一键导出 JSON/Markdown

## 开发命令

```bash
pnpm install
pnpm run start
pnpm run build
pnpm run dist
pnpm run release
```

## 发布门禁

```bash
bash scripts/release-gate.sh
```

门禁默认执行：

- 前端构建
- PHP 语法检查（本机有 `php` 时）
- 可选 E2E（设置 `MAGICK_AD_E2E_PREVIEW_PATH` 时）
- 生成并校验发布 zip

## 回滚脚本

```bash
bash scripts/rollback.sh <release-zip> <plugin-target-dir>
```

## 发布包检查（可选）

```bash
wp plugin check "wp-content/plugins/magick-ad/dist/magick-ad" --format=table
find "wp-content/plugins/magick-ad/dist/magick-ad" -name "*.php" -print0 | xargs -0 -n 1 php -l
```

检查PHP错误

```shell
cd "/Users/muze/Local Sites/magick-ad/app/public/wp-content/plugins/magick-ad"

find . -type f -name "*.php" \
  ! -path "./dist/*" \
  ! -path "./vendor/*" \
  ! -path "./node_modules/*" \
  -print0 | xargs -0 -n1 php -l

```

## E2E

它帮你确认“功能真实可用 + 关键链路不炸 + 改造没引入明显回归”。
预览地址：http://magick-ad.local/

```shell
MAGICK_AD_E2E_PREVIEW_PATH="http://magick-ad.local/" pnpm run test:e2e

```

跑完整门禁（含构建、可选 E2E、打包）：

```shell
MAGICK_AD_E2E_PREVIEW_PATH="http://magick-ad.local/" bash scripts/release-gate.sh

```

本地如果想让 `tracking runtime` 在页面首屏就加载（不走延迟触发），可临时加过滤器：

```php
<?php
/**
 * 本地 E2E：强制 magick-ad-track 立即加载
 * 建议放到 wp-content/mu-plugins/magick-ad-e2e-force-track.php
 * 仅用于本地/测试环境，不建议生产启用。
 */
add_filter('magick_ad_track_defer', static function ($defer) {
    return false;
}, 10, 4);
```

加完后再跑 E2E，可避免因为延迟加载导致的 `window.magickAdTrack` 未就绪问题。

可以，给你一套可直接复制的分场景命令（在插件根目录执行）。

```bash
# 公共变量
BASE="http://magick-ad.local/"
```

```bash
# 场景 A：无同意（期望被门控）
MAGICK_AD_E2E_PREVIEW_PATH="$BASE" \
MAGICK_AD_E2E_REQUIRE_CONSENT=1 \
MAGICK_AD_E2E_HAS_CONSENT=0 \
pnpm exec playwright test tests/e2e/tracking-advanced.spec.js -g "respects consent guard"
```

```bash
# 场景 B：已同意（期望可写统计）
MAGICK_AD_E2E_PREVIEW_PATH="$BASE" \
MAGICK_AD_E2E_REQUIRE_CONSENT=1 \
MAGICK_AD_E2E_HAS_CONSENT=1 \
pnpm exec playwright test tests/e2e/tracking-advanced.spec.js -g "respects consent guard"
```

```bash
# 场景 C：兼容矩阵（10 组：桌面/平板/手机 + 带同意/无同意）
MAGICK_AD_E2E_PREVIEW_PATH="$BASE" \
MAGICK_AD_E2E_REQUIRE_CONSENT=1 \
pnpm exec playwright test tests/e2e/compatibility-matrix.spec.js
```

```bash
# 场景 D：完整 E2E（你当前环境）
MAGICK_AD_E2E_PREVIEW_PATH="$BASE" \
MAGICK_AD_E2E_REQUIRE_CONSENT=1 \
pnpm run test:e2e
```

```bash
# 场景 E：完整发布门禁（构建 + E2E + 打包）
MAGICK_AD_E2E_PREVIEW_PATH="$BASE" \
MAGICK_AD_E2E_REQUIRE_CONSENT=1 \
bash scripts/release-gate.sh
```
