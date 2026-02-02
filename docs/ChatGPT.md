下面是基于你当前代码（`magick-ad` 插件目录结构、CPT + meta、slots option、自定义统计表、REST Controller、前台 resolver + tracking 脚本等）做的一份**偏“工程落地”的专业/现代化优化与修复建议**。我会尽量指出**具体风险点、对应文件/函数位置、以及可执行的改法**。

---

## 你当前实现的优点（先肯定架构方向）

从代码结构来看，你已经走在“现代 WP 插件”的正确路线上：

* **模块拆分清晰**：`src/Admin`、`src/Frontend`、`src/REST`、`src/Data`、`src/Utils`，可维护性不错。
* **数据层靠谱**：广告用 **CPT（`magick_ad`）** + meta 存 JSON，slot 用 option，统计用自定义表（`magick_ad_stats` / `_dim` / `_log`），比纯 option 更合理。
* **前端缓存友好**：slot “client resolver” 占位 + `/render-ad` 拉取，兼容页面缓存/CDN，这个方向很先进。
* **追踪脚本现代**：`IntersectionObserver`、`sendBeacon`、可延迟加载、可选 consent gating、签名校验、去重与限流都有雏形。
* **运维友好**：Site Health 检测、WP-CLI smoke command、迁移器等，都很“产品化”。

所以优化重点不是推翻，而是：**边界条件 + 抗滥用 + 性能/缓存 + 统计口径一致性 + 发布工程化**。

---

## P0 必修（建议优先修，不然会真实影响线上）

### 1) 统计表 “ready 判定”可能导致升级后 tracking 短期/持续失败（高优先级）

**位置：**

* `src/REST/Controllers/Track_Controller.php`

  * `ensure_stats_ready()` / `ensure_dim_ready()` / `ensure_log_ready()`

**现状问题：**
当 `magick_ad_stats_ready`（或 dim/log 的 ready）版本不一致时，你只做了 **“表是否存在”** 检查，然后就把 ready option 更新到当前 `MAGICK_AD_DB_VERSION`。
但这**不验证列是否齐全**（比如 `impressions` 这种升级新增列），也不会触发升级。

**风险：**

* 插件升级后，如果管理员还没进入后台触发 `Schema::maybe_upgrade()`，前台 `/track` 就会开始写库；SQL 用到了新列但旧表没该列 → 直接 `DB insert failed`，曝光/点击会丢。
* 更糟的是 ready option 已被置新版本，后续请求不会再检查，直到后台升级才恢复。

**建议修法（推荐路径）：**

* 给 `Schema` 增加一个 **public 的 readiness 检查**（比如 `Schema::is_ready()`），内部复用你现在 private 的 `is_schema_ready()` 逻辑。
* `Track_Controller` 的 `ensure_*_ready()` 不要只查表，要查列；只有确认 schema 正确才更新 ready option。

> 你现在 `Schema::is_schema_ready()` 是 private，Track_Controller 不能用 —— 建议新加一个 public wrapper。

---

### 2) Cookie 写入参数不一致，可能导致部分站点 Cookie 不生效

**位置：**

* `src/Blocks/Bindings.php`：`setcookie(... 'path' => COOKIEPATH, 'domain' => COOKIE_DOMAIN ...)`
* `src/REST/Controllers/Track_Controller.php`：`get_cookie_viewer_key()` 写 cookie 同样用 `COOKIEPATH`/`COOKIE_DOMAIN` 原值
* 对比：`src/Frontend/Frontend.php`：`maybe_init_random_cookie()` 已做了 `COOKIEPATH ?: '/'`、`COOKIE_DOMAIN ?: ''` 兜底

**建议：**

* 把 Bindings/Track_Controller 的 cookie 参数和 Frontend 统一：

  * `path` 用 `COOKIEPATH ?: '/'`
  * `domain` 用 `COOKIE_DOMAIN ?: ''`
* 同时建议统一 `secure`、`httponly`、`samesite` 策略（你已经做得很好：Lax + httponly）。

---

### 3) 必须声明并防护 PHP 版本（否则低版本直接 fatal）

你代码里已经用到了：

* `enum`（PHP 8.1+）
* `mixed`、命名参数（PHP 8+）

**建议：**

1. 在插件头部加：

* `Requires PHP: 8.1`
* `Requires at least: ...`、`Tested up to: ...`

2. 在 `magick-ad.php` 最前面加 guard：

* PHP < 8.1：后台提示 + 不加载核心类（必要时自动 deactivate），避免白屏。

---

### 4) “只使用区块广告”的页面可能不会加载前台追踪脚本（会导致区块广告无法统计/交互）

