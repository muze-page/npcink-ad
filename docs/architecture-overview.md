# Magick AD Architecture Overview

## 1. 总览

Magick AD 是一个 WordPress 广告投放插件，核心链路为：

1. 后台配置广告与系统设置
2. 前端按规则匹配并渲染广告
3. 追踪接口接收曝光/点击并写入统计
4. 异步队列与 Cron 回收保障高峰稳定性
5. 兼容体检与兼容报告支撑部署排查

## 2. 关键模块

- `src/Plugin.php`：插件生命周期入口
- `src/Admin/Admin.php`：后台菜单、资产注入、初始 tab 路由
- `src/Frontend/Frontend.php`：广告匹配、渲染、插入策略
- `src/REST/Routes.php`：REST 路由注册
- `src/REST/Controllers/Track_Controller.php`：追踪写入、签名校验、去重、降级写入
- `src/REST/Controllers/System_Settings_Controller.php`：系统设置读写
- `src/REST/Controllers/Compatibility_Report_Controller.php`：兼容报告导出
- `src/Data/Template_Migrator.php`：模板 schema 迁移
- `src/Utils/Consent.php`：CMP/同意信号适配层
- `src/Utils/Stats_Queue.php`：统计队列与回退队列
- `src/Utils/Stats_Cron.php`：统计落库计划任务

## 3. 关键数据

- CPT：`magick_ad`
- Options：
  - `magick_ad_slots`
  - `magick_ad_tracking_*`
  - `magick_ad_stats_*`
  - `magick_ad_template_*`
- 自定义表：
  - `wp_magick_ad_stats`
  - `wp_magick_ad_stats_dim`
  - `wp_magick_ad_stats_variant`
  - `wp_magick_ad_stats_event`
  - `wp_magick_ad_stats_log`

## 4. 追踪与可靠性策略

Track 写入优先级：

1. 统计累计器（可用时）
2. 异步队列
3. 直写数据库
4. 直写失败时进入回退队列（fail-open，避免高峰 5xx）
5. Cron 周期回收队列与回退队列

## 5. 同意与合规

- 同意入口：`Consent::has_consent()`
- 兼容常见 CMP 信号，并支持自定义：

```php
add_filter('magick_ad_has_consent', function ($has_consent) {
    return $has_consent;
});
```

- 启用同意门控时，未同意不会写追踪统计。

## 6. 模板体系

- 系统模板来源：`src/Blocks/Patterns.php`
- 模板 schema：`templateVersion`
- 迁移器负责将旧字段映射到最新属性，保证旧模板继续可用。

## 7. 管理端前端

- 入口：`assets/js/index.js`
- 主路由：`assets/js/sections/App.js`
  - `ads`：广告配置
  - `report`：统计看板
  - `compatibility`：兼容报告

## 8. 发布体系

- 门禁脚本：`scripts/release-gate.sh`
- 回滚脚本：`scripts/rollback.sh`
- CI 工作流：
  - `.github/workflows/ci.yml`
  - `.github/workflows/release-gate.yml`
