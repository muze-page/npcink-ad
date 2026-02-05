<?php

namespace MagickAD\REST\Controllers;

use WP_REST_Request;
use WP_Error;
use MagickAD\REST\Controllers\Track_Controller;

if (!defined('ABSPATH')) {
    exit;
}

final class Reports_Controller {
    public static function report(WP_REST_Request $request) {
        $days = absint($request->get_param('days'));
        if (!in_array($days, array(7, 30), true)) {
            $days = 7;
        }

        $cache_key = self::build_cache_key('report', array('days' => $days));
        $cached = self::get_cached_response($cache_key);
        if (is_array($cached)) {
            return rest_ensure_response($cached);
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats';

        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            $empty = self::build_empty_series($days);
            self::set_cached_response($cache_key, $empty);
            return rest_ensure_response($empty);
        }

        $start = self::date_for_offset($days - 1);
        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is a fixed suffix with prefix.
        $sql = $wpdb->prepare(
            "SELECT `date` AS date,
                SUM(impressions) AS views,
                SUM(clicks) AS clicks
             FROM {$table}
             WHERE `date` >= %s
             GROUP BY `date`
             ORDER BY date ASC",
            $start
        );

        $rows = $wpdb->get_results($sql, ARRAY_A);
        $map = array();
        foreach ($rows as $row) {
            $map[$row['date']] = array(
                'date' => $row['date'],
                'views' => (int) $row['views'],
                'clicks' => (int) $row['clicks'],
            );
        }

        $series = array();
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = self::date_for_offset($i);
            if (isset($map[$date])) {
                $series[] = $map[$date];
            } else {
                $series[] = array(
                    'date' => $date,
                    'views' => 0,
                    'clicks' => 0,
                );
            }
        }

