<?php

namespace MagickAD\Utils;

if (!defined('ABSPATH')) {
    exit;
}

final class Tracking_Signature {
    private const OPTION_TRACK_SECRET = 'magick_ad_track_secret';

    public static function build(string $ad_id, string $sig_ts): string {
        return hash_hmac('sha256', $ad_id . '|' . $sig_ts, self::get_secret());
    }

    public static function is_valid(string $ad_id, string $sig, string $sig_ts): bool {
        if ($ad_id === '' || $sig === '' || $sig_ts === '') {
            return false;
        }
        if (!preg_match('/^\d{8}$/', $sig_ts)) {
            return false;
        }
        $expected = self::build($ad_id, $sig_ts);
        if (!hash_equals($expected, $sig)) {
            return false;
        }
        $today = gmdate('Ymd', current_time('timestamp'));
        $yesterday = gmdate('Ymd', current_time('timestamp') - DAY_IN_SECONDS);
        return ($sig_ts === $today || $sig_ts === $yesterday);
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
