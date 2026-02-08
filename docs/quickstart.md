# Magick AD Quickstart

本指南用于在 30 分钟内完成本地开发、构建与基础验证。

## 1. 环境要求

- WordPress `>= 6.5`
- PHP `>= 8.1`
- Node.js `>= 18`（建议 20）
- pnpm `>= 9`

## 2. 安装与启动

1. 将插件放入 `wp-content/plugins/magick-ad`。
2. 安装依赖：

```bash
pnpm install
```

3. 启动前端构建监听：

```bash
pnpm run start
```

4. 在 WP 后台启用插件 `Magick AD`。

## 3. 最小可用配置（百搭默认）

1. 新建一个广告，创意类型先用 `代码/HTML` 或 `图片`。
2. 投放位置选择 `内容前` 或 `底部`。
3. 系统设置建议先保持：
- `统计写入模式 = async`
- `缓存友好 Slot 轮播 = 开启`
- `Full HTML 沙箱 = 开启`

## 4. 构建与发布包

```bash
pnpm run build
pnpm run dist
pnpm run release
```

- `dist`：生成目录包 `dist/magick-ad/`
- `release`：生成 zip 发布包 `dist/magick-ad-<version>.zip`

## 5. 发布前门禁（推荐）

```bash
bash scripts/release-gate.sh
```

门禁包含：
- 前端构建
- PHP 语法检查（如果本机有 `php`）
- 可选 E2E（设置 `MAGICK_AD_E2E_PREVIEW_PATH` 时）
- 发布包生成与校验

## 6. E2E 最短路径

```bash
MAGICK_AD_E2E_PREVIEW_PATH="http://magick-ad.local/" \
MAGICK_AD_E2E_REQUIRE_CONSENT=1 \
pnpm exec playwright test tests/e2e/tracking.spec.js tests/e2e/compatibility-matrix.spec.js --project=chromium
```

如果首次下载浏览器失败，先单独执行：

```bash
pnpm exec playwright install chromium chromium-headless-shell
```

## 7. 关键入口

- 广告配置：`wp-admin/admin.php?page=magick-ad`
- 统计看板：`wp-admin/admin.php?page=magick-ad-report`
- 兼容报告：`wp-admin/admin.php?page=magick-ad-compat`
- 站点健康：`wp-admin/site-health.php?tab=direct`

## 8. 常用诊断命令

PHP 全量语法检查（无 `rg` 依赖）：

```bash
find . -type f -name "*.php" \
  ! -path "./dist/*" \
  ! -path "./vendor/*" \
  ! -path "./node_modules/*" \
  -print0 | xargs -0 -n1 php -l
```
