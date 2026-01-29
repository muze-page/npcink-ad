<?php

namespace MagickAD\REST\Controllers;

use WP_REST_Request;

if (!defined('ABSPATH')) {
    exit;
}

final class Reports_Controller {
    public static function report(WP_REST_Request $request) {
        $days = absint($request->get_param('days'));
        if (!in_array($days, array(7, 30), true)) {
            $days = 7;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats';

        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            return rest_ensure_response(self::build_empty_series($days));
        }

        $start = date('Y-m-d', current_time('timestamp') - ($days - 1) * DAY_IN_SECONDS);
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
            $date = date('Y-m-d', current_time('timestamp') - $i * DAY_IN_SECONDS);
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

        return rest_ensure_response($series);
    }

    private static function build_empty_series(int $days): array {
        $series = array();
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', current_time('timestamp') - $i * DAY_IN_SECONDS);
            $series[] = array(
                'date' => $date,
                'views' => 0,
                'clicks' => 0,
            );
        }
        return $series;
    }
}
