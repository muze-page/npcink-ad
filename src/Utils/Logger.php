<?php

namespace MagickAD\Utils;

if (!defined('ABSPATH')) {
    exit;
}

final class Logger {
    private static function is_debug_constant_enabled(): bool {
        return (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG);
    }

    public static function is_debug_enabled(): bool {
        static $enabled = null;
        if ($enabled !== null) {
            return $enabled;
        }

        if (!self::is_debug_constant_enabled()) {
            $enabled = false;
            return $enabled;
        }

        $enabled = false;
        if (get_option('magick_ad_debug', '0') === '1') {
            $enabled = true;
        }

        $enabled = (bool) apply_filters('magick_ad_debug_enabled', $enabled);

        return $enabled;
    }

    public static function is_settings_log_enabled(): bool {
        if (!self::is_debug_enabled()) {
            return false;
        }

        $enabled = (get_option('magick_ad_debug_log_settings', '1') === '1');

        return (bool) apply_filters('magick_ad_debug_log_settings_enabled', $enabled);
    }

    public static function log(string $message): void {
        if (!self::is_debug_enabled()) {
            return;
        }

        /**
         * Allow hosts to decide how to persist debug logs.
         *
         * @param string $message Debug message.
         */
        do_action('magick_ad_log', $message);
    }
}
