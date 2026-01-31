<?php

namespace MagickAD\Data;

use WP_Error;
use MagickAD\Utils\Capabilities;
use MagickAD\Data\Slots;

if (!defined('ABSPATH')) {
    exit;
}

final class Ads {
    public const POST_TYPE = 'magick_ad';
    public const META_DATA = '_magick_ad_data';
    public const META_ID = '_magick_ad_id';

    public static function register(): void {
        $capability = Capabilities::manage_capability();
        register_post_type(
            self::POST_TYPE,
            array(
                'labels' => array(
                    'name' => __('Magick Ads', 'magick-ad'),
                    'singular_name' => __('Magick Ad', 'magick-ad'),
                ),
                'public' => false,
                'show_ui' => true,
                'show_in_menu' => false,
                'show_in_rest' => true,
                'exclude_from_search' => true,
                'publicly_queryable' => false,
                'supports' => array('title', 'author', 'revisions'),
                'menu_icon' => 'dashicons-megaphone',
                'rewrite' => false,
                'map_meta_cap' => false,
                'capability_type' => 'magick_ad',
                'capabilities' => array(
                    'edit_post' => $capability,
                    'read_post' => $capability,
                    'delete_post' => $capability,
                    'edit_posts' => $capability,
                    'edit_others_posts' => $capability,
                    'publish_posts' => $capability,
                    'read_private_posts' => $capability,
                    'delete_posts' => $capability,
                    'delete_private_posts' => $capability,
                    'delete_published_posts' => $capability,
                    'delete_others_posts' => $capability,
                    'edit_private_posts' => $capability,
                    'edit_published_posts' => $capability,
                    'create_posts' => $capability,
                ),
            )
        );

        register_post_meta(
            self::POST_TYPE,
            self::META_DATA,
            array(
                'type' => 'object',
                'single' => true,
                'show_in_rest' => array(
                    'schema' => array(
                        'type' => 'object',
                        'additionalProperties' => true,
                    ),
                ),
                'sanitize_callback' => array(__CLASS__, 'sanitize_meta_data'),
                'auth_callback' => array(__CLASS__, 'can_manage_meta'),
            )
        );

        register_post_meta(
            self::POST_TYPE,
            self::META_ID,
            array(
                'type' => 'string',
                'single' => true,
                'show_in_rest' => true,
                'sanitize_callback' => 'sanitize_text_field',
                'auth_callback' => array(__CLASS__, 'can_manage_meta'),
            )
        );

        if (is_admin()) {
            add_filter('manage_' . self::POST_TYPE . '_posts_columns', array(__CLASS__, 'columns'));
            add_action('manage_' . self::POST_TYPE . '_posts_custom_column', array(__CLASS__, 'render_column'), 10, 2);
        }
    }

    public static function get_settings(): array {
        return array(
            'ads' => self::get_ads(),
            'slots' => Slots::get_slots(),
        );
    }

    public static function get_ads(): array {
        $posts = get_posts(
            array(
                'post_type' => self::POST_TYPE,
                'post_status' => array('publish', 'draft', 'future', 'private'),
                'numberposts' => -1,
                'orderby' => array(
                    'menu_order' => 'ASC',
                    'date' => 'DESC',
                ),
            )
        );

        $ads = array();
        $post_ids = array();
        foreach ($posts as $post) {
            $post_ids[] = $post->ID;
        }
        if (!empty($post_ids)) {
            update_meta_cache('post', $post_ids);
        }
        foreach ($posts as $post) {
            $data = get_post_meta($post->ID, self::META_DATA, true);
            if (!is_array($data)) {
                $data = array();
            }
            $ad_id = get_post_meta($post->ID, self::META_ID, true);
            if (!$ad_id) {
                $ad_id = 'ad_' . $post->ID;
                update_post_meta($post->ID, self::META_ID, $ad_id);
            }

            $sanitized = Settings::sanitize_settings(array('ads' => array($data)));
            $ad = isset($sanitized['ads'][0]) && is_array($sanitized['ads'][0])
                ? $sanitized['ads'][0]
                : array();
            $ad['id'] = $ad_id;
            $ad['name'] = $post->post_title;
            $ad['status'] = $post->post_status;
            $ad['date'] = $post->post_date;
            $ad['date_gmt'] = $post->post_date_gmt;
            if (!isset($ad['options']) || !is_array($ad['options'])) {
                $ad['options'] = array();
            }
            if (!isset($ad['content']) || !is_array($ad['content'])) {
                $ad['content'] = array();
            }
            if ($post->post_status !== 'publish') {
                $ad['options']['enabled'] = false;
            }

            $ads[] = $ad;
        }

        return $ads;
    }

