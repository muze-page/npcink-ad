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

        $args = self::sanitize_args($payload);
        $slot = isset($args['slot']) ? (string) $args['slot'] : '';
        $position = isset($args['position']) ? (string) $args['position'] : '';
        $container = isset($args['container']) ? (string) $args['container'] : '';

        if ($ad_id === '' || !Tracking_Signature::is_valid($ad_id, $sig, $sig_ts, $slot, $position, $container)) {
            return new WP_Error('magick_ad_invalid_signature', 'Invalid signature', array('status' => 403));
        }
        $markup = Frontend::render_ad_by_id($ad_id, $args);

        return rest_ensure_response(array(
            'success' => $markup !== '',
            'html' => $markup,
        ));
    }

    public static function render_batch(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        $payload = is_array($payload) ? $payload : array();
        $items = isset($payload['items']) && is_array($payload['items']) ? $payload['items'] : array();

        $limit = (int) apply_filters('magick_ad_render_batch_limit', 20);
        if ($limit < 1) {
            $limit = 1;
        }
        if (count($items) > $limit) {
            $items = array_slice($items, 0, $limit);
        }

        $response_items = array();
        foreach ($items as $item) {
            $item = is_array($item) ? $item : array();
            $ad_id = isset($item['ad_id']) ? sanitize_text_field($item['ad_id']) : '';
            $sig = isset($item['sig']) ? sanitize_text_field($item['sig']) : '';
            $sig_ts = isset($item['sig_ts']) ? sanitize_text_field($item['sig_ts']) : '';

            $args = self::sanitize_args($item);
            $slot = isset($args['slot']) ? (string) $args['slot'] : '';
            $position = isset($args['position']) ? (string) $args['position'] : '';
            $container = isset($args['container']) ? (string) $args['container'] : '';

            if ($ad_id === '' || !Tracking_Signature::is_valid($ad_id, $sig, $sig_ts, $slot, $position, $container)) {
                $response_items[] = array(
                    'success' => false,
                    'ad_id' => $ad_id,
                    'html' => '',
                );
                continue;
            }

            $markup = Frontend::render_ad_by_id($ad_id, $args);
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
}
