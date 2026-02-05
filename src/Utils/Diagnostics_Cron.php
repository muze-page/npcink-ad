<?php

namespace MagickAD\Utils;

if (!defined('ABSPATH')) {
    exit;
}

final class Diagnostics_Cron {
    public const HOOK = 'magick_ad_cleanup_diagnostics_log';

    public function register(): void {
        add_action(self::HOOK, array(__CLASS__, 'cleanup'));
        add_action('init', array(__CLASS__, 'maybe_schedule'));
    }

    public static function maybe_schedule(): void {
        if (!self::diagnostics_enabled()) {
            self::unschedule();
            return;
        }
        if (!wp_next_scheduled(self::HOOK)) {
            wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', self::HOOK);
        }
    }

    public static function reschedule(bool $enabled): void {
        if ($enabled) {
            self::maybe_schedule();
            return;
        }
        self::unschedule();
    }

    public static function cleanup(): void {
        if (!self::diagnostics_enabled()) {
            return;
        }

        global $wpdb;
        $log_table = $wpdb->prefix . 'magick_ad_stats_log';
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $log_table));
        if ($exists !== $log_table) {
            return;
        }

        $retention_days = (int) get_option('magick_ad_stats_diagnostics_retention_days', 7);
        $retention_days = max(1, min($retention_days, 90));
        $retention_days = (int) apply_filters('magick_ad_stats_diagnostics_retention_days', $retention_days);
        $cutoff = wp_date('Y-m-d H:i:s', current_time('timestamp') - $retention_days * DAY_IN_SECONDS);

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is a fixed suffix with prefix.
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$log_table} WHERE created_at < %s",
                $cutoff
            )
        );
    }

    private static function diagnostics_enabled(): bool {
        $enabled = (get_option('magick_ad_stats_diagnostics', '0') === '1');
        $enabled = (bool) apply_filters('magick_ad_stats_diagnostics_enabled', $enabled);
        $expires_at = (int) get_option('magick_ad_stats_diagnostics_expires_at', 0);
        if ($enabled && $expires_at > 0 && current_time('timestamp') >= $expires_at) {
            update_option('magick_ad_stats_diagnostics', '0');
            update_option('magick_ad_stats_diagnostics_expires_at', 0);
            $enabled = false;
        }
        return $enabled;
    }

    private static function unschedule(): void {
        $timestamp = wp_next_scheduled(self::HOOK);
        while ($timestamp) {
            wp_unschedule_event($timestamp, self::HOOK);
            $timestamp = wp_next_scheduled(self::HOOK);
        }
    }
}
