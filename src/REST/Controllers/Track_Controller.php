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
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            return new WP_Error('magick_ad_db_missing', 'Stats table missing', array('status' => 500));
        }

        $ad_id = sanitize_text_field($payload['ad_id']);
        $date = current_time('Y-m-d');
        $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '';
        $page_url = isset($payload['page_url']) ? esc_url_raw($payload['page_url']) : esc_url_raw(home_url($request_uri));
        $page_hash = md5($page_url);

        $viewer_key = '';
        $user_id = get_current_user_id();
        if ($user_id) {
            $viewer_key = 'u:' . $user_id;
        } else {
            if (!isset($_COOKIE['magick_ad_uid']) || !is_string($_COOKIE['magick_ad_uid'])) {
                $uid = wp_generate_uuid4();
                setcookie('magick_ad_uid', $uid, time() + MONTH_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
                $_COOKIE['magick_ad_uid'] = $uid;
            }
            $viewer_key = 'c:' . sanitize_text_field(wp_unslash($_COOKIE['magick_ad_uid']));
        }

        $dedupe_key = 'magick_ad_track_' . md5($ad_id . '|' . $event . '|' . $date . '|' . $page_hash . '|' . $viewer_key);
        $dedupe_ttl = (int) apply_filters('magick_ad_track_dedupe_ttl', DAY_IN_SECONDS, $event);
        $should_dedupe = (bool) apply_filters('magick_ad_track_dedupe', $event === 'impression', $event);
        if ($should_dedupe && get_transient($dedupe_key)) {
            return rest_ensure_response(array('success' => true, 'deduped' => true));
        }
        if ($should_dedupe) {
            set_transient($dedupe_key, 1, $dedupe_ttl);
        }

        $impressions = $event === 'impression' ? 1 : 0;
        $clicks = $event === 'click' ? 1 : 0;

        $sql = $wpdb->prepare(
            "INSERT INTO {$table} (`date`, `ad_id`, `impressions`, `clicks`)
             VALUES (%s, %s, %d, %d)
             ON DUPLICATE KEY UPDATE
                impressions = impressions + VALUES(impressions),
                clicks = clicks + VALUES(clicks)",
            $date,
            $ad_id,
            $impressions,
            $clicks
        );

        $result = $wpdb->query($sql);

        if ($result === false) {
            return new WP_Error('magick_ad_db_error', 'DB insert failed', array('status' => 500));
        }

        $diagnostics_enabled = (get_option('magick_ad_stats_diagnostics', '0') === '1');
        $diagnostics_enabled = (bool) apply_filters('magick_ad_stats_diagnostics_enabled', $diagnostics_enabled);

        if ($diagnostics_enabled) {
            $log_table = $wpdb->prefix . 'magick_ad_stats_log';
            $log_exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $log_table));
            if ($log_exists === $log_table) {
                $wpdb->insert(
                    $log_table,
                    array(
                        'ad_id' => $ad_id,
                        'event_type' => $event,
                        'page_url' => $page_url,
                        'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT'])) : '',
                        'user_id' => $user_id,
                        'created_at' => current_time('mysql'),
                    ),
                    array('%s', '%s', '%s', '%s', '%d', '%s')
                );

                $cleanup_key = 'magick_ad_stats_log_cleanup';
                if (!get_transient($cleanup_key)) {
                    $retention_days = (int) apply_filters('magick_ad_stats_diagnostics_retention_days', 7);
                    $cutoff = date('Y-m-d H:i:s', current_time('timestamp') - $retention_days * DAY_IN_SECONDS);
                    $wpdb->query(
                        $wpdb->prepare(
                            "DELETE FROM {$log_table} WHERE created_at < %s",
                            $cutoff
                        )
                    );
                    set_transient($cleanup_key, 1, DAY_IN_SECONDS);
                }
            }
        }

        return rest_ensure_response(array('success' => true));
    }
}
