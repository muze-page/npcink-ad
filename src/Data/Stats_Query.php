<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

final class Stats_Query {
    public static function stats_report(\wpdb $wpdb, string $table, string $start): array {
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table report.
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT `date` AS date,
                    SUM(impressions) AS views,
                    SUM(clicks) AS clicks
                 FROM %i
                 WHERE `date` >= %s
                 GROUP BY `date`
                 ORDER BY date ASC",
                $table,
                $start
            ),
            ARRAY_A
        );
        return is_array($rows) ? $rows : array();
    }

    public static function dimension_report(
        \wpdb $wpdb,
        string $table,
        string $start,
        string $column,
        bool $exclude_empty
    ): array {
        if ($exclude_empty) {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table report.
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT %i AS dimension,
                        SUM(impressions) AS views,
                        SUM(clicks) AS clicks
                     FROM %i
                     WHERE `date` >= %s
                     AND %i <> ''
                     GROUP BY %i
                     ORDER BY views DESC, clicks DESC
                     LIMIT 50",
                    $column,
                    $table,
                    $start,
                    $column,
                    $column
                ),
                ARRAY_A
            );
        } else {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table report.
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT %i AS dimension,
                        SUM(impressions) AS views,
                        SUM(clicks) AS clicks
                     FROM %i
                     WHERE `date` >= %s
                     GROUP BY %i
                     ORDER BY views DESC, clicks DESC
                     LIMIT 50",
                    $column,
                    $table,
                    $start,
                    $column
                ),
                ARRAY_A
            );
        }
        return is_array($rows) ? $rows : array();
    }

    public static function variants_report(\wpdb $wpdb, string $table, string $start, string $ad_id): array {
        if ($ad_id !== '') {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table report.
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT variant_id,
                        SUM(impressions) AS impressions,
                        SUM(clicks) AS clicks
                     FROM %i
                     WHERE `date` >= %s AND ad_id = %s
                     GROUP BY variant_id
                     ORDER BY impressions DESC, clicks DESC
                     LIMIT 100",
                    $table,
                    $start,
                    $ad_id
                ),
                ARRAY_A
            );
        } else {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table report.
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT ad_id, variant_id,
                        SUM(impressions) AS impressions,
                        SUM(clicks) AS clicks
                     FROM %i
                     WHERE `date` >= %s
                     GROUP BY ad_id, variant_id
                     ORDER BY impressions DESC, clicks DESC
                     LIMIT 200",
                    $table,
                    $start
                ),
                ARRAY_A
            );
        }
        return is_array($rows) ? $rows : array();
    }

    public static function events_report(\wpdb $wpdb, string $table, string $start, string $column): array {
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table report.
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT %i AS dimension,
                    SUM(count) AS total
                 FROM %i
                 WHERE `date` >= %s
                 GROUP BY %i
                 ORDER BY total DESC
                 LIMIT 100",
                $column,
                $table,
                $start,
                $column
            ),
            ARRAY_A
        );
        return is_array($rows) ? $rows : array();
    }

    public static function stats_upsert(
        \wpdb $wpdb,
        string $table,
        string $date,
        string $ad_id,
        int $impressions,
        int $clicks
    ): int|false {
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Direct write on custom table.
        return $wpdb->query(
            $wpdb->prepare(
                "INSERT INTO %i (`date`, `ad_id`, `impressions`, `clicks`)
                 VALUES (%s, %s, %d, %d)
                 ON DUPLICATE KEY UPDATE
                    impressions = impressions + VALUES(impressions),
                    clicks = clicks + VALUES(clicks)",
                $table,
                $date,
                $ad_id,
                $impressions,
                $clicks
            )
        );
    }

    public static function variant_upsert(
        \wpdb $wpdb,
        string $table,
        string $date,
        string $ad_id,
        string $variant_id,
        int $impressions,
        int $clicks
    ): int|false {
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Direct write on custom table.
        return $wpdb->query(
            $wpdb->prepare(
                "INSERT INTO %i (`date`, `ad_id`, `variant_id`, `impressions`, `clicks`)
                 VALUES (%s, %s, %s, %d, %d)
                 ON DUPLICATE KEY UPDATE
                    impressions = impressions + VALUES(impressions),
                    clicks = clicks + VALUES(clicks)",
                $table,
                $date,
                $ad_id,
                $variant_id,
                $impressions,
                $clicks
            )
        );
    }

    public static function event_upsert(
        \wpdb $wpdb,
        string $table,
        string $date,
        string $ad_id,
        string $event,
        string $variant_id,
        int $count
    ): int|false {
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Direct write on custom table.
        return $wpdb->query(
            $wpdb->prepare(
                "INSERT INTO %i (`date`, `ad_id`, `event`, `variant_id`, `count`)
                 VALUES (%s, %s, %s, %s, %d)
                 ON DUPLICATE KEY UPDATE
                    count = count + VALUES(count)",
                $table,
                $date,
                $ad_id,
                $event,
                $variant_id,
                $count
            )
        );
    }

    public static function dim_upsert(
        \wpdb $wpdb,
        string $table,
        string $date,
        string $ad_id,
        string $slot,
        string $position,
        string $container,
        int $impressions,
        int $clicks
    ): int|false {
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Direct write on custom table.
        return $wpdb->query(
            $wpdb->prepare(
                "INSERT INTO %i (`date`, `ad_id`, `slot`, `position`, `container`, `impressions`, `clicks`)
                 VALUES (%s, %s, %s, %s, %s, %d, %d)
                 ON DUPLICATE KEY UPDATE
                    impressions = impressions + VALUES(impressions),
                    clicks = clicks + VALUES(clicks)",
                $table,
                $date,
                $ad_id,
                $slot,
                $position,
                $container,
                $impressions,
                $clicks
            )
        );
    }
}
