下面把你“Magick AD 区块 = 预制广告入口，只提供位置；具体投放内容在 Magick AD 设置里配置”这个想法，完善成一套可落地、可扩展、好用且不容易踩坑的方案（同时尽量贴合你现在的实现：ads 存 option、前端统一 build_ad_markup()、规则用 should_display_ad()）。

⸻

1) 给这个区块一个明确定位：它就是“广告位 Slot”，不是广告内容

核心目标：
	•	内容编辑器里放的只是一个“广告位入口”（slot）
	•	具体展示什么广告、怎么轮播、什么时候展示、对谁展示，都在 Magick AD 后台统一配置
	•	后续你想替换广告内容，不用去编辑每篇文章/每个模板

因此建议你把区块叫：
	•	Magick AD（广告位）
	•	Block name：magick-ad/slot（推荐）

⸻

2) 最关键的设计决策：区块存的是 slot（广告位 ID），不是 ad_id

你可以有两种实现路线，我建议你以 B 为目标，先用 A 做 MVP：


B. 理想形态（你说的“区块只提供位置”真正成立）
	•	设置里新增一个 Slots 配置表：slot -> 关联哪些 ad（可多个） -> 如何选择（优先级/权重/轮播）
	•	区块里只保存 slot，不关心任何具体广告
	•	以后你换投放策略，只改 slot 的配置即可

✅ 优点：区块真正“只是一张插座”，内容完全后台可控
✅ 更容易做“轮播/权重/兜底/CLS占位”等现代化能力
⚠️ 缺点：需要新增一个 Slots UI（但非常值得）



⸻

3) “Magick AD（广告位）区块”规格

3.1 Block 元数据
	•	name: magick-ad/slot
	•	title: Magick AD
	•	description: 在文章或模板中插入一个 Magick AD 广告位，广告内容由 Magick AD 设置统一配置
	•	category: widgets（或你自定义 magick-ad 分类）
	•	动态区块（Dynamic Block）：用 render_callback / render.php 服务端渲染（因为广告要按规则/轮播实时决定）。 ￼
	•	注册建议使用 block.json 作为元数据来源（更现代、可维护）。 ￼

3.2 Attributes（区块保存的字段）

最少只要一个字段就能跑：
	1.	slot（必填，string）

	•	例："post-inline-1", "sidebar-top"，或自动生成 "mad-8f3a1c2d"
	•	这是区块的“唯一绑定”，后续一切都围绕它

建议再加两个很实用但不破坏“只提供位置”的字段：
	2.	label（可选，string）

	•	纯用于编辑器显示（更友好）
	•	不参与渲染逻辑也可以

	3.	reserve（可选，object）

	•	用于“预留高度”减少 CLS（布局抖动）
	•	例如：{ mode: "none" | "minHeight", value: 250, unit: "px" }

为什么 reserve 放在 block 里？
因为“预留空间”往往跟“放在这个位置的布局”强相关，和广告内容不完全等价。你也可以把 reserve 放在 slot 配置里（B 方案），但 block 上留一个 override 会更灵活。

3.3 Supports（编辑器通用能力）

建议开启：
	•	customClassName: true（用户可加 class 便于主题细调）
	•	anchor: true（可选：让用户给这个区块一个 HTML id；也能和你未来“节点广告”联动）
	•	align: [ "wide", "full" ]（可选，尤其适配区块主题）

这些通过 block.json 的 supports 配置即可。 ￼

⸻

4) 编辑器体验（必须做到“简单但不傻”）

4.1 编辑器内显示（Canvas）

默认不要渲染真实广告内容（尤其避免执行第三方脚本），建议显示一个现代化占位卡片：
	•	标题：Magick AD
	•	副标题：Slot：sidebar-top（或 label）
	•	状态：
	•	✅ 已配置（该 slot 已绑定至少一个广告）
	•	⚠️ 未配置（该 slot 在设置里还没绑定广告）
	•	一个“打开 Magick AD 设置”的按钮（跳转到你的 admin page）

真实广告预览做成可选开关，不要默认开。
如果你要做“真实预览”，建议用 @wordpress/server-side-render 去请求动态渲染输出，但要注意脚本风险。 ￼

4.2 Inspector 面板（右侧设置）

