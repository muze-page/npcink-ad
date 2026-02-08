# Magick AD Release Playbook

本手册用于开发、测试、运维协同发布，目标是“可重复、可回滚、可追踪”。

## 1. 发布前检查

1. 合并前确保主干构建通过：`pnpm run build`
2. PHP 语法检查通过（全量）
3. E2E 核心链路通过：
   - `tests/e2e/tracking.spec.js`
   - `tests/e2e/compatibility-matrix.spec.js`
4. `README.md` 与 `docs/` 同步更新

## 2. 本地门禁（推荐）

```bash
MAGICK_AD_E2E_PREVIEW_PATH="http://magick-ad.local/" \
MAGICK_AD_E2E_REQUIRE_CONSENT=1 \
bash scripts/release-gate.sh
```

说明：

- 若本机已存在 Playwright Chromium，`release-gate.sh` 会自动跳过安装步骤。
- 产物默认输出到 `dist/magick-ad-<version>.zip`。

## 3. 发布产物核验

```bash
ls -lh dist/magick-ad-*.zip
unzip -l dist/magick-ad-*.zip | head
```

可选（有 WP-CLI 时）：

```bash
wp plugin check "wp-content/plugins/magick-ad/dist/magick-ad" --format=table
```

## 4. 灰度建议

1. 先在预发布站验证：
   - 后台广告配置页可打开
   - 前台至少 1 个广告正常展示
   - `track` 接口返回正常（非 5xx）
2. 再逐步推广到正式站。
3. 观察 30 分钟关键指标：
   - 前台错误日志
   - 队列积压
   - 接口失败原因码

## 5. 回滚流程

```bash
bash scripts/rollback.sh <release-zip> <plugin-target-dir>
```

示例：

```bash
bash scripts/rollback.sh dist/magick-ad-0.1.0.zip /var/www/html/wp-content/plugins/magick-ad
```

回滚后建议立即执行：

1. 后台进入插件页确认可加载
2. 打开一条前台页面确认广告可见
3. 执行一次核心 E2E（tracking）

## 6. GitHub Actions 对齐

- CI：`.github/workflows/ci.yml`
- 发布门禁：`.github/workflows/release-gate.yml`

两条工作流都基于 `scripts/release-gate.sh`，本地与 CI 行为保持一致。
