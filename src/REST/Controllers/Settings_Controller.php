<?php

namespace MagickAD\REST\Controllers;

use MagickAD\Data\Settings;
use WP_Error;
use WP_REST_Request;

if (!defined('ABSPATH')) {
    exit;
}

final class Settings_Controller {
    public static function save(WP_REST_Request $request) {
        $settings = $request->get_json_params();
        if (!is_array($settings)) {
            return new WP_Error('magick_ad_invalid_payload', 'Invalid payload', array('status' => 400));
        }

        $sanitized = Settings::sanitize_settings($settings);
        $validation = Settings::validate_settings($sanitized);
        if (is_wp_error($validation)) {
            return $validation;
        }

        update_option(Settings::OPTION_KEY, $sanitized);

        return rest_ensure_response(array(
            'success' => true,
            'saved' => $sanitized,
        ));
    }

    public static function get() {
        return rest_ensure_response(Settings::get_settings());
    }
}
