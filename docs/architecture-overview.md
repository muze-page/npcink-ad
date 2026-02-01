# 项目技术架构概览

## 1. 项目摘要 (Executive Summary)

一句话定义：这是一个面向 WordPress 的广告投放与素材管理插件，提供从后台配置、前台渲染到统计追踪的一体化投放链路。

关键功能点 (Key Features)：
- 广告资产管理：自定义广告 CPT（`magick_ad`）+ 元数据存储完整广告配置。
- 多投放入口：区块（Block）、短代码（Shortcode）、模板标签（Template Tag）。
- 前台投放引擎：按位置、页面、设备、登录态、定向规则进行投放筛选与权重抽样。
- 统计与诊断：曝光/点击记录、诊断日志、可视化报表。
- 模板/Pattern 库：内置模板与分类管理、收藏/置顶偏好。

## 2. 技术架构深度解析 (Technical Architecture)

### 设计模式
- **Singleton**：`src/Plugin.php` 使用单例启动插件生命周期。
- **Observer/Hooks**：大量使用 WordPress actions/filters 注入生命周期（`init`, `wp_head`, `the_content` 等）。
- **Controller（REST）**：`src/REST/Controllers/*` 以 REST Controller 方式承载 API 逻辑。
- **Strategy（枚举）**：`src/Utils/TrackingStrategy.php` 统一跟踪策略枚举。

### 核心类 / 模块
- `src/Plugin.php`：插件总入口，注册模块与迁移。
- `src/Admin/Admin.php`：后台菜单与 UI 资源加载，注入 `window.MagickAD` 配置。
- `src/Frontend/Frontend.php`：投放核心引擎，负责匹配、渲染、Hook 注入、预览逻辑。
- `src/Data/Ads.php`：广告 CPT 管理与持久化，负责保存/更新/删除广告数据。
- `src/Data/Settings.php`：配置 Sanitization 与 Validation。
- `src/Data/Slots.php`：广告位 Slot 存储（`magick_ad_slots` option）。
- `src/Data/Schema.php`：统计表结构管理（stats/log）。
- `src/REST/Routes.php`：注册 REST 路由与权限控制。
- `src/REST/Controllers/Track_Controller.php`：曝光/点击追踪与去重、签名验证、写库。
- `src/Blocks/*`：区块注册、动态绑定与模板库（Patterns）。
- `src/Utils/*`：权限、调试、日志、跟踪策略。

### 前后端交互
- 后台 UI 使用 React（`assets/js/*` → `build/index.js`）。
- 后端通过 `wp_add_inline_script` 注入 `window.MagickAD`（nonce、previewUrl、patterns、branding 等）。
- 主要交互通过 REST API：
  - `/magick-ad/v1/save-settings`：保存广告与 slot 设置
  - `/magick-ad/v1/system-settings`：系统级设置
  - `/magick-ad/v1/report`：报表数据
  - `/magick-ad/v1/debug`：调试开关
  - `/magick-ad/v1/track`：前台曝光/点击上报
  - `/template-categories`、`/template-preferences`：模板分类/偏好

### 数据库设计
- **CPT**：`magick_ad` 保存广告实体。
  - `_magick_ad_data`：广告内容/规则/配置 JSON
  - `_magick_ad_id`：广告外部 ID（如 `ad_123`）
- **Options**：
  - `magick_ad_slots`：slot 列表（id/label/ad_ids/weights/limit）
  - `magick_ad_tracking_*`：跟踪策略、去重 TTL、签名要求等
  - `magick_ad_brand_*`：后台品牌信息
  - `magick_ad_template_categories`：模板分类
- **User Meta**：
  - `magick_ad_template_favorites` / `magick_ad_template_pins`：模板偏好
- **自定义表**：
  - `wp_magick_ad_stats`：按日统计（date, ad_id, impressions, clicks）
  - `wp_magick_ad_stats_log`：诊断日志（事件明细）

## 3. 关键流程图解 (Key Workflows)

### A. 后台保存广告配置
1) React UI 调用 `/magick-ad/v1/save-settings`
2) `Settings_Controller::save()` 接收 JSON
3) `Settings::sanitize_settings()` → `Settings::validate_settings()`
4) `Ads::store_ads()` 持久化 CPT + meta
5) `Slots::save_slots()` 写入 `magick_ad_slots`
6) 返回保存结果，前端更新状态

### B. 前台投放
1) `Frontend::init()` 挂载各种 Hook
2) `get_matching_ads_for()` 构建缓存并按 placement 区域聚合
3) 根据 hook（content/head/footer/body_top/comments/loop）输出
4) 按广告规则（启用、页面、设备、登录态、定向）过滤
5) Slot 内部权重 = ad.weight * slot.weight；支持 limit 多条输出

### C. 追踪与统计
1) 前端 `assets/magick-ad-track.js` 触发 `/track`
2) `Track_Controller::track()` 校验签名、去重、权限
3) 写入 `magick_ad_stats`
4) 如果开启诊断，写入 `magick_ad_stats_log`

## 4. 项目文件结构说明 (Directory Structure)

```
/src
  /Admin        后台菜单与资源注入
  /Blocks       Gutenberg Block + Patterns + 动态绑定
  /CLI          WP-CLI smoke 测试
  /Data         数据层（CPT/Options/Schema/迁移）
  /Frontend     前台投放与渲染核心
  /REST         REST API 路由与控制器
  /Utils        权限/调试/日志/策略工具
/assets         源码与前端脚本（React/JS）
/build          编译后的后台 UI 包
/templates      前台模板 wrapper（comments）
```

## 5. 快速上手指南 (Developer Onboarding)

**先看哪里？**
1) `src/Plugin.php`：注册入口与模块总览
2) `src/Frontend/Frontend.php`：投放引擎与匹配逻辑
3) `src/Data/Settings.php`：所有规则校验与 Sanitization
4) `src/REST/Routes.php`：API 全景图

**常见坑 / 依赖**
- REST 写操作必须通过 `X-WP-Nonce`（`Capabilities::rest_can_manage()` 校验）。
- 统计依赖自定义表，未安装会导致报表为空。
- `magick_ad_has_consent` 过滤器影响 tracking、cookie 随机策略。
- `magick_ad_allow_external_pattern_assets` 控制模板库外链素材开关。
- 预览与节点调试走 URL 参数（`magick_ad_preview` / `magick_ad_node_debug`）。
