<?php

namespace MagickAD\REST\Controllers;

use WP_Error;
use WP_REST_Request;
use MagickAD\Frontend\Frontend;
use MagickAD\Data\Ads;
use MagickAD\Data\Settings;
use MagickAD\Utils\Tracking_Signature;

if (!defined('ABSPATH')) {
    exit;
}

final class Render_Controller {
    private const CACHE_GROUP = 'magick_ad_render';
    private const MAX_AD_ID_LENGTH = 64;
    private const MAX_SIG_LENGTH = 64;
    private const MAX_SIG_TS_LENGTH = 16;
    private const MAX_SIG_REV_LENGTH = 16;

    public static function render(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        $payload = is_array($payload) ? $payload : array();

        $rate_limited = self::apply_rate_limit();
        if (is_wp_error($rate_limited)) {
            return $rate_limited;
        }

        $ad_id = isset($payload['ad_id'])
            ? self::sanitize_short_text((string) $payload['ad_id'], self::MAX_AD_ID_LENGTH)
            : '';
        $sig = isset($payload['sig'])
            ? self::sanitize_short_text((string) $payload['sig'], self::MAX_SIG_LENGTH)
            : '';
        $sig_ts = isset($payload['sig_ts'])
            ? self::sanitize_short_text((string) $payload['sig_ts'], self::MAX_SIG_TS_LENGTH)
            : '';
        $sig_rev = isset($payload['sig_rev'])
            ? self::sanitize_short_text((string) $payload['sig_rev'], self::MAX_SIG_REV_LENGTH)
            : '';

        $args = self::sanitize_args($payload);
        $slot = isset($args['slot']) ? (string) $args['slot'] : '';
        $position = isset($args['position']) ? (string) $args['position'] : '';
        $container = isset($args['container']) ? (string) $args['container'] : '';

        $runtime_rev = self::get_runtime_rev();
        if ($runtime_rev > 0 && (int) $sig_rev !== $runtime_rev) {
            return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
        }
        $signature_valid = Tracking_Signature::is_valid(
            $ad_id,
            $sig,
            $sig_ts,
            $slot,
            $position,
            $container,
            $runtime_rev > 0 ? (string) $runtime_rev : ''
        );
        if ($ad_id === '' || (self::is_signature_required() && !$signature_valid)) {
            return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
        }

        $cached = self::get_cached_markup($ad_id, $sig_ts, $args);
        if (is_string($cached)) {
            return rest_ensure_response(array(
                'success' => $cached !== '',
                'html' => $cached,
            ));
        }

        $markup = Frontend::render_ad_by_id($ad_id, $args);
        self::set_cached_markup($ad_id, $sig_ts, $args, $markup);

        return rest_ensure_response(array(
            'success' => $markup !== '',
            'html' => $markup,
        ));
    }

