# WordPress 插件开发 Skills（通用版 / AI 协作规范）

> 目标：让 AI 在 VS Code 中协作开发任意 WordPress 插件时，稳定产出“可发布、可维护、安全、兼容”的代码与文档。
> 原则：WordPress 原生优先（Hooks / Settings API / REST / WPDB / WP-CLI / 区块），安全与兼容高于炫技。

---

## 0. AI 工作总规则（强制）

当我说“新增/实现/修复/重构/优化”时，你必须按以下顺序交付：

1. **方案概述**
   - 插件触点：涉及哪些 WP hooks、屏幕、CPT、REST route、短代码、区块、Cron 等
   - 数据：存储在哪里（option/meta/CPT/自建表）、schema 结构、迁移策略
   - 安全：权限、nonce、sanitize/escape、SQL 预处理、REST 参数校验
   - 兼容：多站点、缓存、主题差异、PHP/WP 最低版本

2. **变更列表（文件路径级别）**
   - 新增/修改哪些文件、关键函数/类/Hook 的职责是什么

3. **代码（可直接粘贴）**
   - 以“最小可用实现（MVP）”为先
   - 同时提供必要的扩展点（filters/actions）
   - 若涉及多文件，给出完整文件或明确 diff

4. **安全与边界检查清单**
   - 列出你已处理的安全点，及仍需产品决定/确认的点

5. **测试建议**
   - 本地验证步骤
   - 回归点与边界条件

> 若上下文不足：允许提出“最小必要问题”，但仍需给出合理默认实现方案（可配置）。

---

## 1. 通用项目结构（推荐，但可适配）

### 1.1 推荐目录结构（OOP + 模块化）

my-plugin/
my-plugin.php # 插件入口：只做引导（定义常量+加载+启动）
readme.txt # WordPress.org 风格
uninstall.php # 卸载清理（可选但推荐）
composer.json # PSR-4 autoload（推荐）
package.json # 构建区块/前端资源（如需）
src/
Plugin.php # 主插件类：注册 hooks/初始化模块
Admin/
Admin.php # 菜单、页面、通知、屏幕逻辑
Settings.php # Settings API（可选）
Frontend/
Frontend.php # 前台逻辑（短代码/渲染/内容过滤）
REST/
Routes.php # REST 注册
Controllers/ # REST 控制器（可选）
Integrations/
WooCommerce.php # 与第三方插件集成（示例）
Data/
Schema.php # 数据结构、迁移、版本
Repository.php # 数据访问层（可选）
Utils/
Sanitizer.php # 输入清理集中管理
Escaper.php # 输出转义（可选）
Capabilities.php # 权限定义
Logger.php # 日志（可选）
templates/
admin/
frontend/
assets/
js/
css/
languages/
my-plugin.pot
tests/

### 1.2 插件入口文件职责（必须极简）

入口文件仅做：

- 定义版本、路径常量
- 加载 autoload
- 启动 `Plugin::instance()->init()`

不要把业务逻辑堆在入口文件。

---

## 2. 插件类型与优先 API（通用决策指南）

### 2.1 常见插件类型与优先方案

- **设置/工具类插件**：Settings API + options（少量设置）
- **内容类插件**（短代码、内容过滤、区块）：短代码/区块 + `the_content`（谨慎）+ template 渲染
- **管理数据类插件**（可管理对象）：CPT + meta（易导出、权限好做）
- **高数据量/报表类插件**：自建表 + Repository + 缓存（再考虑）
- **对外集成类**（第三方 API）：HTTP API + REST/AJAX + 安全存储密钥
- **电商扩展**（WooCommerce 等）：Integration 模块 + 软依赖检查 + hook 注入

### 2.2 数据存储优先级（强烈建议）

1. `options`：全局配置、小体量
2. CPT + meta：可管理对象（列表、编辑、权限、导出）
3. 自建表：数据量大或需要复杂查询/统计才用（必须有迁移与卸载策略）

---

## 3. WordPress 编码规范（必须）

### 3.1 风格与规范

- 遵循 WordPress PHP Coding Standards（WPCS）
- 命名：
  - 类：PascalCase
  - 方法/变量：snake_case
  - 常量：UPPER_SNAKE_CASE
- 避免全局函数污染：优先命名空间 + 类
- 避免在全局作用域执行昂贵逻辑：逻辑放到 hook 回调里

