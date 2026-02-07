<?php

namespace MagickAD\REST\Controllers;

use WP_REST_Request;
use MagickAD\Utils\TrackingStrategy;
use MagickAD\Utils\Tracking_Signature;
use MagickAD\Utils\Diagnostics_Cron;
use MagickAD\Utils\Stats_Dim_Cron;
use MagickAD\Utils\Stats_Queue;
use MagickAD\Utils\Ip;

if (!defined('ABSPATH')) {
    exit;
}

final class System_Settings_Controller {
    private static function sanitize_positive_int($value, int $default, int $min, int $max): int {
        if (is_numeric($value)) {
            $value = (int) $value;
        } else {
            $value = $default;
        }
        if ($value < $min) {
            $value = $min;
        }
        if ($value > $max) {
            $value = $max;
        }
        return $value;
    }

    private static function sanitize_optional_int($value, int $default, int $max): int {
        if (is_numeric($value)) {
            $value = (int) $value;
        } else {
            $value = $default;
        }
        if ($value < 0) {
            $value = 0;
        }
        if ($value > $max) {
            $value = $max;
        }
        return $value;
    }

    private static function sanitize_tracking_strategy($value): string {
        return TrackingStrategy::from_value($value)->value;
    }

    private static function sanitize_manage_capability($value): string {
        $value = is_string($value) ? $value : '';
        return in_array($value, array('manage_options', 'manage_magick_ads'), true)
            ? $value
            : 'manage_options';
    }

    private static function sanitize_dedupe_scope($value): string {
        $value = is_string($value) ? $value : '';
        return in_array($value, array('ad', 'placement'), true) ? $value : 'ad';
    }

    private static function sanitize_rate_limit_fallback($value): string {
        $value = is_string($value) ? $value : '';
        return $value === 'transient' ? 'transient' : 'off';
    }

    private static function sanitize_stats_write_mode($value): string {
        $value = is_string($value) ? $value : '';
        return in_array($value, array('sync', 'async'), true) ? $value : 'async';
    }

    private static function sanitize_settings_level($value): string {
        $value = is_string($value) ? $value : '';
        return in_array($value, array('simple', 'advanced', 'lab'), true) ? $value : 'simple';
    }

    private static function sanitize_domain_list($value): array {
        if (is_string($value)) {
            $value = preg_split('/[\\s,;]+/', $value);
        }
        if (!is_array($value)) {
            return array();
        }
        $items = array();
        foreach ($value as $item) {
            if (!is_string($item)) {
                continue;
            }
            $item = trim(strtolower($item));
            if ($item === '') {
                continue;
            }
            $item = preg_replace('#^https?://#', '', $item);
            $item = preg_replace('#/.*$#', '', $item);
            if ($item === '') {
                continue;
            }
            $items[] = $item;
        }
        $items = array_values(array_unique($items));
        if (count($items) > 50) {
            $items = array_slice($items, 0, 50);
        }
        return $items;
    }

    private static function get_site_domain(): string {
        $host = wp_parse_url(home_url(), PHP_URL_HOST);
        if (!is_string($host) || $host === '') {
            $host = wp_parse_url(site_url(), PHP_URL_HOST);
        }
        return is_string($host) ? strtolower($host) : '';
    }

