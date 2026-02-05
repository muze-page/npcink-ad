# skill.md（2）现代化 WordPress 插件开发规范（安全/性能/可维护 + WP 风格后台 UI）

> 目标：用一套统一规范，持续开发“现代化、高性能、可维护、符合 WordPress 风格”的插件（含后台设置界面）。
> 范围：架构、编码规范、安全、性能、后台 UI、构建流程、测试与发布。

---

## 1. 基本原则（务必统一）

1. **WordPress first**：优先使用 WP 原生 API（Settings API、REST、HTTP API、Cron、Filesystem API）
2. **安全默认开启**：capability + nonce + sanitize + escape 为默认路径
3. **性能按“请求成本”设计**：重任务异步化、缓存可控、autoload 清洁
4. **配置可追踪**：任何“生效值”都能解释来源（默认/继承/覆盖）
5. **可维护**：数据驱动 > if/else；清晰 Registry；严格版本化与迁移

---

## 2. 推荐目录结构（兼顾 WP 习惯与现代工程）

plugin-root/

- magick-ai.php # 主插件文件（只做 bootstrap）
- readme.txt
- uninstall.php # 清理数据（可选）
- /includes/
  - /Core/ # Service container / bootstrap
  - /Admin/ # admin pages, assets enqueue
  - /Rest/ # REST controllers
  - /Ajax/ # AJAX handlers
  - /Domain/ # 业务域（Router/Prompt/Model/Jobs）
  - /Infrastructure/ # DB、Cache、HTTP、FS、Logger
  - /Registry/ # tasks/capabilities/prompts 常量与定义
  - /Migrations/ # DB/option schema 迁移
- /assets/
  - /src/ # 前端源（React/Vue/TS）
  - /dist/ # 构建产物（只提交 dist 或用 release 打包）
- /languages/
- /tests/

---

## 3. 编码规范（PHP/JS/SQL）

### 3.1 PHP

- 遵循：WordPress Coding Standards（PHPCS）
- 类命名空间：建议 `Vendor\Plugin\...`，但注意 WP 自动加载策略
- 只在一个地方定义常量（版本号、slug、capability keys）
- 使用严格类型要谨慎（WP 生态兼容性），但内部可用类型声明提升可靠性

### 3.2 JS / CSS

- 后台推荐用 `@wordpress/components`（确保 WP 风格一致）
- 国际化：`wp.i18n.__()` + `wp_set_script_translations`
- 构建：Vite / Webpack 皆可，但要：
  - 产物拆包（code-splitting）
  - 依赖外置（不要重复打包 react/react-dom，尽量用 WP 自带）

### 3.3 SQL

- 自建表：明确 schema version + migration
- 所有动态查询必须 prepared
- 任何 ORDER BY、字段名必须白名单

---

## 4. 安全规范（默认策略）

### 4.1 权限（Capability）

- 后台设置页：`manage_options`（或你自己的 capability）
- 细粒度：为关键动作定义独立 capability（例如 `magick_ai_manage_models`）
- REST：permission_callback 必须检查 capability + 资源归属

### 4.2 CSRF（Nonce）

- Admin form：`wp_nonce_field('magick_ai_save_settings')`
- AJAX：`check_ajax_referer('magick_ai_ajax')`
- REST：结合 WP nonce header 或自定义 token（仍需 permission_callback）

### 4.3 输入校验（Sanitize/Validate）

- 入参来源统一走一个 `Request::get_*()` 层：
  - text: `sanitize_text_field`
  - textarea: `sanitize_textarea_field`
  - html: `wp_kses_post`
  - url: `esc_url_raw`
  - int/bool: `absint` / `rest_sanitize_boolean`
- 复杂结构（JSON）：先 `wp_unslash`，再 json_decode，逐字段 validate

### 4.4 输出转义（Escape）

- HTML：`esc_html/esc_attr/esc_url`
- 富文本：`wp_kses_post`
- JS 注入：`wp_json_encode` + `wp_add_inline_script`

### 4.5 日志与隐私

- 打码敏感字段（key/token/password）
- 生产环境禁止输出堆栈到页面
- 明确数据保留策略（可配置 retention）