### 3.2 国际化（i18n）

- 所有可见文本必须可翻译：`__()`, `_e()`, `esc_html__()` 等
- text domain 全项目统一（例：`my-plugin`）
- `load_plugin_textdomain()` 在 `plugins_loaded` 里

### 3.3 输出转义（Escape on output）——硬规则

- 文本：`esc_html()`
- 属性：`esc_attr()`
- URL：`esc_url()`
- 富文本：`wp_kses_post()` 或 `wp_kses()`（白名单）
- JSON：`wp_json_encode()`
- HTML 模板输出：默认“先 escape，再输出”

### 3.4 输入清理（Sanitize on input）——硬规则

- `$_POST/$_GET` 先 `wp_unslash()`
- 常用：
  - `sanitize_text_field()`
  - `sanitize_key()`
  - `sanitize_email()`
  - `absint()`
- 数组/嵌套结构：递归清理（集中到 `Utils\Sanitizer`）

---

## 4. 安全规范（强制）

### 4.1 权限（Capability）

- 所有后台写操作必须：
  - `current_user_can()` 校验
  - Nonce 校验
- REST/AJAX 写操作必须：
  - 权限回调（REST）
  - `check_ajax_referer()`（AJAX）
- 重要能力建议可配置/可过滤：
  - `apply_filters('my_plugin_manage_capability', 'manage_options')`

### 4.2 CSRF 防护（Nonce）

- 后台表单：`wp_nonce_field() + check_admin_referer()`
- AJAX：`check_ajax_referer()`
- REST：建议用 `wp_rest` nonce 或自定义方案，但必须有权限回调与参数校验

### 4.3 SQL 注入防护

- 优先 WP API：options/meta/WP_Query
- 必须写 SQL：
  - `$wpdb->prepare()` 必须用
  - 不拼接用户输入
  - 表名必须用 `$wpdb->prefix`，考虑 multisite

### 4.4 XSS 防护

- 任何动态输出都必须 escape
- `the_content` 过滤时避免“二次注入/重复注入”
- 允许用户输入 HTML/JS 的场景要严格限制角色与风险提示（默认只允许管理员）

### 4.5 SSRF / 远程请求安全

- 远程请求用 `wp_remote_get/wp_remote_post`
- 设置超时、错误处理，限制重定向
- 不要把 secret 输出到前端
- 对可配置 URL 做白名单或域名校验（可选但建议）

### 4.6 文件系统与上传安全

- 上传：`wp_handle_upload()`，校验 MIME、扩展名、权限
- 文件写入：优先 WP Filesystem API（如有需要）
- 不允许执行型文件写入到可访问目录

---

## 5. 可扩展性设计（让插件“可被二开”）

### 5.1 对外提供 Hook（必须习惯性提供）

- 过滤数据：`apply_filters('my_plugin_xxx', $value, $context)`
- 关键流程点：`do_action('my_plugin_before_xxx', $context)`
- Hook 命名稳定，不随意破坏

### 5.2 配置与默认值策略

- 统一默认值函数：`Defaults::get()` 或 `get_default_settings()`
- 读取设置必须合并默认值：
  - `wp_parse_args($saved, $defaults)`
- 提供过滤器让默认值可覆盖：
  - `apply_filters('my_plugin_default_settings', $defaults)`

### 5.3 向后兼容与废弃策略（建议）

- 变更 public API：先 deprecate（标记 + 文档），至少保留一个主版本周期
- 重要 filter/action 名称不要轻易改
- 版本升级要写 migration（见第 7 节）

---

## 6. 管理端（Admin）通用规范

### 6.1 菜单与页面

- 菜单注册：`add_menu_page/add_submenu_page`
- Screen 检测：使用 `$hook_suffix` 或 `get_current_screen()`
- 设置页尽量使用 Settings API（可自动处理 sanitize）

### 6.2 表单与设置保存

- 必须 `current_user_can` + nonce
- 显示错误用 Settings API 的 `add_settings_error()` 或 admin notices
- 成功提示也用标准 notice

### 6.3 可访问性（A11y）基本要求（建议但很重要）

- 表单元素要有 `<label for>`
- 使用 WP 自带组件/样式（`notice`, `button`, `regular-text`）
- 不用仅颜色表达状态（提示文字+图标）

---

