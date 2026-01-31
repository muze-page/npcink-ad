<?php

namespace MagickAD\REST\Controllers;

use WP_Error;
use WP_REST_Request;
use MagickAD\Data\Ads;

if (!defined('ABSPATH')) {
    exit;
}

final class Track_Controller {
    private static $known_ads = null;

    private static function has_consent(): bool {
        return (bool) apply_filters('magick_ad_has_consent', false);
    }

    private static function tracking_strategy(): string {
        $strategy = get_option('magick_ad_tracking_strategy', 'session');
        $strategy = is_string($strategy) ? $strategy : 'session';
        $strategy = in_array($strategy, array('request', 'session', 'cookie', 'user'), true)
            ? $strategy
            : 'session';
        return (string) apply_filters('magick_ad_tracking_strategy', $strategy);
    }

    private static function tracking_requires_consent(): bool {
        $requires = (get_option('magick_ad_tracking_require_consent', '0') === '1');
        return (bool) apply_filters('magick_ad_tracking_require_consent', $requires);
    }

    private static function get_track_secret(): string {
        $secret = get_option('magick_ad_track_secret', '');
        if (!is_string($secret) || $secret === '') {
            $secret = wp_generate_password(32, true, true);
            update_option('magick_ad_track_secret', $secret, false);
        }
        return (string) $secret;
    }

    private static function is_valid_signature(string $ad_id, string $sig, string $sig_ts): bool {
        if ($ad_id === '' || $sig === '' || $sig_ts === '') {
            return false;
        }
        if (!preg_match('/^\d{8}$/', $sig_ts)) {
            return false;
        }
        $secret = self::get_track_secret();
        $expected = hash_hmac('sha256', $ad_id . '|' . $sig_ts, $secret);
        if (!hash_equals($expected, $sig)) {
            return false;
        }
        $today = gmdate('Ymd', current_time('timestamp'));
        $yesterday = gmdate('Ymd', current_time('timestamp') - DAY_IN_SECONDS);
        return ($sig_ts === $today || $sig_ts === $yesterday);
    }

    private static function get_known_ad_ids(): array {
        if (self::$known_ads !== null) {
            return self::$known_ads;
        }
        $ads = Ads::get_ads();
        $map = array();
        foreach ($ads as $ad) {
            if (!empty($ad['id']) && is_string($ad['id'])) {
                $map[$ad['id']] = true;
            }
        }
        self::$known_ads = $map;
        return $map;
    }

    private static function is_known_ad_id(string $ad_id): bool {
        if ($ad_id === '') {
            return false;
        }
        $map = self::get_known_ad_ids();
        return isset($map[$ad_id]);
    }

