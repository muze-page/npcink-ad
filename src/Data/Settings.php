<?php

namespace MagickAD\Data;

use WP_Error;

if (!defined('ABSPATH')) {
    exit;
}

final class Settings {
    public const OPTION_KEY = 'magick_ad_settings';

    public static function get_settings(): array {
        $settings = get_option(self::OPTION_KEY, array('ads' => array()));
        if (!is_array($settings)) {
            $settings = array('ads' => array());
        }
        if (!isset($settings['ads']) || !is_array($settings['ads'])) {
            $settings['ads'] = array();
        }

        return $settings;
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
        }

        return true;
    }

    public static function sanitize_choice($value, array $allowed, string $default): string {
        $value = is_string($value) ? $value : '';
        return in_array($value, $allowed, true) ? $value : $default;
    }

    private static function normalize_placement(array $options): array {
        $hook = isset($options['placement_hook']) ? (string) $options['placement_hook'] : '';
        $position = isset($options['placement_position']) ? (string) $options['placement_position'] : '';
        $paragraph = isset($options['placement_paragraph']) ? absint($options['placement_paragraph']) : 0;

        if (!$hook) {
            $legacy = isset($options['show_position']) ? (string) $options['show_position'] : '';
            switch ($legacy) {
                case 'head':
                    $hook = 'head';
                    break;
                case 'top':
                    $hook = 'body_top';
                    break;
                case 'footer':
                case 'bottom':
                case 'popup':
                case 'bar':
                    $hook = 'footer';
                    break;
                case 'content_before':
                case 'post_top':
                    $hook = 'content';
                    $position = 'before';
                    break;
                case 'content_after':
                case 'post_bottom':
                    $hook = 'content';
                    $position = 'after';
                    break;
                case 'paragraph_3':
                    $hook = 'content';
                    $position = 'paragraph';
                    $paragraph = 3;
                    break;
                case 'content':
                    $hook = 'content';
                    $position = 'paragraph';
                    $paragraph = isset($options['insert_after']) ? absint($options['insert_after']) : 2;
                    break;
                case 'comments_top':
                    $hook = 'comments_top';
                    break;
                case 'comments_bottom':
                    $hook = 'comments_bottom';
                    break;
                case 'comment_form_before':
                    $hook = 'comment_form_before';
                    break;
                case 'comment_form_after':
                    $hook = 'comment_form_after';
                    break;
            }
        }

        $hook = self::sanitize_choice(
            $hook,
            array(
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
            ),
            ''
        );

        $position = $hook === 'content'
            ? self::sanitize_choice($position, array('before', 'after', 'paragraph'), 'before')
            : '';

        if ($hook === 'content' && $position === 'paragraph' && $paragraph < 1) {
            $paragraph = 2;
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
                    : (isset($options['content_type']) && $options['content_type'] === 'popup'
                        ? 'popup'
                        : (isset($options['content_type']) && $options['content_type'] === 'bar'
                            ? 'banner'
                            : (isset($options['show_position']) && $options['show_position'] === 'popup'
                                ? 'popup'
                                : (isset($options['show_position']) && $options['show_position'] === 'bar'
                                    ? 'banner'
                                    : 'inline')))),
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
            'show_position' => self::sanitize_choice(
                isset($options['show_position']) ? $options['show_position'] : '',
                array(
                    'top',
                    'content_before',
                    'content_after',
                    'bottom',
                    'post_top',
                    'paragraph_3',
                    'post_bottom',
                    'comments_top',
                    'comment_form_before',
                    'comment_form_after',
                    'comments_bottom',
                    'head',
                    'footer',
                    'content',
                    'popup',
                    'bar',
                ),
                ''
            ),
            'insert_after' => isset($options['insert_after']) ? absint($options['insert_after']) : 2,
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

        $sanitized_content = array(
            'html' => $html_value,
            'blocks' => $blocks_value,
            'video_url' => isset($content['video_url']) ? esc_url_raw($content['video_url']) : '',
            'link' => isset($content['link']) ? esc_url_raw($content['link']) : '',
            'link_target' => !empty($content['link_target']),
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