    public static function render_batch(WP_REST_Request $request) {
        $body_limit = self::get_body_limit();
        if ($body_limit > 0 && self::is_request_too_large($request, $body_limit)) {
            return new WP_Error('magick_ad_payload_too_large', 'Payload too large', array('status' => 413));
        }

        $payload = $request->get_json_params();
        $payload = is_array($payload) ? $payload : array();
        $items = isset($payload['items']) && is_array($payload['items']) ? $payload['items'] : array();

        $rate_limited = self::apply_rate_limit();
        if (is_wp_error($rate_limited)) {
            return $rate_limited;
        }

        $limit = (int) apply_filters('magick_ad_render_batch_limit', 10);
        if ($limit < 1) {
            $limit = 1;
        }
        if (count($items) > $limit) {
            $items = array_slice($items, 0, $limit);
        }

        self::prime_post_cache_from_items($items);

        $response_items = array();
        foreach ($items as $item) {
            $item = is_array($item) ? $item : array();
            $ad_id = isset($item['ad_id'])
                ? self::sanitize_short_text((string) $item['ad_id'], self::MAX_AD_ID_LENGTH)
                : '';
            $sig = isset($item['sig'])
                ? self::sanitize_short_text((string) $item['sig'], self::MAX_SIG_LENGTH)
                : '';
            $sig_ts = isset($item['sig_ts'])
                ? self::sanitize_short_text((string) $item['sig_ts'], self::MAX_SIG_TS_LENGTH)
                : '';
            $sig_rev = isset($item['sig_rev'])
                ? self::sanitize_short_text((string) $item['sig_rev'], self::MAX_SIG_REV_LENGTH)
                : '';

            $args = self::sanitize_args($item);
            $slot = isset($args['slot']) ? (string) $args['slot'] : '';
            $position = isset($args['position']) ? (string) $args['position'] : '';
            $container = isset($args['container']) ? (string) $args['container'] : '';

            $runtime_rev = self::get_runtime_rev();
            if ($runtime_rev > 0 && (int) $sig_rev !== $runtime_rev) {
                $response_items[] = array(
                    'success' => false,
                    'ad_id' => $ad_id,
                    'html' => '',
                );
                continue;
            }
            $signature_valid = Tracking_Signature::is_valid(
                $ad_id,
                $sig,
                $sig_ts,
                $slot,
                $position,
                $container,
                $runtime_rev > 0 ? (string) $runtime_rev : ''
            );
            if ($ad_id === '' || (self::is_signature_required() && !$signature_valid)) {
                $response_items[] = array(
                    'success' => false,
                    'ad_id' => $ad_id,
                    'html' => '',
                );
                continue;
            }

            $cached = self::get_cached_markup($ad_id, $sig_ts, $args);
            if (is_string($cached)) {
                $response_items[] = array(
                    'success' => $cached !== '',
                    'ad_id' => $ad_id,
                    'html' => $cached,
                );
                continue;
            }

            $markup = Frontend::render_ad_by_id($ad_id, $args);
            self::set_cached_markup($ad_id, $sig_ts, $args, $markup);
            $response_items[] = array(
                'success' => $markup !== '',
                'ad_id' => $ad_id,
                'html' => $markup,
            );
        }

        return rest_ensure_response(array(
            'success' => true,
            'items' => $response_items,
        ));
    }

    private static function prime_post_cache_from_items(array $items): void {
        if (empty($items)) {
            return;
        }

        $ad_ids = array();
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $ad_id = isset($item['ad_id']) ? sanitize_text_field((string) $item['ad_id']) : '';
            if ($ad_id !== '') {
                $ad_ids[$ad_id] = true;
            }
        }
        if (empty($ad_ids)) {
            return;
        }

        $settings = Settings::get_runtime_settings();
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
        if (empty($ads)) {
            return;
        }

        $post_ids = array();
        foreach ($ads as $ad) {
            if (!is_array($ad)) {
                continue;
            }
            $ad_id = isset($ad['id']) ? (string) $ad['id'] : '';
            if ($ad_id === '' || !isset($ad_ids[$ad_id])) {
                continue;
            }
            $post_id = isset($ad['post_id']) ? absint($ad['post_id']) : 0;
            if ($post_id > 0) {
                $post_ids[$post_id] = true;
            }
        }

        if (empty($post_ids)) {
            return;
        }