    public static function save_settings(array $settings) {
        $sanitized = Settings::sanitize_settings($settings);
        $raw_ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();

        $delete_ids = array();
        $filtered_ads = array();
        foreach ($sanitized['ads'] as $index => $ad) {
            $raw = isset($raw_ads[$index]) && is_array($raw_ads[$index]) ? $raw_ads[$index] : array();
            if (!empty($raw['deleted'])) {
                $raw_id = isset($raw['id']) ? sanitize_text_field($raw['id']) : '';
                if ($raw_id !== '') {
                    $delete_ids[] = $raw_id;
                }
                continue;
            }
            if (isset($raw['status'])) {
                $ad['status'] = self::sanitize_status($raw['status']);
            }
            if (isset($raw['date'])) {
                $ad['date'] = self::sanitize_datetime($raw['date']);
            }
            $filtered_ads[] = $ad;
        }
        $sanitized['ads'] = $filtered_ads;

        $validation = Settings::validate_settings($sanitized);
        if (is_wp_error($validation)) {
            return $validation;
        }

        $replace_all = !empty($settings['_replace_all']);
        $result = self::store_ads(
            $sanitized['ads'],
            array(
                'replace_all' => $replace_all,
                'delete_ids' => $delete_ids,
            )
        );
        if (is_wp_error($result)) {
            return $result;
        }

        $include_slots = array_key_exists('slots', $settings);
        $saved_slots = $include_slots
            ? Slots::save_slots(isset($sanitized['slots']) ? $sanitized['slots'] : array())
            : Slots::get_slots();

        return array(
            'ads' => $result,
            'slots' => $saved_slots,
        );
    }

    public static function store_ads(array $ads, array $options = array()) {
        $existing = self::get_existing_map();
        $replace_all = !empty($options['replace_all']);
        $delete_ids = isset($options['delete_ids']) && is_array($options['delete_ids'])
            ? $options['delete_ids']
            : array();

        if (!empty($delete_ids)) {
            foreach ($delete_ids as $delete_id) {
                $delete_id = sanitize_text_field($delete_id);
                if ($delete_id === '' || !isset($existing[$delete_id])) {
                    continue;
                }
                wp_trash_post($existing[$delete_id]);
                unset($existing[$delete_id]);
            }
        }

        $used_ids = array();
        $saved_ads = array();

        foreach ($ads as $index => $ad) {
            $ad_id = isset($ad['id']) ? sanitize_text_field($ad['id']) : '';
            $post_id = $ad_id && isset($existing[$ad_id]) ? $existing[$ad_id] : 0;
            $title = isset($ad['name']) && $ad['name'] !== '' ? $ad['name'] : __('未命名广告', 'magick-ad');

            $status = isset($ad['status']) ? sanitize_text_field($ad['status']) : '';
            if (!in_array($status, array('publish', 'draft', 'future', 'private'), true)) {
                $status = '';
            }
            if (isset($ad['options']['enabled']) && !$ad['options']['enabled']) {
                $status = 'draft';
            }

            $post_data = array(
                'ID' => $post_id,
                'post_type' => self::POST_TYPE,
                'post_status' => $status ? $status : 'publish',
                'post_title' => $title,
                'menu_order' => $index,
            );

            $date = isset($ad['date']) ? self::sanitize_datetime($ad['date']) : '';
            if ($post_data['post_status'] === 'future' && !$date) {
                $date = date_i18n('Y-m-d H:i:s', current_time('timestamp') + HOUR_IN_SECONDS);
            }
            if ($date) {
                $post_data['post_date'] = $date;
                $post_data['post_date_gmt'] = get_gmt_from_date($date);
            }

            if ($post_id) {
                $post_id = wp_update_post($post_data, true);
            } else {
                $post_data['post_author'] = get_current_user_id();
                $post_id = wp_insert_post($post_data, true);
            }

            if (is_wp_error($post_id)) {
                return $post_id;
            }

            if (!$ad_id) {
                $ad_id = 'ad_' . $post_id;
            }

            update_post_meta($post_id, self::META_ID, $ad_id);
            $ad['id'] = $ad_id;
            $ad['name'] = $title;
            $ad['status'] = get_post_status($post_id);
            $ad['date'] = get_post_field('post_date', $post_id);
            $ad['date_gmt'] = get_post_field('post_date_gmt', $post_id);
            $meta_payload = $ad;
            unset($meta_payload['status'], $meta_payload['date'], $meta_payload['date_gmt']);
            update_post_meta($post_id, self::META_DATA, $meta_payload);
            delete_post_meta($post_id, '_magick_ad_slot');

            $used_ids[] = $post_id;
            $saved_ads[] = $ad;
        }

        $all_ids = self::get_all_ids();
        if ($replace_all) {
            foreach ($all_ids as $post_id) {
                if (!in_array($post_id, $used_ids, true)) {
                    wp_trash_post($post_id);
                }
            }
        }

        wp_cache_delete('magick_ad_known_ads', 'magick_ad');

        return $saved_ads;
    }

