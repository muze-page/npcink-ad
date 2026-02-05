<?php

namespace MagickAD\Utils;

use MagickAD\Data\Schema;
use MagickAD\Data\Stats_Query;

if (!defined('ABSPATH')) {
    exit;
}

final class Stats_Queue {
    private const OPTION_MODE = 'magick_ad_stats_write_mode';
    private const MODE_ASYNC = 'async';

    private const OPTION_STATS = 'magick_ad_stats_queue';
    private const OPTION_DIM = 'magick_ad_stats_dim_queue';
    private const OPTION_VARIANT = 'magick_ad_stats_variant_queue';
    private const OPTION_EVENT = 'magick_ad_stats_event_queue';

    public static function enabled(): bool {
        $mode = (string) get_option(self::OPTION_MODE, self::MODE_ASYNC);
        $mode = (string) apply_filters('magick_ad_stats_write_mode', $mode);
        if ($mode !== self::MODE_ASYNC) {
            return false;
        }
        return !Stats_Accumulator::enabled();
    }

    public static function enqueue_stats(array $rows): bool {
        return self::enqueue_rows(
            self::OPTION_STATS,
            $rows,
            array('date', 'ad_id', 'impressions', 'clicks')
        );
    }

    public static function enqueue_variants(array $rows): bool {
        return self::enqueue_rows(
            self::OPTION_VARIANT,
            $rows,
            array('date', 'ad_id', 'variant_id', 'impressions', 'clicks')
        );
    }

    public static function enqueue_events(array $rows): bool {
        return self::enqueue_rows(
            self::OPTION_EVENT,
            $rows,
            array('date', 'ad_id', 'event', 'variant_id', 'count')
        );
    }

    public static function enqueue_dimensions(array $rows): bool {
        return self::enqueue_rows(
            self::OPTION_DIM,
            $rows,
            array('date', 'ad_id', 'slot', 'position', 'container', 'impressions', 'clicks')
        );
    }

    public static function flush(): void {
        if (!self::enabled()) {
            return;
        }

        $status = Schema::get_table_status();
        if (empty($status['stats'])) {
            return;
        }

        $limit = self::flush_limit();
        self::flush_stats_queue($limit);
        if (!empty($status['dim'])) {
            self::flush_dim_queue($limit);
        }
        if (!empty($status['variant'])) {
            self::flush_variant_queue($limit);
        }
        if (!empty($status['event'])) {
            self::flush_event_queue($limit);
        }
    }

    private static function flush_stats_queue(int $limit): void {
        $queue = self::get_queue(self::OPTION_STATS);
        if (empty($queue)) {
            return;
        }
        $batch = array_slice($queue, 0, $limit, true);
        if (empty($batch)) {
            return;
        }

        global $wpdb;
        $table = Schema::stats_table();
        foreach ($batch as $key => $row) {
            $row = is_array($row) ? $row : array();
            $date = isset($row['date']) ? (string) $row['date'] : '';
            $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
            $impressions = (int) ($row['impressions'] ?? 0);
            $clicks = (int) ($row['clicks'] ?? 0);
            if ($date === '' || $ad_id === '' || ($impressions === 0 && $clicks === 0)) {
                unset($queue[$key]);
                continue;
            }

            $result = Stats_Query::stats_upsert($wpdb, $table, $date, $ad_id, $impressions, $clicks);
            if ($result === false) {
                continue;
            }
            unset($queue[$key]);
        }

        self::set_queue(self::OPTION_STATS, $queue);
    }

    private static function flush_variant_queue(int $limit): void {
        $queue = self::get_queue(self::OPTION_VARIANT);
        if (empty($queue)) {
            return;
        }
        $batch = array_slice($queue, 0, $limit, true);
        if (empty($batch)) {
            return;
        }

        global $wpdb;
        $table = Schema::variant_table();
        foreach ($batch as $key => $row) {
            $row = is_array($row) ? $row : array();
            $date = isset($row['date']) ? (string) $row['date'] : '';
            $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
            $variant_id = isset($row['variant_id']) ? (string) $row['variant_id'] : '';
            $impressions = (int) ($row['impressions'] ?? 0);
            $clicks = (int) ($row['clicks'] ?? 0);
            if ($date === '' || $ad_id === '' || $variant_id === '' || ($impressions === 0 && $clicks === 0)) {
                unset($queue[$key]);
                continue;
            }

            $result = Stats_Query::variant_upsert(
                $wpdb,
                $table,
                $date,
                $ad_id,
                $variant_id,
                $impressions,
                $clicks
            );
            if ($result === false) {
                continue;
            }
            unset($queue[$key]);
        }

        self::set_queue(self::OPTION_VARIANT, $queue);
    }