**核心点：**

* `Frontend::enqueue_assets()` 是否加载 `magick-ad-track.js` 取决于：
  `get_matching_ads_for('all')`（这来自保存的 CPT 广告配置是否命中）
* 但 `magick-ad/ad` 区块可以直接携带 creative（html/image/video/blocks），这类广告**不一定是 CPT 中的配置**
  → 如果页面只有区块广告、没有任何“命中的配置广告”，`enqueue_assets()` 直接 return，追踪脚本根本不加载。

**建议修法（推荐）：**

* 给 `assets/blocks/magick-ad-ad/block.json` 增加 `viewScript`（或者 PHP 注册 block 时加 `view_script`），确保**只要页面渲染该 block，就必定 enqueue 前台脚本 + 样式**。
* 或者在 `enqueue_assets()` 增加检测：

  * `has_block('magick-ad/ad')`（singe post）
  * 或对模板/FSE 场景更稳的是 block viewScript。

> 这条是“产品层面最容易被用户踩”的坑：用户放了区块但没有统计/弹窗行为，会认为插件坏了。

---

### 5) 发布包清理（避免 dev 文件进生产）

建议发布包剔除：

* `.DS_Store`
* `.pnpm-store/`
* `pnpm-lock.yaml`（可留在源码仓库，不建议进发布包）
* 甚至 `assets/js` 源码（看你是否要发布源码）

加 `.distignore` 或用构建脚本自动打包，只留运行必需文件：
`src/`、`assets/*.js/*.css`、`build/`、`templates/`、`languages/`、`uninstall.php` 等。

---

## P1 安全 & 抗滥用（你有公开 REST，这块非常关键）

### 6) 默认信任 `X-Forwarded-For` 存在伪造风险

**位置：** `Track_Controller::get_request_ip()`
目前优先读取 `HTTP_X_FORWARDED_FOR`，在没明确“可信代理”的站点上可被伪造。

**建议：**

* 默认只用 `REMOTE_ADDR`
* 只有在开启“可信代理模式”或命中 allowlist（例如 Cloudflare 回源 IP 段）时才读 XFF
* 你已留 filter，很好：把“默认更安全”即可。

---

### 7) 维度统计表（stats_dim）可被伪造 slot/position/container 撑爆

这是一个**非常现实的膨胀风险**：

* 你的签名（sig）只覆盖 `ad_id + sig_ts`，并不覆盖 `slot / position / container`
* 攻击者拿到页面里的 `ad_id/sig` 后，就可以反复请求 `/track`，并伪造大量随机 slot/position/container
* `stats_dim` 的主键包含这些字段 → 会疯狂产生新 key，数据膨胀

**建议（强烈推荐）：**

* 把签名升级为覆盖更多字段，例如：
  `HMAC(secret, ad_id|sig_ts|slot|position|container)`
  服务端按同样规则校验。
* 同时对维度字段做 allowlist：

  * container：`inline|popup|banner|floating|interstitial`
  * position：限定在你定义的集合（content_before/footer/...）
  * slot：限制为 `sanitize_title` + 长度（例如 ≤64）
* 为兼容旧版本可加 `sig_v`（签名版本），服务端同时支持 v1/v2，逐步切换。

---

### 8) 隐私合规：补齐 WordPress 隐私 API

你已经有：

* `magick_ad_has_consent` filter
* `requireConsent` 开关
* diagnostics 才收集 page_url（很不错）

建议再补：

* `wp_add_privacy_policy_content()`：提供可复制隐私政策文本（说明曝光/点击统计、cookie、日志内容与保留期）
* 如果 diagnostics/log 写了 `user_id`：实现个人数据导出/擦除 hook（`wp_privacy_personal_data_exporters` / `...erasers`），至少能按用户导出/清除诊断日志
* 文档明确 cookie（`magick_ad_uid`）用途、有效期、关闭方式

---

## P1/P2 统计口径与准确性（影响报表可信度）

### 9) 同一页面出现同一 ad_id 多次展示可能只算一次（潜在“口径 bug”）

**现状：**

* 前端 `observed` Map 用 `adId` 作 key → 一个页面同一 ad_id 只会触发一次 impression
* 后端 dedupe key 也不包含 slot/position/container（只含 ad_id + page_hash + viewer_key + event + date）

**结果：**

* 同一创意如果被用在两个 slot（或同页两个位置），曝光可能只算 1 次
* 维度表也只会落一个位置（取决于先触发的那个）

**建议：**

* 如果产品目标是“按位置统计”，应把 dedupe 范围改为 **placement 级别**：
  `ad_id + slot + position + container + page_hash + viewer_key + event + date`
