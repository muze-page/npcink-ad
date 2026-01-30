<?php

namespace MagickAD\REST\Controllers;

use WP_REST_Request;

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

    private static function sanitize_tracking_strategy($value): string {
        $value = is_string($value) ? $value : '';
        return in_array($value, array('request', 'session', 'cookie', 'user'), true)
            ? $value
            : 'session';
    }

    private static function sanitize_manage_capability($value): string {
        $value = is_string($value) ? $value : '';
        return in_array($value, array('manage_options', 'manage_magick_ads'), true)
            ? $value
            : 'manage_options';
    }

    public static function get() {
        $dedupe_ttl = (int) get_option('magick_ad_track_dedupe_ttl', DAY_IN_SECONDS);
        $dedupe_ttl = self::sanitize_positive_int($dedupe_ttl, DAY_IN_SECONDS, 60, WEEK_IN_SECONDS);
        $retention_days = (int) get_option('magick_ad_stats_diagnostics_retention_days', 7);
        $retention_days = self::sanitize_positive_int($retention_days, 7, 1, 90);
        $diagnostics_expires_at = (int) get_option('magick_ad_stats_diagnostics_expires_at', 0);

        $settings = array(
            'tracking_strategy' => get_option('magick_ad_tracking_strategy', 'session'),
            'tracking_require_consent' => (get_option('magick_ad_tracking_require_consent', '0') === '1'),
            'tracking_dedupe_ttl' => $dedupe_ttl,
            'stats_diagnostics' => (get_option('magick_ad_stats_diagnostics', '0') === '1'),
            'stats_diagnostics_retention_days' => $retention_days,
            'stats_diagnostics_expires_at' => $diagnostics_expires_at,
            'brand_name' => get_option('magick_ad_brand_name', 'Magick AD'),
            'brand_tagline' => get_option('magick_ad_brand_tagline', '广告配置与投放规则管理'),
            'manage_capability' => get_option('magick_ad_manage_capability', 'manage_options'),
        );

        return rest_ensure_response($settings);
    }

    public static function update(WP_REST_Request $request) {
        $params = $request->get_json_params();
        $params = is_array($params) ? $params : array();

        $tracking_strategy = self::sanitize_tracking_strategy(
            $params['tracking_strategy'] ?? get_option('magick_ad_tracking_strategy', 'session')
        );
        $tracking_require_consent = !empty($params['tracking_require_consent']);
        $tracking_dedupe_ttl = self::sanitize_positive_int(
            $params['tracking_dedupe_ttl'] ?? get_option('magick_ad_track_dedupe_ttl', DAY_IN_SECONDS),
            DAY_IN_SECONDS,
            60,
            WEEK_IN_SECONDS
        );
        $stats_diagnostics = !empty($params['stats_diagnostics']);
        $stats_diagnostics_retention_days = self::sanitize_positive_int(
            $params['stats_diagnostics_retention_days'] ?? get_option('magick_ad_stats_diagnostics_retention_days', 7),
            7,
            1,
            90
        );
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
        update_option('magick_ad_tracking_require_consent', $tracking_require_consent ? '1' : '0');
        update_option('magick_ad_track_dedupe_ttl', $tracking_dedupe_ttl);
        update_option('magick_ad_stats_diagnostics', $stats_diagnostics ? '1' : '0');
        update_option('magick_ad_stats_diagnostics_retention_days', $stats_diagnostics_retention_days);
        update_option('magick_ad_brand_name', $brand_name);
        update_option('magick_ad_brand_tagline', $brand_tagline);
        update_option('magick_ad_manage_capability', $manage_capability);

        $expires_at = $stats_diagnostics
            ? current_time('timestamp') + $stats_diagnostics_retention_days * DAY_IN_SECONDS
            : 0;
        update_option('magick_ad_stats_diagnostics_expires_at', $expires_at);

        return rest_ensure_response(array(
            'tracking_strategy' => $tracking_strategy,
            'tracking_require_consent' => $tracking_require_consent,
            'tracking_dedupe_ttl' => $tracking_dedupe_ttl,
            'stats_diagnostics' => $stats_diagnostics,
            'stats_diagnostics_retention_days' => $stats_diagnostics_retention_days,
            'stats_diagnostics_expires_at' => $expires_at,
            'brand_name' => $brand_name,
            'brand_tagline' => $brand_tagline,
            'manage_capability' => $manage_capability,
        ));
    }
}
