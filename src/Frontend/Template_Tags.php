<?php

namespace MagickAD\Frontend {
    if (!defined('ABSPATH')) {
        exit;
    }

    final class Template_Tags {
        public function register(): void {
            // No-op. Loading the class registers template tag functions below.
        }
    }
}

namespace {
    if (!function_exists('magick_ad_get')) {
        function magick_ad_get(string $slot_or_id = '', array $args = array()): string {
            return \MagickAD\Frontend\Frontend::render_slot($slot_or_id, $args);
        }
    }

    if (!function_exists('magick_ad_render')) {
        function magick_ad_render(string $slot_or_id = '', array $args = array()): string {
            return \MagickAD\Frontend\Frontend::render_slot($slot_or_id, $args);
        }
    }

    if (!function_exists('magick_ad_the')) {
        function magick_ad_the(string $slot_or_id = '', array $args = array()): void {
            echo \MagickAD\Frontend\Frontend::render_slot($slot_or_id, $args);
        }
    }
}
