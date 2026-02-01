<?php

namespace MagickAD\REST\Controllers;

use WP_Error;
use WP_REST_Request;
use MagickAD\Data\Ads;
use MagickAD\Utils\TrackingStrategy;
use MagickAD\Utils\Tracking_Signature;

if (!defined('ABSPATH')) {
    exit;
}

final class Track_Controller {
    private const CACHE_GROUP = 'magick_ad';
    private const KNOWN_ADS_CACHE_KEY = 'magick_ad_known_ads';
    private const KNOWN_ADS_CACHE_TTL = 120;

    private const OPTION_TRACK_STRATEGY = 'magick_ad_tracking_strategy';
    private const OPTION_TRACK_REQUIRE_CONSENT = 'magick_ad_tracking_require_consent';
    private const OPTION_TRACK_REQUIRE_SIGNATURE = 'magick_ad_track_require_signature';
    private const OPTION_TRACK_DEDUPE_TTL = 'magick_ad_track_dedupe_ttl';
    private const OPTION_STATS_READY = 'magick_ad_stats_ready';
    private const OPTION_LOG_READY = 'magick_ad_stats_log_ready';
    private const OPTION_DIM_READY = 'magick_ad_stats_dim_ready';
    private const OPTION_DIAGNOSTICS_ENABLED = 'magick_ad_stats_diagnostics';
    private const OPTION_DIAGNOSTICS_EXPIRES = 'magick_ad_stats_diagnostics_expires_at';
    private const OPTION_DIAGNOSTICS_RETENTION = 'magick_ad_stats_diagnostics_retention_days';

    private static ?array $known_ads = null;

    public static function track(WP_REST_Request $request) {
        $payload = self::parse_payload($request);
        if (is_wp_error($payload)) {
            return $payload;
        }

        $ready = self::ensure_stats_ready();
        if (is_wp_error($ready)) {
            return $ready;
        }

        $signature_error = self::validate_signature(
            $payload['ad_id'],
            $payload['sig'],
            $payload['sig_ts'],
            $payload['event']
        );
        if (is_wp_error($signature_error)) {
            return $signature_error;
        }

        $rate_limited = self::apply_rate_limit($payload['ad_id'], $payload['event']);
        if ($rate_limited) {
            return $rate_limited;
        }

        $has_consent = self::has_consent();
        if (self::tracking_requires_consent() && !$has_consent) {
            return rest_ensure_response(array('success' => true, 'blocked' => true));
        }

        $strategy = self::tracking_strategy();
        if ($strategy === 'cookie' && !$has_consent) {
            $strategy = 'session';
        }

        $page_hash_source = self::resolve_page_hash_source($payload['page_url']);
        $page_hash = self::resolve_page_hash($payload['page_hash'], $page_hash_source);

        $viewer_key = self::build_viewer_key($strategy, $payload['session_id'], $has_consent);
        if ($viewer_key === '') {
            $viewer_key = 'r:' . wp_generate_uuid4();
        }

        $dedupe_key = 'magick_ad_track_' . md5($payload['ad_id'] . '|' . $payload['event'] . '|' . $payload['date'] . '|' . $page_hash . '|' . $viewer_key);
        $should_dedupe = self::should_dedupe($strategy, $payload['session_id'], $payload['event']);
        if ($should_dedupe && get_transient($dedupe_key)) {
            return rest_ensure_response(array('success' => true, 'deduped' => true));
        }
        if ($should_dedupe) {
            set_transient($dedupe_key, 1, self::get_dedupe_ttl($payload['event']));
        }

        $written = self::write_stats(
            $payload['ad_id'],
            $payload['event'],
            $payload['date']
        );
        if (is_wp_error($written)) {
            return $written;
        }

        $dim_written = self::write_dimension_stats(
            $payload['ad_id'],
            $payload['event'],
            $payload['date'],
            $payload['slot'],
            $payload['position'],
            $payload['container']
        );
        if (is_wp_error($dim_written)) {
            return $dim_written;
        }

        if (self::diagnostics_enabled()) {
            self::write_log(
                $payload['ad_id'],
                $payload['event'],
                $payload['page_url'] ?: $page_hash_source,
                $payload['user_id']
            );
        }

        return rest_ensure_response(array('success' => true));
    }

