<?php

namespace MagickAD\Data;

use WP_Error;

if (!defined('ABSPATH')) {
    exit;
}

final class Settings {
    use Settings_Runtime_Cache_Trait;
    use Settings_Sanitization_Trait;

    public const OPTION_KEY = 'magick_ad_settings';
    public const RUNTIME_OPTION_KEY = 'magick_ad_runtime_settings';
    public const RUNTIME_REV_KEY = 'magick_ad_settings_rev';
    private const RUNTIME_CACHE_GROUP = 'magick_ad';
    private const RUNTIME_CACHE_PREFIX = 'magick_ad_runtime_settings_';
    private const RUNTIME_LOCK_KEY = 'magick_ad_runtime_lock';
    private const USAGE_TYPES = array('ad', 'promo', 'decorative');

    public static function get_settings(): array {
        return Ads::get_settings();
    }

    public static function sanitize_settings($settings): array {
        $ads = array();
        if (isset($settings['ads']) && is_array($settings['ads'])) {
            foreach ($settings['ads'] as $ad) {
                $ads[] = self::sanitize_ad($ad);
            }
        }

        $slots = array();
        if (isset($settings['slots']) && is_array($settings['slots'])) {
            $slots = self::sanitize_slots($settings['slots']);
        }

        return array(
            'ads' => $ads,
            'slots' => $slots,
        );
    }

    public static function validate_settings(array $settings) {
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
        $seen_ids = array();
        foreach ($ads as $ad) {
            $ad_id = isset($ad['id']) ? sanitize_text_field($ad['id']) : '';
            if ($ad_id === '') {
                return new WP_Error(
                    'magick_ad_missing_ad_id',
                    'ad_id is required for each ad.',
                    array('status' => 400)
                );
            }
            if (!preg_match('/^[a-z0-9_]+$/', $ad_id)) {
                return new WP_Error(
                    'magick_ad_invalid_ad_id',
                    'ad_id must match [a-z0-9_]+.',
                    array('status' => 400, 'ad_id' => $ad_id)
                );
            }
            if (isset($seen_ids[$ad_id])) {
                return new WP_Error(
                    'magick_ad_duplicate_ad_id',
                    'ad_id must be unique.',
                    array('status' => 400, 'ad_id' => $ad_id)
                );
            }
            $seen_ids[$ad_id] = true;
            $options = isset($ad['options']) ? $ad['options'] : array();
            if (empty($options['placement_hook'])) {
                return new WP_Error(
                    'magick_ad_missing_position',
                    'placement_hook is required for each ad.',
                    array('status' => 400)
                );
            }
            $render_profile = isset($options['render_profile']) ? $options['render_profile'] : 'minimal';
            if (!in_array($render_profile, array('inherit', 'minimal', 'isolated'), true)) {
                return new WP_Error(
                    'magick_ad_invalid_render_profile',
                    'render_profile is invalid.',
                    array('status' => 400)
                );
            }
            if ($options['placement_hook'] === 'content') {
                $position = isset($options['placement_position']) ? $options['placement_position'] : '';
                if (!$position) {
                    return new WP_Error(
                        'magick_ad_missing_position',
                        'placement_position is required for content placement.',
                        array('status' => 400)
                    );
                }
                if ($position === 'paragraph') {
                    $paragraph = isset($options['placement_paragraph']) ? absint($options['placement_paragraph']) : 0;
                    if ($paragraph < 1) {
                        return new WP_Error(
                            'magick_ad_invalid_paragraph',
                            'placement_paragraph must be >= 1.',
                            array('status' => 400)
                        );
                    }
                }
            }
            if ($options['placement_hook'] === 'node') {
                $target_type = isset($options['node_target_type']) ? $options['node_target_type'] : '';
                $target_value = isset($options['node_target_value']) ? $options['node_target_value'] : '';
                $insert_mode = isset($options['node_insert']) ? $options['node_insert'] : '';
                $match_mode = isset($options['node_match']) ? $options['node_match'] : '';
                $fallback = isset($options['node_fallback']) ? $options['node_fallback'] : '';
                if (!in_array($target_type, array('id', 'class'), true)) {
                    return new WP_Error(
                        'magick_ad_invalid_node_type',
                        'node_target_type must be id or class.',
                        array('status' => 400)
                    );
                }
                if (!$target_value || !preg_match('/^[A-Za-z_][A-Za-z0-9_-]*$/', $target_value)) {
                    return new WP_Error(
                        'magick_ad_invalid_node_value',
                        'node_target_value is invalid.',
                        array('status' => 400)
                    );
                }
                if (!in_array($insert_mode, array('append', 'prepend', 'before', 'after'), true)) {
                    return new WP_Error(
                        'magick_ad_invalid_node_insert',
                        'node_insert is invalid.',
                        array('status' => 400)
                    );
                }
                if (!in_array($match_mode, array('first', 'nth', 'all'), true)) {
                    return new WP_Error(
                        'magick_ad_invalid_node_match',
                        'node_match is invalid.',
                        array('status' => 400)
                    );
                }
                if ($match_mode === 'nth') {
                    $index = isset($options['node_index']) ? absint($options['node_index']) : 0;
                    if ($index < 1) {
                        return new WP_Error(
                            'magick_ad_invalid_node_index',
                            'node_index must be >= 1.',
                            array('status' => 400)
                        );
                    }
                }
                if (!in_array($fallback, array('hide', 'footer'), true)) {
                    return new WP_Error(
                        'magick_ad_invalid_node_fallback',
                        'node_fallback is invalid.',
                        array('status' => 400)
                    );
                }
            }
        }

        return true;
    }

    public static function sanitize_choice($value, array $allowed, string $default): string {
        $value = is_string($value) ? $value : '';
        return in_array($value, $allowed, true) ? $value : $default;
    }

    public static function sanitize_slots($slots): array {
        if (!is_array($slots)) {
            return array();
        }
        $sanitized = array();
        $used = array();
        foreach ($slots as $slot) {
            if (!is_array($slot)) {
                continue;
            }
            $raw_id = isset($slot['id']) ? (string) $slot['id'] : '';
            $id = sanitize_title($raw_id);
            if ($id === '') {
                continue;
            }
            $id = self::unique_slot($id, $used);
            $used[$id] = true;
            $label = isset($slot['label']) ? sanitize_text_field($slot['label']) : '';
            if ($label === '') {
                $label = $id;
            }
            $ad_ids = self::sanitize_ad_ids(isset($slot['ad_ids']) ? $slot['ad_ids'] : array());
            $weights = self::sanitize_weights(
                isset($slot['weights']) ? $slot['weights'] : array(),
                count($ad_ids)
            );
            $limit = isset($slot['limit']) ? max(1, absint($slot['limit'])) : 1;
            $sanitized[] = array(
                'id' => $id,
                'label' => $label,
                'ad_ids' => $ad_ids,
                'weights' => $weights,
                'limit' => $limit,
            );
        }
        return $sanitized;
    }

}
