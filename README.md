# Magick AD WP

WordPress 广告插件，提供广告位配置、投放条件、统计与诊断。

**功能**

- 广告位配置（页面范围、插入位置、设备、登录状态）
- 展示/点击统计
- 诊断日志与导出
- 前端渲染与追踪

开发环境在 wp-config.php 中添加：
调试用

```php
define('MAGICK_AD_DEBUG', true);

```

**目录结构**

- `src/` 业务代码
- `build/` 前端构建产物
- `dist/` 发布包（发布用）
- `templates/` 前端模板

**开发与构建**

- 开发：`pnpm run start`
- 打包：`pnpm run build`
- 生成发布包：`pnpm run dist`

**插件检查**

```shell
wp plugin check "wp-content/plugins/magick-ad/dist/magick-ad" --format=table
```

**系统设置（新增）**

在“系统设置 → 统计与去重 / 安全与缓存”中新增了以下开关：

- `rate_limit_fallback`：限流回退策略。可选 `off`（默认）或 `transient`。当站点没有持久化对象缓存时，`transient` 会写入数据库；默认关闭以避免写入压力。
- `stats_write_mode`：统计写入模式。可选 `async`（默认）或 `sync`。`async` 会进入统计队列，由 Cron 批量落库；`sync` 直接写库。

**队列观测与报警**

在“系统设置 → 统计与去重”会显示队列长度与最久等待时间，且在积压时给出提示。Site Health 也新增了“统计队列积压”检查。

- 队列启用条件：`stats_write_mode=async` 且未启用持久化对象缓存。
- 默认告警阈值：队列长度 ≥ 300 或最久等待 ≥ 900 秒（达到 2 倍阈值为严重）。
- 可通过过滤器调整阈值：`magick_ad_stats_queue_alert_limit`、`magick_ad_stats_queue_alert_age`。

**dist 同步脚本用法**

```shell
scripts/sync-dist.sh
```

它的用途：**把开发目录的源码和资源一键同步到 `dist/magick-ad/`**，避免你每次手动 `cp` 一堆文件。

具体做了这些事：

- 同步 `src/`、`assets/`、`templates/` 到 `dist/magick-ad/`。
- 复制根文件：`magick-ad.php`、`uninstall.php`、`readme.txt`、`LICENSE`。
- 不会重建 `build/`，只做“同步”，适合你手工改 PHP/资产后快速更新发布产物。

什么时候用：

- 你改了 PHP 或资产，希望 `dist` 版本立刻跟上。
- 准备跑 `wp plugin check dist/...` 前，确保检查的是最新代码。

它不会做的事：

- 不会编译前端（`build/` 还是你自己跑构建）。
- 不会清理 `dist` 以外的东西。

**展示页面与位置**

- 页面范围：全站、仅首页、仅文章页、仅单页、仅分类页、仅标签页、仅搜索结果页、仅 404 页、仅作者页
- 位置（非文章/单页）：顶部、内容前、内容后、底部
- 位置（文章/单页）：顶部、内容前、文章顶部、位置第三段、文章底部、评论列表顶部、评论框上方、评论框下方、评论列表底部、内容后、底部