        $post_ids = array_keys($post_ids);
        get_posts(
            array(
                'post_type' => Ads::POST_TYPE,
                'post_status' => 'any',
                'posts_per_page' => -1,
                'post__in' => $post_ids,
                'orderby' => 'post__in',
                'no_found_rows' => true,
                'suppress_filters' => true,
                'update_post_term_cache' => false,
                'update_post_meta_cache' => true,
            )
        );
        update_meta_cache('post', $post_ids);
    }

    private static function is_signature_required(): bool {
        $required = (bool) apply_filters('magick_ad_render_require_signature', true);
        if (self::is_production_environment()) {
            return true;
        }
        return $required;
    }

    private static function get_runtime_rev(): int {
        return (int) get_option(\MagickAD\Data\Settings::RUNTIME_REV_KEY, 0);
    }

    private static function get_body_limit(): int {
        $limit = (int) apply_filters('magick_ad_render_body_limit', 131072);
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

    private static function is_production_environment(): bool {
        if (!function_exists('wp_get_environment_type')) {
            return false;
        }
        return wp_get_environment_type() === 'production';
    }

    private static function sanitize_args(array $payload): array {
        $args = array();

        if (!empty($payload['slot']) && is_string($payload['slot'])) {
            $slot = sanitize_title($payload['slot']);
            if ($slot !== '') {
                $args['slot'] = substr($slot, 0, 64);
            }
        }
        if (!empty($payload['position']) && is_string($payload['position'])) {
            $position = sanitize_text_field($payload['position']);
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
            if (in_array($position, $allowed, true)) {
                $args['position'] = $position;
            }
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

    private static function get_cached_markup(string $ad_id, string $sig_ts, array $args): ?string {
        if (!self::should_cache()) {
            return null;
        }

        $key = self::build_cache_key($ad_id, $sig_ts, $args);
        $cached = wp_cache_get($key, self::CACHE_GROUP);
        return is_string($cached) ? $cached : null;
    }

    private static function set_cached_markup(string $ad_id, string $sig_ts, array $args, string $markup): void {
        if ($markup === '' || !self::should_cache()) {
            return;
        }

        $ttl = self::get_cache_ttl($sig_ts, $ad_id, $args);
        if ($ttl <= 0) {
            return;
        }

        $key = self::build_cache_key($ad_id, $sig_ts, $args);
        wp_cache_set($key, $markup, self::CACHE_GROUP, $ttl);
    }

    private static function should_cache(): bool {
        $enabled = wp_using_ext_object_cache();
        return (bool) apply_filters('magick_ad_render_cache_enabled', $enabled);
    }

    private static function get_cache_ttl(string $sig_ts, string $ad_id, array $args): int {
        $window_days = Tracking_Signature::get_signature_window_days();
        $default_ttl = max(HOUR_IN_SECONDS, ($window_days * DAY_IN_SECONDS) + 6 * HOUR_IN_SECONDS);
        $ttl = (int) apply_filters('magick_ad_render_cache_ttl', $default_ttl, $sig_ts, $ad_id, $args);
        return max(0, $ttl);
    }

    private static function build_cache_key(string $ad_id, string $sig_ts, array $args): string {
        $rev = (int) get_option(Settings::RUNTIME_REV_KEY, 0);
        $parts = array(
            $ad_id,
            $sig_ts,
            (string) $rev,
            isset($args['slot']) ? (string) $args['slot'] : '',
            isset($args['position']) ? (string) $args['position'] : '',
            isset($args['container']) ? (string) $args['container'] : '',
            isset($args['class']) ? (string) $args['class'] : '',
            isset($args['creative']) ? (string) $args['creative'] : '',
        );

        return 'magick_ad_render_' . md5(implode('|', $parts));
    }

    private static function apply_rate_limit(): ?WP_Error {
        $limit = (int) apply_filters('magick_ad_render_rate_limit', 120);
        if ($limit <= 0) {
            return null;
        }
        if (!self::should_use_persistent_cache()) {
            if (self::get_rate_limit_fallback() !== 'transient') {
                return null;
            }
        }

        $ip = self::get_request_ip();
        if ($ip === '') {
            return null;
        }

        $bucket = gmdate('YmdHi', current_time('timestamp'));
        $rate_key = 'magick_ad_render_rl_' . md5($ip . '|' . $bucket);
        $count = (int) get_transient($rate_key);
        if ($count >= $limit) {
            return new WP_Error('magick_ad_rate_limited', 'Rate limited', array('status' => 429));
        }
        set_transient($rate_key, $count + 1, MINUTE_IN_SECONDS + 5);
        return null;
    }

    private static function should_use_persistent_cache(): bool {
        $use = wp_using_ext_object_cache();
        return (bool) apply_filters('magick_ad_render_use_persistent_cache', $use);
    }

    private static function get_rate_limit_fallback(): string {
        $fallback = (string) get_option('magick_ad_rate_limit_fallback', 'transient');
        $fallback = (string) apply_filters('magick_ad_render_rate_limit_fallback', $fallback);
        return $fallback === 'transient' ? 'transient' : 'off';
    }

    private static function get_request_ip(): string {
        $ip = '';
        $trust_proxy = (bool) apply_filters('magick_ad_render_trust_proxy', false, $_SERVER);
        if ($trust_proxy && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $parts = explode(',', sanitize_text_field(wp_unslash($_SERVER['HTTP_X_FORWARDED_FOR'])));
            $ip = trim($parts[0]);
        }
        if ($ip === '' && !empty($_SERVER['REMOTE_ADDR'])) {
            $ip = sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR']));
        }
        $ip = apply_filters('magick_ad_render_client_ip', $ip);
        $ip = is_string($ip) ? $ip : '';
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '';
    }
}
