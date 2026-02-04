<?php

namespace MagickAD\REST\Controllers;

use WP_Error;
use WP_REST_Request;
use MagickAD\Data\Ads;
use MagickAD\Data\Schema;
use MagickAD\Data\Slots;
use MagickAD\Utils\TrackingStrategy;
use MagickAD\Utils\Tracking_Signature;
use MagickAD\Utils\Stats_Accumulator;

if (!defined('ABSPATH')) {
    exit;
}

final class Track_Controller {
    private const CACHE_GROUP = 'magick_ad';
    private const KNOWN_ADS_CACHE_KEY = 'magick_ad_known_ads';
    private const KNOWN_ADS_CACHE_TTL = 120;
    private const MAX_AD_ID_LENGTH = 64;
    private const MAX_EVENT_LENGTH = 32;
    private const MAX_SIG_LENGTH = 64;
    private const MAX_SIG_TS_LENGTH = 16;
    private const MAX_SIG_REV_LENGTH = 16;
    private const MAX_SESSION_ID_LENGTH = 64;
    private const MAX_VARIANT_ID_LENGTH = 64;
    private const MAX_PAGE_URL_LENGTH = 255;
    private const MAX_PAGE_HASH_LENGTH = 128;

    private const OPTION_TRACK_STRATEGY = 'magick_ad_tracking_strategy';
    private const OPTION_TRACK_REQUIRE_CONSENT = 'magick_ad_tracking_require_consent';
    private const OPTION_TRACK_REQUIRE_SIGNATURE = 'magick_ad_track_require_signature';
    private const OPTION_TRACK_DEDUPE_TTL = 'magick_ad_track_dedupe_ttl';
    private const OPTION_STATS_READY = 'magick_ad_stats_ready';
    private const OPTION_LOG_READY = 'magick_ad_stats_log_ready';
    private const OPTION_DIM_READY = 'magick_ad_stats_dim_ready';
    private const OPTION_VARIANT_READY = 'magick_ad_stats_variant_ready';
    private const OPTION_EVENT_READY = 'magick_ad_stats_event_ready';
    private const OPTION_DIAGNOSTICS_ENABLED = 'magick_ad_stats_diagnostics';
    private const OPTION_DIAGNOSTICS_EXPIRES = 'magick_ad_stats_diagnostics_expires_at';
    private const OPTION_DIAGNOSTICS_RETENTION = 'magick_ad_stats_diagnostics_retention_days';

    private static ?array $known_ads = null;
    private static ?array $slot_allowlist = null;

    public static function track(WP_REST_Request $request) {
        $body_limit = self::get_body_limit();
        if ($body_limit > 0 && self::is_request_too_large($request, $body_limit)) {
            return new WP_Error('magick_ad_payload_too_large', 'Payload too large', array('status' => 413));
        }

        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('magick_ad_invalid_payload', 'Invalid payload', array('status' => 400));
        }

        $ready = self::ensure_stats_ready();
        if (is_wp_error($ready)) {
            return $ready;
        }

        if (isset($payload['items']) && is_array($payload['items'])) {
            return self::track_batch($payload);
        }

        $item = self::parse_payload_item($payload, array());
        if (is_wp_error($item)) {
            return $item;
        }

        $result = self::process_item($item);
        if (is_wp_error($result)) {
            return $result;
        }

