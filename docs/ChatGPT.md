## 自定义广告入口
可以，而且我建议你同时提供 3 条“插入入口”（面向不同用户/场景），并且它们底层都调用同一个渲染函数，这样功能一致、维护成本最低：
	1.	区块（Block）：现代 WP 首选（Gutenberg / FSE）
	2.	短代码（Shortcode）：兼容经典编辑器/复制粘贴场景
	3.	主题模板函数（Template Tag / PHP API）：给主题开发者、放在模板任意位置

下面按“怎么做更现代化 + 怎么避免踩坑”给你一份可直接落地的建议。

⸻

1) 文章里插入：优先做区块，其次短代码

A. 建议主入口：一个“广告位/Ad Slot”区块（动态渲染）

为什么区块优先
	•	用户在编辑器里所见即所得
	•	FSE（全站编辑）时代，很多人更愿意用区块放在模板/模板部件里
	•	能很自然地做“模板库 / Pattern / Variation”扩展

实现建议：做成“动态区块（Dynamic Block）”
动态区块在前端渲染时调用 render_callback，更适合广告这种“需要按规则/随机/频控实时决定输出”的内容。 ￼

推荐结构：
	•	区块：magick-ad/slot
	•	主要属性：
	•	adId 或 slot（推荐 slot slug，后面讲）
	•	variant（可选：比如 inline/popup/bar 的容器选择）
	•	align / className（走 block supports）
	•	预览：编辑器里用 @wordpress/server-side-render 预览动态输出（可选，但体验好）。 ￼

区块注册建议用 block.json，这是现代 WordPress 推荐方式，能把注册/脚本/样式定义集中管理。 ￼

⸻

B. 兼容入口：短代码（Shortcode）

短代码仍然非常有价值：经典编辑器、导入导出内容、用户从文档复制粘贴等场景都需要。

推荐短代码命名
	•	主短代码：[magick_ad]（或更短更不易冲突的 [mad_ad]）
	•	注意：同一个 shortcode tag 只能绑定一个回调，如果别的插件用了同名 tag 会互相覆盖，所以名字尽量“带前缀、独特”。 ￼

推荐最小参数集合（MVP）

[magick_ad id="123"]
[magick_ad slot="post-inline-1"]
[magick_ad slot="sidebar-top" class="my-ad" align="wide"]

短代码 API 基础与参数解析方式可以按 WordPress Shortcode API 标准做（attributes、默认值、回调签名等）。 ￼

提示用户一个重要事实：如果插件被停用，内容里的短代码可能会直接显示为文本（这是 WP 的常见现象），所以在文档里说明“短代码属于可移植性较差的写法”，并建议重要位置用区块/模板函数。 ￼

⸻

2) 主题里插入：提供模板函数（Template Tag），并教用户“安全调用”

给主题/开发者用时，最现代也最稳定的是提供 PHP API：

A. 设计成 “get_xxx / the_xxx” 两套函数（更符合 WP 风格）

类似 WordPress 其它模板标签（返回 vs 直接输出）的习惯：

// 返回 HTML（可用于拼接）
$html = magick_ad_get( 'sidebar-top', [
  'container' => 'inline',
  'class'     => 'my-ad',
] );

// 直接 echo（更方便）
magick_ad_the( 'sidebar-top', [
  'container' => 'inline',
] );

为什么要两套？
主题开发者经常需要对 HTML 进行二次包裹或条件判断；返回式函数更灵活。

B. 主题里调用要考虑“插件可能没启用”

官方文档和主题开发中很常见的做法是用 function_exists() 判断再调用（避免主题报 fatal）。 ￼

示例：

<?php if ( function_exists( 'magick_ad_the' ) ) : ?>
  <?php magick_ad_the( 'header-bar' ); ?>
<?php endif; ?>


⸻

3) 强烈建议引入“Slot（广告位）”概念：让插入更简单、更可维护

你现在用户可能用 “广告组ID/广告ID” 来插入，但长期会遇到一个问题：
内容/主题里写死 ID，后续换组、复制站点、迁移环境就会很痛。

建议你给用户一个更稳定的选择：Slot（广告位）= 一个固定名字的投放入口
	•	slot = "post-inline-1"
	•	slot = "sidebar-top"
	•	slot = "header-bar"

Slot 后台配置里再去绑定：
	•	用哪个广告组/哪些素材
	•	容器类型（inline/popup/bar）
	•	规则（设备/页面/频控）
	•	模板/token

这样用户只管在文章/主题里插 slot，以后怎么换广告策略都不需要改内容或模板文件。

⸻

4) 给弹窗类广告一个“触发器入口”（很实用，强烈推荐）