只放少量控件（保持“只提供位置”的纯粹）：
	1.	广告位（Slot）

	•	下拉选择已有 slot
	•		•	“新建 slot”（输入 id + label）
	•	显示 slot id，并提供一键复制

	2.	预留高度（可选）

	•	关闭 / 最小高度（px）
	•	旁边提示：“用于减少布局跳动（CLS）”

	3.	高级（可折叠）

	•	自定义 class（或走默认 className）
	•	anchor（如果开启 supports.anchor）

⸻

5) 后台设置（让“区块只提供位置”真正成立）

5.1 新增一个 Slots 管理区（建议在你的 Admin React 页加一个 Tab）

Slots 列表（每行一个 slot）：
	•	Slot ID（唯一键）
	•	名称（label）
	•	绑定广告（关联的 ad 数量）
	•	最近命中/预览（可选）
	•	操作：编辑、复制、删除（删除需提示“文章里还有区块引用”）

5.2 Slot 的配置结构（B 方案建议）

在你的 option 里新增 slots：

{
  "ads": [...],
  "slots": [
    {
      "id": "sidebar-top",
      "label": "侧栏顶部",
      "fill": {
        "mode": "priority_weight",
        "ad_ids": ["ad_1", "ad_2"],
        "weights": [70, 30],
        "limit": 1
      },
      "fallback": { "mode": "hide" },
      "reserve": { "mode": "none" }
    }
  ]
}

fill.mode 推荐先做一种就够：
	•	priority_weight：先按 priority 选最高一档，再按权重抽 1 个

对应你现有 ads 结构，可以给每个 ad 增加两个字段：
	•	options.priority（默认 10）
	•	options.weight（默认 1）

这样你不用再靠 display_mode=random + cookie 去“碰运气”，slot 永远只会填一个广告，用户体验更可控。



6) 前端渲染（与现有逻辑无缝复用）

6.1 动态区块 render_callback 该做什么

核心就是把 “slot -> 找到要投放的 ad -> 调用你现有 build_ad_markup()” 串起来：
	1.	$slot = sanitize_text_field( $attrs['slot'] )
	2.	根据 slot 配置取到 candidate_ad_ids
	3.	逐个检查 should_display_ad()（你现成有）
	4.	从命中广告里选出最终 1 个（priority/weight）
	5.	return build_ad_markup($ad, 'slot')（或 position=slot:sidebar-top）
	6.	外层可选包一个 zone wrapper，并加上 data-ad-slot 便于调试/统计

动态渲染的核心方式就是 render_callback 或 render.php。 ￼

6.2 避免重复计算：做“请求级缓存”

如果一页里有多个 Magick AD block：
	•	不要每次 block render 都遍历全部 ads
	•	建议做缓存：
	•	static $adsById（id -> ad）
	•	static $matchedByContext（context -> matched）

⸻

7) “自动发现 Slot”建议（让配置更顺滑）

你会遇到一个真实问题：用户先插了区块，但还没去后台创建 slot。

建议做一个“自动发现”机制（不强制、但很加分）：
	•	在后台 Slots 页面提供一个按钮：扫描站点中的 Magick AD 区块
	•	扫描方式：对指定 post types（post/page/wp_template/wp_template_part 等）做查询，然后用 parse_blocks() 抽取 magick-ad/slot 的 attrs.slot。 ￼
	•	扫到但 slots 里不存在的，就显示为“未登记 slot”，一键“导入到 Slots 管理”

这样用户工作流变成：
	1.	内容里先插区块（定位）
	2.	后台扫描自动出现 slot
	3.	绑定广告

体验会非常丝滑。

⸻

8) 建议你额外提供 2 个“同一渲染器”的入口（不会背离 block 设计）

虽然你主入口是区块，但为了主题开发者/经典编辑器兼容，建议提供同一个 slot 的其它入口（共享同一渲染函数）：
	1.	短代码：[magick_ad slot="sidebar-top"]
	2.	模板函数：magick_ad_slot( 'sidebar-top' )

这样：
	•	主题作者可以不用区块也能插
	•	你的渲染逻辑仍然只维护一份

⸻

9) 你现在实现里，和 Slot block 最容易“踩坑”的点（提前规避）
	1.	head 位置不要输出 <div>
