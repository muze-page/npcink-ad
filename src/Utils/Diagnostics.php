<?php

namespace MagickAD\Utils;

if (!defined('ABSPATH')) {
    exit;
}

final class Diagnostics {
    private const OPTION_ENABLED = 'magick_ad_stats_diagnostics';
    private const OPTION_EXPIRES = 'magick_ad_stats_diagnostics_expires_at';

    public static function is_enabled(): bool {
        $enabled = (get_option(self::OPTION_ENABLED, '0') === '1');
        $enabled = (bool) apply_filters('magick_ad_stats_diagnostics_enabled', $enabled);
        $expires_at = (int) get_option(self::OPTION_EXPIRES, 0);
        if ($enabled && $expires_at > 0 && current_time('timestamp') >= $expires_at) {
            update_option(self::OPTION_ENABLED, '0');
            update_option(self::OPTION_EXPIRES, 0);
            $enabled = false;
        }
        return $enabled;
    }
}