    public static function get() {
        $dedupe_ttl = (int) get_option('magick_ad_track_dedupe_ttl', DAY_IN_SECONDS);
        $dedupe_ttl = self::sanitize_positive_int($dedupe_ttl, DAY_IN_SECONDS, 60, WEEK_IN_SECONDS);
        $dedupe_scope = self::sanitize_dedupe_scope(
            get_option('magick_ad_track_dedupe_scope', 'ad')
        );
        $retention_days = (int) get_option('magick_ad_stats_diagnostics_retention_days', 7);
        $retention_days = self::sanitize_positive_int($retention_days, 7, 1, 90);
        $auto_off_days = (int) get_option('magick_ad_stats_diagnostics_auto_off_days', 7);
        $auto_off_days = self::sanitize_positive_int($auto_off_days, 7, 1, 90);
        $diagnostics_expires_at = (int) get_option('magick_ad_stats_diagnostics_expires_at', 0);
        $stats_dim_retention_days = (int) get_option('magick_ad_stats_dim_retention_days', 30);
        $stats_dim_retention_days = self::sanitize_optional_int($stats_dim_retention_days, 30, 365);
        $rate_limit_fallback = self::sanitize_rate_limit_fallback(
            get_option('magick_ad_rate_limit_fallback', 'off')
        );
        $stats_write_mode = self::sanitize_stats_write_mode(
            get_option('magick_ad_stats_write_mode', 'async')
        );
        $slot_client_resolver = (get_option('magick_ad_slot_client_resolver', '1') === '1');
        $html_sandbox = (get_option('magick_ad_html_sandbox', '1') === '1');
        $raw_allowlist = get_option('magick_ad_html_script_allowlist', null);
        $raw_blocklist = get_option('magick_ad_html_script_blocklist', array());
        $html_script_allowlist = self::sanitize_domain_list($raw_allowlist);
        $html_script_blocklist = self::sanitize_domain_list($raw_blocklist);
        if (($raw_allowlist === null || $raw_allowlist === false) && empty($html_script_allowlist)) {
            $site_domain = self::get_site_domain();
            if ($site_domain !== '') {
                $html_script_allowlist = array($site_domain);
            }
        }
        $consent_guard_enabled = (get_option('magick_ad_consent_guard_enabled', '0') === '1');
        $consent_banner_enabled = (get_option('magick_ad_consent_banner_enabled', '1') === '1');
        $consent_banner_text = get_option(
            'magick_ad_consent_banner_text',
            '为了提供更好的体验，我们会使用必要的 Cookie/存储进行频控。'
        );
        $consent_banner_button = get_option('magick_ad_consent_banner_button', '同意');
        $tracking_enabled = (get_option('magick_ad_tracking_enabled', '1') === '1');
        $block_editor_enabled = (get_option('magick_ad_block_editor_enabled', '0') === '1');

        $tracking_require_signature = (get_option('magick_ad_track_require_signature', '1') === '1');
        if (self::is_production_environment() || !self::is_debug_constant_enabled()) {
            $tracking_require_signature = true;
        }
        $tracking_secret_rotated_at = (int) get_option('magick_ad_track_secret_rotated_at', 0);
        $tracking_secret_has_prev = (get_option('magick_ad_track_secret_prev', '') !== '');
        $tracking_secret_grace_seconds = Tracking_Signature::get_rotation_grace_seconds();

        $trusted_proxies = Ip::normalize_list(get_option('magick_ad_trusted_proxies', array()));

        $settings = array(
            'tracking_enabled' => $tracking_enabled,
            'tracking_strategy' => TrackingStrategy::from_value(
                get_option('magick_ad_tracking_strategy', 'session')
            )->value,
            'tracking_require_consent' => (get_option('magick_ad_tracking_require_consent', '0') === '1'),
            'tracking_dedupe_ttl' => $dedupe_ttl,
            'tracking_dedupe_scope' => $dedupe_scope,
            'tracking_require_signature' => $tracking_require_signature,
            'tracking_secret_rotated_at' => $tracking_secret_rotated_at,
            'tracking_secret_has_prev' => $tracking_secret_has_prev,
            'tracking_secret_grace_seconds' => $tracking_secret_grace_seconds,
            'page_cache_detected' => self::is_page_cache_detected(),
            'stats_diagnostics' => (get_option('magick_ad_stats_diagnostics', '0') === '1'),
            'stats_diagnostics_retention_days' => $retention_days,
            'stats_diagnostics_auto_off_days' => $auto_off_days,
            'stats_diagnostics_expires_at' => $diagnostics_expires_at,
            'stats_dim_retention_days' => $stats_dim_retention_days,
            'rate_limit_fallback' => $rate_limit_fallback,
            'stats_write_mode' => $stats_write_mode,
            'stats_queue_metrics' => Stats_Queue::get_metrics(),
            'slot_client_resolver' => $slot_client_resolver,
            'html_sandbox' => $html_sandbox,
            'html_script_allowlist' => $html_script_allowlist,
            'html_script_blocklist' => $html_script_blocklist,
            'consent_guard_enabled' => $consent_guard_enabled,
            'consent_banner_enabled' => $consent_banner_enabled,
            'consent_banner_text' => $consent_banner_text,
            'consent_banner_button' => $consent_banner_button,
            'trusted_proxies' => $trusted_proxies,
            'block_editor_enabled' => $block_editor_enabled,
            'brand_name' => get_option('magick_ad_brand_name', 'Magick AD'),
            'brand_tagline' => get_option('magick_ad_brand_tagline', '广告配置与投放规则管理'),
            'manage_capability' => get_option('magick_ad_manage_capability', 'manage_options'),
            'settings_level' => self::sanitize_settings_level(
                get_option('magick_ad_settings_level', 'simple')
            ),
        );

        return rest_ensure_response($settings);
    }