    private static function parse_payload(WP_REST_Request $request): array|WP_Error {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('magick_ad_invalid_payload', 'Invalid payload', array('status' => 400));
        }

        $ad_id = isset($payload['ad_id']) ? sanitize_text_field($payload['ad_id']) : '';
        $event = isset($payload['event']) ? self::normalize_event($payload['event']) : null;
        if ($ad_id === '' || $event === null) {
            return new WP_Error('magick_ad_invalid_payload', 'Invalid payload', array('status' => 400));
        }

        $sig = isset($payload['sig']) ? sanitize_text_field($payload['sig']) : '';
        $sig_ts = isset($payload['sig_ts']) ? sanitize_text_field($payload['sig_ts']) : '';
        $session_id = isset($payload['session_id']) ? sanitize_text_field($payload['session_id']) : '';
        $page_url = isset($payload['page_url']) ? esc_url_raw($payload['page_url']) : '';
        $page_hash = isset($payload['page_hash']) ? sanitize_text_field($payload['page_hash']) : '';
        $slot = isset($payload['slot']) ? self::sanitize_dimension($payload['slot']) : '';
        $position = isset($payload['position']) ? self::sanitize_dimension($payload['position']) : '';
        $container = isset($payload['container']) ? self::sanitize_container($payload['container']) : '';

