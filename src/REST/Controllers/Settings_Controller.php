<?php

namespace MagickAD\REST\Controllers;

use MagickAD\Data\Ads;
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

        $saved = Ads::save_settings($settings);
        if (is_wp_error($saved)) {
            return $saved;
        }

        return rest_ensure_response(array(
            'success' => true,
            'saved' => $saved,
        ));
    }

    public static function get() {
        return rest_ensure_response(Ads::get_settings());
    }
}