## 7. 数据与迁移（通用插件最容易踩坑的地方）

### 7.1 数据版本号（强烈建议）

- 在 option 存一个 `my_plugin_data_version`
- 插件代码也定义 `MY_PLUGIN_DATA_VERSION`

### 7.2 升级迁移入口

- 在 `admin_init` 或 `plugins_loaded` 里检测数据版本，按步骤迁移：
  - 如果 `stored_version < target_version`：执行迁移队列
- 迁移要幂等（重复运行不出错）

### 7.3 自建表迁移（如使用）

- 使用 `dbDelta()` 创建/更新表结构（注意索引与字段变更）
- 表结构变更要写迁移脚本与版本号
- 卸载时是否删除表必须可选（避免误删）

### 7.4 卸载/停用/删除行为（必须清晰）

- 停用（deactivate）：不应默认删数据
- 卸载（uninstall.php）：可按设置决定是否删除数据
- 建议提供设置：
  - “卸载时删除所有数据”（默认关闭）

---

## 8. 前台（Frontend）通用规范

### 8.1 内容过滤与短代码

- `the_content` 修改必须防重复：
  - 仅在 `is_main_query() && in_the_loop()`（必要时）
  - 仅在目标页面类型（`is_singular()` 等）
  - 使用静态标记防重复注入
- 短代码输出必须 escape，必要时用模板渲染

### 8.2 资源加载（enqueue）

- 只在需要页面加载（按条件 enqueue）
- `wp_enqueue_script/style` + 版本号用插件版本
- JS 需要数据用：
  - `wp_localize_script()` 或 `wp_add_inline_script()`（注意 escape）

### 8.3 模板覆盖机制（可选但通用）

- 允许主题覆盖模板：
  - 先查 `get_stylesheet_directory() . '/my-plugin/...php'`
  - 找不到再用插件内置模板

---

## 9. REST / AJAX（通用）

### 9.1 REST

- `register_rest_route()`
- 必须有：
  - `permission_callback`
  - 参数 schema（类型、required、sanitize_callback/validate_callback）
- 返回用 `WP_REST_Response` 或 `rest_ensure_response()`
- 错误用 `WP_Error`，包含可读 message 与稳定 error code

### 9.2 AJAX

- hook：`wp_ajax_xxx` / `wp_ajax_nopriv_xxx`
- 必须：
  - `check_ajax_referer()`
  - 权限校验（写操作）
  - `wp_send_json_success/error()`

---

## 10. 区块编辑器（Gutenberg）与现代 UI（可选）

### 10.1 注册区块

- 资源构建：`@wordpress/scripts`（如使用）
- `register_block_type()` 统一入口
- 动态区块（PHP render callback）适合需要服务器侧逻辑的场景
- 区块保存内容必须安全：render 端 escape/kses

### 10.2 后台 React 页面（可选）

- 尽量复用 WordPress packages（components, data 等）
- API 调用走 REST
- 注意非管理员不可见敏感信息

---

## 11. Cron / 后台任务（通用）

- 计划任务：`wp_schedule_event()` + `wp_clear_scheduled_hook()`
- WP-Cron 不可靠：避免用于强实时任务；需要的话提供手动触发/CLI
- 长任务建议拆分、分页处理，防超时
- 任务执行要加锁（transient/option）避免并发重复跑

---

## 12. 性能规范（必须有意识）

- 避免在请求中做昂贵操作（尤其 `the_content` / `init`）
- 缓存：
  - 对计算结果用 object cache / transient
  - cache key 包含上下文（用户/语言/站点）
- 查询优化：
  - 避免 N+1
  - 用 `update_meta_cache()` 或减少循环查询
- 资源：
  - 减少全站加载脚本
  - 不在前台输出大量 inline 脚本（必要时合并）

---

## 13. 兼容性（通用必备）

必须考虑：

- 多站点（multisite）：站点级 option vs network option
- PHP 最低版本（插件头声明并遵循）
- WP 最低版本（遵循并避免使用过新 API）
- 缓存插件：避免每次请求生成不可缓存输出（除非有策略）
- 主题差异：不依赖固定 DOM；尽量用 hook 和模板
- 第三方插件软依赖：
  - 检测是否激活
  - 不存在就降级/隐藏功能 + admin notice

---

## 14. 隐私与合规（通用但非常重要）

