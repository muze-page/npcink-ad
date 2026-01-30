<?php

namespace MagickAD\Admin;

if (!defined('ABSPATH')) {
    exit;
}

final class Admin {
    public function register(): void {
        add_action('admin_menu', array($this, 'register_menu'));
        add_action('admin_init', array($this, 'register_debug_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
    }

    public function register_menu(): void {
        $capability = \MagickAD\Utils\Capabilities::manage_capability();
        $brand_name = get_option('magick_ad_brand_name', 'Magick AD');
        add_menu_page(
            $brand_name,
            $brand_name,
            $capability,
            'magick-ad',
            array($this, 'render_app'),
            'dashicons-megaphone',
            60
        );

        add_submenu_page(
            'magick-ad',
            __('广告配置', 'magick-ad'),
            __('广告配置', 'magick-ad'),
            $capability,
            'magick-ad',
            array($this, 'render_app')
        );

        add_submenu_page(
            'magick-ad',
            __('广告列表', 'magick-ad'),
            __('广告列表', 'magick-ad'),
            $capability,
            'edit.php?post_type=magick_ad'
        );

        add_submenu_page(
            'magick-ad',
            __('统计看板', 'magick-ad'),
            __('统计看板', 'magick-ad'),
            $capability,
            'magick-ad-report',
            array($this, 'render_app')
        );

        add_submenu_page(
            'magick-ad',
            __('插入入口', 'magick-ad'),
            __('插入入口', 'magick-ad'),
            $capability,
            'magick-ad-insert',
            array($this, 'render_insert_help')
        );

        add_submenu_page(
            'magick-ad',
            __('调试面板', 'magick-ad'),
            __('调试面板', 'magick-ad'),
            $capability,
            'magick-ad-debug',
            array($this, 'render_debug_panel')
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

        add_settings_section(
            'magick_ad_debug_section',
            esc_html__('调试设置', 'magick-ad'),
            '__return_false',
            'magick_ad_debug'
        );

        add_settings_field(
            'magick_ad_debug_field',
            esc_html__('启用调试日志', 'magick-ad'),
            array($this, 'render_debug_field'),
            'magick_ad_debug',
            'magick_ad_debug_section'
        );
    }

    public function sanitize_debug($value): string {
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
        echo '</div>';
    }

    public function render_insert_help(): void {
        $block_title = esc_html__('区块（Block）', 'magick-ad');
        $shortcode_title = esc_html__('短代码（Shortcode）', 'magick-ad');
        $template_title = esc_html__('主题模板函数（Template Tag / PHP API）', 'magick-ad');

        $shortcode_example_1 = esc_html('[magick_ad slot="sidebar-top"]');
        $shortcode_example_2 = esc_html('[magick_ad id="ad_123456"]');
        $shortcode_example_3 = esc_html('[magick_ad slot="post-inline-1" class="my-ad"]');

        $template_example = esc_html(
            "<?php if (function_exists('magick_ad_the')) : ?>\n" .
            "  <?php magick_ad_the('sidebar-top'); ?>\n" .
            "<?php endif; ?>"
        );

        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('插入入口', 'magick-ad') . '</h1>';
        echo '<p>' . esc_html__('以下是推荐的三种插入方式，适配不同编辑环境与主题需求。', 'magick-ad') . '</p>';

        echo '<hr />';

        echo '<h2>' . $block_title . '</h2>';
        echo '<p>' . esc_html__('现代 WP 首选（Gutenberg / FSE），可在编辑器中直接插入 “Magick AD” 区块。', 'magick-ad') . '</p>';
        echo '<ol>';
        echo '<li>' . esc_html__('在区块编辑器中添加 “Magick AD” 区块。', 'magick-ad') . '</li>';
        echo '<li>' . esc_html__('在区块设置中选择广告位 Slot 或广告 ID。', 'magick-ad') . '</li>';
        echo '<li>' . esc_html__('预览可实时渲染，前台根据投放规则显示。', 'magick-ad') . '</li>';
        echo '</ol>';

        echo '<h2>' . $shortcode_title . '</h2>';
        echo '<p>' . esc_html__('兼容经典编辑器/复制粘贴场景，适合内容中快速插入。', 'magick-ad') . '</p>';
        echo '<pre><code>' . $shortcode_example_1 . "\n" . $shortcode_example_2 . "\n" . $shortcode_example_3 . '</code></pre>';

        echo '<h2>' . $template_title . '</h2>';
        echo '<p>' . esc_html__('给主题开发者或模板文件使用，适合放在任意位置。', 'magick-ad') . '</p>';
        echo '<pre><code>' . $template_example . '</code></pre>';

        echo '<h3>' . esc_html__('Slot 命名建议', 'magick-ad') . '</h3>';
        echo '<ul>';
        echo '<li>' . esc_html__('推荐使用小写字母、数字与短横线。', 'magick-ad') . '</li>';
        echo '<li>' . esc_html__('保持唯一性，便于在区块/短代码/模板函数中稳定引用。', 'magick-ad') . '</li>';
        echo '</ul>';

        echo '</div>';
    }

    public function render_debug_panel(): void {
        $base_url = home_url('/');
        $input_url = isset($_GET['debug_url']) ? esc_url_raw(wp_unslash($_GET['debug_url'])) : $base_url;
        if ($input_url === '') {
            $input_url = $base_url;
        }
        $device = isset($_GET['debug_device']) ? sanitize_text_field(wp_unslash($_GET['debug_device'])) : 'auto';
        if (!in_array($device, array('auto', 'mobile', 'tablet', 'desktop'), true)) {
            $device = 'auto';
        }
        $login_state = isset($_GET['debug_login']) ? sanitize_text_field(wp_unslash($_GET['debug_login'])) : 'auto';
        if (!in_array($login_state, array('auto', 'logged-in', 'logged-out'), true)) {
            $login_state = 'auto';
        }

        $debug_url = add_query_arg(
            array(
                'magick_ad_diagnose' => '1',
                'magick_ad_diagnose_nonce' => wp_create_nonce('magick_ad_diagnose'),
                'magick_ad_debug_device' => $device,
                'magick_ad_debug_login' => $login_state,
            ),
            $input_url
        );

        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('调试面板', 'magick-ad') . '</h1>';
        echo '<p>' . esc_html__('输入页面 URL 并选择设备类型，生成投放诊断报告。页面类型将由 URL 自身决定。', 'magick-ad') . '</p>';

        echo '<form method="get" style="margin:16px 0 24px;">';
        echo '<input type="hidden" name="page" value="magick-ad-debug" />';
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

        echo '<h2>' . esc_html__('诊断链接', 'magick-ad') . '</h2>';
        echo '<p><a href="' . esc_url($debug_url) . '" target="_blank" rel="noopener noreferrer">' . esc_html($debug_url) . '</a></p>';

        echo '<h2>' . esc_html__('嵌入预览', 'magick-ad') . '</h2>';
        echo '<div style="border:1px solid #dcdcde;border-radius:8px;overflow:hidden;background:#fff;">';
        echo '<iframe title="Magick AD Diagnose" src="' . esc_url($debug_url) . '" style="width:100%;height:720px;border:0;"></iframe>';
        echo '</div>';
        echo '</div>';
    }

    public function enqueue_assets(string $hook): void {
        if (!in_array($hook, array('toplevel_page_magick-ad', 'magick-ad_page_magick-ad-report'), true)) {
            return;
        }

        $asset_path = MAGICK_AD_PATH . 'build/index.asset.php';
        $asset = file_exists($asset_path) ? include $asset_path : array(
            'dependencies' => array('wp-element', 'wp-api-fetch'),
            'version' => MAGICK_AD_VERSION,
        );
        if (!in_array('wp-editor', $asset['dependencies'], true)) {
            $asset['dependencies'][] = 'wp-editor';
        }

        wp_enqueue_editor();
        wp_enqueue_media();
        wp_enqueue_script('wplink');
        wp_enqueue_style('editor-buttons');
        wp_enqueue_style('wp-block-library');
        wp_enqueue_style('wp-block-editor');
        wp_enqueue_style('wp-edit-blocks');

        wp_enqueue_script(
            'magick-ad-app',
            MAGICK_AD_URL . 'build/index.js',
            $asset['dependencies'],
            $asset['version'],
            true
        );

        wp_enqueue_style(
            'magick-ad-app',
            MAGICK_AD_URL . 'build/index.css',
            array(),
            $asset['version']
        );

        $initial_tab = 'ads';
        if (isset($_GET['page']) && $_GET['page'] === 'magick-ad-report') {
            $initial_tab = 'report';
        }

        $build_js = MAGICK_AD_PATH . 'build/index.js';
        $build_time = file_exists($build_js) ? filemtime($build_js) : time();
        wp_localize_script(
            'magick-ad-app',
            'MagickAD',
            array(
                'nonce' => wp_create_nonce('wp_rest'),
                'restUrl' => esc_url_raw(rest_url('magick-ad/v1')),
                'canUnfilteredHtml' => current_user_can('unfiltered_html'),
                'previewUrl' => esc_url_raw(home_url('/')),
                'previewNonce' => wp_create_nonce('magick_ad_preview'),
                'diagnoseUrl' => esc_url_raw(
                    add_query_arg(
                        array(
                            'magick_ad_diagnose' => '1',
                            'magick_ad_diagnose_nonce' => wp_create_nonce('magick_ad_diagnose'),
                        ),
                        home_url('/')
                    )
                ),
                'branding' => array(
                    'name' => get_option('magick_ad_brand_name', 'Magick AD'),
                    'tagline' => get_option('magick_ad_brand_tagline', '广告配置与投放规则管理'),
                ),
                'manageCapability' => \MagickAD\Utils\Capabilities::manage_capability(),
                'patterns' => \MagickAD\Blocks\Patterns::export_patterns(),
                'initialTab' => $initial_tab,
                'buildTime' => $build_time,
                'buildVersion' => $asset['version'],
            )
        );
    }
}
