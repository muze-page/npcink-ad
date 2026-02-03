下面这些建议是基于你当前插件代码结构（`Frontend` 投放引擎、`Settings` 运行时缓存与内容懒加载、`Render_Controller`/`Track_Controller` 两类公共 REST 接口、统计三张表 + 可选对象缓存累加器、Interactivity/Fallback 双实现、同意门控与诊断面板等）做的“性能优化 + 安全加固 + 其他改进”清单。为了更好落地，我会尽量写清楚**改哪里、为什么、怎么改**。

---

## 你现在做得比较对的点（建议保留并强化）

* **运行时设置缓存**：`Settings::get_runtime_settings()` 通过 `rev + wp_cache` 缓存，并默认“剥离大字段 + 标记 _content_lazy”，这是很正确的方向（减少前台读取成本）。
* **签名校验链路**：`Tracking_Signature::build/is_valid()` 用 HMAC + 时间窗 + allowlist（position/container），公共接口不依赖 nonce，这是面向访客场景的正确思路。
* **统计写入的性能兜底**：有 `Stats_Accumulator` + Cron flush（依赖持久化对象缓存）以及 `Track_Controller` 的去重/限流开关。
* **前台脚本延迟加载**：对 popup/delay 等场景，track 脚本用交互触发/idle callback 延迟加载，符合现代化性能思路。
* **Site Health 检测**：已提示“持久化对象缓存”和“统计表就绪”，对落地很关键。

下面重点讲还能怎么“再上一档”。

---

# 一、性能优化（现代化、高收益、可落地）

## 1) 统计写入：把“每条事件多次写库”改成“按请求聚合 + 批量 Upsert”（P1 高收益）

现状：`Track_Controller::track()` 会逐条 `process_item()`，在 **未启用持久化对象缓存** 时，每条 event 可能触发：

* 主表 `wp_magick_ad_stats` 一次 `INSERT ... ON DUPLICATE`
* 维度表 `wp_magick_ad_stats_dim` 一次 `INSERT ... ON DUPLICATE`
  -（可选）日志表 `wp_magick_ad_stats_log` 一次 `INSERT`
  这对高 PV 站点会非常吃数据库。

**建议：同一个 REST 请求内先聚合，再一次性写库：**

* 按 `(date, ad_id)` 聚合 impressions/clicks
* 按 `(date, ad_id, slot, position, container)` 聚合维度数据
* 日志表用多值 insert（或按采样率写）

**落地点：** `src/REST/Controllers/Track_Controller.php`

* 在 `track()` 里先收集 `$statsAgg`、`$dimAgg`、`$logRows`
* 最后统一 `write_stats_bulk()` / `write_dim_stats_bulk()` / `write_logs_bulk()`

**SQL 形态：**

* 主表：

  * `INSERT INTO ... (date,ad_id,impressions,clicks) VALUES (...),(... ) ON DUPLICATE KEY UPDATE impressions=impressions+VALUES(impressions), clicks=clicks+VALUES(clicks)`
* 维度表同理。

> 这条基本属于“对吞吐量最直接的提升”，尤其是用户没装 Redis/Memcached 的时候。

---

## 2) render 缓存“失效策略”升级：把 runtime rev 纳入 cache key（P1 体验 + 性能）

现状：`Render_Controller::render_ad_by_id()` 的 object cache key 类似 `magick_ad_render_{ad_id}_{argsHash}`，TTL 10 分钟。
问题：后台刚改完广告，前台 render API 可能继续返回旧缓存（最多 10 分钟），预览/上线体验会“像没生效”。

**建议：把 `Settings` 的 `RUNTIME_REV_KEY`（`magick_ad_settings_rev`）拼进 cache key：**

* 任何一次配置保存会导致 rev +1，从而缓存自然失效，不依赖 TTL。

**落地点：** `src/REST/Controllers/Render_Controller.php`

* 在 `build_cache_key()` 里先读 rev：`$rev = (int) get_option(\MagickAD\Data\Settings::RUNTIME_REV_KEY, 0);`
* cacheKey：`magick_ad_render_{$rev}_...`

---

## 3) render batch：提前“批量预热 post/meta cache”，避免 N+1（P1）

现状：你支持 `/render-ads` 批量渲染，但每个 item 仍然可能触发一次懒加载的 `Ads::get_ad_by_post_id()`（读取 post + meta），在无对象缓存下会变成 N 次 DB。

**建议：在 `render_batch()` 里做一次批量预热：**

