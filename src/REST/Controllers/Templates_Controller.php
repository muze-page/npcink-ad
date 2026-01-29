<?php

namespace MagickAD\REST\Controllers;

use MagickAD\Data\Settings;
use WP_Error;
use WP_REST_Request;

if (!defined('ABSPATH')) {
    exit;
}

final class Templates_Controller {
    public static function list(WP_REST_Request $request) {
        $type = sanitize_text_field($request->get_param('type'));
        $query = array(
            'post_type' => 'magick_template',
            'post_status' => 'publish',
            'posts_per_page' => 200,
            'orderby' => 'date',
            'order' => 'DESC',
            'fields' => 'ids',
        );
        $ids = get_posts($query);
        $items = array();
        foreach ($ids as $post_id) {
            $template_type = get_post_meta($post_id, 'magick_template_type', true);
            if ($type && $type !== $template_type) {
                continue;
            }
            $data = get_post_meta($post_id, 'magick_template_data', true);
            $items[] = array(
                'id' => $post_id,
                'name' => get_the_title($post_id),
                'type' => $template_type,
                'data' => is_array($data) ? $data : array(),
            );
        }
        return rest_ensure_response($items);
    }

    public static function create(WP_REST_Request $request) {
        $name = sanitize_text_field($request->get_param('name'));
        $type = sanitize_text_field($request->get_param('type'));
        $data = $request->get_param('data');
        if (!$name || !$type) {
            return new WP_Error('magick_ad_template_invalid', 'Invalid template payload', array('status' => 400));
        }

        $clean_type = Settings::sanitize_choice(
            $type,
            array('html', 'image', 'video', 'block'),
            'html'
        );
        $clean_data = self::sanitize_template_data($clean_type, $data);
        $post_id = wp_insert_post(array(
            'post_type' => 'magick_template',
            'post_status' => 'publish',
            'post_title' => $name,
        ), true);
        if (is_wp_error($post_id)) {
            return $post_id;
        }
        update_post_meta($post_id, 'magick_template_type', $clean_type);
        update_post_meta($post_id, 'magick_template_data', $clean_data);

        return rest_ensure_response(array(
            'id' => $post_id,
            'name' => $name,
            'type' => $clean_type,
            'data' => $clean_data,
        ));
    }

    public static function import(WP_REST_Request $request) {
        $payload = $request->get_param('templates');
        $templates = is_array($payload) ? $payload : array();
        $created = array();

        foreach ($templates as $template) {
            if (!is_array($template)) {
                continue;
            }
            $name = isset($template['name']) ? sanitize_text_field($template['name']) : '';
            $type = isset($template['type']) ? sanitize_text_field($template['type']) : '';
            $data = isset($template['data']) ? $template['data'] : array();
            if (!$name || !$type) {
                continue;
            }
            $clean_type = Settings::sanitize_choice(
                $type,
                array('html', 'image', 'video', 'block'),
                'html'
            );
            $clean_data = self::sanitize_template_data($clean_type, $data);
            if ($clean_type === 'image') {
                self::maybe_sideload_image($clean_data);
            }
            $post_id = wp_insert_post(array(
                'post_type' => 'magick_template',
                'post_status' => 'publish',
                'post_title' => $name,
            ), true);
            if (is_wp_error($post_id)) {
                continue;
            }
            update_post_meta($post_id, 'magick_template_type', $clean_type);
            update_post_meta($post_id, 'magick_template_data', $clean_data);
            $created[] = $post_id;
        }

        return rest_ensure_response(array(
            'created' => $created,
        ));
    }

    private static function sanitize_template_data(string $type, $data): array {
        $data = is_array($data) ? $data : array();
        if ($type === 'image') {
            $image = isset($data['image']) && is_array($data['image']) ? $data['image'] : array();
            $settings = isset($data['image_settings']) && is_array($data['image_settings']) ? $data['image_settings'] : array();
            return array(
                'image' => array(
                    'id' => isset($image['id']) ? absint($image['id']) : 0,
                    'url' => isset($image['url']) ? esc_url_raw($image['url']) : '',
                    'alt' => isset($image['alt']) ? sanitize_text_field($image['alt']) : '',
                ),
                'link' => isset($data['link']) ? esc_url_raw($data['link']) : '',
                'link_target' => !empty($data['link_target']),
                'image_settings' => array(
                    'radius' => isset($settings['radius']) ? absint($settings['radius']) : 0,
                    'max_width' => isset($settings['max_width']) ? absint($settings['max_width']) : 1200,
                    'margin_top' => isset($settings['margin_top']) ? absint($settings['margin_top']) : 0,
                    'margin_bottom' => isset($settings['margin_bottom']) ? absint($settings['margin_bottom']) : 0,
                    'margin_left' => isset($settings['margin_left']) ? absint($settings['margin_left']) : 0,
                    'margin_right' => isset($settings['margin_right']) ? absint($settings['margin_right']) : 0,
                ),
            );
        }
        if ($type === 'video') {
            return array(
                'video_url' => isset($data['video_url']) ? esc_url_raw($data['video_url']) : '',
            );
        }
        if ($type === 'block') {
            $blocks = isset($data['blocks']) && is_string($data['blocks']) ? $data['blocks'] : '';
            if (!current_user_can('unfiltered_html')) {
                $blocks = wp_kses_post($blocks);
            }
            return array('blocks' => $blocks);
        }
        $html = isset($data['html']) && is_string($data['html']) ? $data['html'] : '';
        return array('html' => wp_kses_post($html));
    }

    private static function maybe_sideload_image(array &$data): void {
        $url = isset($data['image']['url']) ? $data['image']['url'] : '';
        $id = isset($data['image']['id']) ? absint($data['image']['id']) : 0;
        if (!$url || $id) {
            return;
        }
        if (!function_exists('media_sideload_image')) {
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
        }
        $attachment_id = media_sideload_image($url, 0, null, 'id');
        if (is_wp_error($attachment_id)) {
            return;
        }
        $data['image']['id'] = (int) $attachment_id;
        $data['image']['url'] = wp_get_attachment_url($attachment_id);
    }
}
