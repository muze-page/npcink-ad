<?php

namespace MagickAD\Frontend;

if (!defined('ABSPATH')) {
    exit;
}

final class Template_Tags {
    public function register(): void {
        // No-op. Loading the class registers template tag functions below.
    }
}

if (!function_exists('magick_ad_get')) {
    function magick_ad_get($slot_or_id = '', array $args = array()) {
        return Frontend::render_slot($slot_or_id, $args);
    }
}

if (!function_exists('magick_ad_render')) {
    function magick_ad_render($slot_or_id = '', array $args = array()) {
        return Frontend::render_slot($slot_or_id, $args);
    }
}

if (!function_exists('magick_ad_the')) {
    function magick_ad_the($slot_or_id = '', array $args = array()) {
        echo Frontend::render_slot($slot_or_id, $args);
    }
}