        return array(
            'ad_id' => $ad_id,
            'event' => $event,
            'sig' => $sig,
            'sig_ts' => $sig_ts,
            'session_id' => $session_id,
            'page_url' => $page_url,
            'page_hash' => $page_hash,
            'slot' => $slot,
            'position' => $position,
            'container' => $container,
            'date' => current_time('Y-m-d'),
            'user_id' => get_current_user_id(),
        );
    }

    private static function normalize_event(string $event): ?string {
        $event = sanitize_text_field($event);
        return match ($event) {
            'impression', 'click' => $event,
            default => null,
        };
    }

    private static function sanitize_dimension(mixed $value): string {
        $value = is_scalar($value) ? (string) $value : '';
        $value = sanitize_text_field($value);
        if ($value === '') {
            return '';
        }
        return substr($value, 0, 191);
    }

    private static function sanitize_container(mixed $value): string {
        $value = self::sanitize_dimension($value);
        return in_array($value, array('inline', 'popup', 'banner', 'floating', 'interstitial'), true)
            ? $value
            : '';
    }

    private static function tracking_strategy(): string {
        $strategy = TrackingStrategy::from_value(get_option(self::OPTION_TRACK_STRATEGY, 'session'))->value;
        $strategy = (string) apply_filters('magick_ad_tracking_strategy', $strategy);
        return TrackingStrategy::from_value($strategy)->value;
    }

    private static function tracking_requires_consent(): bool {
        $requires = (get_option(self::OPTION_TRACK_REQUIRE_CONSENT, '0') === '1');
        return (bool) apply_filters('magick_ad_tracking_require_consent', $requires);
    }

    private static function has_consent(): bool {
        return (bool) apply_filters('magick_ad_has_consent', false);
    }

    private static function is_valid_signature(string $ad_id, string $sig, string $sig_ts): bool {
        return Tracking_Signature::is_valid($ad_id, $sig, $sig_ts);
    }

    private static function get_known_ad_ids(): array {
        if (self::$known_ads !== null) {
            return self::$known_ads;
        }

        $cached = wp_cache_get(self::KNOWN_ADS_CACHE_KEY, self::CACHE_GROUP);
        if (is_array($cached)) {
            self::$known_ads = $cached;
            return $cached;
        }

        $stored = get_option(Ads::KNOWN_ADS_OPTION, array());
        $map = array();
        if (is_array($stored)) {
            foreach ($stored as $key => $value) {
                if (is_string($key) && $key !== '') {
                    $map[$key] = true;
                    continue;
                }
                if (is_string($value) && $value !== '') {
                    $map[$value] = true;
                }
            }
        }

        if (empty($map)) {
            $ads = Ads::get_ads();
            foreach ($ads as $ad) {
                if (!empty($ad['id']) && is_string($ad['id'])) {
                    $map[$ad['id']] = true;
                }
            }
            update_option(Ads::KNOWN_ADS_OPTION, $map, false);
        }

        wp_cache_set(
            self::KNOWN_ADS_CACHE_KEY,
            $map,
            self::CACHE_GROUP,
            self::KNOWN_ADS_CACHE_TTL
        );
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
        $ip = is_string($ip) ? $ip : '';
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '';
    }

    private static function apply_rate_limit(string $ad_id, string $event) {
        $limit = (int) apply_filters('magick_ad_track_rate_limit', 60, $ad_id, $event);
        if ($limit <= 0) {
            return null;
        }
        $ip = self::get_request_ip();
        $bucket = gmdate('YmdHi', current_time('timestamp'));
        $rate_key = 'magick_ad_rl_' . md5($ip . '|' . $ad_id . '|' . $event . '|' . $bucket);
        $count = (int) get_transient($rate_key);
        if ($count >= $limit) {
            return rest_ensure_response(array('success' => true, 'rate_limited' => true));
        }
        set_transient($rate_key, $count + 1, MINUTE_IN_SECONDS + 5);
        return null;
    }

    private static function validate_signature(string $ad_id, string $sig, string $sig_ts, string $event): WP_Error|true {
        $sig_valid = self::is_valid_signature($ad_id, $sig, $sig_ts);
        $allow_unsigned = (bool) apply_filters('magick_ad_track_allow_unsigned', false);
        $require_signature = (get_option(self::OPTION_TRACK_REQUIRE_SIGNATURE, '1') === '1');
        $require_signature = (bool) apply_filters('magick_ad_track_require_signature', $require_signature, $ad_id, $event);

        if ($sig_valid) {
            return true;
        }

        if ($require_signature) {
            return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
        }

        if (!$allow_unsigned) {
            return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
        }

        $known_ad = self::is_known_ad_id($ad_id);
        if (!$known_ad) {
            return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
        }

        return true;
    }

    private static function resolve_page_hash_source(string $page_url): string {
        $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '';
        $request_uri = is_string($request_uri) ? $request_uri : '';
        return $page_url ? $page_url : esc_url_raw(home_url($request_uri));
    }

    private static function resolve_page_hash(string $page_hash, string $source): string {
        if ($page_hash !== '') {
            return $page_hash;
        }
        return md5($source);
    }

    private static function build_viewer_key(string $strategy, string $session_id, bool $has_consent): string {
        $user_id = get_current_user_id();
        return match ($strategy) {
            'session' => $session_id ? 's:' . $session_id : '',
            'user' => $user_id ? 'u:' . $user_id : '',
            'cookie' => $has_consent ? self::get_cookie_viewer_key() : '',
            default => '',
        };
    }

    private static function get_cookie_viewer_key(): string {
        if (!isset($_COOKIE['magick_ad_uid']) || !is_string($_COOKIE['magick_ad_uid'])) {
            $uid = wp_generate_uuid4();
            setcookie(
                name: 'magick_ad_uid',
                value: $uid,
                options: array(
                    'expires' => time() + MONTH_IN_SECONDS,
                    'path' => COOKIEPATH,
                    'domain' => COOKIE_DOMAIN,
                    'secure' => is_ssl(),
                    'httponly' => true,
                    'samesite' => 'Lax',
                )
            );
            $_COOKIE['magick_ad_uid'] = $uid;
        }
        return isset($_COOKIE['magick_ad_uid']) && is_string($_COOKIE['magick_ad_uid'])
            ? 'c:' . sanitize_text_field(wp_unslash($_COOKIE['magick_ad_uid']))
            : '';
    }

    private static function should_dedupe(string $strategy, string $session_id, string $event): bool {
        $should_dedupe = (bool) apply_filters('magick_ad_track_dedupe', $event === 'impression', $event);
        if ($strategy === 'request') {
            return false;
        }
        if ($strategy === 'session' && $session_id === '') {
            return false;
        }
        return $should_dedupe;
    }

    private static function get_dedupe_ttl(string $event): int {
        $dedupe_ttl = (int) get_option(self::OPTION_TRACK_DEDUPE_TTL, DAY_IN_SECONDS);
        $dedupe_ttl = max(60, min($dedupe_ttl, WEEK_IN_SECONDS));
        return (int) apply_filters('magick_ad_track_dedupe_ttl', $dedupe_ttl, $event);
    }

    private static function ensure_stats_ready(): WP_Error|true {
        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats';
        $stats_ready = (string) get_option(self::OPTION_STATS_READY, '0');
        if ($stats_ready === (string) MAGICK_AD_DB_VERSION) {
            return true;
        }
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            return new WP_Error('magick_ad_db_missing', 'Stats table missing', array('status' => 500));
        }
        update_option(self::OPTION_STATS_READY, (string) MAGICK_AD_DB_VERSION, false);
        return true;
    }

    private static function ensure_log_ready(): bool {
        global $wpdb;
        $log_table = $wpdb->prefix . 'magick_ad_stats_log';
        $log_ready = (string) get_option(self::OPTION_LOG_READY, '0');
        if ($log_ready === (string) MAGICK_AD_DB_VERSION) {
            return true;
        }
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $log_table));
        if ($exists !== $log_table) {
            return false;
        }
        update_option(self::OPTION_LOG_READY, (string) MAGICK_AD_DB_VERSION, false);
        return true;
    }

    private static function ensure_dim_ready(): bool {
        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats_dim';
        $dim_ready = (string) get_option(self::OPTION_DIM_READY, '0');
        if ($dim_ready === (string) MAGICK_AD_DB_VERSION) {
            return true;
        }
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            return false;
        }
        update_option(self::OPTION_DIM_READY, (string) MAGICK_AD_DB_VERSION, false);
        return true;
    }

    private static function write_stats(string $ad_id, string $event, string $date): WP_Error|true {
        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats';
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

        return true;
    }

    private static function write_dimension_stats(
        string $ad_id,
        string $event,
        string $date,
        string $slot,
        string $position,
        string $container
    ): WP_Error|true {
        if (!self::ensure_dim_ready()) {
            return true;
        }
        if ($slot === '' && $position === '' && $container === '') {
            return true;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats_dim';
        $impressions = $event === 'impression' ? 1 : 0;
        $clicks = $event === 'click' ? 1 : 0;

        $sql = $wpdb->prepare(
            "INSERT INTO {$table} (`date`, `ad_id`, `slot`, `position`, `container`, `impressions`, `clicks`)\n             VALUES (%s, %s, %s, %s, %s, %d, %d)\n             ON DUPLICATE KEY UPDATE\n                impressions = impressions + VALUES(impressions),\n                clicks = clicks + VALUES(clicks)",
            $date,
            $ad_id,
            $slot,
            $position,
            $container,
            $impressions,
            $clicks
        );

        $result = $wpdb->query($sql);
        if ($result === false) {
            return new WP_Error('magick_ad_db_error', 'DB insert failed', array('status' => 500));
        }

        return true;
    }

    private static function diagnostics_enabled(): bool {
        $enabled = (get_option(self::OPTION_DIAGNOSTICS_ENABLED, '0') === '1');
        $expires_at = (int) get_option(self::OPTION_DIAGNOSTICS_EXPIRES, 0);
        if ($enabled && $expires_at > 0 && current_time('timestamp') >= $expires_at) {
            update_option(self::OPTION_DIAGNOSTICS_ENABLED, '0');
            update_option(self::OPTION_DIAGNOSTICS_EXPIRES, 0);
            $enabled = false;
        }
        return (bool) apply_filters('magick_ad_stats_diagnostics_enabled', $enabled);
    }

    private static function write_log(string $ad_id, string $event, string $page_url, int $user_id): void {
        if (!self::ensure_log_ready()) {
            return;
        }

        global $wpdb;
        $log_table = $wpdb->prefix . 'magick_ad_stats_log';

        $wpdb->insert(
            $log_table,
            array(
                'ad_id' => $ad_id,
                'event_type' => $event,
                'page_url' => $page_url,
                'user_agent' => isset($_SERVER['HTTP_USER_AGENT'])
                    ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT']))
                    : '',
                'user_id' => $user_id,
                'created_at' => current_time('mysql'),
            ),
            array('%s', '%s', '%s', '%s', '%d', '%s')
        );

        $cleanup_key = 'magick_ad_stats_log_cleanup';
        if (!get_transient($cleanup_key)) {
            $retention_days = (int) get_option(self::OPTION_DIAGNOSTICS_RETENTION, 7);
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
