<?php

namespace MagickAD\Admin;

if (!defined('ABSPATH')) {
    exit;
}

final class Admin {
    private const MENU_SLUG = 'magick-ad';
    private const MENU_ICON = 'dashicons-megaphone';
    private const MENU_POSITION = 60;
    private const DEBUG_DEVICES = array('auto', 'mobile', 'tablet', 'desktop');
    private const DEBUG_LOGIN_STATES = array('auto', 'logged-in', 'logged-out');

    public function register(): void {
        add_action('admin_menu', array($this, 'register_menu'));
        add_action('admin_init', array($this, 'register_debug_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
    }

    public function enqueue_assets(string $hook): void {
        if (!$this->is_app_screen($hook)) {
            return;
        }

        $asset = $this->get_admin_asset();
        $handle = 'magick-ad-admin';

        wp_enqueue_style('wp-block-library');
        wp_enqueue_style('wp-block-library-theme');
        wp_enqueue_style('wp-block-editor');
        wp_enqueue_style('wp-edit-blocks');

        wp_enqueue_style(
            $handle,
            MAGICK_AD_URL . 'build/index.css',
            array('wp-components'),
            $asset['version']
        );

        wp_enqueue_script(
            $handle,
            MAGICK_AD_URL . 'build/index.js',
            $asset['dependencies'],
            $asset['version'],
            true
        );

        wp_set_script_translations($handle, 'magick-ad', MAGICK_AD_PATH . 'languages');
        wp_enqueue_media();

        $data = array(
            'nonce' => wp_create_nonce('wp_rest'),
            'initialTab' => $this->get_initial_tab($hook),
            'previewUrl' => $this->get_preview_url(),
            'previewNonce' => wp_create_nonce('magick_ad_preview'),
            'pickerNonce' => wp_create_nonce('magick_ad_picker'),
            'nodeDebugNonce' => wp_create_nonce('magick_ad_node_debug'),
            'branding' => $this->get_branding(),
            'canUnfilteredHtml' => current_user_can('unfiltered_html'),
            'patterns' => \MagickAD\Blocks\Patterns::export_patterns(),
            'diagnoseUrl' => admin_url('admin.php?page=magick-ad-debug'),
            'buildVersion' => MAGICK_AD_VERSION,
            'buildTime' => $this->get_build_time(),
        );

        wp_add_inline_script(
            $handle,
            'window.MagickAD = ' . wp_json_encode($data) . ';',
            'before'
        );
    }

    public function register_menu(): void {
        $capability = \MagickAD\Utils\Capabilities::manage_capability();
        $brand_name = $this->get_brand_name();

        add_menu_page(
            $brand_name,
            $brand_name,
            $capability,
            self::MENU_SLUG,
            array($this, 'render_app'),
            self::MENU_ICON,
            self::MENU_POSITION
        );

        $this->register_submenu_pages($capability);
    }

    private function get_brand_name(): string {
        $name = (string) get_option('magick_ad_brand_name', 'Magick AD');
        $name = sanitize_text_field($name);
        return $name !== '' ? $name : 'Magick AD';
    }

    private function get_branding(): array {
        $name = (string) get_option('magick_ad_brand_name', 'Magick AD');
        $tagline = (string) get_option('magick_ad_brand_tagline', '广告配置与投放规则管理');

        return array(
            'name' => $name !== '' ? sanitize_text_field($name) : 'Magick AD',
            'tagline' => $tagline !== '' ? sanitize_text_field($tagline) : '广告配置与投放规则管理',
        );
    }

    private function is_app_screen(string $hook): bool {
        return in_array(
            $hook,
            array(
                'toplevel_page_magick-ad',
                'magick-ad_page_magick-ad',
                'magick-ad_page_magick-ad-report',
            ),
            true
        );
    }

    private function get_initial_tab(string $hook): string {
        return str_contains($hook, 'magick-ad-report') ? 'report' : 'ads';
    }

    private function get_admin_asset(): array {
        $asset_path = MAGICK_AD_PATH . 'build/index.asset.php';
        if (file_exists($asset_path)) {
            $asset = require $asset_path;
            return array(
                'dependencies' => isset($asset['dependencies']) && is_array($asset['dependencies'])
                    ? $asset['dependencies']
                    : array(),
                'version' => isset($asset['version']) ? (string) $asset['version'] : MAGICK_AD_VERSION,
            );
        }

        return array(
            'dependencies' => array(),
            'version' => MAGICK_AD_VERSION,
        );
    }

    private function get_build_time(): int {
        $file = MAGICK_AD_PATH . 'build/index.js';
        return file_exists($file) ? (int) filemtime($file) : time();
    }

    private function get_preview_url(): string {
        $url = home_url('/');
        $url = (string) apply_filters('magick_ad_preview_url', $url);
        return $url !== '' ? $url : home_url('/');
    }

    private function register_submenu_pages(string $capability): void {
        foreach ($this->get_submenu_pages() as $page) {
            if (!isset($page['menu_slug'], $page['page_title'], $page['menu_title'])) {
                continue;
            }
            if (isset($page['callback'])) {
                add_submenu_page(
                    self::MENU_SLUG,
                    $page['page_title'],
                    $page['menu_title'],
                    $capability,
                    $page['menu_slug'],
                    $page['callback']
                );
                continue;
            }
            add_submenu_page(
                self::MENU_SLUG,
                $page['page_title'],
                $page['menu_title'],
                $capability,
                $page['menu_slug']
            );
        }
    }

    private function get_submenu_pages(): array {
        return array(
            array(
                'page_title' => __('广告配置', 'magick-ad'),
                'menu_title' => __('广告配置', 'magick-ad'),
                'menu_slug' => self::MENU_SLUG,
                'callback' => array($this, 'render_app'),
            ),
            array(
                'page_title' => __('广告列表', 'magick-ad'),
                'menu_title' => __('广告列表', 'magick-ad'),
                'menu_slug' => 'edit.php?post_type=magick_ad',
            ),
            array(
                'page_title' => __('统计看板', 'magick-ad'),
                'menu_title' => __('统计看板', 'magick-ad'),
                'menu_slug' => 'magick-ad-report',
                'callback' => array($this, 'render_app'),
            ),
            array(
                'page_title' => __('插入入口', 'magick-ad'),
                'menu_title' => __('插入入口', 'magick-ad'),
                'menu_slug' => 'magick-ad-insert',
                'callback' => array($this, 'render_insert_help'),
            ),
            array(
                'page_title' => __('调试面板', 'magick-ad'),
                'menu_title' => __('调试面板', 'magick-ad'),
                'menu_slug' => 'magick-ad-debug',
                'callback' => array($this, 'render_debug_panel'),
            ),
        );
    }

    public function register_debug_settings(): void {
        register_setting(
            'magick_ad_debug',
            'magick_ad_debug',
            array(
                'type' => 'string',
                'sanitize_callback' => array($this, 'sanitize_debug'),
                'default' => '0',
            )
        );

        $this->register_debug_section();
        $this->register_debug_field_setting();
    }

    private function register_debug_section(): void {
        add_settings_section(
            'magick_ad_debug_section',
            esc_html__('调试设置', 'magick-ad'),
            '__return_false',
            'magick_ad_debug'
        );
    }

    private function register_debug_field_setting(): void {
        add_settings_field(
            'magick_ad_debug_field',
            esc_html__('启用调试日志', 'magick-ad'),
            array($this, 'render_debug_field'),
            'magick_ad_debug',
            'magick_ad_debug_section'
        );
    }

    public function sanitize_debug(mixed $value): string {
        return !empty($value) ? '1' : '0';
    }

    public function render_debug_field(): void {
        $value = get_option('magick_ad_debug', '0');
        echo '<label>';
        echo '<input type="checkbox" name="magick_ad_debug" value="1" ' . checked('1', $value, false) . ' />';
        echo ' ' . esc_html__('记录调试日志到 debug.log', 'magick-ad');
        echo '</label>';
    }

    public function render_app(): void {
        echo '<div class="wrap">';
        echo '<div id="magick-ad-app"></div>';
        $this->render_classic_editor_host();
        echo '</div>';
    }

    private function render_classic_editor_host(): void {
        echo '<div id="magick-ad-classic-editor-host" style="display:none;">';
        wp_editor(
            '',
            'magick_ad_classic_editor',
            array(
                'textarea_name' => 'magick_ad_classic_editor',
                'editor_height' => 260,
                'media_buttons' => true,
                'teeny' => false,
                'quicktags' => true,
            )
        );
        echo '</div>';
    }

    public function render_insert_help(): void {
        $payload = $this->get_insert_help_payload();

        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('插入入口', 'magick-ad') . '</h1>';
        echo '<p>' . esc_html__('以下是推荐的三种插入方式，适配不同编辑环境与主题需求。', 'magick-ad') . '</p>';

        echo '<hr />';

        $this->render_block_help($payload['block_title']);
        $this->render_shortcode_help($payload['shortcode_title'], $payload['shortcode_examples']);
        $this->render_template_help($payload['template_title'], $payload['template_example']);
        $this->render_slot_naming_help();

        echo '</div>';
    }

    private function get_insert_help_payload(): array {
        return array(
            'block_title' => __('区块（Block）', 'magick-ad'),
            'shortcode_title' => __('短代码（Shortcode）', 'magick-ad'),
            'template_title' => __('主题模板函数（Template Tag / PHP API）', 'magick-ad'),
            'shortcode_examples' => array(
                '[magick_ad slot="sidebar-top"]',
                '[magick_ad id="ad_123456"]',
                '[magick_ad slot="post-inline-1" class="my-ad"]',
            ),
            'template_example' =>
                "<?php if (function_exists('magick_ad_the')) : ?>\n" .
                "  <?php magick_ad_the('sidebar-top'); ?>\n" .
                "<?php endif; ?>",
        );
    }

    private function render_block_help(string $title): void {
        echo '<h2>' . esc_html($title) . '</h2>';
        echo '<p>' . esc_html__('现代 WP 首选（Gutenberg / FSE），可在编辑器中直接插入 “Magick AD” 区块。', 'magick-ad') . '</p>';
        echo '<ol>';
        echo '<li>' . esc_html__('在区块编辑器中添加 “Magick AD” 区块。', 'magick-ad') . '</li>';
        echo '<li>' . esc_html__('在区块设置中选择广告位 Slot。', 'magick-ad') . '</li>';
        echo '<li>' . esc_html__('预览可实时渲染，前台根据投放规则显示。', 'magick-ad') . '</li>';
        echo '</ol>';
    }

    private function render_shortcode_help(string $title, array $examples): void {
        echo '<h2>' . esc_html($title) . '</h2>';
        echo '<p>' . esc_html__('兼容经典编辑器/复制粘贴场景，适合内容中快速插入。', 'magick-ad') . '</p>';
        $examples = array_map('esc_html', $examples);
        echo '<pre><code>' . implode("\n", $examples) . '</code></pre>';
    }

    private function render_template_help(string $title, string $example): void {
        echo '<h2>' . esc_html($title) . '</h2>';
        echo '<p>' . esc_html__('给主题开发者或模板文件使用，适合放在任意位置。', 'magick-ad') . '</p>';
        echo '<pre><code>' . esc_html($example) . '</code></pre>';
    }

    private function render_slot_naming_help(): void {
        echo '<h3>' . esc_html__('Slot 命名建议', 'magick-ad') . '</h3>';
        echo '<ul>';
        echo '<li>' . esc_html__('推荐使用小写字母、数字与短横线。', 'magick-ad') . '</li>';
        echo '<li>' . esc_html__('保持唯一性，便于在区块/短代码/模板函数中稳定引用。', 'magick-ad') . '</li>';
        echo '</ul>';
    }

    public function render_debug_panel(): void {
        $params = $this->get_debug_panel_params();
        $debug_url = $this->build_debug_url($params['input_url'], $params['device'], $params['login_state']);

        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('调试面板', 'magick-ad') . '</h1>';
        echo '<p>' . esc_html__('输入页面 URL 并选择设备类型，生成投放诊断报告。页面类型将由 URL 自身决定。', 'magick-ad') . '</p>';

        $this->render_debug_form($params);
        $this->render_debug_result($debug_url);

        echo '</div>';
    }

    private function get_debug_panel_params(): array {
        $base_url = home_url('/');
        if (!$this->is_debug_nonce_valid()) {
            return array(
                'input_url' => $base_url,
                'device' => 'auto',
                'login_state' => 'auto',
            );
        }

        $input_url = $this->get_url_param('debug_url', $base_url);
        $device = $this->get_select_param('debug_device', self::DEBUG_DEVICES, 'auto');
        $login_state = $this->get_select_param('debug_login', self::DEBUG_LOGIN_STATES, 'auto');

        return array(
            'input_url' => $input_url,
            'device' => $device,
            'login_state' => $login_state,
        );
    }

    private function get_url_param(string $key, string $fallback): string {
        $value = isset($_GET[$key]) ? esc_url_raw(wp_unslash($_GET[$key])) : '';
        return $value !== '' ? $value : $fallback;
    }

    private function get_select_param(string $key, array $allowed, string $fallback): string {
        $value = isset($_GET[$key]) ? sanitize_text_field(wp_unslash($_GET[$key])) : '';
        return in_array($value, $allowed, true) ? $value : $fallback;
    }

    private function build_debug_url(string $input_url, string $device, string $login_state): string {
        return add_query_arg(
            array(
                'magick_ad_diagnose' => '1',
                'magick_ad_diagnose_nonce' => wp_create_nonce('magick_ad_diagnose'),
                'magick_ad_debug_device' => $device,
                'magick_ad_debug_login' => $login_state,
            ),
            $input_url
        );
    }

    private function render_debug_form(array $params): void {
        $input_url = $params['input_url'] ?? '';
        $device = $params['device'] ?? 'auto';
        $login_state = $params['login_state'] ?? 'auto';

        echo '<form method="get" style="margin:16px 0 24px;">';
        echo '<input type="hidden" name="page" value="magick-ad-debug" />';
        wp_nonce_field('magick_ad_debug_form', 'magick_ad_debug_nonce');
        echo '<table class="form-table">';
        echo '<tr><th scope="row"><label for="magick-ad-debug-url">' . esc_html__('页面 URL', 'magick-ad') . '</label></th>';
        echo '<td><input name="debug_url" id="magick-ad-debug-url" type="text" class="regular-text" value="' . esc_attr($input_url) . '" />';
        echo '<p class="description">' . esc_html__('可填写站内完整 URL。', 'magick-ad') . '</p></td></tr>';
        echo '<tr><th scope="row"><label for="magick-ad-debug-device">' . esc_html__('设备类型', 'magick-ad') . '</label></th>';
        echo '<td><select name="debug_device" id="magick-ad-debug-device">';
        echo '<option value="auto"' . selected($device, 'auto', false) . '>' . esc_html__('自动识别', 'magick-ad') . '</option>';
        echo '<option value="mobile"' . selected($device, 'mobile', false) . '>' . esc_html__('移动端', 'magick-ad') . '</option>';
        echo '<option value="tablet"' . selected($device, 'tablet', false) . '>' . esc_html__('平板端', 'magick-ad') . '</option>';
        echo '<option value="desktop"' . selected($device, 'desktop', false) . '>' . esc_html__('桌面端', 'magick-ad') . '</option>';
        echo '</select>';
        echo '<p class="description">' . esc_html__('仅影响设备判断，不改变 URL 页面类型。', 'magick-ad') . '</p></td></tr>';
        echo '<tr><th scope="row"><label for="magick-ad-debug-login">' . esc_html__('登录状态', 'magick-ad') . '</label></th>';
        echo '<td><select name="debug_login" id="magick-ad-debug-login">';
        echo '<option value="auto"' . selected($login_state, 'auto', false) . '>' . esc_html__('自动识别', 'magick-ad') . '</option>';
        echo '<option value="logged-in"' . selected($login_state, 'logged-in', false) . '>' . esc_html__('已登录', 'magick-ad') . '</option>';
        echo '<option value="logged-out"' . selected($login_state, 'logged-out', false) . '>' . esc_html__('未登录', 'magick-ad') . '</option>';
        echo '</select>';
        echo '<p class="description">' . esc_html__('仅影响登录状态判断。', 'magick-ad') . '</p></td></tr>';
        echo '</table>';
        submit_button(__('生成诊断链接', 'magick-ad'));
        echo '</form>';
    }

    private function is_debug_nonce_valid(): bool {
        if (!isset($_GET['magick_ad_debug_nonce'])) {
            return false;
        }
        $nonce = sanitize_text_field(wp_unslash($_GET['magick_ad_debug_nonce']));
        if ($nonce === '') {
            return false;
        }
        return wp_verify_nonce($nonce, 'magick_ad_debug_form');
    }

    private function render_debug_result(string $debug_url): void {
        echo '<h2>' . esc_html__('诊断链接', 'magick-ad') . '</h2>';
        echo '<p><a href="' . esc_url($debug_url) . '" target="_blank" rel="noopener noreferrer">' . esc_html($debug_url) . '</a></p>';

        echo '<h2>' . esc_html__('嵌入预览', 'magick-ad') . '</h2>';
        echo '<div style="border:1px solid #dcdcde;border-radius:8px;overflow:hidden;background:#fff;">';
        echo '<iframe title="Magick AD Diagnose" src="' . esc_url($debug_url) . '" style="width:100%;height:720px;border:0;"></iframe>';
        echo '</div>';
    }
}
