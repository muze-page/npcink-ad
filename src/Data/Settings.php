<?php

namespace MagickAD\Data;

use WP_Error;

if (!defined('ABSPATH')) {
    exit;
}

final class Settings {
    public const OPTION_KEY = 'magick_ad_settings';
    public const RUNTIME_OPTION_KEY = 'magick_ad_runtime_settings';
    public const RUNTIME_REV_KEY = 'magick_ad_settings_rev';
    private const RUNTIME_CACHE_GROUP = 'magick_ad';
    private const RUNTIME_CACHE_PREFIX = 'magick_ad_runtime_settings_';
    private const RUNTIME_LOCK_KEY = 'magick_ad_runtime_lock';

    public static function get_settings(): array {
        return Ads::get_settings();
    }

    public static function get_runtime_settings(): array {
        $rev = (int) get_option(self::RUNTIME_REV_KEY, 0);
        $cache_key = self::RUNTIME_CACHE_PREFIX . $rev;
        $cached = wp_cache_get($cache_key, self::RUNTIME_CACHE_GROUP);
        if (is_array($cached)) {
            return self::strip_runtime_meta($cached);
        }

        $stored = get_option(self::RUNTIME_OPTION_KEY, array());
        if (is_array($stored) && isset($stored['_rev']) && (int) $stored['_rev'] === $rev) {
            wp_cache_set(
                $cache_key,
                $stored,
                self::RUNTIME_CACHE_GROUP,
                self::get_runtime_cache_ttl()
            );
            return self::strip_runtime_meta($stored);
        }

        $stale = is_array($stored) ? self::strip_runtime_meta($stored) : array();
        if (!self::acquire_runtime_lock()) {
            return $stale;
        }

        return self::refresh_runtime_cache();
    }

    public static function refresh_runtime_cache(?array $ads = null, ?array $slots = null): array {
        if ($ads === null || $slots === null) {
            $settings = Ads::get_settings();
            $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
            $slots = isset($settings['slots']) && is_array($settings['slots']) ? $settings['slots'] : array();
        }

        $prev_rev = (int) get_option(self::RUNTIME_REV_KEY, 0);
        $rev = $prev_rev + 1;
        $ads_payload = self::maybe_strip_runtime_ads(is_array($ads) ? $ads : array());
        $payload = array(
            'ads' => $ads_payload,
            'slots' => is_array($slots) ? $slots : array(),
            'index' => self::build_runtime_index($ads_payload),
            'needs_random_cookie' => self::ads_need_random_cookie($ads_payload),
            '_rev' => $rev,
        );

        update_option(self::RUNTIME_OPTION_KEY, $payload, false);
        update_option(self::RUNTIME_REV_KEY, $rev, false);

        $cache_key = self::RUNTIME_CACHE_PREFIX . $rev;
        wp_cache_set(
            $cache_key,
            $payload,
            self::RUNTIME_CACHE_GROUP,
            self::get_runtime_cache_ttl()
        );
        if ($prev_rev > 0) {
            wp_cache_delete(self::RUNTIME_CACHE_PREFIX . $prev_rev, self::RUNTIME_CACHE_GROUP);
        }

        self::release_runtime_lock();

        return self::strip_runtime_meta($payload);
    }

    private static function strip_runtime_meta(array $settings): array {
        if (isset($settings['_rev'])) {
            unset($settings['_rev']);
        }
        return $settings;
    }

    private static function build_runtime_index(array $ads): array {
        $index = array(
            'ads' => array(),
            'all' => array(),
            'hooks' => array(),
            'placements' => array(),
        );

        foreach ($ads as $position => $ad) {
            if (!is_array($ad)) {
                continue;
            }
            $ad_id = isset($ad['id']) ? (string) $ad['id'] : '';
            if ($ad_id === '') {
                continue;
            }
            $index['ads'][$ad_id] = $position;
            $index['all'][] = $ad_id;

            $options = isset($ad['options']) && is_array($ad['options']) ? $ad['options'] : array();
            $hook = isset($options['placement_hook']) ? (string) $options['placement_hook'] : '';
            $pos = isset($options['placement_position']) ? (string) $options['placement_position'] : '';
            $paragraph = isset($options['placement_paragraph']) ? absint($options['placement_paragraph']) : 0;

            if ($hook === 'content' && $pos === 'paragraph') {
                if ($paragraph < 1) {
                    $paragraph = 2;
                }
            } else {
                $pos = $hook === 'content' ? $pos : '';
                $paragraph = 0;
            }

            $index['placements'][$ad_id] = array(
                'hook' => $hook,
                'position' => $pos,
                'paragraph' => $paragraph,
            );

            if ($hook !== '') {
                if (!isset($index['hooks'][$hook])) {
                    $index['hooks'][$hook] = array();
                }
                $index['hooks'][$hook][] = $ad_id;
            }
        }

        return $index;
    }

    private static function ads_need_random_cookie(array $ads): bool {
        foreach ($ads as $ad) {
            if (!is_array($ad)) {
                continue;
            }
            $options = isset($ad['options']) && is_array($ad['options']) ? $ad['options'] : array();
            if (($options['display_mode'] ?? '') !== 'random') {
                continue;
            }
            if (($options['random_strategy'] ?? '') === 'cookie') {
                return true;
            }
        }
        return false;
    }

    private static function maybe_strip_runtime_ads(array $ads): array {
        $enabled = (bool) apply_filters('magick_ad_runtime_strip_content', true);
        if (!$enabled) {
            return $ads;
        }

        foreach ($ads as &$ad) {
            if (!is_array($ad)) {
                continue;
            }
            if (!isset($ad['content']) || !is_array($ad['content'])) {
                continue;
            }

            $content = $ad['content'];
            $changed = false;
            foreach (array('html', 'blocks', 'custom_html', 'custom_css') as $key) {
                if (isset($content[$key]) && is_string($content[$key]) && $content[$key] !== '') {
                    $content[$key] = '';
                    $changed = true;
                }
            }

            if ($changed) {
                $ad['content'] = $content;
                $ad['_content_lazy'] = true;
            }
        }
        unset($ad);

        return $ads;
    }

    private static function acquire_runtime_lock(): bool {
        $ttl = (int) apply_filters('magick_ad_runtime_lock_ttl', 15);
        $ttl = max(5, $ttl);

        if (wp_using_ext_object_cache()) {
            return (bool) wp_cache_add(self::RUNTIME_LOCK_KEY, 1, self::RUNTIME_CACHE_GROUP, $ttl);
        }

        $lock = get_transient(self::RUNTIME_LOCK_KEY);
        if ($lock) {
            return false;
        }
        set_transient(self::RUNTIME_LOCK_KEY, 1, $ttl);
        return true;
    }

    private static function release_runtime_lock(): void {
        if (wp_using_ext_object_cache()) {
            wp_cache_delete(self::RUNTIME_LOCK_KEY, self::RUNTIME_CACHE_GROUP);
            return;
        }
        delete_transient(self::RUNTIME_LOCK_KEY);
    }

    private static function get_runtime_cache_ttl(): int {
        $ttl = (int) apply_filters('magick_ad_runtime_cache_ttl', DAY_IN_SECONDS);
        return max(60, $ttl);
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
