# Magick AD Troubleshooting

## 1. 广告不展示

优先检查：

1. 广告是否启用，投放条件是否命中（页面/设备/登录态）。
2. 调试面板中的“未展示原因码”。
3. 节点插入场景是否存在目标节点，回退策略是否可用。

### 常见 `reason_code`

- `schedule_not_started`：未到开始时间
- `schedule_expired`：已过期
- `targeting_mismatch`：页面/分类/标签定向不命中
- `device_mismatch`：设备不匹配
- `login_mismatch`：登录状态不匹配
- `consent_required`：同意门控未通过

## 2. Track 接口异常

### 症状：大量 `403`

- 常见原因：签名不匹配、运行时密钥已轮换。
- 处理建议：检查 `tracking_require_signature`、重新渲染页面获取新签名。

### 症状：统计不增长但接口 200

- 常见原因：开启了同意门控且未同意。
- 处理建议：检查 CMP 信号、`magick_ad_has_consent` 接入逻辑。

## 3. 队列积压

### 症状

- 系统设置显示队列持续增长
- Site Health 提示 `统计队列积压`

### 处理

1. 检查 `WP-Cron` 是否可执行。
2. 查看数据库慢查询与资源占用。
3. 暂时降低写入压力或切换 `sync` 验证数据库链路。

## 4. Cron 未计划

检查：

- `wp_next_scheduled('magick_ad_flush_stats_cache')`
- Site Health 中 `Cron 任务健康度`

建议：

- 访问首页触发 WP-Cron
- 或由服务器 Crontab 调用 `wp-cron.php`

## 5. 模板异常（导入后不可用/字段缺失）

1. 检查模板内容是否包含 `<!-- wp:magick-ad/ad ... /-->`。
2. 确认模板 schema 已迁移到最新 `templateVersion`。
3. 在兼容报告页导出环境信息，确认是否存在旧数据未迁移。

## 6. 发布故障回滚

```bash
bash scripts/rollback.sh <release-zip> <plugin-target-dir>
```

示例：

```bash
bash scripts/rollback.sh dist/magick-ad-0.1.0.zip /var/www/html/wp-content/plugins/magick-ad
```

脚本会先备份当前目录，再将目标版本同步回插件目录。

## 7. E2E 常见失败

### 症状：`tracking sends click payload` 超时或点不到元素

- 常见原因：
  - 广告元素存在但不可见（如 `aria-hidden="true"` / delay 未到）
  - 当前页面未加载 tracking runtime
- 处理建议：
  - 用 `:visible` 目标触发点击或使用合成点击回退
  - 本地测试临时关闭 `magick_ad_track_defer`

### 症状：`page.goto(..., { waitUntil: 'networkidle' })` 超时

- 常见原因：页面有持续网络请求，`networkidle` 长时间不满足。
- 处理建议：
  - 改为 `waitUntil: 'domcontentloaded'` + 关键选择器等待
  - 对广告单元使用 `state: 'attached'` 或 `state: 'visible'` 的显式等待

### 症状：`Playwright does not support chromium on mac-arm64`

- 常见原因：错误设置了 `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE`。
- 处理建议：移除 override，直接执行：

```bash
pnpm exec playwright install chromium chromium-headless-shell
```

## 8. Shell 与命令环境问题

### 症状：提示符变成 `bash-3.2$`

- 原因：当前会话仍在 bash。
- 处理：

```bash
exec zsh
```

### 症状：`zsh: command not found: rg`

- 处理：使用 `find` 版替代命令（见 `docs/quickstart.md` 的语法检查命令）。
