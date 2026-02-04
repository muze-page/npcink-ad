<?php

namespace MagickAD\REST\Controllers;

use WP_REST_Request;
use MagickAD\Utils\TrackingStrategy;
use MagickAD\Utils\Diagnostics_Cron;
use MagickAD\Utils\Stats_Dim_Cron;

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
        $slot_client_resolver = (get_option('magick_ad_slot_client_resolver', '1') === '1');
        $html_sandbox = (get_option('magick_ad_html_sandbox', '0') === '1');
        $consent_guard_enabled = (get_option('magick_ad_consent_guard_enabled', '0') === '1');
        $consent_banner_enabled = (get_option('magick_ad_consent_banner_enabled', '1') === '1');
        $consent_banner_text = get_option(
            'magick_ad_consent_banner_text',
            '为了提供更好的体验，我们会使用必要的 Cookie/存储进行频控。'
        );
        $consent_banner_button = get_option('magick_ad_consent_banner_button', '同意');
        $tracking_enabled = (get_option('magick_ad_tracking_enabled', '1') === '1');

        $tracking_require_signature = (get_option('magick_ad_track_require_signature', '1') === '1');
        if (function_exists('wp_get_environment_type') && wp_get_environment_type() === 'production') {
            $tracking_require_signature = true;
        }

        $settings = array(
            'tracking_enabled' => $tracking_enabled,
            'tracking_strategy' => TrackingStrategy::from_value(
                get_option('magick_ad_tracking_strategy', 'session')
            )->value,
            'tracking_require_consent' => (get_option('magick_ad_tracking_require_consent', '0') === '1'),
            'tracking_dedupe_ttl' => $dedupe_ttl,
            'tracking_dedupe_scope' => $dedupe_scope,
            'tracking_require_signature' => $tracking_require_signature,
            'page_cache_detected' => self::is_page_cache_detected(),
            'stats_diagnostics' => (get_option('magick_ad_stats_diagnostics', '0') === '1'),
            'stats_diagnostics_retention_days' => $retention_days,
            'stats_diagnostics_auto_off_days' => $auto_off_days,
            'stats_diagnostics_expires_at' => $diagnostics_expires_at,
            'stats_dim_retention_days' => $stats_dim_retention_days,
            'slot_client_resolver' => $slot_client_resolver,
            'html_sandbox' => $html_sandbox,
            'consent_guard_enabled' => $consent_guard_enabled,
            'consent_banner_enabled' => $consent_banner_enabled,
            'consent_banner_text' => $consent_banner_text,
            'consent_banner_button' => $consent_banner_button,
            'brand_name' => get_option('magick_ad_brand_name', 'Magick AD'),
            'brand_tagline' => get_option('magick_ad_brand_tagline', '广告配置与投放规则管理'),
            'manage_capability' => get_option('magick_ad_manage_capability', 'manage_options'),
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
        if (function_exists('wp_get_environment_type') && wp_get_environment_type() === 'production') {
            $tracking_require_signature = true;
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
            ? (get_option('magick_ad_html_sandbox', '0') === '1')
            : !empty($params['html_sandbox']);
        $brand_name = isset($params['brand_name']) && is_string($params['brand_name'])
            ? sanitize_text_field($params['brand_name'])
            : get_option('magick_ad_brand_name', 'Magick AD');
        $brand_tagline = isset($params['brand_tagline']) && is_string($params['brand_tagline'])
            ? sanitize_text_field($params['brand_tagline'])
            : get_option('magick_ad_brand_tagline', '广告配置与投放规则管理');
        $manage_capability = self::sanitize_manage_capability(
            $params['manage_capability'] ?? get_option('magick_ad_manage_capability', 'manage_options')
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
        update_option('magick_ad_slot_client_resolver', $slot_client_resolver ? '1' : '0');
        update_option('magick_ad_html_sandbox', $html_sandbox ? '1' : '0');
        update_option('magick_ad_consent_guard_enabled', $consent_guard_enabled ? '1' : '0');
        update_option('magick_ad_consent_banner_enabled', $consent_banner_enabled ? '1' : '0');
        update_option('magick_ad_consent_banner_text', $consent_banner_text);
        update_option('magick_ad_consent_banner_button', $consent_banner_button);
        update_option('magick_ad_brand_name', $brand_name);
        update_option('magick_ad_brand_tagline', $brand_tagline);
        update_option('magick_ad_manage_capability', $manage_capability);

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
            'stats_diagnostics' => $stats_diagnostics,
            'stats_diagnostics_retention_days' => $stats_diagnostics_retention_days,
            'stats_diagnostics_auto_off_days' => $stats_diagnostics_auto_off_days,
            'stats_diagnostics_expires_at' => $expires_at,
            'stats_dim_retention_days' => $stats_dim_retention_days,
            'slot_client_resolver' => $slot_client_resolver,
            'html_sandbox' => $html_sandbox,
            'consent_guard_enabled' => $consent_guard_enabled,
            'consent_banner_enabled' => $consent_banner_enabled,
            'consent_banner_text' => $consent_banner_text,
            'consent_banner_button' => $consent_banner_button,
            'brand_name' => $brand_name,
            'brand_tagline' => $brand_tagline,
            'manage_capability' => $manage_capability,
        ));
    }
}