* 收集所有 ad_id → 找到对应 post_id（或者直接由 runtime settings 给出 post_id 映射）
* 用 `get_posts( [ 'post__in' => ... ] )` / `update_postmeta_cache()` 提前把 post/meta 拉进 WP cache
* 然后循环渲染时，`get_post/get_post_meta` 多数命中缓存

**落地点：** `Render_Controller::render_batch()`

---

## 4) 图片渲染升级：用 `wp_get_attachment_image()` 自动带上 width/height、srcset、sizes（P1 直接改善 CLS/LCP）

现状：`Frontend::build_image_body()` 手工输出 `<img src=... loading="lazy">`，缺点：

* 没有 `width/height` → **CLS 风险**（广告位尤其容易抖动）
* 没有 `srcset/sizes` → 无法让浏览器选最佳分辨率 → **LCP 更差**
* `decoding="async"` 等现代属性也没用上

**建议：当 image.id 存在时优先用：**

* `wp_get_attachment_image($id, 'full', false, [ 'loading' => 'lazy', 'decoding' => 'async' ])`
* 或 `wp_get_attachment_image_src()` 拿尺寸后补上 `width/height`

**落地点：** `src/Frontend/Frontend.php::build_image_body()`

---

## 5) 前端脚本拆分：把“行为（popup/slot/node）”和“追踪（impression/click）”解耦，按需加载（P2 但很“现代化”）

现状：`magick-ad-track` 依赖 `magick-ad-interactivity`，所以即使只需要基本统计，也会先加载行为脚本。

**建议：**

* track 脚本不要强依赖 interactivity（除非你必须等待 slot resolver 插入）
* 或拆成三块：

  1. `behavior-core`（最小：show/hide/delay/freq）
  2. `slot-resolver`（仅当页面有 slot placeholder 时加载）
  3. `tracker`（仅当 tracking_strategy != none 时加载；目前你没有 none，但可以加入）

**落地点：** `Frontend::enqueue_assets()`

---

## 6) 运行时匹配加速：构建 “placement_hook → ads[]” 索引，减少每页筛选成本（P2）

现状：`Frontend::build_matching_cache()` 每个请求循环所有 ads，按 placement_hook 分组，同时还会多次检查 placement/targeting。

如果广告数量上百，仍有成本。

**建议：在 `Settings::refresh_runtime_cache()` 时顺便产出索引：**

* `index.hook.footer = [ad_id...]`
* `index.hook.content.paragraph = [ad_id...]` 等
* 甚至预分：global/targeted、device/login/show_page 快速过滤字段

这样 `Frontend` 每页只遍历“当前 hook 相关”的 ad 列表，而不是全量。

---

## 7) “随机 cookie”初始化：避免每次请求扫描所有广告（P3 小优化）

现状：`Frontend::maybe_init_random_cookie()` 每次前台请求都会扫一遍 runtime ads，看有没有 `display_mode=random` 且 `random_strategy=cookie`。

**建议：在 runtime cache 里放一个布尔值**：`needs_random_cookie = true/false`，保存时计算一次，前台直接读即可。

---
已完成

# 二、安全修复 / 安全加固（优先级 P0/P1）

## 1) HTML 沙箱：当前 sandbox 权限过宽，尤其是 `allow-popups-to-escape-sandbox`（P0）

你在 `Frontend::build_sandboxed_html()` 里用的 iframe：

```html
sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
```

**风险点：**

* `allow-popups-to-escape-sandbox` 允许打开的窗口“逃逸沙箱”，这通常是广告/第三方内容场景里**最不建议默认开启**的能力之一。
* `allow-forms` 也可能被用于钓鱼表单。
* `allow-popups` 会放大滥用面。

**建议：把 sandbox 权限做成“最小默认 + 可配置白名单”：**

* 默认：`sandbox="allow-scripts"`（甚至 `allow-scripts allow-forms` 也要慎重）
* 通过系统设置或 per-ad 选项决定是否追加：

  * `allow-forms`（确实需要表单再开）
  * `allow-popups`（确实需要打开链接再开）
  * **不建议**默认提供 `allow-popups-to-escape-sandbox`

**落地点：** `Frontend::build_sandboxed_html()`
建议新增 filter：`magick_ad_html_sandbox_flags` 或系统设置项，集中管理。

---

## 2) 强制签名：把 “require_signature 可关闭” 改成“生产环境强制 / 仅开发模式可关”（P0）