        self::set_cached_response($cache_key, $series);
        return rest_ensure_response($series);
    }

    public static function report_dimensions(WP_REST_Request $request) {
        $days = absint($request->get_param('days'));
        if (!in_array($days, array(7, 30), true)) {
            $days = 7;
        }

        $group_by = sanitize_text_field((string) $request->get_param('group_by'));
        $allowed = array('slot', 'position', 'container', 'ad_id');
        if (!in_array($group_by, $allowed, true)) {
            return new WP_Error('magick_ad_invalid_group', 'Invalid group_by', array('status' => 400));
        }

        $cache_key = self::build_cache_key('report_dim', array(
            'days' => $days,
            'group_by' => $group_by,
        ));
        $cached = self::get_cached_response($cache_key);
        if (is_array($cached)) {
            return rest_ensure_response($cached);
        }

        global $wpdb;
        $start = self::date_for_offset($days - 1);
        $column_map = array(
            'slot' => 'slot',
            'position' => 'position',
            'container' => 'container',
            'ad_id' => 'ad_id',
        );
        $column = $column_map[$group_by];
        $table = $group_by === 'ad_id'
            ? $wpdb->prefix . 'magick_ad_stats'
            : $wpdb->prefix . 'magick_ad_stats_dim';

        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            $empty = array();
            self::set_cached_response($cache_key, $empty);
            return rest_ensure_response($empty);
        }

        if ($group_by === 'ad_id') {
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Whitelisted column/table.
            $sql = $wpdb->prepare(
                "SELECT {$column} AS dimension,
                    SUM(impressions) AS views,
                    SUM(clicks) AS clicks
                 FROM {$table}
                 WHERE `date` >= %s
                 GROUP BY {$column}
                 ORDER BY views DESC, clicks DESC
                 LIMIT 50",
                $start
            );
        } else {
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Whitelisted column/table.
            $sql = $wpdb->prepare(
                "SELECT {$column} AS dimension,
                    SUM(impressions) AS views,
                    SUM(clicks) AS clicks
                 FROM {$table}
                 WHERE `date` >= %s
                 AND {$column} <> ''
                 GROUP BY {$column}
                 ORDER BY views DESC, clicks DESC
                 LIMIT 50",
                $start
            );
        }

        $rows = $wpdb->get_results($sql, ARRAY_A);
        $result = array();
        foreach ($rows as $row) {
            $dimension = isset($row['dimension']) ? (string) $row['dimension'] : '';
            if ($dimension === '') {
                continue;
            }
            $result[] = array(
                'dimension' => $dimension,
                'views' => (int) $row['views'],
                'clicks' => (int) $row['clicks'],
            );
        }

        self::set_cached_response($cache_key, $result);
        return rest_ensure_response($result);
    }

    public static function report_failures(WP_REST_Request $request) {
        $days = absint($request->get_param('days'));
        if (!in_array($days, array(1, 7, 30), true)) {
            $days = 7;
        }

        $cache_key = self::build_cache_key('report_failures', array('days' => $days));
        $cached = self::get_cached_response($cache_key);
        if (is_array($cached)) {
            return rest_ensure_response($cached);
        }

        $series = array();
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = self::date_for_offset($i);
            $stats = Track_Controller::get_failure_stats($date);
            $series[] = array_merge(array('date' => $date), $stats);
        }

        self::set_cached_response($cache_key, $series);
        return rest_ensure_response($series);
    }

    public static function report_variants(WP_REST_Request $request) {
        $days = absint($request->get_param('days'));
        if (!in_array($days, array(7, 30), true)) {
            $days = 7;
        }
        $ad_id = sanitize_text_field((string) $request->get_param('ad_id'));

        $cache_key = self::build_cache_key('report_variants', array(
            'days' => $days,
            'ad_id' => $ad_id,
        ));
        $cached = self::get_cached_response($cache_key);
        if (is_array($cached)) {
            return rest_ensure_response($cached);
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats_variant';
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            $empty = array();
            self::set_cached_response($cache_key, $empty);
            return rest_ensure_response($empty);
        }

        $start = self::date_for_offset($days - 1);
        if ($ad_id !== '') {
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is a fixed suffix with prefix.
            $sql = $wpdb->prepare(
                "SELECT variant_id,
                    SUM(impressions) AS impressions,
                    SUM(clicks) AS clicks
                 FROM {$table}
                 WHERE `date` >= %s AND ad_id = %s
                 GROUP BY variant_id
                 ORDER BY impressions DESC, clicks DESC
                 LIMIT 100",
                $start,
                $ad_id
            );
        } else {
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is a fixed suffix with prefix.
            $sql = $wpdb->prepare(
                "SELECT ad_id, variant_id,
                    SUM(impressions) AS impressions,
                    SUM(clicks) AS clicks
                 FROM {$table}
                 WHERE `date` >= %s
                 GROUP BY ad_id, variant_id
                 ORDER BY impressions DESC, clicks DESC
                 LIMIT 200",
                $start
            );
        }

        $rows = $wpdb->get_results($sql, ARRAY_A);
        $result = array();
        foreach ($rows as $row) {
            $result[] = array(
                'ad_id' => isset($row['ad_id']) ? (string) $row['ad_id'] : $ad_id,
                'variant_id' => (string) $row['variant_id'],
                'impressions' => (int) $row['impressions'],
                'clicks' => (int) $row['clicks'],
            );
        }

        self::set_cached_response($cache_key, $result);
        return rest_ensure_response($result);
    }

    public static function report_events(WP_REST_Request $request) {
        $days = absint($request->get_param('days'));
        if (!in_array($days, array(7, 30), true)) {
            $days = 7;
        }
        $group_by = sanitize_text_field((string) $request->get_param('group_by'));
        $allowed = array('event', 'ad_id', 'variant_id');
        if (!in_array($group_by, $allowed, true)) {
            $group_by = 'event';
        }

        $cache_key = self::build_cache_key('report_events', array(
            'days' => $days,
            'group_by' => $group_by,
        ));
        $cached = self::get_cached_response($cache_key);
        if (is_array($cached)) {
            return rest_ensure_response($cached);
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats_event';
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            $empty = array();
            self::set_cached_response($cache_key, $empty);
            return rest_ensure_response($empty);
        }

        $start = self::date_for_offset($days - 1);
        $column_map = array(
            'event' => 'event',
            'ad_id' => 'ad_id',
            'variant_id' => 'variant_id',
        );
        $column = $column_map[$group_by];
        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Whitelisted column/table.
        $sql = $wpdb->prepare(
            "SELECT {$column} AS dimension,
                SUM(count) AS total
             FROM {$table}
             WHERE `date` >= %s
             GROUP BY {$column}
             ORDER BY total DESC
             LIMIT 100",
            $start
        );

        $rows = $wpdb->get_results($sql, ARRAY_A);
        $result = array();
        foreach ($rows as $row) {
            $dimension = isset($row['dimension']) ? (string) $row['dimension'] : '';
            if ($dimension === '') {
                continue;
            }
            $result[] = array(
                'dimension' => $dimension,
                'total' => (int) $row['total'],
            );
        }

        self::set_cached_response($cache_key, $result);
        return rest_ensure_response($result);
    }

    private static function date_for_offset(int $offset_days): string {
        $timestamp = current_time('timestamp') - ($offset_days * DAY_IN_SECONDS);
        return wp_date('Y-m-d', $timestamp);
    }

    private static function build_empty_series(int $days): array {
        $series = array();
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = self::date_for_offset($i);
            $series[] = array(
                'date' => $date,
                'views' => 0,
                'clicks' => 0,
            );
        }
        return $series;
    }

    private static function get_cached_response(string $key): ?array {
        if (!self::should_cache()) {
            return null;
        }
        $cached = wp_cache_get($key, 'magick_ad_report');
        return is_array($cached) ? $cached : null;
    }

    private static function set_cached_response(string $key, array $value): void {
        if (!self::should_cache()) {
            return;
        }
        $ttl = (int) apply_filters('magick_ad_report_cache_ttl', 300);
        $ttl = max(60, $ttl);
        wp_cache_set($key, $value, 'magick_ad_report', $ttl);
    }

    private static function should_cache(): bool {
        $use = wp_using_ext_object_cache();
        return (bool) apply_filters('magick_ad_report_cache_enabled', $use);
    }

    private static function build_cache_key(string $prefix, array $params): string {
        return 'magick_ad_' . $prefix . '_' . md5(wp_json_encode($params));
    }
}
