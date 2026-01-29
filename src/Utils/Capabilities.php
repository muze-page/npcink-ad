<?php

namespace MagickAD\Utils;

use WP_Error;
use WP_REST_Request;

if (!defined('ABSPATH')) {
    exit;
}

final class Capabilities {
    public static function manage_capability(): string {
        return (string) apply_filters('magick_ad_manage_capability', 'manage_options');
    }

    public static function current_user_can_manage(): bool {
        return current_user_can(self::manage_capability());
    }

    public static function rest_can_manage(WP_REST_Request $request) {
        if (!self::current_user_can_manage()) {
            return new WP_Error('magick_ad_forbidden', 'Forbidden', array('status' => 403));
        }

        $nonce = $request->get_header('X-WP-Nonce');
        if (!$nonce || !wp_verify_nonce($nonce, 'wp_rest')) {
            return new WP_Error('magick_ad_invalid_nonce', 'Invalid nonce', array('status' => 403));
        }

        return true;
    }
}