    private static function get_existing_map(): array {
        $posts = self::get_all_ids();
        if (!empty($posts)) {
            update_meta_cache('post', $posts);
        }
        $map = array();
        foreach ($posts as $post_id) {
            $ad_id = get_post_meta($post_id, self::META_ID, true);
            if (!$ad_id) {
                $ad_id = 'ad_' . $post_id;
                update_post_meta($post_id, self::META_ID, $ad_id);
            }
            $map[$ad_id] = $post_id;
        }
        return $map;
    }

    private static function get_all_ids(): array {
        return get_posts(
            array(
                'post_type' => self::POST_TYPE,
                'post_status' => array('publish', 'draft', 'future', 'private'),
                'numberposts' => -1,
                'fields' => 'ids',
            )
        );
    }

    public static function sanitize_meta_data($value): array {
        if (!is_array($value)) {
            return array();
        }
        return $value;
    }

    public static function can_manage_meta(): bool {
        return Capabilities::current_user_can_manage();
    }

    public static function columns(array $columns): array {
        $next = array();
        if (isset($columns['cb'])) {
            $next['cb'] = $columns['cb'];
        }
        $next['title'] = __('广告名称', 'magick-ad');
        $next['magick_ad_status'] = __('排期状态', 'magick-ad');
        $next['magick_ad_enabled'] = __('启用状态', 'magick-ad');
        $next['magick_ad_type'] = __('素材/容器', 'magick-ad');
        $next['magick_ad_placement'] = __('投放位置', 'magick-ad');
        $next['magick_ad_slot'] = __('Slot', 'magick-ad');
        $next['date'] = $columns['date'] ?? __('日期', 'magick-ad');
        return $next;
    }

    public static function render_column(string $column, int $post_id): void {
        $data = get_post_meta($post_id, self::META_DATA, true);
        if (!is_array($data)) {
            $data = array();
        }
        $options = isset($data['options']) && is_array($data['options']) ? $data['options'] : array();

        if ($column === 'magick_ad_enabled') {
            $status = get_post_status($post_id);
            $enabled = isset($options['enabled']) ? (bool) $options['enabled'] : true;
            if ($status !== 'publish') {
                $enabled = false;
            }
            echo $enabled ? esc_html__('启用', 'magick-ad') : esc_html__('停用', 'magick-ad');
            return;
        }

        if ($column === 'magick_ad_status') {
            $status = get_post_status($post_id);
            if ($status === 'future') {
                echo esc_html__('已排期', 'magick-ad');
                return;
            }
            if ($status === 'publish') {
                echo esc_html__('已发布', 'magick-ad');
                return;
            }
            echo esc_html__('草稿/停用', 'magick-ad');
            return;
        }

        if ($column === 'magick_ad_type') {
            $creative = isset($options['creative_type']) ? $options['creative_type'] : 'image';
            $container = isset($options['container_type']) ? $options['container_type'] : 'inline';
            echo esc_html($creative . ' / ' . $container);
            return;
        }

        if ($column === 'magick_ad_placement') {
            $hook = isset($options['placement_hook']) ? $options['placement_hook'] : '';
            $position = isset($options['placement_position']) ? $options['placement_position'] : '';
            $paragraph = isset($options['placement_paragraph']) ? absint($options['placement_paragraph']) : 0;
            $label = $hook;
            if ($hook === 'content') {
                $label = 'content_' . ($position ? $position : 'before');
                if ($position === 'paragraph') {
                    $label = 'paragraph_' . ($paragraph ?: 2);
                }
            }
            if ($hook === 'node') {
                $node_type = isset($options['node_target_type']) ? $options['node_target_type'] : 'id';
                $node_value = isset($options['node_target_value']) ? $options['node_target_value'] : '';
                $prefix = $node_type === 'class' ? '.' : '#';
                $label = 'node ' . $prefix . $node_value;
            }
            echo esc_html($label ?: '-');
            return;
        }

        if ($column === 'magick_ad_slot') {
            $ad_id = get_post_meta($post_id, self::META_ID, true);
            if (!$ad_id && isset($data['id'])) {
                $ad_id = (string) $data['id'];
            }
            $slot_labels = array();
            $slots = Slots::get_slots();
            foreach ($slots as $slot) {
                if (!is_array($slot) || empty($slot['id']) || empty($slot['ad_ids'])) {
                    continue;
                }
                if ($ad_id && in_array($ad_id, $slot['ad_ids'], true)) {
                    $slot_labels[] = (string) $slot['id'];
                }
            }
            if (empty($slot_labels)) {
                echo '-';
                return;
            }
            echo esc_html(implode(', ', $slot_labels));
        }
    }

    private static function sanitize_status($value): string {
        $value = is_string($value) ? $value : '';
        return in_array($value, array('publish', 'draft', 'future', 'private'), true)
            ? $value
            : 'publish';
    }

    private static function sanitize_datetime($value): string {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '') {
            return '';
        }
        $timestamp = strtotime($value);
        if ($timestamp === false) {
            return '';
        }
        return date('Y-m-d H:i:s', $timestamp);
    }
}
