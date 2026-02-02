<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

final class Slots {
    public const OPTION_KEY = 'magick_ad_slots';

    public static function get_slots(): array {
        $slots = get_option(self::OPTION_KEY, array());
        if (!is_array($slots)) {
            $slots = array();
        }
        return Settings::sanitize_slots($slots);
    }

    public static function save_slots(array $slots, bool $refresh_runtime = true): array {
        $slots = Settings::sanitize_slots($slots);
        update_option(self::OPTION_KEY, $slots, false);
        if ($refresh_runtime) {
            Settings::refresh_runtime_cache(null, $slots);
        }
        return $slots;
    }
}