弹窗广告（popup/interstitial）通常不希望“页面加载就弹”，而是点击按钮或链接触发。

你可以提供一个 触发器短代码/区块：

A. 包裹式短代码（enclosing shortcode）

[magick_ad_trigger slot="signup-popup"]点击领取优惠[/magick_ad_trigger]

包裹式短代码的写法是 Shortcode API 支持的典型形式。 ￼

B. 触发器区块
	•	magick-ad/trigger
	•	属性：slot、label、style（按钮/链接）
	•	前端：触发 JS 事件 magickad:open(slot)，与你的 popup 行为系统对接

⸻

5) 和你“节点广告（找 ID/class 插入）”的关系：两者都要，但定位不同
	•	短代码/区块/模板函数：适合“我能控制内容或主题模板”，直接插入最稳定
	•	节点广告（ID/class 定位）：适合“我不想改主题模板/内容，但我知道主题里某个节点稳定存在”

所以最佳组合是：
	•	普通用户：用区块/短代码插入（最简单、最可控）
	•	高级用户：用节点广告“贴到主题指定位置”
	•	你还可以额外提供一个 “锚点/Marker 区块（或短代码）”：
	•	[magick_ad_anchor id="sidebar-top-anchor"]
	•	这样用户不用懂主题结构，也能“自己造一个稳定节点”给节点广告去挂载（非常减少工单）

⸻

6) 现代化实现的关键：所有入口共用一个渲染器（避免逻辑分裂）

无论是：
	•	动态区块 render_callback
	•	shortcode callback
	•	magick_ad_get() 模板函数

都应该只做一件事：把参数归一化 → 调用同一个渲染函数：

function magick_ad_render( $slot_or_id, array $args = [] ) : string {
  // 1) 查找广告（slot → group → creatives）
  // 2) 规则命中/频控/同意门控（如有）
  // 3) 输出容器 + creative + data-*（用于前端行为&统计）
}

这样你以后新增“节点投放、selector 投放、信息流投放”，只是增加 Placement 逻辑，不会同时改 3 套入口。

⸻

7) 缓存与随机/轮播：提前在文档里说清楚（否则差评）

用户把短代码/区块放进文章后，经常还会有缓存插件/CDN：
	•	如果你做“服务端随机”，页面被缓存后随机就会被固定
	•	解决方案通常是：
	1.	“稳定随机”（基于会话/用户桶），或者
	2.	“前端轮播/随机”（JS 在客户端决定）

建议你在 slot 或 短代码参数里提供一个开关，例如：
	•	rotation="server"（更可控、可统计更准，但受缓存影响）
	•	rotation="client"（更抗缓存，但统计与一致性需要设计）

⸻

推荐你先落地的最小版本（投入最小、覆盖最大）
	1.	✅ magick-ad/slot 动态区块（可选 adId 或 slot） ￼
	2.	✅ [magick_ad] 短代码（支持 id/slot + 少量参数） ￼
	3.	✅ magick_ad_get() / magick_ad_the() 模板函数（slot 优先）
	4.	✅ [magick_ad_trigger]（给弹窗用） ￼

⸻

如果你愿意，我可以按你现有的数据结构（ad group / container / placement / behavior）给你一份具体的参数规范（短代码参数表 + 区块属性 schema + PHP API 参数表），并附上“如何做向后兼容（旧 show_position 仍可用）”的迁移建议。


## 节点插入
下面给你一套“节点广告（按 ID / class 找 DOM 节点并插入）”的产品设计 + 技术落地建议，并且会尽量贴合你现在 Magick AD 的实现方式（show_position 控制投放位置、PHP 先输出广告 markup、前端 JS 做行为/统计）。

⸻

1) 把它定义成“投放方式（Placement）”，不是新的广告类型

你新增的“节点广告”本质是：**在哪儿放（Placement）**改变了，而不是“内容是什么（Creative）”改变了。
	•	Creative 仍然复用你现有的：html / image / video / block
	•	Container 仍然复用你现有的：inline / popup / banner / floating / interstitial
	•	新增的是 Placement：node（节点投放）

这样后续你再加其它投放方式（CSS selector、更复杂定位、多个节点）不会推翻架构。

⸻

2) 配置项建议（一定要做“简单版 + 高级版”）

2.1 MVP（先做简单但好用）

