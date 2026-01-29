<?php

namespace MagickAD\REST\Controllers;

use MagickAD\Data\Template_Categories;
use WP_Error;
use WP_REST_Request;

if (!defined('ABSPATH')) {
    exit;
}

final class Template_Categories_Controller {
    public static function get() {
        return rest_ensure_response(array(
            'categories' => Template_Categories::get(),
        ));
    }

    public static function update(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('magick_ad_invalid_payload', 'Invalid payload', array('status' => 400));
        }

        $categories = isset($payload['categories']) ? $payload['categories'] : array();
        if (!is_array($categories)) {
            return new WP_Error('magick_ad_invalid_categories', 'Invalid categories', array('status' => 400));
        }

        $saved = Template_Categories::update($categories);

        return rest_ensure_response(array(
            'success' => true,
            'categories' => $saved,
        ));
    }
}
