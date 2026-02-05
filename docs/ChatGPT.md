## 整改

下面是**基于你这份 Plugin Check 扫描结果**做的整改清单，我按「必须先修（会影响上线/上架/安全）→ 建议修（质量/规范/性能）→ 可优化（工程化）」给你一套可落地的改法。
（来源：你上传的扫描报告 ）

---

## 0）先定目标：你是“自用上线”还是“准备上架 WP.org”？

从报告里大量出现 **slug 含 wp、readme 头缺失、隐藏文件、脚本文件不允许** 来看，如果你要上架 WP.org，这些属于**硬性门槛**，必须处理；如果只自用上线，也建议按同样标准做一次“生产化”。

---

## 1）必须先修（高风险 / 影响上架 / 影响安全）

### 1.1 插件头与 Readme：许可证、Text Domain、稳定版本

- **缺 License**（插件头 + README 都缺），会被直接拒绝：`plugin_header_no_license`、`no_license`。
  ✅整改：
  - `magick-ad.php` 插件头加：
    - `License: GPLv2 or later`
    - `License URI: https://www.gnu.org/licenses/gpl-2.0.html`

  - README 增加 License 段落

- **Text Domain 不匹配**：发现 `magick-ad`，期望 `magick-ad-wp`（但同时又提示 slug 含 wp 不允许）。
  ✅整改策略（推荐一次性定案）：
  - 如果走 WP.org：**不要用带 “wp” 的 slug / 插件名**（会触发 trademarked_term）。
  - 建议把目录名、主文件、Text Domain 统一为：`magick-ad`（或 `magick-ad-lite` / `magick-ads`）
  - 全项目搜索替换 `__('...', 'magick-ad')` 保持一致

- **README 缺 Tested up to / Stable Tag / 名称不一致**：
  ✅整改：补齐 readme 头，并确保 Stable Tag = 插件头 Version；README 名称与插件头 name 对齐。

---

### 1.2 生产包里不允许的文件/目录（上架硬伤）

- `.DS_Store`（禁止）
- `scripts/release.sh`（application files 不允许）
- `.github`（工作流目录不建议包含在生产插件）
- `.gitignore`（隐藏文件问题）
- `README.en.md`（根目录额外 markdown 文件不符合预期）

✅整改：

- 建一个 `dist/` 打包流程（release artifact）只包含 WP 运行必需文件
- 将 `scripts/`、`.github`、开发文档移到仓库但不打进发布包
- mac 上把 `.DS_Store` 加入全局忽略，并清理仓库内已有文件

---

### 1.3 输出未转义（XSS/后台安全 & 审核必修）

报告里大量 `OutputNotEscaped`，涉及：

- `magick-ad.php` 输出 `$message` 未 escape
- `src/Frontend/Frontend.php` 多处 `$markup`、`self`、`$preview_content`、`get_language_attributes`、`$active` 未 escape
- `src/Frontend/Template_Tags.php` `MagickAD` / `$args` 未 escape
- `src/Admin/Admin.php` `$title`、`$examples`、`$example` 未 escape

✅整改原则（按类型选函数，别一刀切）：

- **输出到 HTML 文本节点**：`esc_html()` / `wp_kses_post()`
- **输出到属性**：`esc_attr()`
- **输出 URL**：`esc_url()`
- **输出你自己的广告 HTML（可包含标签）**：必须先走**白名单过滤** `wp_kses( $markup, $allowed_html )`，不要直接 echo 原始 `$markup`
- `get_language_attributes()` 这种本身返回安全属性字符串，但插件审计会要求你显式使用：`echo wp_kses( get_language_attributes(), [] )` 或者把它放在 `printf('<html %s>', get_language_attributes())` 并标注 `// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped`（有理由才 ignore）

> 你这个插件允许广告 HTML/iframe/script，本质是“高风险内容”，你要明确做两档：
>
> - **safe 模式**：严格 kses 白名单（默认）
> - **full 模式**：强提醒 + 仅管理员可用 + 单独 capability + 可选 sandbox

---

### 1.4 Nonce 校验缺失（CSRF）

多处 `NonceVerification.Recommended`：

- `magick-ad.php` 行 37、66（处理表单无 nonce）
- `src/Admin/Admin.php` 多处表单处理
- `src/Blocks/Bindings.php` / `src/Frontend/Frontend.php` 也出现

✅整改：

- 所有后台表单提交：
  - 表单内：`wp_nonce_field('magick_ad_action', 'magick_ad_nonce')`
  - 处理处：`check_admin_referer('magick_ad_action', 'magick_ad_nonce')`

- REST 写入类接口：使用 `permission_callback` + `current_user_can()` + `wp_verify_nonce()`（若走 cookie auth）

---

### 1.5 输入未 unslash / 未 sanitize（Cookie / Server）

