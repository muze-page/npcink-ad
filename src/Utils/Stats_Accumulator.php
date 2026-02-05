<?php

namespace MagickAD\Utils;

use MagickAD\Data\Schema;

if (!defined('ABSPATH')) {
    exit;
}

final class Stats_Accumulator {
    private const CACHE_GROUP = 'magick_ad_stats';
    private const STATS_INDEX_KEY = 'magick_ad_stats_index';
    private const DIM_INDEX_KEY = 'magick_ad_stats_dim_index';
    private const VAR_INDEX_KEY = 'magick_ad_stats_variant_index';
    private const EVENT_INDEX_KEY = 'magick_ad_stats_event_index';
    private const STATS_PREFIX = 'magick_ad_stats:';
    private const DIM_PREFIX = 'magick_ad_stats_dim:';
    private const VAR_PREFIX = 'magick_ad_stats_variant:';
    private const EVENT_PREFIX = 'magick_ad_stats_event:';
    private const FLUSH_LOCK_KEY = 'magick_ad_stats_flush_lock';

    public static function enabled(): bool {
        $use = wp_using_ext_object_cache();
        $use = (bool) apply_filters('magick_ad_track_use_persistent_cache', $use);
        return (bool) apply_filters('magick_ad_track_use_cache_accumulator', $use);
    }

    public static function record_stats(string $ad_id, string $event, string $date, int $delta = 1): bool {
        if (!self::enabled()) {
            return false;
        }
        if ($ad_id === '' || $event === '' || $date === '') {
            return false;
        }
        if ($delta < 1) {
            return false;
        }

        $hash = self::hash_parts(array($date, $ad_id));
        $base_key = self::STATS_PREFIX . $hash;
        self::register_index(self::STATS_INDEX_KEY, $hash, array($date, $ad_id));

        $counter_key = $base_key . ($event === 'click' ? ':c' : ':i');
        return self::incr_counter($counter_key, $delta);
    }

    public static function record_dimension(
        string $ad_id,
        string $event,
        string $date,
        string $slot,
        string $position,
        string $container,
        int $delta = 1
    ): bool {
        if (!self::enabled()) {
            return false;
        }
        if ($ad_id === '' || $event === '' || $date === '') {
            return false;
        }
        if ($delta < 1) {
            return false;
        }
        if ($slot === '' && $position === '' && $container === '') {
            return false;
        }

        $hash = self::hash_parts(array($date, $ad_id, $slot, $position, $container));
        $base_key = self::DIM_PREFIX . $hash;
        self::register_index(self::DIM_INDEX_KEY, $hash, array($date, $ad_id, $slot, $position, $container));

        $counter_key = $base_key . ($event === 'click' ? ':c' : ':i');
        return self::incr_counter($counter_key, $delta);
    }

    public static function record_variant(
        string $ad_id,
        string $variant_id,
        string $event,
        string $date,
        int $delta = 1
    ): bool {
        if (!self::enabled()) {
            return false;
        }
        if ($ad_id === '' || $variant_id === '' || $event === '' || $date === '') {
            return false;
        }
        if ($delta < 1) {
            return false;
        }

        $hash = self::hash_parts(array($date, $ad_id, $variant_id));
        $base_key = self::VAR_PREFIX . $hash;
        self::register_index(self::VAR_INDEX_KEY, $hash, array($date, $ad_id, $variant_id));

        $counter_key = $base_key . ($event === 'click' ? ':c' : ':i');
        return self::incr_counter($counter_key, $delta);
    }

    public static function record_event(
        string $ad_id,
        string $event,
        string $date,
        string $variant_id = '',
        int $delta = 1
    ): bool {
        if (!self::enabled()) {
            return false;
        }
        if ($ad_id === '' || $event === '' || $date === '') {
            return false;
        }
        if ($delta < 1) {
            return false;
        }

        $hash = self::hash_parts(array($date, $ad_id, $event, $variant_id));
        $base_key = self::EVENT_PREFIX . $hash;
        self::register_index(
            self::EVENT_INDEX_KEY,
            $hash,
            array($date, $ad_id, $event, $variant_id)
        );

        return self::incr_counter($base_key, $delta);
    }

    public static function flush(): void {
        if (!self::enabled()) {
            return;
        }

        $status = Schema::get_table_status();
        if (empty($status['stats'])) {
            return;
        }

        if (!self::acquire_lock()) {
            return;
        }

        self::flush_stats();
        if (!empty($status['dim'])) {
            self::flush_dimensions();
        }
        if (!empty($status['variant'])) {
            self::flush_variants();
        }
        if (!empty($status['event'])) {
            self::flush_events();
        }

        self::release_lock();
    }