---

## 5. 性能规范（你要“高性能”主要靠这些）

### 5.1 Option 设计

- 小而常用：autoload=yes
- 大或不常用：autoload=no
- 大对象（路由配置/提示词包）：分片存储或自建表（并缓存）

### 5.2 缓存策略

- request-scope cache：同请求内 `static $cache`
- persistent cache：transient/object cache（带失效机制）
- 关键点：缓存必须可解释、可清理（后台提供“清除缓存”）

### 5.3 任务异步化

- 任何会遍历大量文章/媒体/远程请求的动作：
  - 用 Action Scheduler（推荐）或 WP-Cron 队列化
  - 管理页面只展示进度（SSE/AJAX 轮询）
- 默认 timeout：远程请求 5~15s，且可配置

### 5.4 后台资源加载

- 严格按页面加载（hook_suffix）
- 构建产物版本：用文件 hash 或 `filemtime`
- 禁止全站 enqueue 巨量脚本

---

## 6. “能力 / 功能 / 策略”三层架构规范（解决你现在的矛盾）

> 强制约束：**用户选择“策略档位”，开发者维护“能力默认”，任务只做少量例外**。

### 6.1 定义

- **Task（功能）**：用户看到的一行功能（如 Article Writing）
- **Capability Slot（能力）**：一类任务共享策略（如 text_generate / micro / seo_review）
- **Strategy Tier（策略档位）**：ECO/STD/PRO/STRICT（决定模型/提示词/采样/是否自检）

### 6.2 生效优先级（强烈建议固定）

1. Task override（手动覆盖，显式标记）
2. Task strategy tier（任务自定义档位）
3. Capability default（能力默认：模型/采样/pack）
4. Role default（角色默认模型池）
5. Provider fallback

### 6.3 UI 规则

- 默认只让用户选 **策略档位**（一键好用）
- “高级设置”里才允许覆盖 model/prompt
- 界面必须显示：**当前生效值来自哪里**（继承/覆盖）

---

## 7. WordPress 风格后台设置界面规范（现代化 + 原生一致）

### 7.1 视觉与布局

- 采用 WP Admin 原生容器：`wrap`, `h1.wp-heading-inline`, `notice`
- Tab/导航：优先用 `nav-tab-wrapper`（PHP 渲染）或 `@wordpress/components` 的 TabPanel
- 表格：用 `WP_List_Table`（大量数据）或 `components/Table`（React）
- 统一间距：跟随 WP 样式，不要自造“类 Material UI”

### 7.2 设置保存（推荐）

- 简单设置：Settings API（register_setting / add_settings_section / add_settings_field）
- 复杂 JSON：REST API + nonce + capability
- 必须支持：
  - 保存成功 notice
  - 表单校验提示
  - “恢复默认 / 导出 / 导入（带校验）”

### 7.3 国际化

- PHP：`__()`, `_e()`, `esc_html__()`
- JS：`@wordpress/i18n`
- 产物：`wp_set_script_translations`

### 7.4 可访问性

- 表单 label 对应
- 按钮 aria-label
- 键盘可达（tab 顺序）

---

## 8. 可测试性与 CI（现代化必备）

- 单元测试：核心纯函数（路由解析/策略合并/校验）
- 集成测试：REST/AJAX permission、nonce、数据写入
- CI：
  - PHPCS（WPCS）
  - PHPStan
  - JS lint（eslint）
  - build 产物一致性检查

---

## 9. 发布与版本化

- 语义化版本：MAJOR.MINOR.PATCH
- DB/Schema 迁移：记录 schema version（option 或表）
- 升级可重复执行（幂等），失败可恢复
- readme.txt + changelog 清晰

---

## 10. “现代插件”验收清单（发版前必过）

- [ ] 所有写接口：capability + nonce + sanitize + escape
- [ ] Query Monitor 下无明显慢查询/重复查询
- [ ] option autoload 无大对象
- [ ] 后台资源只在本页面加载
- [ ] 路由策略可追踪：显示“最终生效来源”
- [ ] i18n 完整
- [ ] CI 通过（PHPCS + PHPStan + build）
