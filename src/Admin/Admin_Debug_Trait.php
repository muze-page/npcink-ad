<?php

namespace MagickAD\Admin;

if (!defined('ABSPATH')) {
    exit;
}

trait Admin_Debug_Trait {
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

    public function render_debug_panel(): void {
        if (!$this->is_debug_enabled()) {
            return;
        }
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
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only debug filters.
        $value = isset($_GET[$key]) ? esc_url_raw(wp_unslash($_GET[$key])) : '';
        return $value !== '' ? $value : $fallback;
    }

    private function get_select_param(string $key, array $allowed, string $fallback): string {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only debug filters.
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