    private static function get_request_ip(): string {
        $ip = '';
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $parts = explode(',', sanitize_text_field(wp_unslash($_SERVER['HTTP_X_FORWARDED_FOR'])));
            $ip = trim($parts[0]);
        }
        if ($ip === '' && !empty($_SERVER['REMOTE_ADDR'])) {
            $ip = sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR']));
        }
        $ip = apply_filters('magick_ad_track_client_ip', $ip);
        return is_string($ip) ? $ip : '';
    }

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
        $stats_ready = (string) get_option('magick_ad_stats_ready', '0');
        if ($stats_ready !== (string) MAGICK_AD_DB_VERSION) {
            $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
            if ($exists !== $table) {
                return new WP_Error('magick_ad_db_missing', 'Stats table missing', array('status' => 500));
            }
            update_option('magick_ad_stats_ready', (string) MAGICK_AD_DB_VERSION, false);
        }

        $ad_id = sanitize_text_field($payload['ad_id']);
        $sig = isset($payload['sig']) ? sanitize_text_field($payload['sig']) : '';
        $sig_ts = isset($payload['sig_ts']) ? sanitize_text_field($payload['sig_ts']) : '';
        $sig_valid = self::is_valid_signature($ad_id, $sig, $sig_ts);
        $allow_unsigned = (bool) apply_filters('magick_ad_track_allow_unsigned', false);
        $require_signature = (get_option('magick_ad_track_require_signature', '1') === '1');
        $require_signature = (bool) apply_filters('magick_ad_track_require_signature', $require_signature, $ad_id, $event);
        $known_ad = self::is_known_ad_id($ad_id);
        if (!$sig_valid) {
            if ($require_signature) {
                return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
            }
            if (!$allow_unsigned || !$known_ad) {
                return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
            }
        }

        $limit = (int) apply_filters('magick_ad_track_rate_limit', 60, $ad_id, $event);
        if ($limit > 0) {
            $ip = self::get_request_ip();
            $bucket = gmdate('YmdHi', current_time('timestamp'));
            $rate_key = 'magick_ad_rl_' . md5($ip . '|' . $ad_id . '|' . $event . '|' . $bucket);
            $count = (int) get_transient($rate_key);
            if ($count >= $limit) {
                return rest_ensure_response(array('success' => true, 'rate_limited' => true));
            }
            set_transient($rate_key, $count + 1, MINUTE_IN_SECONDS + 5);
        }

        $date = current_time('Y-m-d');
        $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '';
        $page_url = isset($payload['page_url']) ? esc_url_raw($payload['page_url']) : '';
        $page_hash_source = $page_url ? $page_url : esc_url_raw(home_url($request_uri));
        $page_hash = '';
        if (isset($payload['page_hash']) && is_string($payload['page_hash'])) {
            $page_hash = sanitize_text_field($payload['page_hash']);
        }
        if ($page_hash === '') {
            $page_hash = md5($page_hash_source);
        }

        $user_id = get_current_user_id();
        $has_consent = self::has_consent();
        if (self::tracking_requires_consent() && !$has_consent) {
            return rest_ensure_response(array('success' => true, 'blocked' => true));
        }

        $strategy = self::tracking_strategy();
        if ($strategy === 'cookie' && !$has_consent) {
            $strategy = 'session';
        }

        $viewer_key = '';
        $session_id = '';
        if (isset($payload['session_id']) && is_string($payload['session_id'])) {
            $session_id = sanitize_text_field($payload['session_id']);
        }

        if ($strategy === 'session' && $session_id) {
            $viewer_key = 's:' . $session_id;
        } elseif ($strategy === 'user' && $user_id) {
            $viewer_key = 'u:' . $user_id;
        } elseif ($strategy === 'cookie') {
            if (!isset($_COOKIE['magick_ad_uid']) || !is_string($_COOKIE['magick_ad_uid'])) {
                $uid = wp_generate_uuid4();
                setcookie('magick_ad_uid', $uid, time() + MONTH_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
                $_COOKIE['magick_ad_uid'] = $uid;
            }
            if (isset($_COOKIE['magick_ad_uid']) && is_string($_COOKIE['magick_ad_uid'])) {
                $viewer_key = 'c:' . sanitize_text_field(wp_unslash($_COOKIE['magick_ad_uid']));
            }
        }

        if ($strategy === 'request' || $viewer_key === '') {
            $viewer_key = 'r:' . wp_generate_uuid4();
        }

        $dedupe_key = 'magick_ad_track_' . md5($ad_id . '|' . $event . '|' . $date . '|' . $page_hash . '|' . $viewer_key);
        $dedupe_ttl = (int) get_option('magick_ad_track_dedupe_ttl', DAY_IN_SECONDS);
        $dedupe_ttl = max(60, min($dedupe_ttl, WEEK_IN_SECONDS));
        $dedupe_ttl = (int) apply_filters('magick_ad_track_dedupe_ttl', $dedupe_ttl, $event);
        $should_dedupe = (bool) apply_filters('magick_ad_track_dedupe', $event === 'impression', $event);
        if ($strategy === 'request') {
            $should_dedupe = false;
        } elseif ($strategy === 'session' && !$session_id) {
            $should_dedupe = false;
        }
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
        $diagnostics_expires_at = (int) get_option('magick_ad_stats_diagnostics_expires_at', 0);
        if ($diagnostics_enabled && $diagnostics_expires_at > 0 && current_time('timestamp') >= $diagnostics_expires_at) {
            update_option('magick_ad_stats_diagnostics', '0');
            update_option('magick_ad_stats_diagnostics_expires_at', 0);
            $diagnostics_enabled = false;
        }
        $diagnostics_enabled = (bool) apply_filters('magick_ad_stats_diagnostics_enabled', $diagnostics_enabled);

        if ($diagnostics_enabled) {
            $log_table = $wpdb->prefix . 'magick_ad_stats_log';
            $log_ready = (string) get_option('magick_ad_stats_log_ready', '0');
            if ($log_ready !== (string) MAGICK_AD_DB_VERSION) {
                $log_exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $log_table));
                if ($log_exists !== $log_table) {
                    return rest_ensure_response(array('success' => true));
                }
                update_option('magick_ad_stats_log_ready', (string) MAGICK_AD_DB_VERSION, false);
                $log_ready = (string) MAGICK_AD_DB_VERSION;
            }
            if ($log_ready === (string) MAGICK_AD_DB_VERSION) {
                $wpdb->insert(
                    $log_table,
                    array(
                        'ad_id' => $ad_id,
                        'event_type' => $event,
                        'page_url' => $page_url ? $page_url : $page_hash_source,
                        'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT'])) : '',
                        'user_id' => $user_id,
                        'created_at' => current_time('mysql'),
                    ),
                    array('%s', '%s', '%s', '%s', '%d', '%s')
                );

                $cleanup_key = 'magick_ad_stats_log_cleanup';
                if (!get_transient($cleanup_key)) {
                    $retention_days = (int) get_option('magick_ad_stats_diagnostics_retention_days', 7);
                    $retention_days = max(1, min($retention_days, 90));
                    $retention_days = (int) apply_filters('magick_ad_stats_diagnostics_retention_days', $retention_days);
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
