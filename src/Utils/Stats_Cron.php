<?php

namespace MagickAD\Utils;

if (!defined('ABSPATH')) {
    exit;
}

final class Stats_Cron {
    public const HOOK = 'magick_ad_flush_stats_cache';
    private const SCHEDULE = 'magick_ad_stats_flush';

    public function register(): void {
        add_action(self::HOOK, array(__CLASS__, 'flush'));
        add_action('init', array(__CLASS__, 'maybe_schedule'), 20);
        add_filter('cron_schedules', array(__CLASS__, 'register_schedule'));
    }

    public static function maybe_schedule(): void {
        if (!Stats_Accumulator::enabled() && !Stats_Queue::enabled()) {
            self::unschedule();
            return;
        }

        if (!wp_next_scheduled(self::HOOK)) {
            wp_schedule_event(time() + MINUTE_IN_SECONDS, self::SCHEDULE, self::HOOK);
        }
    }

    public static function register_schedule(array $schedules): array {
        $interval = (int) apply_filters('magick_ad_stats_flush_interval', 300);
        $interval = max(60, $interval);
        $schedules[self::SCHEDULE] = array(
            'interval' => $interval,
            'display' => esc_html__('Magick AD stats flush', 'magick-ad'),
        );
        return $schedules;
    }

    public static function flush(): void {
        Stats_Accumulator::flush();
        Stats_Queue::flush();
    }

    private static function unschedule(): void {
        $timestamp = wp_next_scheduled(self::HOOK);
        while ($timestamp) {
            wp_unschedule_event($timestamp, self::HOOK);
            $timestamp = wp_next_scheduled(self::HOOK);
        }
    }
}
