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

未设置 MAGICK_AD_E2E_PREVIEW_PATH，因此未执行真实页面 E2E（门禁脚本按预期跳过）。 是啥意思？