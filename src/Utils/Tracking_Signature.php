<?php

namespace MagickAD\Utils;

if (!defined('ABSPATH')) {
    exit;
}

final class Tracking_Signature {
    private const OPTION_TRACK_SECRET = 'magick_ad_track_secret';
    private const OPTION_TRACK_SIGNATURE_DAYS = 'magick_ad_track_signature_days';
    private const OPTION_TRACK_SIGNATURE_MODE = 'magick_ad_track_signature_mode';
    private const POSITION_ALLOWLIST = array(
        'block',
        'slot',
        'shortcode',
        'content',
        'content_before',
        'content_after',
        'footer',
        'node',
        'top',
        'comments_top',
        'comments_bottom',
        'comment_form_before',
        'comment_form_after',
    );
    private const CONTAINER_ALLOWLIST = array(
        'inline',
        'popup',
        'banner',
        'floating',
        'interstitial',
    );

    public static function build(
        string $ad_id,
        string $sig_ts,
        string $slot = '',
        string $position = '',
        string $container = ''
    ): string {
        $payload = implode('|', array(
            $ad_id,
            $sig_ts,
            self::normalize_slot($slot),
            self::normalize_position($position),
            self::normalize_container($container),
        ));
        return hash_hmac('sha256', $payload, self::get_secret());
    }

    public static function is_valid(
        string $ad_id,
        string $sig,
        string $sig_ts,
        string $slot = '',
        string $position = '',
        string $container = ''
    ): bool {
        if ($ad_id === '' || $sig === '' || $sig_ts === '') {
            return false;
        }

        $expected = self::build($ad_id, $sig_ts, $slot, $position, $container);
        if (!hash_equals($expected, $sig)) {
            return false;
        }

        $timestamp = self::parse_sig_ts($sig_ts);
        if ($timestamp === null) {
            return false;
        }

        $now = current_time('timestamp');
        $age_days = (int) floor(($now - $timestamp) / DAY_IN_SECONDS);
        if ($age_days < 0) {
            return false;
        }

        $window_days = self::get_signature_window_days();
        return $age_days < $window_days;
    }

    public static function current_sig_ts(): string {
        $now = current_time('timestamp');
        if (self::get_signature_mode() === 'week') {
            return gmdate('oW', $now);
        }
        return gmdate('Ymd', $now);
    }

    public static function get_signature_window_days(): int {
        $days = (int) get_option(self::OPTION_TRACK_SIGNATURE_DAYS, 14);
        $days = max(1, min($days, 90));
        $days = (int) apply_filters('magick_ad_track_signature_window_days', $days);
        return max(1, min($days, 90));
    }

    private static function parse_sig_ts(string $sig_ts): ?int {
        $tz = function_exists('wp_timezone') ? wp_timezone() : new \DateTimeZone('UTC');

        if (self::get_signature_mode() === 'week') {
            if (!preg_match('/^\d{6}$/', $sig_ts)) {
                return null;
            }
            $year = (int) substr($sig_ts, 0, 4);
            $week = (int) substr($sig_ts, 4, 2);
            if ($week < 1 || $week > 53) {
                return null;
            }
            $date = (new \DateTimeImmutable('now', $tz))->setISODate($year, $week, 1)->setTime(0, 0, 0);
            return (int) $date->getTimestamp();
        }

        if (!preg_match('/^\d{8}$/', $sig_ts)) {
            return null;
        }

        $year = (int) substr($sig_ts, 0, 4);
        $month = (int) substr($sig_ts, 4, 2);
        $day = (int) substr($sig_ts, 6, 2);

        if (!checkdate($month, $day, $year)) {
            return null;
        }

        $date = \DateTimeImmutable::createFromFormat(
            'Y-m-d H:i:s',
            sprintf('%04d-%02d-%02d 00:00:00', $year, $month, $day),
            $tz
        );
        if ($date === false) {
            return null;
        }

        return (int) $date->getTimestamp();
    }

    private static function get_signature_mode(): string {
        $mode = (string) get_option(self::OPTION_TRACK_SIGNATURE_MODE, 'day');
        $mode = (string) apply_filters('magick_ad_track_signature_mode', $mode);
        return $mode === 'week' ? 'week' : 'day';
    }

    private static function normalize_slot(string $slot): string {
        $slot = sanitize_title($slot);
        if ($slot === '') {
            return '';
        }
        return substr($slot, 0, 64);
    }

    private static function normalize_position(string $position): string {
        $position = sanitize_text_field($position);
        return in_array($position, self::POSITION_ALLOWLIST, true) ? $position : '';
    }

    private static function normalize_container(string $container): string {
        $container = sanitize_text_field($container);
        return in_array($container, self::CONTAINER_ALLOWLIST, true) ? $container : '';
    }

    private static function get_secret(): string {
        $secret = get_option(self::OPTION_TRACK_SECRET, '');
        if (!is_string($secret) || $secret === '') {
            $secret = wp_generate_password(32, true, true);
            update_option(self::OPTION_TRACK_SECRET, $secret, false);
        }
        return (string) $secret;
    }
}
