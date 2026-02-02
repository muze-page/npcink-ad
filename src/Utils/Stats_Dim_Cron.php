<?php

namespace MagickAD\Utils;

if (!defined('ABSPATH')) {
    exit;
}

final class Stats_Dim_Cron {
    public const HOOK = 'magick_ad_cleanup_stats_dim';

    public function register(): void {
        add_action(self::HOOK, array(__CLASS__, 'cleanup'));
        add_action('init', array(__CLASS__, 'maybe_schedule'));
    }

    public static function maybe_schedule(): void {
        if (self::get_retention_days() <= 0) {
            self::unschedule();
            return;
        }
        if (!wp_next_scheduled(self::HOOK)) {
            wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', self::HOOK);
        }
    }

    public static function reschedule(): void {
        self::unschedule();
        self::maybe_schedule();
    }

    public static function cleanup(): void {
        $days = self::get_retention_days();
        if ($days <= 0) {
            return;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats_dim';
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            return;
        }

        $cutoff = date('Y-m-d', current_time('timestamp') - $days * DAY_IN_SECONDS);
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$table} WHERE `date` < %s",
                $cutoff
            )
        );
    }

    private static function get_retention_days(): int {
        $days = (int) get_option('magick_ad_stats_dim_retention_days', 30);
        $days = (int) apply_filters('magick_ad_stats_dim_retention_days', $days);
        if ($days < 0) {
            $days = 0;
        }
        if ($days > 365) {
            $days = 365;
        }
        return $days;
    }

    private static function unschedule(): void {
        $timestamp = wp_next_scheduled(self::HOOK);
        while ($timestamp) {
            wp_unschedule_event($timestamp, self::HOOK);
            $timestamp = wp_next_scheduled(self::HOOK);
        }
    }
}
