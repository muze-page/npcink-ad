# skill.md（1）WordPress 插件性能 & 安全审计技能（含 AI 代码常见问题）

> 目标：系统化检查现有插件的性能、安全、可维护性，并输出可落地的整改建议与优先级。
> 使用方式：按本清单逐项排查，记录证据（文件/行号/截图/请求日志），产出审计报告与修复 PR 列表。

---

## 0. 审计输出物（建议格式）

### 0.1 缺陷条目模板（每条都要这样写）

- **ID**：SEC-001 / PERF-003 / MAINT-007
- **级别**：P0(立即修) / P1(本迭代) / P2(可排期)
- **类型**：安全 / 性能 / 可靠性 / 可维护性 / 体验
- **影响面**：管理员/访客/编辑/全站/特定页面
- **复现步骤**：
- **证据**：文件路径 + 行号 + 日志/截图
- **原因分析**：
- **修复建议（具体到代码形态）**：
- **回归测试点**：

### 0.2 风险分级建议

- **P0**：可被利用的漏洞（XSS/SQLi/权限绕过/CSRF/RCE/任意文件写入/SSRF）、导致站点崩溃、严重数据损坏
- **P1**：高概率性能问题（慢查询、每次请求大量 IO、后台页面卡死）、隐性安全风险（缺少权限校验/nonce、敏感信息泄漏）
- **P2**：代码异味、重复代码、架构不清、可维护性差、轻微性能浪费

---

## 1. 快速摸底（10 分钟定位大风险）

### 1.1 入口与高风险面清点

- [ ] 所有 **AJAX**：`wp_ajax_` / `wp_ajax_nopriv_`
- [ ] 所有 **REST API**：`register_rest_route`
- [ ] 所有 **表单提交**：后台设置页、保存按钮、导入导出
- [ ] 所有 **文件操作**：上传、写文件、解压、日志落盘
- [ ] 所有 **远程请求**：`wp_remote_get/post`（是否 SSRF 风险）
- [ ] 所有 **数据库写入**：`$wpdb->query/insert/update`（是否 prepared）
- [ ] 所有 **输出到页面**：echo/print、admin notice、前台短代码

### 1.2 一键工具（强烈建议）

- [ ] 安装 Query Monitor：看 **慢查询、重复查询、HTTP API、hooks 性能**
- [ ] 开启 `WP_DEBUG_LOG`，检查 Notice/Warning（影响性能 & 可泄漏路径）
- [ ] 用浏览器 DevTools 看后台页面：是否加载大量 JS/CSS、是否阻塞渲染
- [ ] `wp-cli`（如可用）：检查 cron、option autoload、插件激活耗时

---

## 2. 安全审计清单（按攻击面逐项查）

> 核心原则：**每个入口必须做：权限校验（capability）+ nonce（CSRF）+ 输入校验（sanitize/validate）+ 输出转义（escape）+ 最小暴露**。

### 2.1 权限与访问控制（Privilege Escalation）

- [ ] 每个 admin page：是否 `current_user_can('manage_options')` 或更细粒度 capability
- [ ] AJAX handler：是否校验 capability（不是只校验 nonce）
- [ ] REST permission_callback：是否校验 capability + 资源归属（比如只能读自己的数据）
- [ ] 多站点（Multisite）：是否区分 `manage_network_options`

**常见问题**

- 只用 nonce 但不校验权限
- permission_callback 返回 true
- 允许订阅者调用敏感接口

**修复建议**

- 统一封装：`Security::require_cap( $cap )` / `Security::verify_nonce( $action )`

---

### 2.2 CSRF（跨站请求伪造）

- [ ] 所有会写入的请求必须 `check_admin_referer` 或 `wp_verify_nonce`
- [ ] REST：建议用 WP 的 nonce header（`X-WP-Nonce`）并在 permission_callback 校验
- [ ] 非管理员表单：用 `wp_nonce_field`，action 要有命名空间（如 `magick_ai_save_settings`）

---

### 2.3 XSS（跨站脚本）

- [ ] 所有输出到 HTML：是否使用 `esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`
- [ ] 输出 JSON 到页面：是否 `wp_json_encode` + `wp_add_inline_script`（避免直接拼接）
- [ ] Admin notice：内容是否来自用户输入（尤其 error message / logs）

**高风险点**

- `$_GET` / `$_POST` 直接 echo
- JS 内拼接 HTML 字符串（尤其 React/Vue 以外的原生 DOM 操作）

---

### 2.4 SQL 注入 & 数据完整性

- [ ] `$wpdb->prepare()`：是否正确使用占位符（%d, %s, %f）
- [ ] `LIKE`：是否正确转义（`$wpdb->esc_like`）
- [ ] 不要拼接 `ORDER BY` / `IN (...)`：必须白名单
- [ ] 表结构：是否有主键/索引；升级逻辑是否可逆

---

### 2.5 SSRF / 任意远程请求

- [ ] `wp_remote_get/post` 的 URL 是否来自用户输入？
- [ ] 是否限制协议（http/https）、域名白名单、内网 IP（127.0.0.1/169.254/10/172/192.168）阻断
- [ ] 是否设置 timeout、redirection、user-agent

---

### 2.6 反序列化 / 任意文件写入 / RCE