* `Track_Controller` 与 `Render_Controller` 都支持通过 option 关闭签名校验。
  这在生产站点上风险很大：
* render 接口会变成“任意人可按 ad_id 拉取广告 HTML”
* track 接口更容易被刷量

**建议：**

* 生产环境（比如 `wp_get_environment_type() === 'production'`）强制 `require_signature=true`
* UI 上把关闭签名标为“危险（仅开发/排障使用）”，并且默认隐藏或二次确认

**落地点：**

* `Track_Controller::validate_signature()`
* `Render_Controller::validate_signature()`

---

## 3) 签名抗重放：把时间窗缩小 + 把 runtime rev / page hash 纳入签名（P1）

现状：签名有效期默认 14 天（可调 1~90）。攻击者拿到页面上的 `sig`，在窗内可反复调用 render/track（当然还有你做的限流，但在无对象缓存时限流会失效）。

**建议（两种强度）：**

1. **把默认 window_days 调小**：比如 1~3 天更合理（广告投放一般不需要 14 天签名仍然有效）。
2. **把 runtime rev 纳入签名 payload**：广告更新立即让旧签名失效（还能抗 replay）。

   * 做法：`build(ad_id, sig_ts, slot, position, container, rev)`
   * 同时 data-attribute 带上 rev，track/render 都校验
3. 若你愿意更强：把“页面哈希（page_hash）”也加入签名（会更难刷，但要保证前后端 hash 一致）。

**落地点：**

* `Tracking_Signature::build()/is_valid()`
* `Frontend::build_data_attributes()`、`render_slot_placeholder()`
* `Track_Controller::parse_payload_item()` / `Render_Controller::parse_payload_item()`

---

## 4) 无对象缓存时的限流/去重：现在基本失效（P0→P1）

你目前的设计是：**只要没有持久化对象缓存，就直接不做 rate limit / dedupe**（`apply_rate_limit()` 和 `is_duplicate_event()` 的第一句就是 `if (!wp_using_ext_object_cache()) return null/false;`）。

这等于：

* 访客端 track/render 公共接口在某些站点上缺少最重要的防护
* 攻击者可以非常轻松做 DoS/刷库

**建议：提供“降级限流方案”**（哪怕更粗糙也比没有强）：

* 方案 A：用 `transient`（DB）做 token bucket（分钟级），只对明显异常的 IP 生效

  * 缺点：会增加 DB 写，但能挡住最糟糕情况
* 方案 B：对单请求做更严格限制

  * body 大小限制（见下一条）
  * items 数量限制已经有了（默认 50），建议再加 “每 item 字段长度限制”
* 方案 C：支持可选的 server-level 防护提示（推荐 Nginx/Cloudflare/WAF 配置），并在 Site Health 里提示

**落地点：**

* `Track_Controller::apply_rate_limit()` / `Render_Controller::apply_rate_limit()`
* 可新增 option：`magick_ad_rate_limit_fallback=transient|off`

---

## 5) 请求体大小与字段长度：加一道“硬上限”防滥用（P1）

现在你限制了 batch item 数（默认 50），但没有强约束 **请求体总体大小**、`page_url/user_agent` 的长度（你写日志时截断了 page_url 到 255，但 UA 仍可能很长）。

**建议：**

* 在 `track()` 和 `render_batch()` 一开始就检查：

  * `Content-Length` > 某阈值（例如 64KB/128KB）直接 413/400
* 对关键字段做长度截断（在 parse 阶段就截断）

  * `ad_id/slot`：按表结构 191 或你业务上更小（例如 64）
  * `user_agent`：例如 255 或 512
  * `page_url`：你已在 log insert 前截断 255，但建议 parse 就截断

---

## 6) `<a>` 安全与 SEO：默认加上 `rel="nofollow sponsored"`（P2）

你现在图片广告链接在 `target=_blank` 时加了 `noopener noreferrer`，很好。
但广告链接通常还需要：

* `rel="nofollow sponsored"`（避免被利用做 SEO 黑链/站点被惩罚）

建议做成可配置：

* 默认开启（特别是联盟广告）
* 可在每条广告上覆盖（有些站长想要 dofollow）

落地点：`Frontend::build_image_body()`、CTA link 输出等。

---

# 三、其他更多改进建议（体验、合规、可维护性）

## 1) “同意”变更后让追踪/频控即时生效（P1 体验）