当 show_position === 'node' 时，新增一组 options（建议放在 options 里）：
	1.	定位方式（只做 ID / class，先别开放完整 CSS selector）

	•	node_target_type: 'id' | 'class'
	•	node_target_value: string（用户输入不带 #/.）

	2.	插入方式

	•	node_insert: 'append' | 'prepend' | 'before' | 'after'
	•	append：插到节点内部末尾
	•	prepend：插到节点内部开头
	•	before：插到节点外部前面（兄弟节点）
	•	after：插到节点外部后面（兄弟节点）

	3.	匹配策略（class 多匹配时必须有）

	•	node_match: 'first' | 'nth' | 'all'
	•	node_index: number（nth 时才需要，1 开始）

	4.	节点找不到怎么办

	•	node_fallback: 'hide' | 'footer'
	•	hide：不展示（最安全）
	•	footer：回退到底部（对用户“至少能看到”）

	5.	样式适配（强烈建议）

	•	node_compact: boolean（默认 true）
	•	compact = 自动移除 .magick-ad-unit 默认上下 margin（避免塞进 header/sidebar 把布局顶乱）

为什么 MVP 不建议一上来做“任意 CSS selector”？
因为你现在的用户大概率只会填 #id 或 .class，开放全选择器会带来大量“填错→匹配不到→差评”与安全/兼容边界（比如 >、:nth-child()、[]）。等你有“元素选择器/可视化拾取”再开放高级 selector 会更稳。

⸻

2.2 v2（再增强，但仍可控）

如果你希望更强，可以在 v2 加：
	•	node_wait_mode: 'domready' | 'load' | 'observe'
	•	node_timeout_ms: number（默认 5000）
	•	node_max_inserts: number（默认 1，防止重复注入）
	•	node_replace: 'none' | 'replace-content' | 'replace-node'（谨慎开放）

⸻

3) 后台 UI 设计建议（避免把用户“表单淹死”）

在你现在的「展示位置」SelectControl 里新增一项：
	•	指定节点（ID / class） → value: 'node'

当用户选了 'node'，在「展示位置」面板下方出现一个新的 PanelBody：「节点投放」。

节点投放面板（建议字段顺序）
	1.	定位方式：ID / Class（单选）
	2.	节点值：TextControl（提示：ID 不带 #，Class 不带 .）
	3.	插入方式：SelectControl（append/prepend/before/after）
	4.	匹配多个节点：SelectControl（first / nth / all）
	5.	第 N 个：RangeControl（仅 nth 时显示）
	6.	找不到节点时：SelectControl（hide / footer）
	7.	✅ 紧凑模式：ToggleControl（默认开启）

帮助文案要写清楚（这能减少 80% 工单）
	•	推荐用户尽量用 ID（更稳定）
	•	class 往往会匹配多个，默认只取第一个
	•	如果你选的是 <p> 这类元素，不要用 append/prepend（会出现 HTML 结构自动修正导致布局错乱），推荐 before/after

⸻

4) 前端实现路线：用“stash（暂存区）+ JS 搬运”最稳

你现在的广告渲染是 PHP build_ad_markup() 生成 HTML，再由前端脚本负责动画/关闭/统计。

“节点投放”的最佳落地方式是：

4.1 服务器端（PHP）
	1.	在页面底部输出一个隐藏容器（只输出一次）：

<div id="magick-ad-stash" class="magick-ad-stash" style="display:none"></div>

	2.	所有 show_position === 'node' 的广告先输出到 stash 里（不要直接输出在页面可见位置），并把节点投放参数写成 data-attributes，例如：

	•	data-ad-node-type="id|class"
	•	data-ad-node-value="header-ad"
	•	data-ad-node-insert="append|before|after|prepend"
	•	data-ad-node-match="first|nth|all"
	•	data-ad-node-index="2"
	•	data-ad-node-fallback="hide|footer"
	•	data-ad-node-compact="1|0"

这样你可以继续复用 build_ad_markup()，不用在 JS 里重新拼广告 HTML，减少一堆 XSS/escape 风险。

4.2 客户端（JS）

在你现有的 magick-ad-track.js（或拆新文件）里，在初始化 observer/行为前执行：

核心流程
	1.	找到 stash
	2.	遍历 stash 内所有节点广告单元
	3.	计算 selector：
	•	type=id → #${value}
	•	type=class → .${value}
	4.	查找目标节点：
	•	first → document.querySelector(selector)
	•	all → document.querySelectorAll(selector)
	•	nth → document.querySelectorAll(selector)[index-1]
	5.	执行插入（推荐用 insertAdjacentElement）：
	•	append → beforeend
	•	prepend → afterbegin
	•	before → beforebegin
	•	after → afterend
	6.	compact 模式：给广告单元加一个 class，例如 .magick-ad-placement--node-compact，CSS 里把 margin 变为 0
	7.	插入成功后：从 stash 移除原节点（或保留但标记已处理）