- 若收集任何用户数据/统计：
  - 必须在设置中明确告知与开关
  - 提供导出/删除路径（如涉及个人数据）
- 不要“悄悄”向外部发送站点信息（除非用户明确启用）
- 若需要存储 API Key：
  - 存到 options（autoload=false）或更安全的方式
  - 前端不要暴露 secret

---

## 15. 日志、调试与可观测性（建议）

- 不在生产输出调试信息
- 建议实现 Logger：
  - 默认关闭
  - 仅在 WP_DEBUG 或插件 debug 开启时写 `error_log`
- 对关键失败路径提供可读错误信息（不泄露敏感）

---

## 16. 测试与质量门槛（强烈建议）

### 16.1 手动测试清单（每次改动必走）

- 激活/停用/卸载
- 设置保存：权限 + nonce
- 前台输出：正确页面生效，不重复
- XSS：设置项输出是否 escape
- SQL：prepare 是否到位
- 多站点（如声明支持）
- 与常见主题/缓存插件基本兼容（至少不报错）

### 16.2 自动化（可选但推荐）

- PHPCS：WPCS
- PHPStan：从低级别开始
- PHPUnit：核心逻辑（Sanitizer、规则判断、渲染输出）

---

## 17. 发布与打包（通用）

- `readme.txt`：简介、安装、使用、FAQ、更新日志、最低要求
- 版本：语义化 `MAJOR.MINOR.PATCH`
- 插件头信息完整（Name/URI/Version/Requires PHP/Requires at least/Text Domain 等）
- 不要把开发依赖打进发布包（node_modules、tests、.git）
- 许可证：遵循 GPL 兼容（WordPress 生态要求）

---

## 18. 常用代码模板（通用）

### 18.1 插件主类骨架

```php
<?php
namespace MyPlugin;

defined('ABSPATH') || exit;

final class Plugin {

  private static $instance = null;

  public static function instance(): self {
    if (null === self::$instance) {
      self::$instance = new self();
    }
    return self::$instance;
  }

  private function __construct() {}

  public function init(): void {
    add_action('plugins_loaded', [$this, 'load_textdomain']);
    add_action('init', [$this, 'register']);
    add_action('admin_init', [$this, 'maybe_upgrade']);
  }

  public function load_textdomain(): void {
    load_plugin_textdomain('my-plugin', false, dirname(plugin_basename(MY_PLUGIN_FILE)) . '/languages');
  }

  public function register(): void {
    // 注册：CPT / taxonomies / shortcodes / blocks / routes / hooks
  }

  public function maybe_upgrade(): void {
    // 数据迁移入口（比较 data version，按需执行）
  }
}
```

## 18.2 安全保存设置（通用模式）

```php
if (! current_user_can(apply_filters('my_plugin_manage_capability', 'manage_options'))) {
  wp_die(esc_html__('Permission denied.', 'my-plugin'));
}

check_admin_referer('my_plugin_save_settings', 'my_plugin_nonce');

$raw = isset($_POST['my_plugin_settings']) ? (array) wp_unslash($_POST['my_plugin_settings']) : [];
$settings = \MyPlugin\Utils\Sanitizer::sanitize_settings($raw);

update_option('my_plugin_settings', $settings, false);
```

## REST route 注册（通用）

```php
register_rest_route('my-plugin/v1', '/settings', [
  'methods'             => 'POST',
  'permission_callback' => function () {
    return current_user_can(apply_filters('my_plugin_manage_capability', 'manage_options'));
  },
  'args' => [
    'foo' => [
      'type'              => 'string',
      'required'          => false,
      'sanitize_callback' => 'sanitize_text_field',
    ],
  ],
  'callback' => function (\WP_REST_Request $request) {
    $foo = (string) $request->get_param('foo');
    // ...
    return rest_ensure_response(['ok' => true]);
  },
]);
```

可扩展点示例

```php
$enabled = (bool) apply_filters('my_plugin_feature_enabled', true, [
  'feature' => 'example',
]);

do_action('my_plugin_after_render', [
  'context' => 'frontend',
]);
```

## 默认假设（当需求未说明时）

    text domain：my-plugin
    •	后台管理权限：manage_options（可过滤）
    •	设置存储：options（autoload=false）
    •	输出策略：默认严格 escape；富文本用 wp_kses_post
    •	不默认删除数据：卸载清理需要用户明确开启