    private static function flush_stats(): void {
        global $wpdb;
        $index = wp_cache_get(self::STATS_INDEX_KEY, self::CACHE_GROUP);
        if (!is_array($index) || empty($index)) {
            return;
        }

        $limit = self::flush_limit();
        $batch = array_slice($index, 0, $limit, true);
        if (empty($batch)) {
            return;
        }

        $table = $wpdb->prefix . 'magick_ad_stats';
        foreach ($batch as $hash => $parts) {
            $parts = is_array($parts) ? $parts : array();
            $date = isset($parts[0]) ? (string) $parts[0] : '';
            $ad_id = isset($parts[1]) ? (string) $parts[1] : '';
            if ($date === '' || $ad_id === '') {
                unset($index[$hash]);
                continue;
            }

            $base_key = self::STATS_PREFIX . $hash;
            $impressions = (int) wp_cache_get($base_key . ':i', self::CACHE_GROUP);
            $clicks = (int) wp_cache_get($base_key . ':c', self::CACHE_GROUP);
            if ($impressions === 0 && $clicks === 0) {
                self::cleanup_counters($base_key);
                unset($index[$hash]);
                continue;
            }

            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is a fixed suffix with prefix.
            $sql = $wpdb->prepare(
                "INSERT INTO {$table} (`date`, `ad_id`, `impressions`, `clicks`)
                 VALUES (%s, %s, %d, %d)
                 ON DUPLICATE KEY UPDATE
                    impressions = impressions + VALUES(impressions),
                    clicks = clicks + VALUES(clicks)",
                $date,
                $ad_id,
                $impressions,
                $clicks
            );

            $result = $wpdb->query($sql);
            if ($result === false) {
                continue;
            }

            self::cleanup_counters($base_key);
            unset($index[$hash]);
        }

        wp_cache_set(self::STATS_INDEX_KEY, $index, self::CACHE_GROUP, self::cache_ttl());
    }

    private static function flush_dimensions(): void {
        global $wpdb;
        $index = wp_cache_get(self::DIM_INDEX_KEY, self::CACHE_GROUP);
        if (!is_array($index) || empty($index)) {
            return;
        }

        $limit = self::flush_limit();
        $batch = array_slice($index, 0, $limit, true);
        if (empty($batch)) {
            return;
        }

        $table = $wpdb->prefix . 'magick_ad_stats_dim';
        foreach ($batch as $hash => $parts) {
            $parts = is_array($parts) ? $parts : array();
            $date = isset($parts[0]) ? (string) $parts[0] : '';
            $ad_id = isset($parts[1]) ? (string) $parts[1] : '';
            $slot = isset($parts[2]) ? (string) $parts[2] : '';
            $position = isset($parts[3]) ? (string) $parts[3] : '';
            $container = isset($parts[4]) ? (string) $parts[4] : '';
            if ($date === '' || $ad_id === '') {
                unset($index[$hash]);
                continue;
            }

            $base_key = self::DIM_PREFIX . $hash;
            $impressions = (int) wp_cache_get($base_key . ':i', self::CACHE_GROUP);
            $clicks = (int) wp_cache_get($base_key . ':c', self::CACHE_GROUP);
            if ($impressions === 0 && $clicks === 0) {
                self::cleanup_counters($base_key);
                unset($index[$hash]);
                continue;
            }

            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is a fixed suffix with prefix.
            $sql = $wpdb->prepare(
                "INSERT INTO {$table} (`date`, `ad_id`, `slot`, `position`, `container`, `impressions`, `clicks`)
                 VALUES (%s, %s, %s, %s, %s, %d, %d)
                 ON DUPLICATE KEY UPDATE
                    impressions = impressions + VALUES(impressions),
                    clicks = clicks + VALUES(clicks)",
                $date,
                $ad_id,
                $slot,
                $position,
                $container,
                $impressions,
                $clicks
            );

            $result = $wpdb->query($sql);
            if ($result === false) {
                continue;
            }

            self::cleanup_counters($base_key);
            unset($index[$hash]);
        }

        wp_cache_set(self::DIM_INDEX_KEY, $index, self::CACHE_GROUP, self::cache_ttl());
    }

