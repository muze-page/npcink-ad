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
