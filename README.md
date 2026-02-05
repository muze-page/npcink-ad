# Magick AD WP

WordPress 广告插件，提供广告位配置、投放条件、统计与诊断。

**功能**

- 广告位配置（页面范围、插入位置、设备、登录状态）
- 展示/点击统计
- 诊断日志与导出
- 前端渲染与追踪

开发环境在 wp-config.php 中添加：

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

- `wp plugin check "wp-content/plugins/magick-ad/dist/magick-ad" --format=table`

**展示页面与位置**

- 页面范围：全站、仅首页、仅文章页、仅单页、仅分类页、仅标签页、仅搜索结果页、仅 404 页、仅作者页
- 位置（非文章/单页）：顶部、内容前、内容后、底部
- 位置（文章/单页）：顶部、内容前、文章顶部、位置第三段、文章底部、评论列表顶部、评论框上方、评论框下方、评论列表底部、内容后、底部
