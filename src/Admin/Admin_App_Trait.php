<?php

namespace MagickAD\Admin;

if (!defined('ABSPATH')) {
    exit;
}

trait Admin_App_Trait {
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
            'settingsLevel' => $this->get_settings_level(),
            'previewUrl' => $this->get_preview_url(),
            'previewNonce' => wp_create_nonce('magick_ad_preview'),
            'diagnoseNonce' => wp_create_nonce('magick_ad_diagnose'),
            'pickerNonce' => wp_create_nonce('magick_ad_picker'),
            'siteHealthUrl' => admin_url('site-health.php?tab=direct'),
            'compatibilityUrl' => admin_url('admin.php?page=magick-ad-compat'),
            'branding' => $this->get_branding(),
            'canUnfilteredHtml' => current_user_can('unfiltered_html'),
            'patterns' => \MagickAD\Blocks\Patterns::export_patterns(),
            'templateSchemaVersion' => \MagickAD\Blocks\Patterns::TEMPLATE_SCHEMA_VERSION,
            'buildVersion' => MAGICK_AD_VERSION,
            'buildTime' => $this->get_build_time(),
            'displayReasonCatalog' => \MagickAD\Utils\Diagnostics::get_ad_display_reason_catalog(),
        );
        if ($this->is_debug_enabled() && $this->get_settings_level() !== 'simple') {
            $data['nodeDebugNonce'] = wp_create_nonce('magick_ad_node_debug');
            $data['diagnoseUrl'] = admin_url('admin.php?page=magick-ad-debug');
            $data['debugEnabled'] = true;
        } else {
            $data['debugEnabled'] = false;
        }

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

    private function get_settings_level(): string {
        $level = (string) get_option(self::SETTINGS_LEVEL_OPTION, 'simple');
        return in_array($level, array('simple', 'advanced', 'lab'), true) ? $level : 'simple';
    }

    private function is_debug_enabled(): bool {
        return (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG);
    }

    private function is_app_screen(string $hook): bool {
        return in_array(
            $hook,
            array(
                'toplevel_page_magick-ad',
                'magick-ad_page_magick-ad',
                'magick-ad_page_magick-ad-report',
                'magick-ad_page_magick-ad-compat',
            ),
            true
        );
    }

    private function get_initial_tab(string $hook): string {
        if (str_contains($hook, 'magick-ad-compat')) {
            return 'compatibility';
        }
        if (str_contains($hook, 'magick-ad-report')) {
            return 'report';
        }
        return 'ads';
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
        $level = $this->get_settings_level();
        $pages = array(
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
        );

        if ($level !== 'simple') {
            $pages[] = array(
                'page_title' => __('统计看板', 'magick-ad'),
                'menu_title' => __('统计看板', 'magick-ad'),
                'menu_slug' => 'magick-ad-report',
                'callback' => array($this, 'render_app'),
            );
            $pages[] = array(
                'page_title' => __('兼容报告', 'magick-ad'),
                'menu_title' => __('兼容报告', 'magick-ad'),
                'menu_slug' => 'magick-ad-compat',
                'callback' => array($this, 'render_app'),
            );
        }

        if ($this->is_debug_enabled() && $level !== 'simple') {
            $pages[] = array(
                'page_title' => __('调试面板', 'magick-ad'),
                'menu_title' => __('调试面板', 'magick-ad'),
                'menu_slug' => 'magick-ad-debug',
                'callback' => array($this, 'render_debug_panel'),
            );
        }

        return $pages;
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
        $examples_output = implode("\n", $examples);
        echo '<pre><code>' . esc_html($examples_output) . '</code></pre>';
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


}
