<?php

namespace MagickAD\Data;

use WP_Error;

if (!defined('ABSPATH')) {
    exit;
}

final class Settings {
    public const OPTION_KEY = 'magick_ad_settings';

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

        return array('ads' => $ads);
    }

    public static function validate_settings(array $settings) {
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
        $slots = array();
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            if (empty($options['placement_hook'])) {
                return new WP_Error(
                    'magick_ad_missing_position',
                    'placement_hook is required for each ad.',
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
            $slot = isset($options['slot']) ? (string) $options['slot'] : '';
            if ($slot !== '') {
                $slot = sanitize_title($slot);
                if ($slot !== '') {
                    if (isset($slots[$slot])) {
                        return new WP_Error(
                            'magick_ad_duplicate_slot',
                            sprintf('slot "%s" is duplicated.', $slot),
                            array('status' => 400, 'slot' => $slot)
                        );
                    }
                    $slots[$slot] = true;
                }
            }
        }

        return true;
    }

    public static function sanitize_choice($value, array $allowed, string $default): string {
        $value = is_string($value) ? $value : '';
        return in_array($value, $allowed, true) ? $value : $default;
    }

    private static function sanitize_node_target_value($value): string {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '') {
            return '';
        }
        if (!preg_match('/^[A-Za-z_][A-Za-z0-9_-]*$/', $value)) {
            return '';
        }
        return $value;
    }

    private static function normalize_placement(array $options): array {
        $hook = isset($options['placement_hook']) ? (string) $options['placement_hook'] : '';
        $position = isset($options['placement_position']) ? (string) $options['placement_position'] : '';
        $paragraph = isset($options['placement_paragraph']) ? absint($options['placement_paragraph']) : 0;
        $legacy = '';

        if (in_array($hook, array('popup', 'bar', 'banner', 'floating', 'interstitial'), true)) {
            $legacy = $hook;
            $hook = '';
        }
        if ($hook === '') {
            if (isset($options['show_position']) && is_string($options['show_position'])) {
                $legacy = $options['show_position'];
            } elseif (isset($options['placement']) && is_string($options['placement'])) {
                $legacy = $options['placement'];
            } elseif (isset($options['position']) && is_string($options['position'])) {
                $legacy = $options['position'];
            }
        }

        $hook = self::sanitize_choice(
            $hook,
            array(
                '',
                'content',
                'head',
                'footer',
                'body_top',
                'loop_before',
                'loop_after',
                'comments_top',
                'comments_bottom',
                'comment_form_before',
                'comment_form_after',
                'node',
            ),
            ''
        );

        if ($hook === '' && $legacy !== '') {
            $legacy = (string) $legacy;
            $legacy_map = array(
                'head' => array('hook' => 'head'),
                'footer' => array('hook' => 'footer'),
                'body_top' => array('hook' => 'body_top'),
                'top' => array('hook' => 'body_top'),
                'content_before' => array('hook' => 'content', 'position' => 'before'),
                'before' => array('hook' => 'content', 'position' => 'before'),
                'content_after' => array('hook' => 'content', 'position' => 'after'),
                'after' => array('hook' => 'content', 'position' => 'after'),
                'paragraph' => array('hook' => 'content', 'position' => 'paragraph'),
                'after_paragraph' => array('hook' => 'content', 'position' => 'paragraph'),
                'comments_top' => array('hook' => 'comments_top'),
                'comments_bottom' => array('hook' => 'comments_bottom'),
                'comment_form_before' => array('hook' => 'comment_form_before'),
                'comment_form_after' => array('hook' => 'comment_form_after'),
                'node' => array('hook' => 'node'),
                'popup' => array('hook' => 'footer'),
                'bar' => array('hook' => 'footer'),
                'banner' => array('hook' => 'footer'),
                'floating' => array('hook' => 'footer'),
                'interstitial' => array('hook' => 'footer'),
            );
            if (isset($legacy_map[$legacy])) {
                $hook = $legacy_map[$legacy]['hook'];
                $position = $legacy_map[$legacy]['position'] ?? '';
            }
        }

        $position = $hook === 'content'
            ? self::sanitize_choice($position, array('before', 'after', 'paragraph'), 'before')
            : '';

        if ($hook === 'content' && $position === 'paragraph') {
            if ($paragraph < 1) {
                $paragraph = 2;
            }
        } else {
            $paragraph = 0;
        }

        return array(
            'hook' => $hook,
            'position' => $position,
            'paragraph' => $paragraph,
        );
    }

    private static function sanitize_ad($ad): array {
        $ad = is_array($ad) ? $ad : array();
        $options = isset($ad['options']) && is_array($ad['options']) ? $ad['options'] : array();
        $content = isset($ad['content']) && is_array($ad['content']) ? $ad['content'] : array();
        $image = isset($content['image']) && is_array($content['image']) ? $content['image'] : array();
        $container_style = isset($content['container_style']) && is_array($content['container_style'])
            ? $content['container_style']
            : array();
        $behavior = isset($content['behavior']) && is_array($content['behavior'])
            ? $content['behavior']
            : array();

        $legacy_container = '';
        if (isset($options['placement_hook']) && is_string($options['placement_hook'])) {
            $legacy_container = $options['placement_hook'];
        }
        if ($legacy_container === '' && isset($options['show_position']) && is_string($options['show_position'])) {
            $legacy_container = $options['show_position'];
        }
        if ($legacy_container === '' && isset($options['placement']) && is_string($options['placement'])) {
            $legacy_container = $options['placement'];
        }
        $legacy_container = in_array($legacy_container, array('popup', 'bar', 'banner', 'floating', 'interstitial'), true)
            ? $legacy_container
            : '';
        if ($legacy_container === 'bar') {
            $legacy_container = 'banner';
        }

        $sanitized_options = array(
            'enabled' => isset($options['enabled']) ? (bool) $options['enabled'] : true,
            'ad_type' => self::sanitize_choice(
                isset($options['ad_type']) ? $options['ad_type'] : 'global',
                array('global', 'targeted'),
                'global'
            ),
            'creative_type' => self::sanitize_choice(
                isset($options['creative_type'])
                    ? $options['creative_type']
                    : (isset($options['content_type'])
                        ? ($options['content_type'] === 'popup' || $options['content_type'] === 'bar'
                            ? 'html'
                            : $options['content_type'])
                        : 'image'),
                array('html', 'image', 'video', 'block'),
                'image'
            ),
            'container_type' => self::sanitize_choice(
                isset($options['container_type'])
                    ? $options['container_type']
                    : ($legacy_container !== ''
                        ? $legacy_container
                        : (isset($options['content_type']) && $options['content_type'] === 'popup'
                            ? 'popup'
                            : (isset($options['content_type']) && $options['content_type'] === 'bar'
                                ? 'banner'
                                : 'inline'))),
                array('inline', 'popup', 'banner', 'floating', 'interstitial'),
                'inline'
            ),
            'show_page' => self::sanitize_choice(
                isset($options['show_page']) ? $options['show_page'] : 'all',
                array('all', 'home', 'posts', 'pages', 'category', 'tag', 'search', '404', 'author', 'archive'),
                'all'
            ),
            'display_mode' => self::sanitize_choice(
                isset($options['display_mode']) ? $options['display_mode'] : 'show',
                array('show', 'random', 'hide'),
                'show'
            ),
            'random_strategy' => self::sanitize_choice(
                isset($options['random_strategy']) ? $options['random_strategy'] : 'request',
                array('request', 'session', 'cookie'),
                'request'
            ),
            'html_mode' => self::sanitize_choice(
                isset($options['html_mode']) ? $options['html_mode'] : 'safe',
                array('safe', 'full'),
                'safe'
            ),
            'editor_mode' => self::sanitize_choice(
                isset($options['editor_mode']) ? $options['editor_mode'] : 'design',
                array('quick', 'design', 'expert'),
                'design'
            ),
            'device' => self::sanitize_choice(
                isset($options['device']) ? $options['device'] : 'all',
                array('all', 'mobile', 'tablet', 'desktop'),
                'all'
            ),
            'login' => self::sanitize_choice(
                isset($options['login']) ? $options['login'] : 'all',
                array('all', 'logged-in', 'logged-out'),
                'all'
            ),
            'end_date' => self::sanitize_date(isset($options['end_date']) ? $options['end_date'] : ''),
            'target_type' => self::sanitize_choice(
                isset($options['target_type']) ? $options['target_type'] : '',
                array('posts', 'pages', 'category', 'tag', 'author'),
                ''
            ),
            'target_ids' => self::sanitize_ids(isset($options['target_ids']) ? $options['target_ids'] : array()),
            'slot_mode' => self::sanitize_choice(
                isset($options['slot_mode']) ? $options['slot_mode'] : 'auto',
                array('auto', 'manual'),
                'auto'
            ),
            'slot' => isset($options['slot']) ? sanitize_title((string) $options['slot']) : '',
            'node_target_type' => self::sanitize_choice(
                isset($options['node_target_type']) ? $options['node_target_type'] : 'id',
                array('id', 'class'),
                'id'
            ),
            'node_target_value' => self::sanitize_node_target_value(
                isset($options['node_target_value']) ? $options['node_target_value'] : ''
            ),
            'node_insert' => self::sanitize_choice(
                isset($options['node_insert']) ? $options['node_insert'] : 'append',
                array('append', 'prepend', 'before', 'after'),
                'append'
            ),
            'node_match' => self::sanitize_choice(
                isset($options['node_match']) ? $options['node_match'] : 'first',
                array('first', 'nth', 'all'),
                'first'
            ),
            'node_index' => isset($options['node_index']) ? max(1, absint($options['node_index'])) : 1,
            'node_fallback' => self::sanitize_choice(
                isset($options['node_fallback']) ? $options['node_fallback'] : 'hide',
                array('hide', 'footer'),
                'hide'
            ),
            'node_compact' => isset($options['node_compact']) ? (bool) $options['node_compact'] : true,
        );

        $placement = self::normalize_placement($options);
        $sanitized_options['placement_hook'] = $placement['hook'];
        $sanitized_options['placement_position'] = $placement['position'];
        $sanitized_options['placement_paragraph'] = $placement['paragraph'];

        $raw_blocks = isset($content['blocks']) && is_string($content['blocks']) ? $content['blocks'] : '';
        $blocks_value = $raw_blocks;
        if (!current_user_can('unfiltered_html')) {
            $blocks_value = wp_kses_post($raw_blocks);
        }

        $raw_html = isset($content['html']) && is_string($content['html']) ? $content['html'] : '';
        $html_value = $raw_html;
        $html_mode = isset($sanitized_options['html_mode']) ? $sanitized_options['html_mode'] : 'safe';
        if ($html_mode !== 'full' || !current_user_can('unfiltered_html')) {
            $html_value = wp_kses_post($raw_html);
            if ($html_mode === 'full') {
                $sanitized_options['html_mode'] = 'safe';
            }
        }

        $custom_html = isset($content['custom_html']) && is_string($content['custom_html'])
            ? $content['custom_html']
            : '';
        $custom_css = isset($content['custom_css']) && is_string($content['custom_css'])
            ? $content['custom_css']
            : '';
        if (!current_user_can('unfiltered_html')) {
            $custom_html = '';
            $custom_css = '';
        }

        $sanitized_content = array(
            'html' => $html_value,
            'blocks' => $blocks_value,
            'video_url' => isset($content['video_url']) ? esc_url_raw($content['video_url']) : '',
            'link' => isset($content['link']) ? esc_url_raw($content['link']) : '',
            'link_target' => !empty($content['link_target']),
            'cta_text' => isset($content['cta_text']) ? sanitize_text_field($content['cta_text']) : '',
            'custom_html' => $custom_html,
            'custom_css' => $custom_css,
            'image' => array(
                'id' => isset($image['id']) ? absint($image['id']) : 0,
                'url' => isset($image['url']) ? esc_url_raw($image['url']) : '',
                'alt' => isset($image['alt']) ? sanitize_text_field($image['alt']) : '',
            ),
            'container_style' => array(
                'mode' => self::sanitize_choice(
                    isset($container_style['mode']) ? $container_style['mode'] : 'boxed',
                    array('boxed', 'raw'),
                    'boxed'
                ),
                'max_width' => isset($container_style['max_width']) ? absint($container_style['max_width']) : 100,
                'max_width_unit' => self::sanitize_choice(
                    isset($container_style['max_width_unit']) ? $container_style['max_width_unit'] : '%',
                    array('%', 'px'),
                    '%'
                ),
                'reserve_height' => isset($container_style['reserve_height']) ? absint($container_style['reserve_height']) : 0,
                'padding_top' => isset($container_style['padding_top']) ? absint($container_style['padding_top']) : 0,
                'padding_right' => isset($container_style['padding_right']) ? absint($container_style['padding_right']) : 0,
                'padding_bottom' => isset($container_style['padding_bottom']) ? absint($container_style['padding_bottom']) : 0,
                'padding_left' => isset($container_style['padding_left']) ? absint($container_style['padding_left']) : 0,
                'background' => self::sanitize_color(isset($container_style['background']) ? $container_style['background'] : 'transparent'),
                'radius' => isset($container_style['radius']) ? absint($container_style['radius']) : 0,
                'shadow' => self::sanitize_choice(
                    isset($container_style['shadow']) ? $container_style['shadow'] : 'none',
                    array('none', 'soft', 'float'),
                    'none'
                ),
                'badge_enabled' => !empty($container_style['badge_enabled']),
                'badge_text' => self::sanitize_choice(
                    isset($container_style['badge_text']) ? $container_style['badge_text'] : '广告',
                    array('广告', '推广'),
                    '广告'
                ),
                'badge_color' => self::sanitize_color(isset($container_style['badge_color']) ? $container_style['badge_color'] : '#1d2327'),
                'layout' => self::sanitize_choice(
                    isset($container_style['layout']) ? $container_style['layout'] : '',
                    array('', 'centered'),
                    ''
                ),
            ),
            'behavior' => array(
                'animation' => self::sanitize_choice(
                    isset($behavior['animation']) ? $behavior['animation'] : 'none',
                    array('none', 'fade', 'slide-up', 'zoom'),
                    'none'
                ),
                'close_button' => !empty($behavior['close_button']),
                'close_on_esc' => array_key_exists('close_on_esc', $behavior) ? (bool) $behavior['close_on_esc'] : true,
                'close_on_overlay' => array_key_exists('close_on_overlay', $behavior)
                    ? (bool) $behavior['close_on_overlay']
                    : true,
                'lock_scroll' => !empty($behavior['lock_scroll']),
                'frequency_mode' => self::sanitize_choice(
                    isset($behavior['frequency_mode']) ? $behavior['frequency_mode'] : 'none',
                    array('none', 'session', 'day', 'count'),
                    'none'
                ),
                'frequency_limit' => isset($behavior['frequency_limit']) ? max(1, absint($behavior['frequency_limit'])) : 1,
                'delay' => isset($behavior['delay']) ? absint($behavior['delay']) : 0,
            ),
            'image_settings' => array(
                'watermark' => !empty($content['image_settings']['watermark']),
                'radius' => isset($content['image_settings']['radius']) ? absint($content['image_settings']['radius']) : 0,
                'max_width' => isset($content['image_settings']['max_width']) ? absint($content['image_settings']['max_width']) : 1200,
                'margin_top' => isset($content['image_settings']['margin_top']) ? absint($content['image_settings']['margin_top']) : 0,
                'margin_bottom' => isset($content['image_settings']['margin_bottom']) ? absint($content['image_settings']['margin_bottom']) : 0,
                'margin_left' => isset($content['image_settings']['margin_left']) ? absint($content['image_settings']['margin_left']) : 0,
                'margin_right' => isset($content['image_settings']['margin_right']) ? absint($content['image_settings']['margin_right']) : 0,
            ),
        );

        if (($sanitized_options['placement_hook'] ?? '') === 'head') {
            $sanitized_content['container_style']['mode'] = 'raw';
        }

        return array(
            'id' => isset($ad['id']) ? sanitize_text_field($ad['id']) : '',
            'name' => isset($ad['name']) ? sanitize_text_field($ad['name']) : '',
            'options' => $sanitized_options,
            'content' => $sanitized_content,
        );
    }

    private static function sanitize_color($value): string {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '' || $value === 'transparent') {
            return 'transparent';
        }
        if (preg_match('/^#([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i', $value)) {
            return $value;
        }
        if (preg_match('/^rgba?\(([^)]+)\)$/i', $value)) {
            return $value;
        }
        return 'transparent';
    }

    private static function sanitize_date($value): string {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '') {
            return '';
        }
        $timestamp = strtotime($value);
        if ($timestamp === false) {
            return '';
        }
        return date('Y-m-d', $timestamp);
    }

    private static function sanitize_ids($value): array {
        if (!is_array($value)) {
            return array();
        }
        $ids = array();
        foreach ($value as $id) {
            $id = absint($id);
            if ($id > 0) {
                $ids[] = $id;
            }
        }
        return array_values(array_unique($ids));
    }
}
