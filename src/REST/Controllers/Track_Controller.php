<?php

namespace MagickAD\REST\Controllers;

use WP_Error;
use WP_REST_Request;

if (!defined('ABSPATH')) {
    exit;
}

final class Track_Controller {
    public static function track(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload) || empty($payload['ad_id']) || empty($payload['event'])) {
            return new WP_Error('magick_ad_invalid_payload', 'Invalid payload', array('status' => 400));
        }

        $event = sanitize_text_field($payload['event']);
        if (!in_array($event, array('impression', 'click'), true)) {
            return new WP_Error('magick_ad_invalid_event', 'Invalid event', array('status' => 400));
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats';
        $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '';
        $page_url = isset($payload['page_url']) ? esc_url_raw($payload['page_url']) : esc_url_raw(home_url($request_uri));

        $data = array(
            'ad_id' => sanitize_text_field($payload['ad_id']),
            'event_type' => $event,
            'page_url' => $page_url,
            'device' => wp_is_mobile() ? 'mobile' : 'desktop',
            'user_id' => get_current_user_id(),
            'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT'])) : '',
            'created_at' => current_time('mysql'),
        );

        $format = array('%s', '%s', '%s', '%s', '%d', '%s', '%s');
        $inserted = $wpdb->insert($table, $data, $format);

        if ($inserted === false) {
            return new WP_Error('magick_ad_db_error', 'DB insert failed', array('status' => 500));
        }

        return rest_ensure_response(array('success' => true));
    }
}
