<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

trait Settings_Sanitization_Trait {
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

    private static function default_non_critical_delay(string $container_type): int {
        $delay = in_array($container_type, array('popup', 'banner', 'floating', 'interstitial'), true)
            ? 1
            : 0;
        $delay = (int) apply_filters('magick_ad_default_non_critical_delay', $delay, $container_type);
        if ($delay < 0) {
            $delay = 0;
        }
        if ($delay > 120) {
            $delay = 120;
        }
        return $delay;
    }

    private static function default_reserve_height(string $container_type, string $creative_type, array $content): int {
        if ($container_type !== 'inline') {
            return 0;
        }

        if ($creative_type === 'video') {
            return 0;
        }

        if ($creative_type === 'image') {
            $image = isset($content['image']) && is_array($content['image'])
                ? $content['image']
                : array();
            $width = isset($image['width']) ? absint($image['width']) : 0;
            $height = isset($image['height']) ? absint($image['height']) : 0;
            if ($width > 0 && $height > 0) {
                return 0;
            }
        }

        if ($creative_type === 'html') {
            $ratio = isset($content['html_placeholder_ratio'])
                ? (string) $content['html_placeholder_ratio']
                : '';
            if ($ratio !== '' && preg_match('/^\\d{1,3}:\\d{1,3}$/', $ratio)) {
                return 0;
            }
        }

        $fallback = match ($creative_type) {
            'image' => 180,
            'block' => 160,
            default => 120,
        };

        $fallback = (int) apply_filters(
            'magick_ad_default_reserve_height',
            $fallback,
            $container_type,
            $creative_type,
            $content
        );
        if ($fallback < 0) {
            $fallback = 0;
        }
        if ($fallback > 2000) {
            $fallback = 2000;
        }
        return $fallback;
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
            'html_sandbox' => self::sanitize_choice(
                isset($options['html_sandbox']) ? $options['html_sandbox'] : 'inherit',
                array('inherit', 'enable', 'disable'),
                'inherit'
            ),
            'render_profile' => self::sanitize_choice(
                isset($options['render_profile']) ? $options['render_profile'] : 'minimal',
                array('inherit', 'minimal', 'isolated'),
                'minimal'
            ),
            'editor_mode' => self::sanitize_choice(
                isset($options['editor_mode']) ? $options['editor_mode'] : 'design',
                array('quick', 'design', 'expert'),
                'design'
            ),
            'usage_type' => self::sanitize_choice(
                isset($options['usage_type']) ? $options['usage_type'] : 'ad',
                self::USAGE_TYPES,
                'ad'
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
            'start_date' => self::sanitize_datetime(isset($options['start_date']) ? $options['start_date'] : ''),
            'end_date' => self::sanitize_date(isset($options['end_date']) ? $options['end_date'] : ''),
            'target_type' => self::sanitize_choice(
                isset($options['target_type']) ? $options['target_type'] : '',
                array('posts', 'pages', 'category', 'tag', 'author'),
                ''
            ),
            'target_ids' => self::sanitize_ids(isset($options['target_ids']) ? $options['target_ids'] : array()),
            'priority' => isset($options['priority']) ? max(1, absint($options['priority'])) : 10,
            'weight' => isset($options['weight']) ? max(1, absint($options['weight'])) : 1,
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
            'render_require_consent' => !empty($options['render_require_consent']),
        );

        $placement = self::normalize_placement($options);
        $sanitized_options['placement_hook'] = $placement['hook'];
        $sanitized_options['placement_position'] = $placement['position'];
        $sanitized_options['placement_paragraph'] = $placement['paragraph'];
        $default_delay = self::default_non_critical_delay((string) $sanitized_options['container_type']);

        $raw_blocks = isset($content['blocks']) && is_string($content['blocks']) ? $content['blocks'] : '';
        $blocks_value = $raw_blocks;
        if (!current_user_can('unfiltered_html')) {
            $blocks_value = wp_kses_post($raw_blocks);
        }

        $can_unfiltered = current_user_can('unfiltered_html');

        $raw_html = isset($content['html']) && is_string($content['html']) ? $content['html'] : '';
        $html_value = $raw_html;
        $html_mode = isset($sanitized_options['html_mode']) ? $sanitized_options['html_mode'] : 'safe';
        if ($html_mode !== 'full' || !$can_unfiltered) {
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
        $custom_js = isset($content['custom_js']) && is_string($content['custom_js'])
            ? $content['custom_js']
            : '';
        if (!$can_unfiltered) {
            $custom_html = '';
            $custom_css = '';
            $custom_js = '';
        }

        $html_script_allowlist = self::sanitize_domain_list(isset($content['html_script_allowlist']) ? $content['html_script_allowlist'] : array());
        $html_script_blocklist = self::sanitize_domain_list(isset($content['html_script_blocklist']) ? $content['html_script_blocklist'] : array());
        $html_runtime_vars = !array_key_exists('html_runtime_vars', $content) ? true : !empty($content['html_runtime_vars']);
        $html_load_strategy = self::sanitize_choice(
            isset($content['html_load_strategy']) ? $content['html_load_strategy'] : 'immediate',
            array('immediate', 'delay', 'viewport'),
            'immediate'
        );
        $html_load_delay = isset($content['html_load_delay']) ? absint($content['html_load_delay']) : 0;
        if ($html_load_delay < 0) {
            $html_load_delay = 0;
        }
        if ($html_load_delay > 120000) {
            $html_load_delay = 120000;
        }
        $html_placeholder_ratio = isset($content['html_placeholder_ratio'])
            ? sanitize_text_field((string) $content['html_placeholder_ratio'])
            : '';
        if (!preg_match('/^\\d{1,3}:\\d{1,3}$/', $html_placeholder_ratio)) {
            $html_placeholder_ratio = '';
        }

        $variants_enabled = !empty($content['variants_enabled']);
        $variants_strategy = self::sanitize_choice(
            isset($content['variants_strategy']) ? $content['variants_strategy'] : 'request',
            array('request', 'session'),
            'request'
        );
        $variants = self::sanitize_variants(
            isset($content['variants']) ? $content['variants'] : array(),
            $html_mode,
            $can_unfiltered
        );

        $video_settings = isset($content['video_settings']) && is_array($content['video_settings'])
            ? $content['video_settings']
            : array();

        $block_settings = isset($content['block_settings']) && is_array($content['block_settings'])
            ? $content['block_settings']
            : array();

        $video_preload = self::sanitize_choice(
            isset($video_settings['preload']) ? $video_settings['preload'] : 'metadata',
            array('metadata', 'auto', 'none'),
            'metadata'
        );
        $video_aspect = self::sanitize_choice(
            isset($video_settings['aspect_ratio']) ? $video_settings['aspect_ratio'] : '16:9',
            array('auto', '16:9', '4:3', '1:1', '9:16', 'custom'),
            '16:9'
        );
        $video_poster_mode = self::sanitize_choice(
            isset($video_settings['poster_mode']) ? $video_settings['poster_mode'] : 'manual',
            array('manual', 'auto'),
            'manual'
        );
        if ($video_poster_mode === 'auto' && $video_preload === 'none') {
            $video_preload = 'metadata';
        }
        $video_aspect_custom = self::sanitize_ratio(
            isset($video_settings['aspect_ratio_custom']) ? $video_settings['aspect_ratio_custom'] : ''
        );

        $sanitized_content = array(
            'html' => $html_value,
            'blocks' => $blocks_value,
            'video_url' => isset($content['video_url']) ? esc_url_raw($content['video_url']) : '',
            'link' => isset($content['link']) ? esc_url_raw($content['link']) : '',
            'link_target' => !empty($content['link_target']),
            'link_rel' => isset($content['link_rel']) ? sanitize_text_field($content['link_rel']) : '',
            'cta_text' => isset($content['cta_text']) ? sanitize_text_field($content['cta_text']) : '',
            'custom_html' => $custom_html,
            'custom_css' => $custom_css,
            'custom_js' => $custom_js,
            'html_script_allowlist' => $html_script_allowlist,
            'html_script_blocklist' => $html_script_blocklist,
            'html_runtime_vars' => $html_runtime_vars,
            'html_load_strategy' => $html_load_strategy,
            'html_load_delay' => $html_load_delay,
            'html_placeholder_ratio' => $html_placeholder_ratio,
            'variants_enabled' => $variants_enabled,
            'variants_strategy' => $variants_strategy,
            'variants' => $variants,
            'image' => self::sanitize_image_asset($image),
            'video_settings' => array(
                'type' => self::sanitize_choice(
                    isset($video_settings['type']) ? $video_settings['type'] : 'mp4',
                    array('mp4', 'embed'),
                    'mp4'
                ),
                'autoplay' => !empty($video_settings['autoplay']),
                'autoplay_first' => !empty($video_settings['autoplay_first']),
                'repeat_muted' => !empty($video_settings['repeat_muted']),
                'muted' => !empty($video_settings['muted']),
                'loop' => !empty($video_settings['loop']),
                'controls' => array_key_exists('controls', $video_settings)
                    ? (bool) $video_settings['controls']
                    : true,
                'playsinline' => array_key_exists('playsinline', $video_settings)
                    ? (bool) $video_settings['playsinline']
                    : true,
                'preload' => $video_preload,
                'aspect_ratio' => $video_aspect,
                'aspect_ratio_custom' => $video_aspect_custom,
                'poster_mode' => $video_poster_mode,
                'poster' => self::sanitize_image_asset($video_settings['poster'] ?? array()),
                'fallback_text' => isset($video_settings['fallback_text'])
                    ? sanitize_text_field($video_settings['fallback_text'])
                    : '',
                'track_events' => !empty($video_settings['track_events']),
            ),
            'block_settings' => array(
                'background' => self::sanitize_color(isset($block_settings['background']) ? $block_settings['background'] : 'transparent'),
                'background_gradient' => isset($block_settings['background_gradient']) ? sanitize_text_field($block_settings['background_gradient']) : '',
                'text_color' => self::sanitize_color(isset($block_settings['text_color']) ? $block_settings['text_color'] : ''),
                'padding' => isset($block_settings['padding']) ? absint($block_settings['padding']) : 0,
                'radius' => isset($block_settings['radius']) ? absint($block_settings['radius']) : 0,
                'max_width' => isset($block_settings['max_width']) ? absint($block_settings['max_width']) : 0,
                'font_size' => isset($block_settings['font_size']) ? absint($block_settings['font_size']) : 0,
                'font_family' => isset($block_settings['font_family']) ? sanitize_text_field($block_settings['font_family']) : '',
                'align' => self::sanitize_choice(
                    isset($block_settings['align']) ? $block_settings['align'] : '',
                    array('', 'center'),
                    ''
                ),
                'background_image' => self::sanitize_image_asset($block_settings['background_image'] ?? array()),
                'layout' => self::sanitize_choice(
                    isset($block_settings['layout']) ? $block_settings['layout'] : 'content',
                    array('content', 'stack', 'split', 'split-reverse'),
                    'content'
                ),
                'media_image' => self::sanitize_image_asset($block_settings['media_image'] ?? array()),
                'heading' => isset($block_settings['heading']) ? sanitize_text_field($block_settings['heading']) : '',
                'subheading' => isset($block_settings['subheading']) ? sanitize_text_field($block_settings['subheading']) : '',
                'heading_size' => isset($block_settings['heading_size']) ? absint($block_settings['heading_size']) : 0,
                'heading_line_height' => isset($block_settings['heading_line_height'])
                    ? floatval($block_settings['heading_line_height'])
                    : 0,
                'heading_weight' => self::sanitize_choice(
                    isset($block_settings['heading_weight']) ? $block_settings['heading_weight'] : 'semibold',
                    array('normal', 'medium', 'semibold', 'bold', 'black'),
                    'semibold'
                ),
                'subheading_size' => isset($block_settings['subheading_size']) ? absint($block_settings['subheading_size']) : 0,
                'subheading_line_height' => isset($block_settings['subheading_line_height'])
                    ? floatval($block_settings['subheading_line_height'])
                    : 0,
                'subheading_weight' => self::sanitize_choice(
                    isset($block_settings['subheading_weight']) ? $block_settings['subheading_weight'] : 'normal',
                    array('normal', 'medium', 'semibold', 'bold', 'black'),
                    'normal'
                ),
                'cta_text' => isset($block_settings['cta_text']) ? sanitize_text_field($block_settings['cta_text']) : '',
                'cta_link' => isset($block_settings['cta_link']) ? esc_url_raw($block_settings['cta_link']) : '',
                'cta_target' => !empty($block_settings['cta_target']),
                'cta_text_color' => self::sanitize_color(isset($block_settings['cta_text_color']) ? $block_settings['cta_text_color'] : '#ffffff'),
                'cta_background' => self::sanitize_color(isset($block_settings['cta_background']) ? $block_settings['cta_background'] : '#2563eb'),
                'cta_radius' => isset($block_settings['cta_radius']) ? absint($block_settings['cta_radius']) : 0,
                'border_width' => isset($block_settings['border_width']) ? absint($block_settings['border_width']) : 0,
                'border_color' => self::sanitize_color(isset($block_settings['border_color']) ? $block_settings['border_color'] : '#d0d7e2'),
                'shadow' => self::sanitize_choice(
                    isset($block_settings['shadow']) ? $block_settings['shadow'] : 'none',
                    array('none', 'soft', 'float'),
                    'none'
                ),
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
                'badge_type' => self::sanitize_choice(
                    isset($container_style['badge_type']) ? $container_style['badge_type'] : 'text',
                    array('text', 'image'),
                    'text'
                ),
                'badge_text' => sanitize_text_field(
                    isset($container_style['badge_text']) ? $container_style['badge_text'] : '广告'
                ),
                'badge_color' => self::sanitize_color(isset($container_style['badge_color']) ? $container_style['badge_color'] : '#1d2327'),
                'badge_image' => self::sanitize_image_asset($container_style['badge_image'] ?? array()),
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
                'delay' => array_key_exists('delay', $behavior) ? absint($behavior['delay']) : $default_delay,
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

        if (($sanitized_options['usage_type'] ?? 'ad') === 'decorative') {
            $sanitized_options['container_type'] = 'inline';
            if (!isset($sanitized_content['container_style']) || !is_array($sanitized_content['container_style'])) {
                $sanitized_content['container_style'] = array();
            }
            $sanitized_content['container_style']['mode'] = 'boxed';
            if (!in_array(
                (string) ($sanitized_options['placement_hook'] ?? ''),
                array('content', 'body_top', 'footer'),
                true
            )) {
                $sanitized_options['placement_hook'] = 'footer';
                $sanitized_options['placement_position'] = '';
                $sanitized_options['placement_paragraph'] = 0;
            }
            if (($sanitized_options['placement_hook'] ?? '') !== 'content') {
                $sanitized_options['placement_position'] = '';
                $sanitized_options['placement_paragraph'] = 0;
            }
            $sanitized_options['render_require_consent'] = false;
            $sanitized_content['variants_enabled'] = false;
            $sanitized_content['variants_strategy'] = 'request';
            $sanitized_content['variants'] = array();
            if (!isset($sanitized_content['behavior']) || !is_array($sanitized_content['behavior'])) {
                $sanitized_content['behavior'] = array();
            }
            $sanitized_content['behavior']['frequency_mode'] = 'none';
            $sanitized_content['behavior']['frequency_limit'] = 1;
            $sanitized_content['behavior']['delay'] = 0;
            if (!isset($sanitized_content['video_settings']) || !is_array($sanitized_content['video_settings'])) {
                $sanitized_content['video_settings'] = array();
            }
            $sanitized_content['video_settings']['track_events'] = false;
        }

        $reserve_height = isset($sanitized_content['container_style']['reserve_height'])
            ? absint($sanitized_content['container_style']['reserve_height'])
            : 0;
        if ($reserve_height <= 0) {
            $reserve_height = self::default_reserve_height(
                (string) ($sanitized_options['container_type'] ?? 'inline'),
                (string) ($sanitized_options['creative_type'] ?? 'html'),
                $sanitized_content
            );
        }
        $sanitized_content['container_style']['reserve_height'] = $reserve_height;

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

    private static function sanitize_image_asset($image): array {
        $image = is_array($image) ? $image : array();
        return array(
            'id' => isset($image['id']) ? absint($image['id']) : 0,
            'url' => isset($image['url']) ? esc_url_raw($image['url']) : '',
            'alt' => isset($image['alt']) ? sanitize_text_field($image['alt']) : '',
            'width' => isset($image['width']) ? absint($image['width']) : 0,
            'height' => isset($image['height']) ? absint($image['height']) : 0,
        );
    }

    private static function sanitize_ratio($value): string {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '') {
            return '';
        }
        if (preg_match('/^\\d{1,3}:\\d{1,3}$/', $value)) {
            return $value;
        }
        return '';
    }

    private static function sanitize_domain_list($value): array {
        $items = array();
        if (is_string($value)) {
            $value = preg_split('/[\\s,;]+/', $value);
        }
        if (!is_array($value)) {
            return $items;
        }
        foreach ($value as $item) {
            if (!is_string($item)) {
                continue;
            }
            $item = trim(strtolower($item));
            if ($item === '') {
                continue;
            }
            $item = preg_replace('#^https?://#', '', $item);
            $item = preg_replace('#/.*$#', '', $item);
            if ($item === '') {
                continue;
            }
            $items[] = $item;
        }
        $items = array_values(array_unique($items));
        if (count($items) > 50) {
            $items = array_slice($items, 0, 50);
        }
        return $items;
    }

    private static function sanitize_variants($value, string $html_mode, bool $can_unfiltered): array {
        if (!is_array($value)) {
            return array();
        }
        $variants = array();
        foreach ($value as $variant) {
            if (!is_array($variant)) {
                continue;
            }
            $content = isset($variant['content']) && is_array($variant['content'])
                ? $variant['content']
                : array();

            $raw_blocks = isset($content['blocks']) && is_string($content['blocks']) ? $content['blocks'] : '';
            $blocks_value = $raw_blocks;
            if (!$can_unfiltered) {
                $blocks_value = wp_kses_post($raw_blocks);
            }

            $raw_html = isset($content['html']) && is_string($content['html']) ? $content['html'] : '';
            $html_value = $raw_html;
            if ($html_mode !== 'full' || !$can_unfiltered) {
                $html_value = wp_kses_post($raw_html);
            }

            $variants[] = array(
                'id' => isset($variant['id']) ? sanitize_text_field($variant['id']) : '',
                'label' => isset($variant['label']) ? sanitize_text_field($variant['label']) : '',
                'weight' => isset($variant['weight']) ? max(1, absint($variant['weight'])) : 1,
                'content' => array(
                    'html' => $html_value,
                    'blocks' => $blocks_value,
                    'video_url' => isset($content['video_url']) ? esc_url_raw($content['video_url']) : '',
                ),
            );
            if (count($variants) >= 10) {
                break;
            }
        }
        return $variants;
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
        return wp_date('Y-m-d H:i:s', $timestamp);
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
        if (preg_match('/\\d{2}:\\d{2}/', $value)) {
            return wp_date('Y-m-d H:i:s', $timestamp);
        }
        return wp_date('Y-m-d', $timestamp);
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

    private static function sanitize_ad_ids($value): array {
        if (!is_array($value)) {
            return array();
        }
        $ids = array();
        foreach ($value as $id) {
            if (!is_string($id)) {
                continue;
            }
            $id = sanitize_text_field($id);
            if ($id === '' || in_array($id, $ids, true)) {
                continue;
            }
            $ids[] = $id;
        }
        return $ids;
    }

    private static function sanitize_weights($value, int $count): array {
        if (!is_array($value)) {
            return array_fill(0, $count, 1);
        }
        $weights = array();
        foreach ($value as $weight) {
            $weights[] = max(1, absint($weight));
        }
        if (count($weights) < $count) {
            $weights = array_pad($weights, $count, 1);
        }
        if (count($weights) > $count) {
            $weights = array_slice($weights, 0, $count);
        }
        return $weights;
    }

    private static function unique_slot(string $slot, array $used): string {
        $base = $slot;
        $suffix = 2;
        while (isset($used[$slot])) {
            $slot = $base . '-' . $suffix;
            $suffix++;
        }
        return $slot;
    }

}