- `$_COOKIE['magick_ad_consent']` 未 `wp_unslash()` 且未 sanitize
- `$_SERVER['CONTENT_LENGTH']`、`$_SERVER['REQUEST_URI']` 多处提示 InputNotSanitized

✅整改：

- 对 `$_COOKIE` / `$_POST` / `$_GET` / `$_SERVER`：
  - 先 `wp_unslash()`
  - 再 `sanitize_text_field()` / `absint()` / `sanitize_key()` / `esc_url_raw()` 视类型

- `REQUEST_URI` 如果只是用于日志：建议 `wp_parse_url()` 取 path+query，再 `sanitize_text_field()` 截断长度

---

## 2）数据库/SQL 整改（安全 + 兼容 + 通过审计的关键）

你报告里最大的一坨 ERROR 来自：**SQL 中插入了变量表名/列名**，被认为 “InterpolatedNotPrepared / UnescapedDBParameter”。典型位置：

- `src/REST/Controllers/Track_Controller.php`（严重度 10 的 DirectDB Unescaped）
- `src/Utils/Stats_Accumulator.php` 多处 `$wpdb->query($sql)` 与 `$table` 插值
- `Reports_Controller.php` 动态 `$column` / `$table` 拼接
- `Admin/Privacy.php` `FROM {$table}` / `DELETE ... IN ({$placeholders})`
- `Schema.php`、`uninstall.php` 有 schema change / DROP TABLE 拼接

✅整改策略（现实可过审的方式）：

1. **表名不要当作用户输入**：
   - 统一封装：
     - `magick_ad_table_stats()` 返回固定字符串 `$wpdb->prefix . 'magick_ad_stats'`
     - `magick_ad_table_log()`、`magick_ad_table_dim()`…

   - 然后在 SQL 里直接使用这些“内部常量表名”，并在关键点加 `// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared`（因为表名不能用 `%s` 绑定，官方也认可这种做法，只要表名不是外部输入）

2. **列名/ORDER BY 这类动态字段，必须白名单**（Reports_Controller 的 `$column` 就是典型）
   - `allowed_columns = ['ad_id','slot','position','container','variant_id']`
   - 不在白名单 → 400

3. **IN (...) 批量删除**
   - 用 `array_map('absint', $ids)`
   - `implode(',', array_fill(0, count($ids), '%d'))`
   - 再 `$wpdb->prepare("DELETE FROM $table WHERE id IN ($placeholders)", ...$ids)`

4. **批量 UPSERT**（Track_Controller / Accumulator 的多值插入）
   - 生成 placeholders + values 数组，再一次 `$wpdb->prepare($sql, $values)`
   - 执行 `$wpdb->query($prepared)`
     （你已经有类似写法，但报告仍提示不安全，主要问题往往是：`$sql` 拼接/表名插值/未白名单字段）

---

## 3）时间函数：用 `gmdate()` 或 `wp_date()`

多处 `date()` 被标记：`WordPress.DateTime.RestrictedFunctions.date_date`（Ads.php、Reports_Controller、Diagnostics_Cron、Stats_Dim_Cron、Settings.php）。
✅整改：

- 用 `gmdate('Y-m-d')`（统计按 UTC 日期最稳）
- 或用 `wp_date()`（遵循站点时区，但对统计聚合可能更麻烦）

---

## 4）i18n（国际化）整改：Text Domain + translators comment

大量 `TextDomainMismatch` + `MissingTranslatorsComment`。
✅整改：

- 统一 text domain（见 1.1）
- 对带占位符的翻译文本，加注释：

  ```php
  /* translators: %s: error message */
  esc_html__( 'Magick AD error: %s', 'magick-ad' );
  ```

另外：`load_plugin_textdomain()` 被标记不推荐（WP.org 自动加载）。
✅整改：如果你目标是 WP.org，上架版可以移除；如果私有分发，也可以保留但不会影响功能（只是审计提示）。

---

## 5）工程化/发布流程整改（强烈建议）

为了以后每次发布都不会带上 `.DS_Store/.github/scripts` 这种东西，我建议你加一个“发布构建”：

- `npm run build` / `composer dump-autoload -o` 后，复制到 `dist/magick-ad/`
- 只保留：`magick-ad.php / src / assets(build后) / templates / uninstall.php / readme.txt`
- 在 CI 里跑 Plugin Check / PHPCS，失败禁止发布

---

## 6）我建议你下一步的“整改顺序”（最快见效）

1. **改名与统一：slug / textdomain / readme 头 / license**（上架硬门槛）
2. **修所有未 escape 输出点**（安全/审计大头）
3. **补 nonce**（后台表单、写接口）
4. **SQL：表名/列名白名单 + prepare 规范**（尤其 Track/Reports/Privacy/Accumulator）
5. **清理发布包：删除隐藏文件/脚本/.github**
6. **date() → gmdate/wp_date** + i18n translators 注释


