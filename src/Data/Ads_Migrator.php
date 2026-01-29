<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

final class Ads_Migrator {
    private const OPTION_FLAG = 'magick_ad_ads_migrated';

    public static function maybe_migrate(): void {
        if (get_option(self::OPTION_FLAG, '') === '1') {
            return;
        }

        $legacy = get_option(Settings::OPTION_KEY);
        if (!is_array($legacy) || empty($legacy['ads'])) {
            update_option(self::OPTION_FLAG, '1');
            return;
        }

        $sanitized = Settings::sanitize_settings($legacy);
        $result = Ads::store_ads(isset($sanitized['ads']) ? $sanitized['ads'] : array());

        if (!is_wp_error($result)) {
            update_option(self::OPTION_FLAG, '1');
            delete_option(Settings::OPTION_KEY);
        }
    }
}
