# Magick AD 0.2 Architecture Overview

## 1. 核心链路

0.2 只有一条运行链路：

1. 管理员使用 WordPress 原生编辑器维护广告和投放位。
2. 动态区块或 WordPress 内容钩子提供一个投放位 ID。
3. 服务端加载投放位及其广告，交给纯 `Eligibility_Evaluator` 判断。
4. 判断通过后服务端渲染广告区块内容；拒绝时返回稳定 reason code，前台不输出广告。

没有浏览器端广告解析、追踪写入或异步数据管线。

## 2. 数据模型

### `magick_ad`

- `post_content`：广告区块内容。
- `post_status`：发布控制。
- `_magick_ad_end_at`：可选的 WordPress 本地日期时间字符串（`Y-m-d H:i:s`）；Repository 使用站点时区转换为 evaluator 所需的 Unix timestamp。

### `magick_ad_placement`

- `post_status`：发布控制。
- `_magick_ad_ad_id`：关联广告 ID。
- `_magick_ad_location`：投放位置。
- `_magick_ad_device`：`all`、`desktop` 或 `mobile`。

所有业务 meta 都必须通过 `register_post_meta()` 提供类型、sanitize callback、auth callback 和 REST schema。两个 CPT 使用 WordPress 核心 REST 支撑编辑器，但整个相关路由前缀均要求 `manage_magick_ads`；发布状态不会让广告创意成为匿名公开 API。CPT、meta、状态和内容是唯一事实来源；运行时不得再复制到 Options 或自定义表。

## 3. 模块边界

- 插件入口负责版本门控、常量、自动加载和启动，不包含业务判断。
- 数据模块只负责注册两个 CPT 和 typed meta。
- `MagickAD\Domain\Eligibility_Evaluator` 不调用 WordPress API，因此可以使用普通 PHPUnit 确定性测试。
- 展示协调层负责加载 WordPress 对象、构造 evaluator 输入并渲染内容。
- 动态区块仅保存投放位引用和编辑器表现属性；自动位置复用同一展示协调层。

## 4. 展示规则

Evaluator 返回：

```php
array(
    'allowed' => true,
    'reasons' => array(),
);
```

拒绝原因是稳定的内部诊断契约：

- `placement_not_published`
- `ad_missing`
- `ad_not_published`
- `ad_expired`
- `ad_content_empty`
- `device_mismatch`

新增规则必须先扩充纯 evaluator 测试，再接入 WordPress 协调层。

## 5. 明确删除的边界

0.1 的自定义 REST 控制器、管理端 SPA、统计表、事件追踪、队列、Cron、CMP 猜测、A/B、模板与迁移器均不属于 0.2。完整决策和替代方案见 `docs/decisions/001-pre-ga-native-wordpress-baseline.md`。

## 6. 质量和发布

- PHPUnit：纯业务规则。
- PHPCS：单一 WordPress Coding Standards 规则集。
- PHPStan：WordPress stubs 和插件常量 bootstrap。
- 前端：TypeScript/type lint、样式 lint、生产构建和包体预算。
- 发布：固定 `magick-ad` 根目录，校验完整运行时必需文件，并禁止开发依赖、源前端、测试和文档进入 zip。
- WordPress 集成：`tests/playground/` 从发布 zip 安装插件，验证激活、CPT/meta、动态区块、短代码、匿名 REST 权限和过期广告拒绝。

Playground fixture 覆盖服务端 WordPress 集成，但不替代浏览器级区块编辑器交互。发布前仍需在真实浏览器中完成选择投放位、保存文章和前台查看的显式人工检查。