关键点：避免重复插入
	•	给广告单元加 data-node-inserted="1" 标记
	•	如果 match=all 需要克隆：用 cloneNode(true)，并给 clone 也加标记，避免再次处理

动态节点（可选）
	•	如果 node_wait_mode=observe：用 MutationObserver 监听 document.body，在 timeout 内重试查找，一旦找到就插入并停止观察。

⸻

5) 你必须提前防的坑（节点投放最常见翻车点）

坑 1：用户选中了不适合“插内部”的节点

比如 <p>、<img>、<input> 等——把 <div> append 进去浏览器会自动改 DOM，可能导致广告跑到奇怪位置。

建议：
	•	运行时检测 target.tagName
	•	如果是 P 且用户选了 append/prepend：自动降级成 after 并在 debug 里提示
	•	如果是 void elements（IMG/INPUT 等）：禁止 append/prepend，只允许 before/after/replace

坑 2：class 匹配多个，用户不知情

建议：
	•	默认 first
	•	UI 上明确显示“class 可能匹配多个，建议用 nth 或 all”
	•	在调试模式输出：匹配到多少个节点、最终用了哪个

坑 3：主题改版导致 ID/class 变了，广告“消失”

建议：
	•	提供 fallback（hide/footer）
	•	提供 Debug 工具：在前台用 outline 高亮匹配节点（只在调试模式启用）

坑 4：把节点广告塞进 header 导航导致样式爆炸

你目前 .magick-ad-unit { margin:16px 0; } 对 header/sidebar 会很不友好。

建议：
	•	compact 默认开启（节点广告通常都要紧凑）
	•	或提供“节点广告专用样式开关”：移除默认 margin、让容器宽度继承父级

⸻

6) Debug/预览建议（把它做成“现代化卖点”）

你已经有 magick_ad_debug 了，很适合顺手增强：

前台调试能力（建议）
	•	当 debug 开启时：
	•	console.info 输出：每个 node 广告的 selector、匹配数、插入方式、是否 fallback
	•	对成功插入的目标节点加临时 outline（2 秒后移除）
	•	对失败的广告给出原因：未找到 / index 超出 / 目标不允许插入内部 等

后台“测试选择器”（v2 很推荐）

做一个「测试」按钮：
	•	输入一个 URL（同域）
	•	打开新窗口（或 iframe）加载该页面，并携带 ?magick_ad_debug=1&magick_ad_test=...
	•	页面里只加载一段轻量脚本：点击元素 → 自动生成 ID/class → 回传到后台（postMessage）

这是把“节点投放”从“开发者功能”变成“普通用户可用”的关键升级点。

⸻

7) 最小开发改动清单（按你当前项目结构）

你要实现 MVP，大致需要改这些地方：
	1.	PHP：Settings.php

	•	show_position allowed list 增加 'node'
	•	sanitize_ad() 增加 node_* 字段的 sanitize（id/class 值建议用严格正则，只允许 [A-Za-z_][A-Za-z0-9_-]*）
	•	validate_settings()：当 show_position === 'node' 时校验必填（type/value/insert/match）

	2.	Admin：assets/js/constants/options.js

	•	在 GENERIC_POSITION_OPTIONS 与 POST_POSITION_OPTIONS 增加 { label:'指定节点（ID / class）', value:'node' }

	3.	Admin：AdsConfig.js

	•	当 show_position === ‘node’ 时显示「节点投放」PanelBody
	•	保存到 options

	4.	Frontend：Frontend.php

	•	在 render_footer_ads() 或单独新增一个输出 stash 的方法：
	•	把 node 类广告输出到 #magick-ad-stash（隐藏）
	•	广告单元带上 data-ad-node-* 属性

	5.	JS：magick-ad-track.js

	•	在 initObservers 前加 placeNodeAds()
	•	如果支持动态 observe：插入后要对新节点调用 observer.observe（或 refresh）

⸻

8) 我建议你先这样做 MVP（最稳、最少坑）

MVP 只支持：
	•	目标类型：ID / Class
	•	插入方式：before / after / append / prepend
	•	匹配：first（默认）+ nth（可选）
	•	找不到：hide / footer
	•	compact：默认开启
	•	不做 MutationObserver（先不处理动态加载）

等 MVP 跑起来再加：
	•	all（多匹配克隆）
	•	observe（动态渲染）
	•	可视化拾取元素

⸻

如果你愿意，我可以直接按你当前代码把“节点投放”的**字段命名、sanitize 正则、data-attributes 设计、以及 JS 插入函数伪代码（贴合你现有 track.js 结构）**写得更具体，方便你直接开工改代码。