现状：同意 banner 点击后只设置 cookie 并更新 `MagickADBehavior.hasConsent`，但 `magick-ad-track.js` 的 `hasConsent` 变量是脚本初始化时固化的，**不会自动变更**（除非刷新页面）。

**建议：**

* banner 点击后 `window.dispatchEvent(new CustomEvent('magickad:consent', {detail:{hasConsent:true}}))`
* track 脚本监听该事件并更新本地变量，开始允许上报/存储
* 同理：频控存储也可以在 consent 后启用

落地点：`assets/magick-ad-interactivity.js` 与 `assets/magick-ad-track.js`

---

## 2) 把“展示门控”与“统计门控”分开（合规更稳）

你当前的同意门控主要影响：

* 是否允许写 localStorage/sessionStorage
* 是否允许 track 写库

但**展示层**并不会阻断某些广告内容（尤其是 full HTML/第三方脚本）。在合规要求更严格的地区，这可能不够。

**建议：加入 per-ad 的“requires consent to render” 开关：**

* 未同意时：不渲染该广告（或者只渲染占位/纯图片无追踪版本）
* 同意后：再渲染（slot resolver + render API 正好适配这个机制）

落地点：`Settings` schema + `Frontend::should_display_ad()` + `render_slot_placeholder()`/resolver 逻辑

---

## 3) 可观测性：把“追踪失败原因”做成聚合指标（P2）

你已经有 diagnose 面板与日志表。可以再做一步：

* 统计 `signature_invalid / rate_limited / deduped / no_consent` 的计数（按日或按小时）
* 管理后台展示“为什么今天数据少了”（是签名过期？是对象缓存缺失导致限流关闭？是未同意比例高？）

落地点：`Track_Controller::process_item()` 返回的结果里已经有很多状态位，收集聚合即可。

---

## 4) 缓存插件友好策略：把“随机/轮播”默认引导到 client resolver（P2 产品/口碑）

你已经有 `magick_ad_slot_client_resolver` 这个“缓存友好 Slot 轮播”，非常关键。

建议再强化：

* 后台 UI 对“启用了整站静态缓存”的站点给出提示：

  * “随机策略=请求”在缓存页面会失效
  * 推荐：slot client resolver 或 random=session（你已经对 session 随机做了 JS 控制）
* 给出一键迁移建议（自动把某些 placement 迁到 slot/resolver）

---

## 5) A11y 小修：关闭按钮加 aria-label、弹窗标题关联（P3）

你的弹窗已经做了 focus trap、ESC 关闭等，已经很不错。
再补两点更完整：

* close button：`aria-label="关闭"`
* dialog：如果广告内容里有 heading，可给 dialog 加 `aria-labelledby` 指向那个 heading id（或提供可配置标题）

落地点：`Frontend::build_close_button()`、`wrap_modal_container()` 输出

---

## 6) 工程化：TypeScript + 更严格的契约（P3）

前台脚本涉及很多 DOM 与状态机逻辑（frequency、resolver queue、hydrate scripts）。
建议逐步迁到 TypeScript，至少对：

* Render/Track payload schema
* data-attribute parsing
* store 状态对象
  做类型约束，能显著减少线上边界 bug。

---
已添加
# 建议的优先级路线图（不需要大改架构也能见效）

**P0（先保命）**

1. HTML sandbox 权限收敛（去掉/默认关闭 `allow-popups-to-escape-sandbox`）
2. 生产环境强制签名校验（render + track）
3. 无对象缓存时给 track/render 加降级限流（哪怕用 transients + 更严请求限制）

**P1（立竿见影的性能）**
4. track 写库：按请求聚合 + 批量 upsert（主表 + 维度表 + 日志）
5. render 缓存 key 加 runtime rev，更新立刻生效
6. render batch 预热 post/meta cache，减少 N+1
7. 图片渲染改用 `wp_get_attachment_image()`（CLS/LCP 直接改善）

**P2（产品和体验更现代化）**
8. 同意状态变更后，追踪/频控无需刷新即时生效
9. per-ad 的展示门控（未同意时不加载第三方脚本型广告）
10. 脚本按需拆分加载（slot-resolver、tracker、behavior 分离）

---

如果你希望我把其中 **P0/P1** 的改动直接写成补丁（例如：track 批量 upsert、render cache key 加 rev、sandbox flags 可配置、降级限流的 transient 方案），我也可以按你现有代码风格给出“可直接拷进去”的具体函数实现草案（不需要你再二次设计）。