    private static function flush_event_queue(int $limit): void {
        $queue = self::get_queue(self::OPTION_EVENT);
        if (empty($queue)) {
            return;
        }
        $batch = array_slice($queue, 0, $limit, true);
        if (empty($batch)) {
            return;
        }

        global $wpdb;
        $table = Schema::event_table();
        foreach ($batch as $key => $row) {
            $row = is_array($row) ? $row : array();
            $date = isset($row['date']) ? (string) $row['date'] : '';
            $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
            $event = isset($row['event']) ? (string) $row['event'] : '';
            $variant_id = isset($row['variant_id']) ? (string) $row['variant_id'] : '';
            $count = (int) ($row['count'] ?? 0);
            if ($date === '' || $ad_id === '' || $event === '' || $count < 1) {
                unset($queue[$key]);
                continue;
            }

            $result = Stats_Query::event_upsert(
                $wpdb,
                $table,
                $date,
                $ad_id,
                $event,
                $variant_id,
                $count
            );
            if ($result === false) {
                continue;
            }
            unset($queue[$key]);
        }

        self::set_queue(self::OPTION_EVENT, $queue);
    }

    private static function flush_dim_queue(int $limit): void {
        $queue = self::get_queue(self::OPTION_DIM);
        if (empty($queue)) {
            return;
        }
        $batch = array_slice($queue, 0, $limit, true);
        if (empty($batch)) {
            return;
        }

        global $wpdb;
        $table = Schema::dim_table();
        foreach ($batch as $key => $row) {
            $row = is_array($row) ? $row : array();
            $date = isset($row['date']) ? (string) $row['date'] : '';
            $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
            $slot = isset($row['slot']) ? (string) $row['slot'] : '';
            $position = isset($row['position']) ? (string) $row['position'] : '';
            $container = isset($row['container']) ? (string) $row['container'] : '';
            $impressions = (int) ($row['impressions'] ?? 0);
            $clicks = (int) ($row['clicks'] ?? 0);
            if ($date === '' || $ad_id === '' || ($impressions === 0 && $clicks === 0)) {
                unset($queue[$key]);
                continue;
            }
            if ($slot === '' && $position === '' && $container === '') {
                unset($queue[$key]);
                continue;
            }

            $result = Stats_Query::dim_upsert(
                $wpdb,
                $table,
                $date,
                $ad_id,
                $slot,
                $position,
                $container,
                $impressions,
                $clicks
            );
            if ($result === false) {
                continue;
            }
            unset($queue[$key]);
        }

        self::set_queue(self::OPTION_DIM, $queue);
    }

    private static function enqueue_rows(string $option, array $rows, array $fields): bool {
        if (!self::enabled() || empty($rows)) {
            return false;
        }

        $queue = self::get_queue($option);
        if (count($queue) >= self::queue_limit()) {
            return false;
        }

        foreach ($rows as $row) {
            $row = is_array($row) ? $row : array();
            $data = array();
            foreach ($fields as $field) {
                $data[$field] = $row[$field] ?? '';
            }

            $key = self::build_key($data, $fields);
            if ($key === '') {
                continue;
            }

            if (isset($queue[$key]) && is_array($queue[$key])) {
                $existing = $queue[$key];
            } else {
                $existing = $data;
            }

            if (isset($data['impressions'])) {
                $existing['impressions'] = (int) ($existing['impressions'] ?? 0) + (int) $data['impressions'];
            }
            if (isset($data['clicks'])) {
                $existing['clicks'] = (int) ($existing['clicks'] ?? 0) + (int) $data['clicks'];
            }
            if (isset($data['count'])) {
                $existing['count'] = (int) ($existing['count'] ?? 0) + (int) $data['count'];
            }

            $queue[$key] = $existing;
        }

        self::set_queue($option, $queue);
        return true;
    }

    private static function build_key(array $data, array $fields): string {
        $parts = array();
        foreach ($fields as $field) {
            $value = isset($data[$field]) ? (string) $data[$field] : '';
            if ($value === '' && in_array($field, array('impressions', 'clicks', 'count'), true)) {
                $value = '0';
            }
            $parts[] = $value;
        }
        if (empty($parts)) {
            return '';
        }
        return md5(implode("\0", $parts));
    }

    private static function get_queue(string $option): array {
        $queue = get_option($option, array());
        return is_array($queue) ? $queue : array();
    }

    private static function set_queue(string $option, array $queue): void {
        if (empty($queue)) {
            delete_option($option);
            return;
        }
        $existing = get_option($option, null);
        if ($existing === null) {
            add_option($option, $queue, '', false);
            return;
        }
        update_option($option, $queue, false);
    }

    private static function queue_limit(): int {
        $limit = (int) apply_filters('magick_ad_stats_queue_limit', 500);
        return max(50, $limit);
    }

    private static function flush_limit(): int {
        $limit = (int) apply_filters('magick_ad_stats_queue_flush_limit', 200);
        return max(50, $limit);
    }
}