你现在 head 会 wrap zone 输出 <div>，这是不合法 HTML。Slot block 不涉及 head，但如果你将来允许 slot 放在 head 相关区域，会复现这个坑。
	2.	统计（track）未来想支持 slot 维度
现在 track 只传 ad_id + page_url。建议你在区块渲染 wrapper 上加 data-ad-slot="sidebar-top"，将来扩展 track 只要多读一个属性即可（兼容性好）。
	3.	编辑器预览不要执行第三方脚本
默认用占位卡片，真实预览做“可选开关”，并最好在预览时对 html 做更严格净化。

⸻

10) 一套你可以直接照着做的最小落地版本（推荐）

	•	magick-ad/slot 动态区块（只含 slot + label）
	•	后台 ads 里新增 show_position=slot + slot_key（A 方案）
	•	slot block 渲染时：同 slot_key 只渲染 1 条（取第一条或 priority 最大）
	•	编辑器显示占位卡片 + “复制 slot id” + “打开设置”按钮


	•	新增 Slots 管理（B 方案）：slot -> 绑定 ad_ids + 权重
	•	支持一键扫描 parse_blocks 自动发现 slot（可选但很加分） ￼
	•	slot 内支持权重轮播（limit=1），告别“叠广告/随机碰运气”

## 实施
下面给你一版**“可直接落地、最少改动、能长期扩展”的整改意见**，基于你当前实现（CPT + build_ad_markup + should_display_ad）来做“Slot 区块 = 入口”的真正闭环：

结论先行（推荐路线）
先做 A（最小可用），同时把接口设计成 B 的形态，后面无痛升级。

✅ A（1–2 天内可落地）
仍然用你现有 ads（每条广告已有 options.slot）
区块只保存 slot，渲染时：
筛出所有 options.slot = slot 的广告
只渲染 1 条（优先级最高 / 权重优先 / 默认第一条）
不需要新增 Slots UI，零成本升级体验
✅ B（最终形态）
新增 slots 配置表（可在后台新 Tab 管理）
slot 里配置“绑定广告 / 权重 / 频控 / 兜底 / CLS 预留”
区块只保存 slot（真正解耦）
✅ 你现在应该做的整改动作（按优先级）
P0：统一入口逻辑（避免分裂）
把区块 / 短代码 / 模板函数都走同一个渲染入口：
Frontend::render_slot($slot, $args)
你现在已经有这个函数，这一步只是 强制所有入口都用 slot。

修改重点：

Block 只允许 slot（可保留 adId 作为 fallback，但 UI 不暴露）
Shortcode & Template Tag 只使用 slot
ad_id 仅用于“调试/直接指定”，不对普通用户展示
P1：区块变成“广告位入口”
区块改名：magick-ad/slot

Canvas：显示占位卡片（slot + 状态 + 打开设置按钮）
Inspector：只显示 slot 下拉 + label + reserve height
禁止用户在区块里选“广告内容”
这一步能立刻解决“内容编辑器混乱”。

P2：slot 绑定策略（A 方案内简化）
在 render_slot() 里加一个最小策略：

候选 = 所有 options.slot === slot
过滤 should_display_ad
按 priority 取第一条（新增 options.priority）
这样就能开始实现“一个入口只出一个广告”。

P3：准备好 B 方案的数据结构（先不做 UI）
建议你 先把 slots 字段加进 settings，但不用 UI：

"slots": [
  { "id": "sidebar-top", "label": "侧栏顶部", "fill": { "mode":"priority", "ad_ids":[...] } }
]
这样以后直接加 UI，不用重构逻辑。

P4：Slot 自动发现（极大减工单）
提供一个后台按钮：

扫描文章 block
抽取 magick-ad/slot 的 slot id
自动入库成为“未配置 slot”
✅ 你能立刻得到的收益
**彻底避免“广告内容塞进区块”**导致维护困难
内容只放 slot，广告更换无需改文章
与 node placement 形成互补（用户可用“锚点块 + 节点投放”）
未来轻松加“权重/轮播/兜底/CLS”
✅ 我建议你下一步直接做的动作
如果你现在愿意继续，我建议按这顺序实施：

区块 UI 改为只选 slot
render_slot() 只渲染 1 条候选
新增 priority/weight 字段
插入入口文档更新为“slot 入口”
如果你同意，我可以直接开始实施这套“最小 + 可扩展”的 Slot 区块改造。