* 如果你就是想“每页每广告仅算一次”，那就要：

  * 产品文档写清楚
  * 维度报表也按同口径处理（否则用户会认为你统计错了）

最好做成可配置：`dedupe_scope = ad | placement`，默认保持现有口径以免影响老用户数据。

---

## P2 性能 & 缓存（面向中大型站点/高 PV）

### 10) 前台每次请求都扫 CPT 取全量广告 + meta（上百条会明显变慢）

**位置：**

* `Ads::get_ads()`、`Settings::get_settings()`、`Frontend::build_matching_cache()`

建议增加“运行时编译配置缓存”：

* 保存广告/slot 时，把运行时需要的数据写入一个 option（autoload=false）或 object cache
* 前台优先从 cache 读，避免每次 query CPT + meta
* 保存时 bump 一个版本号 `magick_ad_settings_rev`，cache key 带 rev，天然失效

这样能显著降低 DB 压力。

---

### 11) 没有外置对象缓存时，transient 可能把 wp_options 撑大

**位置：** Track_Controller 的 rate limit + dedupe 都 `set_transient()`
没有 Redis/Memcached 时 transient 落库（wp_options），高 PV 会大量生成 transient 记录。

建议：

* 检测 `wp_using_ext_object_cache()`：

  * 若 false：dedupe/rate limit 不要落库（改用 `wp_cache_*` 或自动降级/关闭）
  * 或提供开关允许管理员关闭（并提示风险）
* 你已经做了 Site Health 检测，很好；建议再把默认行为改得更“不会拖死站”。

---

### 12) 诊断日志清理建议移到 WP-Cron

现在清理由 `/track` 请求触发（transient gate 每天一次）。
更现代的做法是：开启 diagnostics 时注册 cron event，每天清理一次；前台 tracking 请求只负责写入，不做清理判断。

---

### 13) slot resolver 请求优化

同页多个 resolver 可能请求多个 `/render-ad`，建议：

* 对同一 `ad_id` 做页面级缓存（Map: ad_id → Promise/html），避免重复 fetch
* 或增加批量渲染接口（一次返回多个 ad_id 的 HTML），减少 RTT

---

## P3 现代化增强（提升产品力和长期维护）

### 14) 弹窗/插屏 A11y 完善

你已有：`role="dialog" aria-modal="true"`、ESC、锁滚动。
建议补齐：

* focus trap（Tab 不离开弹窗）
* 关闭后恢复焦点到触发点
* `prefers-reduced-motion` 降低动画（对可访问性和体验更现代）

---
已实施
### 15) Interactivity API 渐进式引入（你文档里提到的方向）

推荐落地顺序：

* v1：只替换弹窗/横栏交互层（open/close/ESC/overlay/focus/scroll lock）
* v1.1：再迁移触发/频控
* v1.2：再考虑把 resolver 也做成可交互模块（可选）

这样风险最小，不会牵一发动全身。

---

### 16) 内容插入点更 Gutenberg 化

目前段落插入主要靠 `</p>` 切分和（部分）parse_blocks。
对 block 主题/FSE，更现代的方式是：

* `render_block` / `render_block_core/paragraph` 过滤器精确定位段落块
* 或使用 Block Hooks（如果你要做“模板固定位置插入”）

---

### 17) 工程化（强烈建议加上）

* PHP：PHPCS（WPCS）+ PHPStan/Psalm（至少 level 5）
* JS：对 tracking/resolver/popup 做 E2E（Playwright）覆盖关键路径
* Release：自动生成生产包（清理 dev 文件、生成 languages、生成 build）

---

## 最短“可落地修复清单”（你可以马上开始改）

1. 修 `Track_Controller::ensure_*_ready()`：增加列校验/Schema ready 检查，不通过不更新 ready option。
2. 统一 Bindings/Track_Controller 的 cookie set 参数兜底（path/domain）。
3. 插件头部声明 `Requires PHP: 8.1` + 运行时 guard。
4. 给 `magick-ad/ad` block 增加 `viewScript` 或 render_callback enqueue，保证区块广告也加载前台脚本。
5. 把 slot/position/container 纳入签名或 allowlist，防止刷爆维度表。
6. 发布包加 `.distignore`，剔除 `.pnpm-store`、lock、`.DS_Store` 等。

---

如果你希望我更进一步：我可以按你现有代码风格，给出一份“**最小改动 patch 方案**”（哪些文件要改、加哪些 public 方法、签名字段怎么做版本兼容、viewScript 怎么挂、dedupe_scope 怎么加选项），保证不会破坏现有功能与数据口径。
