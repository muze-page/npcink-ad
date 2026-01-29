<?php

namespace MagickAD\REST\Controllers;

use WP_Error;
use WP_REST_Request;

if (!defined('ABSPATH')) {
    exit;
}

final class Template_Preferences_Controller {
    private const FAVORITES_KEY = 'magick_ad_template_favorites';
    private const PINS_KEY = 'magick_ad_template_pins';

    public static function get() {
        $user_id = get_current_user_id();
        if (!$user_id) {
            return new WP_Error('magick_ad_no_user', 'User not found', array('status' => 401));
        }

        $favorites = get_user_meta($user_id, self::FAVORITES_KEY, true);
        $pins = get_user_meta($user_id, self::PINS_KEY, true);

        return rest_ensure_response(array(
            'favorites' => self::sanitize_ids($favorites),
            'pins' => self::sanitize_ids($pins),
        ));
    }

    public static function update(WP_REST_Request $request) {
        $user_id = get_current_user_id();
        if (!$user_id) {
            return new WP_Error('magick_ad_no_user', 'User not found', array('status' => 401));
        }

        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('magick_ad_invalid_payload', 'Invalid payload', array('status' => 400));
        }

        $favorites = isset($payload['favorites']) ? $payload['favorites'] : array();
        $pins = isset($payload['pins']) ? $payload['pins'] : array();

        if (!is_array($favorites) || !is_array($pins)) {
            return new WP_Error('magick_ad_invalid_preferences', 'Invalid preferences', array('status' => 400));
        }

        $clean_favorites = self::sanitize_ids($favorites);
        $clean_pins = self::sanitize_ids($pins);

        update_user_meta($user_id, self::FAVORITES_KEY, $clean_favorites);
        update_user_meta($user_id, self::PINS_KEY, $clean_pins);

        return rest_ensure_response(array(
            'success' => true,
            'favorites' => $clean_favorites,
            'pins' => $clean_pins,
        ));
    }

    private static function sanitize_ids($value): array {
        $list = is_array($value) ? $value : array();
        $list = array_map('sanitize_text_field', $list);
        $list = array_filter($list, static function ($item) {
            return $item !== '';
        });
        return array_values(array_unique($list));
    }
}