- [ ] 不要 `unserialize` 用户输入
- [ ] 文件写入：路径必须在 `wp_upload_dir()` 内，文件名要 `sanitize_file_name`
- [ ] 导入 zip：严禁路径穿越（`../`），解压必须检查 realpath

---

### 2.7 敏感信息泄漏

- [ ] 日志：是否写入 API Key、token、请求体（应打码）
- [ ] 错误提示：是否泄漏绝对路径、SQL、堆栈
- [ ] REST 响应：是否泄漏 option 值/密钥

---

## 3. 性能审计清单（“每次请求” vs “偶发任务”分离）

### 3.1 最致命的性能问题（优先查）

- [ ] **autoload options**：是否把大 JSON 存进 autoload=yes 的 option
- [ ] 后台页面加载：是否在 `admin_menu`/`init` 时就做重计算/远程请求
- [ ] 每次请求都跑迁移/扫描：比如遍历全站文章/媒体
- [ ] N+1 查询：循环里 `get_post_meta/get_user_meta`
- [ ] HTTP API：是否在页面渲染时请求外部 API（应异步/缓存）

**修复建议**

- 大数据：用自建表或分片 option（autoload=no）
- 重任务：Action Scheduler / WP Cron / 后台队列（AJAX/SSE 拉进度）
- 查询：批量拉 meta（`update_meta_cache`）或一次性 query

---

### 3.2 数据库与缓存

- [ ] 查询是否可加索引（常用 where 条件字段）
- [ ] 是否使用 Transient/Object Cache 缓存（且有失效策略）
- [ ] 是否重复计算同一结果（可用 request-scope cache 静态变量）

---

### 3.3 资源加载（后台 UI/前台）

- [ ] `wp_enqueue_script/style` 是否只在需要的页面加载（hook suffix 判断）
- [ ] 是否正确声明依赖、版本（cache busting）
- [ ] 是否避免加载巨量库（重复引入 React、moment 等）
- [ ] 是否启用构建产物压缩、tree-shaking、按需拆包

---

## 4. AI 写代码常见“坑”专项检查（你提到的重复/低效等）

### 4.1 重复代码 & 假抽象

- [ ] 多个文件出现同样的 sanitize/nonce/capability 逻辑（应抽到 Security 类）
- [ ] Prompt/Model 路由处重复 if/else（应做策略解析器/映射表）
- [ ] “看起来有架构”，但每个函数只调用一次（假抽象 → 增加复杂度）

**整改**

- 抽出：`Security`, `Router`, `PromptRegistry`, `SettingsRepository`, `Logger`
- 用数据驱动（数组映射/配置对象）替代多层 if

---

### 4.2 重复注释/啰嗦注释

- [ ] 注释是否重复描述代码本身（“设置变量 x 为…”）
- [ ] 是否存在 AI 生成的模板注释但与实现不符
- [ ] 是否遗漏 docblock 的 @return/@throws 真实语义

**整改**

- 只保留：WHY（为什么这么做）/ CONTRACT（输入输出约束）/ SECURITY（安全点）

---

### 4.3 低效实现

- [ ] 正则/字符串处理在循环里频繁创建对象
- [ ] JSON encode/decode 反复执行
- [ ] 大数组 merge/array_map 多次链式调用（PHP 下很耗）
- [ ] 频繁调用 `get_option`（可做 request 缓存）

---

### 4.4 可维护性风险

- [ ] “magic string”满天飞（capability key/prompt key/model key）
- [ ] 没有统一错误码体系（日志不可读）
- [ ] 捕获异常后吞掉（导致 silent failure）

---

## 5. 整改建议（可直接作为 PR 列表）

### 5.1 必做（P0）

- [ ] 所有写接口：capability + nonce + sanitize + escape
- [ ] REST permission_callback 全面收紧
- [ ] remote 请求 SSRF 防护 + timeout
- [ ] 日志打码（API key/token）+ 关闭生产环境 debug 输出

### 5.2 性能（P1）

- [ ] 后台页面只加载所需资源（按页面 hook）
- [ ] 大 option 改为 autoload=no 或自建表
- [ ] 路由策略解析缓存（避免每请求多层 resolve）
- [ ] 向量/批处理任务走队列（Action Scheduler）

### 5.3 维护（P2）

- [ ] 建立 Registry：task/capability/prompt 统一常量 & schema
- [ ] 增加 CI：PHPCS(WPCS) + PHPStan + Unit/Integration Test
- [ ] 建立错误码与日志规范

---

## 6. 推荐的自动化检查配置（附命令）

### 6.1 PHPCS（WordPress Coding Standards）

- 标准：WordPress-Core, WordPress-Docs, WordPress-Extra
- 重点 sniff：escape/sanitize、nonce usage、prepared statements

### 6.2 PHPStan（或 Psalm）

- 目标：消灭隐式类型错误、未定义索引、可空值错误

### 6.3 安全扫描（可选）

- `wp-env` + 集成测试 + e2e（Playwright）跑关键管理流程
- 简单 SAST：grep 检查 `$_GET/$_POST` 直出、`wp_remote_get` 入参来源等

---

## 7. 审计完成的“验收标准”

- [ ] 关键入口 0 漏洞（P0=0）
- [ ] 后台关键页面加载时间明显下降（记录前后对比）
- [ ] 插件激活/升级过程可重复、可回滚或可恢复
- [ ] 路由/策略/提示词配置可解释、可追踪（日志含 “最终生效来源”）