    private static function flush_variants(): void {
        global $wpdb;
        $index = wp_cache_get(self::VAR_INDEX_KEY, self::CACHE_GROUP);
        if (!is_array($index) || empty($index)) {
            return;
        }

        $limit = self::flush_limit();
        $batch = array_slice($index, 0, $limit, true);
        if (empty($batch)) {
            return;
        }

        $table = $wpdb->prefix . 'magick_ad_stats_variant';
        foreach ($batch as $hash => $parts) {
            $parts = is_array($parts) ? $parts : array();
            $date = isset($parts[0]) ? (string) $parts[0] : '';
            $ad_id = isset($parts[1]) ? (string) $parts[1] : '';
            $variant_id = isset($parts[2]) ? (string) $parts[2] : '';
            if ($date === '' || $ad_id === '' || $variant_id === '') {
                unset($index[$hash]);
                continue;
            }

            $base_key = self::VAR_PREFIX . $hash;
            $impressions = (int) wp_cache_get($base_key . ':i', self::CACHE_GROUP);
            $clicks = (int) wp_cache_get($base_key . ':c', self::CACHE_GROUP);
            if ($impressions === 0 && $clicks === 0) {
                self::cleanup_counters($base_key);
                unset($index[$hash]);
                continue;
            }

            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is a fixed suffix with prefix.
            $sql = $wpdb->prepare(
                "INSERT INTO {$table} (`date`, `ad_id`, `variant_id`, `impressions`, `clicks`)
                 VALUES (%s, %s, %s, %d, %d)
                 ON DUPLICATE KEY UPDATE
                    impressions = impressions + VALUES(impressions),
                    clicks = clicks + VALUES(clicks)",
                $date,
                $ad_id,
                $variant_id,
                $impressions,
                $clicks
            );

            $result = $wpdb->query($sql);
            if ($result === false) {
                continue;
            }

            self::cleanup_counters($base_key);
            unset($index[$hash]);
        }

        wp_cache_set(self::VAR_INDEX_KEY, $index, self::CACHE_GROUP, self::cache_ttl());
    }

    private static function flush_events(): void {
        global $wpdb;
        $index = wp_cache_get(self::EVENT_INDEX_KEY, self::CACHE_GROUP);
        if (!is_array($index) || empty($index)) {
            return;
        }

        $limit = self::flush_limit();
        $batch = array_slice($index, 0, $limit, true);
        if (empty($batch)) {
            return;
        }

        $table = $wpdb->prefix . 'magick_ad_stats_event';
        foreach ($batch as $hash => $parts) {
            $parts = is_array($parts) ? $parts : array();
            $date = isset($parts[0]) ? (string) $parts[0] : '';
            $ad_id = isset($parts[1]) ? (string) $parts[1] : '';
            $event = isset($parts[2]) ? (string) $parts[2] : '';
            $variant_id = isset($parts[3]) ? (string) $parts[3] : '';
            if ($date === '' || $ad_id === '' || $event === '') {
                unset($index[$hash]);
                continue;
            }

            $base_key = self::EVENT_PREFIX . $hash;
            $count = (int) wp_cache_get($base_key, self::CACHE_GROUP);
            if ($count < 1) {
                self::cleanup_event_counter($base_key);
                unset($index[$hash]);
                continue;
            }

            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is a fixed suffix with prefix.
            $sql = $wpdb->prepare(
                "INSERT INTO {$table} (`date`, `ad_id`, `event`, `variant_id`, `count`)
                 VALUES (%s, %s, %s, %s, %d)
                 ON DUPLICATE KEY UPDATE
                    count = count + VALUES(count)",
                $date,
                $ad_id,
                $event,
                $variant_id,
                $count
            );

            $result = $wpdb->query($sql);
            if ($result === false) {
                continue;
            }

            self::cleanup_event_counter($base_key);
            unset($index[$hash]);
        }

        wp_cache_set(self::EVENT_INDEX_KEY, $index, self::CACHE_GROUP, self::cache_ttl());
    }

    private static function incr_counter(string $key, int $delta = 1): bool {
        if ($delta < 1) {
            return false;
        }
        $ttl = self::cache_ttl();
        $value = wp_cache_incr($key, $delta, self::CACHE_GROUP);
        if ($value === false) {
            wp_cache_add($key, 0, self::CACHE_GROUP, $ttl);
            $value = wp_cache_incr($key, $delta, self::CACHE_GROUP);
        }
        return $value !== false;
    }

    private static function register_index(string $index_key, string $hash, array $parts): void {
        $index = wp_cache_get($index_key, self::CACHE_GROUP);
        if (!is_array($index)) {
            $index = array();
        }
        if (isset($index[$hash])) {
            return;
        }
        $index[$hash] = $parts;
        wp_cache_set($index_key, $index, self::CACHE_GROUP, self::cache_ttl());
    }

    private static function cleanup_counters(string $base_key): void {
        wp_cache_delete($base_key . ':i', self::CACHE_GROUP);
        wp_cache_delete($base_key . ':c', self::CACHE_GROUP);
    }

    private static function cleanup_event_counter(string $base_key): void {
        wp_cache_delete($base_key, self::CACHE_GROUP);
    }

    private static function cache_ttl(): int {
        $ttl = (int) apply_filters('magick_ad_stats_cache_ttl', 6 * HOUR_IN_SECONDS);
        return max(300, $ttl);
    }

    private static function flush_limit(): int {
        $limit = (int) apply_filters('magick_ad_stats_flush_limit', 200);
        return max(20, $limit);
    }

    private static function hash_parts(array $parts): string {
        return sha1(implode('|', $parts));
    }

    private static function acquire_lock(): bool {
        return wp_cache_add(self::FLUSH_LOCK_KEY, 1, self::CACHE_GROUP, 60);
    }

    private static function release_lock(): void {
        wp_cache_delete(self::FLUSH_LOCK_KEY, self::CACHE_GROUP);
    }
}
