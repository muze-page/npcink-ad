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

        $cache_context = self::get_cache_context($ad_id, $args);
        $cached = self::get_cached_markup($ad_id, $sig_ts, $args, $cache_context);
        if (is_string($cached)) {
            return rest_ensure_response(array(
                'success' => $cached !== '',
                'html' => $cached,
            ));
        }

        $markup = Frontend::render_ad_by_id($ad_id, $args);
        self::set_cached_markup($ad_id, $sig_ts, $args, $markup, $cache_context);

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

            $cache_context = self::get_cache_context($ad_id, $args);
            $cached = self::get_cached_markup($ad_id, $sig_ts, $args, $cache_context);
            if (is_string($cached)) {
                $response_items[] = array(
                    'success' => $cached !== '',
                    'ad_id' => $ad_id,
                    'html' => $cached,
                );
                continue;
            }

            $markup = Frontend::render_ad_by_id($ad_id, $args);
            self::set_cached_markup($ad_id, $sig_ts, $args, $markup, $cache_context);
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
                'update_post_term_cache' => false,
                'update_post_meta_cache' => true,
            )
        );
        update_meta_cache('post', $post_ids);
    }

    private static function is_signature_required(): bool {
        if (self::is_production_environment() || !self::is_debug_constant_enabled()) {
            return true;
        }
        return (bool) apply_filters('magick_ad_render_require_signature', true);
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
            $length = sanitize_text_field(wp_unslash((string) $_SERVER['CONTENT_LENGTH']));
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

    private static function is_debug_constant_enabled(): bool {
        return (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG);
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

    private static function get_cached_markup(
        string $ad_id,
        string $sig_ts,
        array $args,
        array $cache_context = array()
    ): ?string {
        if (!self::should_cache() || empty($cache_context['cacheable'])) {
            return null;
        }

        $key = self::build_cache_key($ad_id, $sig_ts, $args, $cache_context);
        $cached = wp_cache_get($key, self::CACHE_GROUP);
        return is_string($cached) ? $cached : null;
    }

    private static function set_cached_markup(
        string $ad_id,
        string $sig_ts,
        array $args,
        string $markup,
        array $cache_context = array()
    ): void {
        if ($markup === '' || !self::should_cache() || empty($cache_context['cacheable'])) {
            return;
        }

        $ttl = self::get_cache_ttl($sig_ts, $ad_id, $args, $cache_context);
        if ($ttl <= 0) {
            return;
        }

        $key = self::build_cache_key($ad_id, $sig_ts, $args, $cache_context);
        wp_cache_set($key, $markup, self::CACHE_GROUP, $ttl);
    }

    private static function should_cache(): bool {
        $enabled = wp_using_ext_object_cache();
        return (bool) apply_filters('magick_ad_render_cache_enabled', $enabled);
    }

    private static function get_cache_ttl(
        string $sig_ts,
        string $ad_id,
        array $args,
        array $cache_context = array()
    ): int {
        $default_ttl = 60;
        $ttl = (int) apply_filters(
            'magick_ad_render_cache_ttl',
            $default_ttl,
            $sig_ts,
            $ad_id,
            $args,
            $cache_context
        );
        return max(0, $ttl);
    }

    private static function build_cache_key(
        string $ad_id,
        string $sig_ts,
        array $args,
        array $cache_context = array()
    ): string {
        $rev = (int) get_option(Settings::RUNTIME_REV_KEY, 0);
        $variant = isset($cache_context['variant']) ? (string) $cache_context['variant'] : '';
        $parts = array(
            $ad_id,
            $sig_ts,
            (string) $rev,
            isset($args['slot']) ? (string) $args['slot'] : '',
            isset($args['position']) ? (string) $args['position'] : '',
            isset($args['container']) ? (string) $args['container'] : '',
            isset($args['class']) ? (string) $args['class'] : '',
            isset($args['creative']) ? (string) $args['creative'] : '',
            $variant,
        );

        return 'magick_ad_render_' . md5(implode('|', $parts));
    }

    private static function get_cache_context(string $ad_id, array $args): array {
        $context = array(
            'cacheable' => true,
            'variant' => '',
        );

        $settings = Settings::get_runtime_settings();
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
        $ad = null;
        foreach ($ads as $candidate) {
            if (!is_array($candidate)) {
                continue;
            }
            if (isset($candidate['id']) && (string) $candidate['id'] === $ad_id) {
                $ad = $candidate;
                break;
            }
        }

        if (!is_array($ad)) {
            return $context;
        }

        $content = isset($ad['content']) && is_array($ad['content']) ? $ad['content'] : array();
        if (empty($content['variants_enabled'])) {
            return (array) apply_filters('magick_ad_render_cache_context', $context, $ad, $args);
        }

        $strategy = ($content['variants_strategy'] ?? '') === 'session' ? 'session' : 'request';
        if ($strategy !== 'session') {
            $context['cacheable'] = false;
            return (array) apply_filters('magick_ad_render_cache_context', $context, $ad, $args);
        }

        $variant = self::get_variant_cookie_value($ad_id);
        if ($variant === '') {
            $context['cacheable'] = false;
            return (array) apply_filters('magick_ad_render_cache_context', $context, $ad, $args);
        }

        $context['variant'] = $variant;
        return (array) apply_filters('magick_ad_render_cache_context', $context, $ad, $args);
    }

    private static function get_variant_cookie_value(string $ad_id): string {
        $cookie_key = self::build_variant_cookie_key($ad_id);
        if ($cookie_key === '') {
            return '';
        }
        $value = isset($_COOKIE[$cookie_key]) ? sanitize_text_field(wp_unslash($_COOKIE[$cookie_key])) : '';
        if ($value === '') {
            return '';
        }
        return substr($value, 0, 64);
    }

    private static function build_variant_cookie_key(string $ad_id): string {
        $safe = preg_replace('/[^a-zA-Z0-9_]/', '_', $ad_id);
        if (!is_string($safe) || $safe === '') {
            return '';
        }
        return 'magick_ad_variant_' . $safe;
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
        $fallback = (string) get_option('magick_ad_rate_limit_fallback', 'off');
        $fallback = (string) apply_filters('magick_ad_render_rate_limit_fallback', $fallback);
        return $fallback === 'transient' ? 'transient' : 'off';
    }

    private static function get_request_ip(): string {
        $ip = '';
        $trust_proxy = (bool) apply_filters('magick_ad_render_trust_proxy', false, $_SERVER);
        $trusted = get_option('magick_ad_trusted_proxies', array());
        $trusted = \MagickAD\Utils\Ip::normalize_list($trusted);
        $trusted = apply_filters('magick_ad_trusted_proxies', $trusted, $_SERVER);
        $ip = \MagickAD\Utils\Ip::extract_client_ip(
            $_SERVER,
            $trust_proxy ? $trusted : array()
        );
        $ip = apply_filters('magick_ad_render_client_ip', $ip);
        $ip = is_string($ip) ? $ip : '';
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '';
    }
}
