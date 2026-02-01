<?php

namespace MagickAD\REST\Controllers;

use WP_Error;
use WP_REST_Request;
use MagickAD\Frontend\Frontend;
use MagickAD\Utils\Tracking_Signature;

if (!defined('ABSPATH')) {
    exit;
}

final class Render_Controller {
    public static function render(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        $payload = is_array($payload) ? $payload : array();

        $ad_id = isset($payload['ad_id']) ? sanitize_text_field($payload['ad_id']) : '';
        $sig = isset($payload['sig']) ? sanitize_text_field($payload['sig']) : '';
        $sig_ts = isset($payload['sig_ts']) ? sanitize_text_field($payload['sig_ts']) : '';

        if ($ad_id === '' || !Tracking_Signature::is_valid($ad_id, $sig, $sig_ts)) {
            return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
        }

        $args = self::sanitize_args($payload);
        $markup = Frontend::render_ad_by_id($ad_id, $args);

        return rest_ensure_response(array(
            'success' => $markup !== '',
            'html' => $markup,
        ));
    }

    private static function sanitize_args(array $payload): array {
        $args = array();

        if (!empty($payload['slot']) && is_string($payload['slot'])) {
            $args['slot'] = sanitize_title($payload['slot']);
        }
        if (!empty($payload['position']) && is_string($payload['position'])) {
            $args['position'] = sanitize_text_field($payload['position']);
        }
        if (!empty($payload['class']) && is_string($payload['class'])) {
            $args['class'] = sanitize_text_field($payload['class']);
        }
        if (!empty($payload['container']) && is_string($payload['container'])) {
            $container = sanitize_text_field($payload['container']);
            if (in_array($container, array('inline', 'popup', 'banner', 'floating', 'interstitial'), true)) {
                $args['container'] = $container;
            }
        }
        if (!empty($payload['creative']) && is_string($payload['creative'])) {
            $creative = sanitize_text_field($payload['creative']);
            if (in_array($creative, array('html', 'image', 'video', 'block'), true)) {
                $args['creative'] = $creative;
            }
        }

        return $args;
    }
}
