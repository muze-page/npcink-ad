<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

trait Settings_Runtime_Cache_Trait {
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


}