    private static function is_page_cache_detected(): bool {
        if (defined('WP_CACHE') && WP_CACHE) {
            return true;
        }
        if (defined('WPCACHEHOME')) {
            return true;
        }
        $advanced_cache = WP_CONTENT_DIR . '/advanced-cache.php';
        if (is_readable($advanced_cache)) {
            return true;
        }
        return false;
    }

    private static function is_production_environment(): bool {
        return function_exists('wp_get_environment_type') && wp_get_environment_type() === 'production';
    }

    private static function is_debug_constant_enabled(): bool {
        return (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG);
    }

    public static function update(WP_REST_Request $request) {
        $params = $request->get_json_params();
        $params = is_array($params) ? $params : array();

        $tracking_strategy = self::sanitize_tracking_strategy(
            $params['tracking_strategy'] ?? get_option('magick_ad_tracking_strategy', 'session')
        );
        $tracking_enabled = !array_key_exists('tracking_enabled', $params)
            ? (get_option('magick_ad_tracking_enabled', '1') === '1')
            : !empty($params['tracking_enabled']);
        $tracking_require_consent = !empty($params['tracking_require_consent']);
        $tracking_dedupe_ttl = self::sanitize_positive_int(
            $params['tracking_dedupe_ttl'] ?? get_option('magick_ad_track_dedupe_ttl', DAY_IN_SECONDS),
            DAY_IN_SECONDS,
            60,
            WEEK_IN_SECONDS
        );
        $tracking_dedupe_scope = self::sanitize_dedupe_scope(
            $params['tracking_dedupe_scope'] ?? get_option('magick_ad_track_dedupe_scope', 'ad')
        );
        $tracking_require_signature = !array_key_exists('tracking_require_signature', $params)
            ? (get_option('magick_ad_track_require_signature', '1') === '1')
            : !empty($params['tracking_require_signature']);
        if (self::is_production_environment() || !self::is_debug_constant_enabled()) {
            $tracking_require_signature = true;
        }
        if (!empty($params['rotate_track_secret'])) {
            Tracking_Signature::rotate_secret();
        }
        $stats_diagnostics = !empty($params['stats_diagnostics']);
        $stats_diagnostics_retention_days = self::sanitize_positive_int(
            $params['stats_diagnostics_retention_days'] ?? get_option('magick_ad_stats_diagnostics_retention_days', 7),
            7,
            1,
            90
        );
        $stats_diagnostics_auto_off_days = self::sanitize_positive_int(
            $params['stats_diagnostics_auto_off_days'] ?? get_option('magick_ad_stats_diagnostics_auto_off_days', 7),
            7,
            1,
            90
        );
        $stats_dim_retention_days = self::sanitize_optional_int(
            $params['stats_dim_retention_days'] ?? get_option('magick_ad_stats_dim_retention_days', 30),
            30,
            365
        );
        $rate_limit_fallback = self::sanitize_rate_limit_fallback(
            $params['rate_limit_fallback'] ?? get_option('magick_ad_rate_limit_fallback', 'off')
        );
        $stats_write_mode = self::sanitize_stats_write_mode(
            $params['stats_write_mode'] ?? get_option('magick_ad_stats_write_mode', 'async')
        );
        $consent_guard_enabled = !array_key_exists('consent_guard_enabled', $params)
            ? (get_option('magick_ad_consent_guard_enabled', '0') === '1')
            : !empty($params['consent_guard_enabled']);
        $consent_banner_enabled = !array_key_exists('consent_banner_enabled', $params)
            ? (get_option('magick_ad_consent_banner_enabled', '1') === '1')
            : !empty($params['consent_banner_enabled']);
        $consent_banner_text = isset($params['consent_banner_text']) && is_string($params['consent_banner_text'])
            ? sanitize_text_field($params['consent_banner_text'])
            : get_option(
                'magick_ad_consent_banner_text',
                '为了提供更好的体验，我们会使用必要的 Cookie/存储进行频控。'
            );
        $consent_banner_button = isset($params['consent_banner_button']) && is_string($params['consent_banner_button'])
            ? sanitize_text_field($params['consent_banner_button'])
            : get_option('magick_ad_consent_banner_button', '同意');
        $slot_client_resolver = !array_key_exists('slot_client_resolver', $params)
            ? (get_option('magick_ad_slot_client_resolver', '1') === '1')
            : !empty($params['slot_client_resolver']);
        $html_sandbox = !array_key_exists('html_sandbox', $params)
            ? (get_option('magick_ad_html_sandbox', '1') === '1')
            : !empty($params['html_sandbox']);
        $html_script_allowlist = self::sanitize_domain_list(
            $params['html_script_allowlist'] ?? get_option('magick_ad_html_script_allowlist', array())
        );
        $html_script_blocklist = self::sanitize_domain_list(
            $params['html_script_blocklist'] ?? get_option('magick_ad_html_script_blocklist', array())
        );
        $trusted_proxies = Ip::normalize_list(
            $params['trusted_proxies'] ?? get_option('magick_ad_trusted_proxies', array())
        );
        $block_editor_enabled = !array_key_exists('block_editor_enabled', $params)
            ? (get_option('magick_ad_block_editor_enabled', '0') === '1')
            : !empty($params['block_editor_enabled']);
        $brand_name = isset($params['brand_name']) && is_string($params['brand_name'])
            ? sanitize_text_field($params['brand_name'])
            : get_option('magick_ad_brand_name', 'Magick AD');
        $brand_tagline = isset($params['brand_tagline']) && is_string($params['brand_tagline'])
            ? sanitize_text_field($params['brand_tagline'])
            : get_option('magick_ad_brand_tagline', '广告配置与投放规则管理');
        $manage_capability = self::sanitize_manage_capability(
            $params['manage_capability'] ?? get_option('magick_ad_manage_capability', 'manage_options')
        );
        $settings_level = self::sanitize_settings_level(
            $params['settings_level'] ?? get_option('magick_ad_settings_level', 'simple')
        );

        update_option('magick_ad_tracking_strategy', $tracking_strategy);
        update_option('magick_ad_tracking_enabled', $tracking_enabled ? '1' : '0');
        update_option('magick_ad_tracking_require_consent', $tracking_require_consent ? '1' : '0');
        update_option('magick_ad_track_dedupe_ttl', $tracking_dedupe_ttl);
        update_option('magick_ad_track_dedupe_scope', $tracking_dedupe_scope);
        update_option('magick_ad_track_require_signature', $tracking_require_signature ? '1' : '0');
        update_option('magick_ad_stats_diagnostics', $stats_diagnostics ? '1' : '0');
        update_option('magick_ad_stats_diagnostics_retention_days', $stats_diagnostics_retention_days);
        update_option('magick_ad_stats_diagnostics_auto_off_days', $stats_diagnostics_auto_off_days);
        update_option('magick_ad_stats_dim_retention_days', $stats_dim_retention_days);
        update_option('magick_ad_rate_limit_fallback', $rate_limit_fallback);
        update_option('magick_ad_stats_write_mode', $stats_write_mode);
        update_option('magick_ad_slot_client_resolver', $slot_client_resolver ? '1' : '0');
        update_option('magick_ad_html_sandbox', $html_sandbox ? '1' : '0');
        update_option('magick_ad_html_script_allowlist', $html_script_allowlist);
        update_option('magick_ad_html_script_blocklist', $html_script_blocklist);
        update_option('magick_ad_trusted_proxies', $trusted_proxies);
        update_option('magick_ad_block_editor_enabled', $block_editor_enabled ? '1' : '0');
        update_option('magick_ad_consent_guard_enabled', $consent_guard_enabled ? '1' : '0');
        update_option('magick_ad_consent_banner_enabled', $consent_banner_enabled ? '1' : '0');
        update_option('magick_ad_consent_banner_text', $consent_banner_text);
        update_option('magick_ad_consent_banner_button', $consent_banner_button);
        update_option('magick_ad_brand_name', $brand_name);
        update_option('magick_ad_brand_tagline', $brand_tagline);
        update_option('magick_ad_manage_capability', $manage_capability);
        update_option('magick_ad_settings_level', $settings_level);

        $tracking_secret_rotated_at = (int) get_option('magick_ad_track_secret_rotated_at', 0);
        $tracking_secret_has_prev = (get_option('magick_ad_track_secret_prev', '') !== '');
        $tracking_secret_grace_seconds = Tracking_Signature::get_rotation_grace_seconds();

        $expires_at = $stats_diagnostics
            ? current_time('timestamp') + $stats_diagnostics_auto_off_days * DAY_IN_SECONDS
            : 0;
        update_option('magick_ad_stats_diagnostics_expires_at', $expires_at);
        Diagnostics_Cron::reschedule($stats_diagnostics);
        Stats_Dim_Cron::reschedule();

        return rest_ensure_response(array(
            'tracking_enabled' => $tracking_enabled,
            'tracking_strategy' => $tracking_strategy,
            'tracking_require_consent' => $tracking_require_consent,
            'tracking_dedupe_ttl' => $tracking_dedupe_ttl,
            'tracking_dedupe_scope' => $tracking_dedupe_scope,
            'tracking_require_signature' => $tracking_require_signature,
            'tracking_secret_rotated_at' => $tracking_secret_rotated_at,
            'tracking_secret_has_prev' => $tracking_secret_has_prev,
            'tracking_secret_grace_seconds' => $tracking_secret_grace_seconds,
            'stats_diagnostics' => $stats_diagnostics,
            'stats_diagnostics_retention_days' => $stats_diagnostics_retention_days,
            'stats_diagnostics_auto_off_days' => $stats_diagnostics_auto_off_days,
            'stats_diagnostics_expires_at' => $expires_at,
            'stats_dim_retention_days' => $stats_dim_retention_days,
            'rate_limit_fallback' => $rate_limit_fallback,
            'stats_write_mode' => $stats_write_mode,
            'stats_queue_metrics' => Stats_Queue::get_metrics(),
            'slot_client_resolver' => $slot_client_resolver,
            'html_sandbox' => $html_sandbox,
            'html_script_allowlist' => $html_script_allowlist,
            'html_script_blocklist' => $html_script_blocklist,
            'trusted_proxies' => $trusted_proxies,
            'block_editor_enabled' => $block_editor_enabled,
            'consent_guard_enabled' => $consent_guard_enabled,
            'consent_banner_enabled' => $consent_banner_enabled,
            'consent_banner_text' => $consent_banner_text,
            'consent_banner_button' => $consent_banner_button,
            'brand_name' => $brand_name,
            'brand_tagline' => $brand_tagline,
            'manage_capability' => $manage_capability,
            'settings_level' => $settings_level,
        ));
    }
}