        return rest_ensure_response($result);
    }

    private static function parse_payload_defaults(array $payload): array {
        $defaults = array();

        if (isset($payload['session_id'])) {
            $defaults['session_id'] = self::sanitize_short_text(
                (string) $payload['session_id'],
                self::MAX_SESSION_ID_LENGTH
            );
        }
        if (isset($payload['page_url'])) {
            $defaults['page_url'] = self::sanitize_page_url((string) $payload['page_url']);
        }
        if (isset($payload['page_hash'])) {
            $defaults['page_hash'] = self::sanitize_short_text(
                (string) $payload['page_hash'],
                self::MAX_PAGE_HASH_LENGTH
            );
        }

        return $defaults;
    }

    private static function parse_payload_item(array $payload, array $defaults): array|WP_Error {
        $payload = array_merge($defaults, $payload);

        $ad_id = isset($payload['ad_id'])
            ? self::sanitize_short_text((string) $payload['ad_id'], self::MAX_AD_ID_LENGTH)
            : '';
        $event = isset($payload['event']) ? self::normalize_event($payload['event']) : null;
        if ($ad_id === '' || $event === null) {
            return new WP_Error('magick_ad_invalid_payload', 'Invalid payload', array('status' => 400));
        }

        $sig = isset($payload['sig'])
            ? self::sanitize_short_text((string) $payload['sig'], self::MAX_SIG_LENGTH)
            : '';
        $sig_ts = isset($payload['sig_ts'])
            ? self::sanitize_short_text((string) $payload['sig_ts'], self::MAX_SIG_TS_LENGTH)
            : '';
        $sig_rev = isset($payload['sig_rev'])
            ? self::sanitize_short_text((string) $payload['sig_rev'], self::MAX_SIG_REV_LENGTH)
            : '';
        $session_id = isset($payload['session_id'])
            ? self::sanitize_short_text((string) $payload['session_id'], self::MAX_SESSION_ID_LENGTH)
            : '';
        $page_url = isset($payload['page_url']) ? self::sanitize_page_url((string) $payload['page_url']) : '';
        $page_hash = isset($payload['page_hash'])
            ? self::sanitize_short_text((string) $payload['page_hash'], self::MAX_PAGE_HASH_LENGTH)
            : '';
        $slot = isset($payload['slot']) ? self::sanitize_slot($payload['slot']) : '';
        $position = isset($payload['position']) ? self::sanitize_position($payload['position']) : '';
        $container = isset($payload['container']) ? self::sanitize_container($payload['container']) : '';
        $variant_id = isset($payload['variant_id'])
            ? self::sanitize_short_text((string) $payload['variant_id'], self::MAX_VARIANT_ID_LENGTH)
            : '';

        return array(
            'ad_id' => $ad_id,
            'event' => $event,
            'sig' => $sig,
            'sig_ts' => $sig_ts,
            'sig_rev' => $sig_rev,
            'session_id' => $session_id,
            'page_url' => $page_url,
            'page_hash' => $page_hash,
            'slot' => $slot,
            'position' => $position,
            'container' => $container,
            'variant_id' => $variant_id,
            'date' => current_time('Y-m-d'),
            'user_id' => get_current_user_id(),
        );
    }

    private static function get_body_limit(): int {
        $limit = (int) apply_filters('magick_ad_track_body_limit', 131072);
        return max(0, $limit);
    }

    private static function is_request_too_large(WP_REST_Request $request, int $limit): bool {
        $length = $request->get_header('content-length');
        if ($length === '' && isset($_SERVER['CONTENT_LENGTH'])) {
            $length = (string) $_SERVER['CONTENT_LENGTH'];
        }
        if (is_numeric($length)) {
            return (int) $length > $limit;
        }
        $body = $request->get_body();
        if ($body !== '') {
            return strlen($body) > $limit;
        }
        return false;
    }

    private static function sanitize_short_text(string $value, int $max): string {
        $value = sanitize_text_field($value);
        if ($max > 0 && strlen($value) > $max) {
            return substr($value, 0, $max);
        }
        return $value;
    }

    private static function sanitize_page_url(string $value): string {
        $value = esc_url_raw($value);
        if ($value === '') {
            return '';
        }
        if (strlen($value) > self::MAX_PAGE_URL_LENGTH) {
            return substr($value, 0, self::MAX_PAGE_URL_LENGTH);
        }
        return $value;
    }

    private static function track_batch(array $payload) {
        $items = isset($payload['items']) && is_array($payload['items']) ? $payload['items'] : array();
        if (empty($items)) {
            return new WP_Error('magick_ad_invalid_payload', 'Invalid payload', array('status' => 400));
        }

        $limit = (int) apply_filters('magick_ad_track_batch_limit', 20);
        if ($limit < 1) {
            $limit = 1;
        }
        if (count($items) > $limit) {
            $items = array_slice($items, 0, $limit);
        }

        $defaults = self::parse_payload_defaults($payload);
        $results = array();
        $processed = 0;
        $errors = 0;
        $stats_agg = array();
        $dim_agg = array();
        $variant_agg = array();
        $event_agg = array();
        $log_rows = array();

        foreach ($items as $item) {
            $item = is_array($item) ? $item : array();
            $parsed = self::parse_payload_item($item, $defaults);
            if (is_wp_error($parsed)) {
                $errors += 1;
                $results[] = array(
                    'success' => false,
                    'error' => $parsed->get_error_code(),
                );
                continue;
            }

            $result = self::collect_item($parsed, $stats_agg, $dim_agg, $variant_agg, $event_agg, $log_rows);
            if (is_wp_error($result)) {
                $errors += 1;
                $status = $result->get_error_data()['status'] ?? 500;
                if ($status >= 500) {
                    return $result;
                }
                $results[] = array(
                    'success' => false,
                    'ad_id' => $parsed['ad_id'],
                    'event' => $parsed['event'],
                    'error' => $result->get_error_code(),
                );
                continue;
            }

            $processed += 1;
            $results[] = array_merge(
                array(
                    'success' => true,
                    'ad_id' => $parsed['ad_id'],
                    'event' => $parsed['event'],
                ),
                $result
            );
        }

        $written = self::write_stats_bulk($stats_agg);
        if (is_wp_error($written)) {
            return $written;
        }

        $dim_written = self::write_dimension_stats_bulk($dim_agg);
        if (is_wp_error($dim_written)) {
            return $dim_written;
        }

        $variant_written = self::write_variant_stats_bulk($variant_agg);
        if (is_wp_error($variant_written)) {
            return $variant_written;
        }

        $event_written = self::write_event_stats_bulk($event_agg);
        if (is_wp_error($event_written)) {
            return $event_written;
        }

        if (self::diagnostics_enabled()) {
            self::write_logs_bulk($log_rows);
        }

        return rest_ensure_response(array(
            'success' => true,
            'processed' => $processed,
            'errors' => $errors,
            'items' => $results,
        ));
    }

    private static function collect_item(
        array $payload,
        array &$stats_agg,
        array &$dim_agg,
        array &$variant_agg,
        array &$event_agg,
        array &$log_rows
    ): array|WP_Error {
        $signature_error = self::validate_signature(
            $payload['ad_id'],
            $payload['sig'],
            $payload['sig_ts'],
            $payload['sig_rev'],
            $payload['event'],
            $payload['slot'],
            $payload['position'],
            $payload['container']
        );
        if (is_wp_error($signature_error)) {
            return $signature_error;
        }

        $rate_limited = self::apply_rate_limit($payload['ad_id'], $payload['event']);
        if ($rate_limited) {
            return array('success' => true, 'rate_limited' => true);
        }

        $has_consent = self::has_consent();
        if (self::tracking_requires_consent() && !$has_consent) {
            self::record_track_failure('no_consent');
            return array('success' => true, 'blocked' => true);
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

        $dedupe_scope = self::get_dedupe_scope();
        $dedupe_parts = array(
            $payload['ad_id'],
            $payload['event'],
            $payload['date'],
            $page_hash,
            $viewer_key,
        );
        if ($dedupe_scope === 'placement') {
            $dedupe_parts[] = $payload['slot'];
            $dedupe_parts[] = $payload['position'];
            $dedupe_parts[] = $payload['container'];
        }
        $dedupe_key = 'magick_ad_track_' . md5(implode('|', $dedupe_parts));
        $should_dedupe = self::should_dedupe($strategy, $payload['session_id'], $payload['event']);
        if ($should_dedupe && !self::should_use_persistent_cache()) {
            $should_dedupe = false;
        }
        if ($should_dedupe && get_transient($dedupe_key)) {
            self::record_track_failure('deduped');
            return array('success' => true, 'deduped' => true);
        }
        if ($should_dedupe) {
            set_transient($dedupe_key, 1, self::get_dedupe_ttl($payload['event']));
        }

        if (self::is_countable_event($payload['event'])) {
            $stats_key = $payload['date'] . '|' . $payload['ad_id'];
            if (!isset($stats_agg[$stats_key])) {
                $stats_agg[$stats_key] = array(
                    'date' => $payload['date'],
                    'ad_id' => $payload['ad_id'],
                    'impressions' => 0,
                    'clicks' => 0,
                );
            }
            if ($payload['event'] === 'click') {
                $stats_agg[$stats_key]['clicks'] += 1;
            } else {
                $stats_agg[$stats_key]['impressions'] += 1;
            }

            if (!($payload['slot'] === '' && $payload['position'] === '' && $payload['container'] === '')) {
                $dim_key = implode('|', array(
                    $payload['date'],
                    $payload['ad_id'],
                    $payload['slot'],
                    $payload['position'],
                    $payload['container'],
                ));
                if (!isset($dim_agg[$dim_key])) {
                    $dim_agg[$dim_key] = array(
                        'date' => $payload['date'],
                        'ad_id' => $payload['ad_id'],
                        'slot' => $payload['slot'],
                        'position' => $payload['position'],
                        'container' => $payload['container'],
                        'impressions' => 0,
                        'clicks' => 0,
                    );
                }
                if ($payload['event'] === 'click') {
                    $dim_agg[$dim_key]['clicks'] += 1;
                } else {
                    $dim_agg[$dim_key]['impressions'] += 1;
                }
            }

            if (!empty($payload['variant_id'])) {
                $variant_key = implode('|', array(
                    $payload['date'],
                    $payload['ad_id'],
                    $payload['variant_id'],
                ));
                if (!isset($variant_agg[$variant_key])) {
                    $variant_agg[$variant_key] = array(
                        'date' => $payload['date'],
                        'ad_id' => $payload['ad_id'],
                        'variant_id' => $payload['variant_id'],
                        'impressions' => 0,
                        'clicks' => 0,
                    );
                }
                if ($payload['event'] === 'click') {
                    $variant_agg[$variant_key]['clicks'] += 1;
                } else {
                    $variant_agg[$variant_key]['impressions'] += 1;
                }
            }
        }

        if (self::should_record_event($payload['event'])) {
            $event_key = implode('|', array(
                $payload['date'],
                $payload['ad_id'],
                $payload['event'],
                $payload['variant_id'] ?: '',
            ));
            if (!isset($event_agg[$event_key])) {
                $event_agg[$event_key] = array(
                    'date' => $payload['date'],
                    'ad_id' => $payload['ad_id'],
                    'event' => $payload['event'],
                    'variant_id' => $payload['variant_id'] ?: '',
                    'count' => 0,
                );
            }
            $event_agg[$event_key]['count'] += 1;
        }

        if (self::diagnostics_enabled()) {
            $log_rows[] = array(
                'ad_id' => $payload['ad_id'],
                'event' => $payload['event'],
                'page_url' => $payload['page_url'] ?: $page_hash_source,
                'user_id' => $payload['user_id'],
            );
        }

        return array('success' => true);
    }

    private static function process_item(array $payload): array|WP_Error {
        $signature_error = self::validate_signature(
            $payload['ad_id'],
            $payload['sig'],
            $payload['sig_ts'],
            $payload['sig_rev'],
            $payload['event'],
            $payload['slot'],
            $payload['position'],
            $payload['container']
        );
        if (is_wp_error($signature_error)) {
            return $signature_error;
        }

        $rate_limited = self::apply_rate_limit($payload['ad_id'], $payload['event']);
        if ($rate_limited) {
            return array('success' => true, 'rate_limited' => true);
        }

        $has_consent = self::has_consent();
        if (self::tracking_requires_consent() && !$has_consent) {
            self::record_track_failure('no_consent');
            return array('success' => true, 'blocked' => true);
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

        $dedupe_scope = self::get_dedupe_scope();
        $dedupe_parts = array(
            $payload['ad_id'],
            $payload['event'],
            $payload['date'],
            $page_hash,
            $viewer_key,
        );
        if ($dedupe_scope === 'placement') {
            $dedupe_parts[] = $payload['slot'];
            $dedupe_parts[] = $payload['position'];
            $dedupe_parts[] = $payload['container'];
        }
        $dedupe_key = 'magick_ad_track_' . md5(implode('|', $dedupe_parts));
        $should_dedupe = self::should_dedupe($strategy, $payload['session_id'], $payload['event']);
        if ($should_dedupe && !self::should_use_persistent_cache()) {
            $should_dedupe = false;
        }
        if ($should_dedupe && get_transient($dedupe_key)) {
            self::record_track_failure('deduped');
            return array('success' => true, 'deduped' => true);
        }
        if ($should_dedupe) {
            set_transient($dedupe_key, 1, self::get_dedupe_ttl($payload['event']));
        }

        if (self::is_countable_event($payload['event'])) {
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

            if (!empty($payload['variant_id'])) {
                $variant_written = self::write_variant_stats(
                    $payload['ad_id'],
                    $payload['variant_id'],
                    $payload['event'],
                    $payload['date']
                );
                if (is_wp_error($variant_written)) {
                    return $variant_written;
                }
            }
        }

        if (self::should_record_event($payload['event'])) {
            $event_written = self::write_event_stats(
                $payload['ad_id'],
                $payload['event'],
                $payload['date'],
                $payload['variant_id']
            );
            if (is_wp_error($event_written)) {
                return $event_written;
            }
        }

        if (self::diagnostics_enabled()) {
            self::write_log(
                $payload['ad_id'],
                $payload['event'],
                $payload['page_url'] ?: $page_hash_source,
                $payload['user_id']
            );
        }

        return array('success' => true);
    }

    private static function normalize_event(string $event): ?string {
        $event = sanitize_key($event);
        if ($event === '') {
            return null;
        }
        if (self::MAX_EVENT_LENGTH > 0 && strlen($event) > self::MAX_EVENT_LENGTH) {
            return null;
        }
        $known = array(
            'impression',
            'click',
            'video_play',
            'video_pause',
            'video_complete',
            'conversion',
        );
        if (in_array($event, $known, true)) {
            return $event;
        }
        if (!preg_match('/^[a-z][a-z0-9_-]{0,31}$/', $event)) {
            return null;
        }
        return $event;
    }

    private static function is_countable_event(string $event): bool {
        return in_array($event, array('impression', 'click'), true);
    }

    private static function is_video_event(string $event): bool {
        return in_array($event, array('video_play', 'video_pause', 'video_complete'), true);
    }

    private static function should_record_event(string $event): bool {
        $should = !self::is_countable_event($event) && !self::is_video_event($event);
        return (bool) apply_filters('magick_ad_track_record_event', $should, $event);
    }

    private static function sanitize_dimension(mixed $value): string {
        $value = is_scalar($value) ? (string) $value : '';
        $value = sanitize_text_field($value);
        if ($value === '') {
            return '';
        }
        return substr($value, 0, 191);
    }

    private static function sanitize_slot(mixed $value): string {
        $value = is_scalar($value) ? (string) $value : '';
        $value = sanitize_title($value);
        if ($value === '') {
            return '';
        }
        $value = substr($value, 0, 64);
        $allow_unknown = (bool) apply_filters('magick_ad_track_allow_unknown_slot', false, $value);
        if ($allow_unknown) {
            return $value;
        }
        $allowlist = self::get_slot_allowlist();
        return isset($allowlist[$value]) ? $value : '';
    }

    private static function sanitize_position(mixed $value): string {
        $value = self::sanitize_dimension($value);
        $allowed = array(
            'block',
            'slot',
            'shortcode',
            'content',
            'content_before',
            'content_after',
            'footer',
            'node',
            'top',
            'comments_top',
            'comments_bottom',
            'comment_form_before',
            'comment_form_after',
        );
        return in_array($value, $allowed, true) ? $value : '';
    }

    private static function sanitize_container(mixed $value): string {
        $value = self::sanitize_dimension($value);
        return in_array($value, array('inline', 'popup', 'banner', 'floating', 'interstitial'), true)
            ? $value
            : '';
    }

    private static function get_slot_allowlist(): array {
        if (self::$slot_allowlist !== null) {
            return self::$slot_allowlist;
        }

        $slots = Slots::get_slots();
        $map = array();
        foreach ($slots as $slot) {
            $slot_id = isset($slot['id']) ? (string) $slot['id'] : '';
            if ($slot_id !== '') {
                $map[$slot_id] = true;
            }
        }
        self::$slot_allowlist = $map;
        return $map;
    }

    private static function tracking_strategy(): string {
        $strategy = TrackingStrategy::from_value(get_option(self::OPTION_TRACK_STRATEGY, 'session'))->value;
        $strategy = (string) apply_filters('magick_ad_tracking_strategy', $strategy);
        return TrackingStrategy::from_value($strategy)->value;
    }

    private static function tracking_requires_consent(): bool {
        $guard_enabled = (get_option('magick_ad_consent_guard_enabled', '0') === '1');
        $guard_enabled = (bool) apply_filters('magick_ad_consent_guard_enabled', $guard_enabled);
        if (!$guard_enabled) {
            return false;
        }
        $requires = (get_option(self::OPTION_TRACK_REQUIRE_CONSENT, '0') === '1');
        return (bool) apply_filters('magick_ad_tracking_require_consent', $requires);
    }

    private static function has_consent(): bool {
        return (bool) apply_filters('magick_ad_has_consent', false);
    }

    private static function is_valid_signature(
        string $ad_id,
        string $sig,
        string $sig_ts,
        string $slot,
        string $position,
        string $container,
        string $rev = ''
    ): bool {
        return Tracking_Signature::is_valid($ad_id, $sig, $sig_ts, $slot, $position, $container, $rev);
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
        $trust_proxy = (bool) apply_filters('magick_ad_track_trust_proxy', false, $_SERVER);
        $trusted = get_option('magick_ad_trusted_proxies', array());
        $trusted = \MagickAD\Utils\Ip::normalize_list($trusted);
        $trusted = apply_filters('magick_ad_trusted_proxies', $trusted, $_SERVER);
        $ip = \MagickAD\Utils\Ip::extract_client_ip(
            $_SERVER,
            $trust_proxy ? $trusted : array()
        );
        $ip = apply_filters('magick_ad_track_client_ip', $ip);
        $ip = is_string($ip) ? $ip : '';
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '';
    }

    private static function apply_rate_limit(string $ad_id, string $event) {
        $limit = (int) apply_filters('magick_ad_track_rate_limit', 60, $ad_id, $event);
        if ($limit <= 0) {
            return null;
        }
        if (!self::should_use_persistent_cache()) {
            if (self::get_rate_limit_fallback() !== 'transient') {
                return null;
            }
        }
        $ip = self::get_request_ip();
        $bucket = gmdate('YmdHi', current_time('timestamp'));
        $rate_key = 'magick_ad_rl_' . md5($ip . '|' . $ad_id . '|' . $event . '|' . $bucket);
        $count = (int) get_transient($rate_key);
        if ($count >= $limit) {
            self::record_track_failure('rate_limited');
            return rest_ensure_response(array('success' => true, 'rate_limited' => true));
        }
        set_transient($rate_key, $count + 1, MINUTE_IN_SECONDS + 5);
        return null;
    }

    private static function validate_signature(
        string $ad_id,
        string $sig,
        string $sig_ts,
        string $sig_rev,
        string $event,
        string $slot,
        string $position,
        string $container
    ): WP_Error|true {
        $runtime_rev = self::get_runtime_rev();
        if ($runtime_rev > 0) {
            if ((int) $sig_rev !== $runtime_rev) {
                self::record_track_failure('signature_invalid');
                return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
            }
        }
        $sig_valid = self::is_valid_signature(
            $ad_id,
            $sig,
            $sig_ts,
            $slot,
            $position,
            $container,
            $runtime_rev > 0 ? (string) $runtime_rev : ''
        );
        $allow_unsigned = (bool) apply_filters('magick_ad_track_allow_unsigned', false);
        $require_signature = (get_option(self::OPTION_TRACK_REQUIRE_SIGNATURE, '1') === '1');
        $require_signature = (bool) apply_filters('magick_ad_track_require_signature', $require_signature, $ad_id, $event);
        if (self::is_production_environment()) {
            $require_signature = true;
        }

        if ($sig_valid) {
            return true;
        }

        if ($require_signature) {
            self::record_track_failure('signature_invalid');
            return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
        }

        if (!$allow_unsigned) {
            self::record_track_failure('signature_invalid');
            return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
        }

        $known_ad = self::is_known_ad_id($ad_id);
        if (!$known_ad) {
            self::record_track_failure('signature_invalid');
            return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
        }

        return true;
    }

    private static function get_runtime_rev(): int {
        return (int) get_option(\MagickAD\Data\Settings::RUNTIME_REV_KEY, 0);
    }

    private static function is_production_environment(): bool {
        if (!function_exists('wp_get_environment_type')) {
            return false;
        }
        return wp_get_environment_type() === 'production';
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
                    'path' => COOKIEPATH ?: '/',
                    'domain' => COOKIE_DOMAIN ?: '',
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

    private static function get_dedupe_scope(): string {
        $scope = (string) get_option('magick_ad_track_dedupe_scope', 'ad');
        $scope = (string) apply_filters('magick_ad_track_dedupe_scope', $scope);
        return $scope === 'placement' ? 'placement' : 'ad';
    }

    private static function should_use_persistent_cache(): bool {
        $use = wp_using_ext_object_cache();
        return (bool) apply_filters('magick_ad_track_use_persistent_cache', $use);
    }

    private static function record_track_failure(string $reason): void {
        if (!self::track_failure_enabled()) {
            return;
        }
        $reason = self::normalize_failure_reason($reason);
        if ($reason === '') {
            return;
        }
        $date = current_time('Y-m-d');
        $key = self::failure_stats_key($date);
        $stats = get_transient($key);
        if (!is_array($stats)) {
            $stats = array();
        }
        $stats[$reason] = (int) ($stats[$reason] ?? 0) + 1;
        set_transient($key, $stats, self::failure_retention_seconds());
    }

    private static function track_failure_enabled(): bool {
        $enabled = (bool) apply_filters('magick_ad_track_failure_stats_enabled', true);
        return $enabled;
    }

    private static function failure_retention_seconds(): int {
        $days = (int) apply_filters('magick_ad_track_failure_retention_days', 7);
        $days = max(1, min($days, 90));
        return $days * DAY_IN_SECONDS;
    }

    private static function failure_stats_key(string $date): string {
        return 'magick_ad_track_fail_' . preg_replace('/[^0-9\-]/', '', $date);
    }

    public static function get_failure_stats(string $date = ''): array {
        $date = $date !== '' ? $date : current_time('Y-m-d');
        $key = self::failure_stats_key($date);
        $stats = get_transient($key);
        if (!is_array($stats)) {
            return array();
        }
        $normalized = array();
        foreach ($stats as $reason => $count) {
            $reason_key = self::normalize_failure_reason((string) $reason);
            if ($reason_key === '') {
                continue;
            }
            $normalized[$reason_key] = (int) $count;
        }
        ksort($normalized);
        return $normalized;
    }

    private static function normalize_failure_reason(string $reason): string {
        $reason = sanitize_key($reason);
        $allowed = array(
            'signature_invalid',
            'rate_limited',
            'deduped',
            'no_consent',
        );
        return in_array($reason, $allowed, true) ? $reason : '';
    }

    private static function get_rate_limit_fallback(): string {
        $fallback = (string) get_option('magick_ad_rate_limit_fallback', 'transient');
        $fallback = (string) apply_filters('magick_ad_track_rate_limit_fallback', $fallback);
        return $fallback === 'transient' ? 'transient' : 'off';
    }

    private static function ensure_stats_ready(): WP_Error|true {
        $stats_ready = (string) get_option(self::OPTION_STATS_READY, '0');
        if ($stats_ready === (string) MAGICK_AD_DB_VERSION) {
            return true;
        }
        $status = Schema::get_table_status();
        if (empty($status['stats'])) {
            return new WP_Error('magick_ad_db_missing', 'Stats table missing', array('status' => 500));
        }
        update_option(self::OPTION_STATS_READY, (string) MAGICK_AD_DB_VERSION, false);
        return true;
    }

    private static function ensure_log_ready(): bool {
        $log_ready = (string) get_option(self::OPTION_LOG_READY, '0');
        if ($log_ready === (string) MAGICK_AD_DB_VERSION) {
            return true;
        }
        $status = Schema::get_table_status();
        if (empty($status['log'])) {
            return false;
        }
        update_option(self::OPTION_LOG_READY, (string) MAGICK_AD_DB_VERSION, false);
        return true;
    }

    private static function ensure_dim_ready(): bool {
        $dim_ready = (string) get_option(self::OPTION_DIM_READY, '0');
        if ($dim_ready === (string) MAGICK_AD_DB_VERSION) {
            return true;
        }
        $status = Schema::get_table_status();
        if (empty($status['dim'])) {
            return false;
        }
        update_option(self::OPTION_DIM_READY, (string) MAGICK_AD_DB_VERSION, false);
        return true;
    }

    private static function ensure_variant_ready(): bool {
        $variant_ready = (string) get_option(self::OPTION_VARIANT_READY, '0');
        if ($variant_ready === (string) MAGICK_AD_DB_VERSION) {
            return true;
        }
        $status = Schema::get_table_status();
        if (empty($status['variant'])) {
            return false;
        }
        update_option(self::OPTION_VARIANT_READY, (string) MAGICK_AD_DB_VERSION, false);
        return true;
    }

    private static function ensure_event_ready(): bool {
        $event_ready = (string) get_option(self::OPTION_EVENT_READY, '0');
        if ($event_ready === (string) MAGICK_AD_DB_VERSION) {
            return true;
        }
        $status = Schema::get_table_status();
        if (empty($status['event'])) {
            return false;
        }
        update_option(self::OPTION_EVENT_READY, (string) MAGICK_AD_DB_VERSION, false);
        return true;
    }

    private static function write_stats(string $ad_id, string $event, string $date): WP_Error|true {
        if (Stats_Accumulator::record_stats($ad_id, $event, $date)) {
            return true;
        }

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

    private static function write_variant_stats(
        string $ad_id,
        string $variant_id,
        string $event,
        string $date
    ): WP_Error|true {
        if (!self::ensure_variant_ready()) {
            return true;
        }
        if ($variant_id === '') {
            return true;
        }
        if (Stats_Accumulator::record_variant($ad_id, $variant_id, $event, $date)) {
            return true;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats_variant';
        $impressions = $event === 'impression' ? 1 : 0;
        $clicks = $event === 'click' ? 1 : 0;

        $sql = $wpdb->prepare(
            "INSERT INTO {$table} (`date`, `ad_id`, `variant_id`, `impressions`, `clicks`)
             VALUES (%s, %s, %s, %d, %d)
             ON DUPLICATE KEY UPDATE
                impressions = impressions + VALUES(impressions),
                clicks = clicks + VALUES(clicks)",
            $date,
            $ad_id,
            $variant_id,
            $impressions,
            $clicks
        );

        $result = $wpdb->query($sql);
        if ($result === false) {
            return new WP_Error('magick_ad_db_error', 'DB insert failed', array('status' => 500));
        }

        return true;
    }

    private static function write_event_stats(
        string $ad_id,
        string $event,
        string $date,
        string $variant_id = ''
    ): WP_Error|true {
        if (!self::ensure_event_ready()) {
            return true;
        }
        if ($ad_id === '' || $event === '' || $date === '') {
            return true;
        }
        if (Stats_Accumulator::record_event($ad_id, $event, $date, $variant_id ?: '', 1)) {
            return true;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats_event';

        $sql = $wpdb->prepare(
            "INSERT INTO {$table} (`date`, `ad_id`, `event`, `variant_id`, `count`)
             VALUES (%s, %s, %s, %s, %d)
             ON DUPLICATE KEY UPDATE
                count = count + VALUES(count)",
            $date,
            $ad_id,
            $event,
            $variant_id ?: '',
            1
        );

        $result = $wpdb->query($sql);
        if ($result === false) {
            return new WP_Error('magick_ad_db_error', 'DB insert failed', array('status' => 500));
        }

        return true;
    }

    private static function write_stats_bulk(array $stats_agg): WP_Error|true {
        if (empty($stats_agg)) {
            return true;
        }

        if (Stats_Accumulator::enabled()) {
            foreach ($stats_agg as $row) {
                $row = is_array($row) ? $row : array();
                $date = isset($row['date']) ? (string) $row['date'] : '';
                $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
                $impressions = (int) ($row['impressions'] ?? 0);
                $clicks = (int) ($row['clicks'] ?? 0);
                if ($date === '' || $ad_id === '') {
                    continue;
                }
                if ($impressions > 0) {
                    Stats_Accumulator::record_stats($ad_id, 'impression', $date, $impressions);
                }
                if ($clicks > 0) {
                    Stats_Accumulator::record_stats($ad_id, 'click', $date, $clicks);
                }
            }
            return true;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats';
        $values = array();
        $placeholders = array();

        foreach ($stats_agg as $row) {
            $row = is_array($row) ? $row : array();
            $date = isset($row['date']) ? (string) $row['date'] : '';
            $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
            $impressions = (int) ($row['impressions'] ?? 0);
            $clicks = (int) ($row['clicks'] ?? 0);
            if ($date === '' || $ad_id === '' || ($impressions === 0 && $clicks === 0)) {
                continue;
            }
            $placeholders[] = '(%s, %s, %d, %d)';
            array_push($values, $date, $ad_id, $impressions, $clicks);
        }

        if (empty($placeholders)) {
            return true;
        }

        $sql = "INSERT INTO {$table} (`date`, `ad_id`, `impressions`, `clicks`) VALUES ";
        $sql .= implode(', ', $placeholders);
        $sql .= " ON DUPLICATE KEY UPDATE impressions = impressions + VALUES(impressions), clicks = clicks + VALUES(clicks)";

        $prepared = $wpdb->prepare($sql, $values);
        $result = $wpdb->query($prepared);
        if ($result === false) {
            return new WP_Error('magick_ad_db_error', 'DB insert failed', array('status' => 500));
        }

        return true;
    }

    private static function write_variant_stats_bulk(array $variant_agg): WP_Error|true {
        if (empty($variant_agg)) {
            return true;
        }
        if (!self::ensure_variant_ready()) {
            return true;
        }

        if (Stats_Accumulator::enabled()) {
            foreach ($variant_agg as $row) {
                $row = is_array($row) ? $row : array();
                $date = isset($row['date']) ? (string) $row['date'] : '';
                $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
                $variant_id = isset($row['variant_id']) ? (string) $row['variant_id'] : '';
                $impressions = (int) ($row['impressions'] ?? 0);
                $clicks = (int) ($row['clicks'] ?? 0);
                if ($date === '' || $ad_id === '' || $variant_id === '') {
                    continue;
                }
                if ($impressions > 0) {
                    Stats_Accumulator::record_variant(
                        $ad_id,
                        $variant_id,
                        'impression',
                        $date,
                        $impressions
                    );
                }
                if ($clicks > 0) {
                    Stats_Accumulator::record_variant(
                        $ad_id,
                        $variant_id,
                        'click',
                        $date,
                        $clicks
                    );
                }
            }
            return true;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats_variant';
        $values = array();
        $placeholders = array();

        foreach ($variant_agg as $row) {
            $row = is_array($row) ? $row : array();
            $date = isset($row['date']) ? (string) $row['date'] : '';
            $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
            $variant_id = isset($row['variant_id']) ? (string) $row['variant_id'] : '';
            $impressions = (int) ($row['impressions'] ?? 0);
            $clicks = (int) ($row['clicks'] ?? 0);
            if ($date === '' || $ad_id === '' || $variant_id === '') {
                continue;
            }
            if ($impressions === 0 && $clicks === 0) {
                continue;
            }
            $placeholders[] = '(%s, %s, %s, %d, %d)';
            array_push($values, $date, $ad_id, $variant_id, $impressions, $clicks);
        }

        if (empty($placeholders)) {
            return true;
        }

        $sql = "INSERT INTO {$table} (`date`, `ad_id`, `variant_id`, `impressions`, `clicks`) VALUES ";
        $sql .= implode(', ', $placeholders);
        $sql .= " ON DUPLICATE KEY UPDATE impressions = impressions + VALUES(impressions), clicks = clicks + VALUES(clicks)";

        $prepared = $wpdb->prepare($sql, $values);
        $result = $wpdb->query($prepared);
        if ($result === false) {
            return new WP_Error('magick_ad_db_error', 'DB insert failed', array('status' => 500));
        }

        return true;
    }

    private static function write_event_stats_bulk(array $event_agg): WP_Error|true {
        if (empty($event_agg)) {
            return true;
        }
        if (!self::ensure_event_ready()) {
            return true;
        }

        if (Stats_Accumulator::enabled()) {
            foreach ($event_agg as $row) {
                $row = is_array($row) ? $row : array();
                $date = isset($row['date']) ? (string) $row['date'] : '';
                $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
                $event = isset($row['event']) ? (string) $row['event'] : '';
                $variant_id = isset($row['variant_id']) ? (string) $row['variant_id'] : '';
                $count = (int) ($row['count'] ?? 0);
                if ($date === '' || $ad_id === '' || $event === '' || $count < 1) {
                    continue;
                }
                Stats_Accumulator::record_event($ad_id, $event, $date, $variant_id, $count);
            }
            return true;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats_event';
        $values = array();
        $placeholders = array();

        foreach ($event_agg as $row) {
            $row = is_array($row) ? $row : array();
            $date = isset($row['date']) ? (string) $row['date'] : '';
            $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
            $event = isset($row['event']) ? (string) $row['event'] : '';
            $variant_id = isset($row['variant_id']) ? (string) $row['variant_id'] : '';
            $count = (int) ($row['count'] ?? 0);
            if ($date === '' || $ad_id === '' || $event === '' || $count < 1) {
                continue;
            }
            $placeholders[] = '(%s, %s, %s, %s, %d)';
            array_push($values, $date, $ad_id, $event, $variant_id, $count);
        }

        if (empty($placeholders)) {
            return true;
        }

        $sql = "INSERT INTO {$table} (`date`, `ad_id`, `event`, `variant_id`, `count`) VALUES ";
        $sql .= implode(', ', $placeholders);
        $sql .= " ON DUPLICATE KEY UPDATE count = count + VALUES(count)";

        $prepared = $wpdb->prepare($sql, $values);
        $result = $wpdb->query($prepared);
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

        if (Stats_Accumulator::record_dimension($ad_id, $event, $date, $slot, $position, $container)) {
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

    private static function write_dimension_stats_bulk(array $dim_agg): WP_Error|true {
        if (empty($dim_agg)) {
            return true;
        }
        if (!self::ensure_dim_ready()) {
            return true;
        }

        if (Stats_Accumulator::enabled()) {
            foreach ($dim_agg as $row) {
                $row = is_array($row) ? $row : array();
                $date = isset($row['date']) ? (string) $row['date'] : '';
                $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
                $slot = isset($row['slot']) ? (string) $row['slot'] : '';
                $position = isset($row['position']) ? (string) $row['position'] : '';
                $container = isset($row['container']) ? (string) $row['container'] : '';
                $impressions = (int) ($row['impressions'] ?? 0);
                $clicks = (int) ($row['clicks'] ?? 0);
                if ($date === '' || $ad_id === '') {
                    continue;
                }
                if ($slot === '' && $position === '' && $container === '') {
                    continue;
                }
                if ($impressions > 0) {
                    Stats_Accumulator::record_dimension(
                        $ad_id,
                        'impression',
                        $date,
                        $slot,
                        $position,
                        $container,
                        $impressions
                    );
                }
                if ($clicks > 0) {
                    Stats_Accumulator::record_dimension(
                        $ad_id,
                        'click',
                        $date,
                        $slot,
                        $position,
                        $container,
                        $clicks
                    );
                }
            }
            return true;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats_dim';
        $values = array();
        $placeholders = array();

        foreach ($dim_agg as $row) {
            $row = is_array($row) ? $row : array();
            $date = isset($row['date']) ? (string) $row['date'] : '';
            $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
            $slot = isset($row['slot']) ? (string) $row['slot'] : '';
            $position = isset($row['position']) ? (string) $row['position'] : '';
            $container = isset($row['container']) ? (string) $row['container'] : '';
            $impressions = (int) ($row['impressions'] ?? 0);
            $clicks = (int) ($row['clicks'] ?? 0);
            if ($date === '' || $ad_id === '' || ($impressions === 0 && $clicks === 0)) {
                continue;
            }
            if ($slot === '' && $position === '' && $container === '') {
                continue;
            }
            $placeholders[] = '(%s, %s, %s, %s, %s, %d, %d)';
            array_push($values, $date, $ad_id, $slot, $position, $container, $impressions, $clicks);
        }

        if (empty($placeholders)) {
            return true;
        }

        $sql = "INSERT INTO {$table} (`date`, `ad_id`, `slot`, `position`, `container`, `impressions`, `clicks`) VALUES ";
        $sql .= implode(', ', $placeholders);
        $sql .= " ON DUPLICATE KEY UPDATE impressions = impressions + VALUES(impressions), clicks = clicks + VALUES(clicks)";

        $prepared = $wpdb->prepare($sql, $values);
        $result = $wpdb->query($prepared);
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
        $page_url = self::sanitize_log_page_url($page_url);

        $wpdb->insert(
            $log_table,
            array(
                'ad_id' => $ad_id,
                'event_type' => $event,
                'page_url' => substr($page_url, 0, 255),
                'user_agent' => substr(
                    isset($_SERVER['HTTP_USER_AGENT'])
                        ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT']))
                        : '',
                    0,
                    255
                ),
                'user_id' => $user_id,
                'created_at' => current_time('mysql'),
            ),
            array('%s', '%s', '%s', '%s', '%d', '%s')
        );

        // Log cleanup is handled by WP-Cron.
    }

    private static function write_logs_bulk(array $log_rows): void {
        if (empty($log_rows) || !self::ensure_log_ready()) {
            return;
        }

        global $wpdb;
        $log_table = $wpdb->prefix . 'magick_ad_stats_log';
        $values = array();
        $placeholders = array();
        $user_agent = substr(
            isset($_SERVER['HTTP_USER_AGENT'])
                ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT']))
                : '',
            0,
            255
        );
        $created_at = current_time('mysql');

        foreach ($log_rows as $row) {
            $row = is_array($row) ? $row : array();
            $ad_id = isset($row['ad_id']) ? (string) $row['ad_id'] : '';
            $event = isset($row['event']) ? (string) $row['event'] : '';
            $page_url = isset($row['page_url']) ? (string) $row['page_url'] : '';
            $user_id = isset($row['user_id']) ? (int) $row['user_id'] : 0;
            if ($ad_id === '' || $event === '') {
                continue;
            }
            $page_url = self::sanitize_log_page_url($page_url);
            $placeholders[] = '(%s, %s, %s, %s, %d, %s)';
            array_push(
                $values,
                $ad_id,
                $event,
                substr($page_url, 0, 255),
                $user_agent,
                $user_id,
                $created_at
            );
        }

        if (empty($placeholders)) {
            return;
        }

        $sql = "INSERT INTO {$log_table} (`ad_id`, `event_type`, `page_url`, `user_agent`, `user_id`, `created_at`) VALUES ";
        $sql .= implode(', ', $placeholders);
        $wpdb->query($wpdb->prepare($sql, $values));
    }

    private static function sanitize_log_page_url(string $page_url): string {
        $page_url = esc_url_raw($page_url);
        if ($page_url === '') {
            return '';
        }
        $keep_query = (bool) apply_filters('magick_ad_log_keep_query', false, $page_url);
        if ($keep_query) {
            return $page_url;
        }
        $parts = wp_parse_url($page_url);
        if (!is_array($parts)) {
            return $page_url;
        }
        $path = $parts['path'] ?? '';
        $scheme = $parts['scheme'] ?? '';
        $host = $parts['host'] ?? '';
        $port = isset($parts['port']) ? ':' . (int) $parts['port'] : '';
        if ($host !== '') {
            $base = ($scheme ? $scheme . '://' : '') . $host . $port;
            return $base . $path;
        }
        return $path;
    }
}
