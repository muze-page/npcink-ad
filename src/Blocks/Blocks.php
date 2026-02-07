<?php

namespace MagickAD\Blocks;

use MagickAD\Frontend\Frontend;
use MagickAD\Data\Slots;

if (!defined('ABSPATH')) {
    exit;
}

final class Blocks {
    private const CREATIVE_TYPES = array('html', 'image', 'video', 'block');
    private const CONTAINER_TYPES = array('inline', 'popup', 'banner', 'floating', 'interstitial');
    private const USAGE_TYPES = array('ad', 'promo', 'decorative');

    public function register(): void {
        if (did_action('init')) {
            $this->register_blocks();
            return;
        }
        add_action('init', array($this, 'register_blocks'));
    }

    public function register_blocks(): void {
        $block_dir = MAGICK_AD_PATH . 'assets/blocks/magick-ad-ad';
        if (!file_exists($block_dir . '/block.json')) {
            return;
        }

        $editor_handle = 'magick-ad-block-editor';
        $this->register_editor_script($editor_handle);

        wp_localize_script(
            $editor_handle,
            'MagickADSlots',
            array('slots' => $this->build_slot_payload())
        );

        register_block_type($block_dir, array(
            'editor_script' => $editor_handle,
            'render_callback' => array(__CLASS__, 'render_ad_block'),
        ));
    }

    private function register_editor_script(string $editor_handle): void {
        wp_register_script(
            $editor_handle,
            MAGICK_AD_URL . 'assets/blocks/magick-ad-ad/editor.js',
            array('wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-data', 'wp-core-data', 'wp-server-side-render'),
            MAGICK_AD_VERSION,
            true
        );
    }

    private function build_slot_payload(): array {
        $payload = array();
        foreach (Slots::get_slots() as $slot) {
            $normalized = $this->normalize_slot_payload($slot);
            if ($normalized === null) {
                continue;
            }
            $payload[] = $normalized;
        }
        return $payload;
    }

    private function normalize_slot_payload(mixed $slot): ?array {
        if (!is_array($slot) || empty($slot['id'])) {
            return null;
        }

        return array(
            'id' => (string) $slot['id'],
            'label' => isset($slot['label']) ? (string) $slot['label'] : '',
            'ad_ids' => isset($slot['ad_ids']) && is_array($slot['ad_ids']) ? $slot['ad_ids'] : array(),
        );
    }

    public static function render_ad_block(mixed $attributes): string {
        Frontend::enqueue_assets(true);

        $attrs = is_array($attributes) ? $attributes : array();
        $slot = self::sanitize_slot($attrs);
        $ad_id = self::sanitize_ad_id($attrs);

        if ($slot !== '' || $ad_id !== '') {
            return self::render_slot_block($slot, $ad_id, $attrs);
        }

        $creative = self::sanitize_creative_type($attrs['creativeType'] ?? '');
        $container = self::sanitize_container_type($attrs['containerType'] ?? '');
        $ad = self::build_inline_ad($attrs, $creative, $container);

        return Frontend::render_ad_array($ad, array('position' => 'block'));
    }

    private static function render_slot_block(string $slot, string $ad_id, array $attrs): string {
        $args = array('position' => 'block');
        if ($slot !== '') {
            $args['slot'] = $slot;
        } elseif ($ad_id !== '') {
            $args['id'] = $ad_id;
        }

        $output = Frontend::render_slot($slot !== '' ? $slot : $ad_id, $args);
        $reserve = isset($attrs['reserveHeight']) ? absint($attrs['reserveHeight']) : 0;

        return self::wrap_with_reserve($output, $reserve);
    }

    private static function wrap_with_reserve(string $output, int $reserve): string {
        if ($reserve <= 0 || $output === '') {
            return $output;
        }

        return '<div class="magick-ad-slot-reserve" style="min-height:' . esc_attr((string) $reserve) . 'px">' . $output . '</div>';
    }

    private static function sanitize_slot(array $attrs): string {
        return isset($attrs['slot']) ? sanitize_title((string) $attrs['slot']) : '';
    }

    private static function sanitize_ad_id(array $attrs): string {
        return isset($attrs['adId']) ? sanitize_text_field((string) $attrs['adId']) : '';
    }

    private static function sanitize_creative_type(string $value): string {
        return in_array($value, self::CREATIVE_TYPES, true) ? $value : 'html';
    }

    private static function sanitize_container_type(string $value): string {
        return in_array($value, self::CONTAINER_TYPES, true) ? $value : 'inline';
    }

    private static function sanitize_usage_type(string $value): string {
        return in_array($value, self::USAGE_TYPES, true) ? $value : 'ad';
    }

    private static function build_inline_ad(array $attrs, string $creative, string $container): array {
        $html = isset($attrs['html']) ? (string) $attrs['html'] : '';
        if ($creative === 'html' && !current_user_can('unfiltered_html')) {
            $html = wp_kses_post($html);
        }

        return array(
            'id' => self::generate_block_ad_id($attrs),
            'options' => array(
                'creative_type' => $creative,
                'container_type' => $container,
                'usage_type' => self::sanitize_usage_type(
                    isset($attrs['usageType']) ? (string) $attrs['usageType'] : 'ad'
                ),
                'display_mode' => 'show',
                'random_strategy' => 'request',
                'placement_hook' => 'content',
                'placement_position' => 'before',
                'placement_paragraph' => 0,
            ),
            'content' => array(
                'html' => $html,
                'blocks' => isset($attrs['blocks']) ? (string) $attrs['blocks'] : '',
                'video_url' => isset($attrs['videoUrl']) ? esc_url_raw($attrs['videoUrl']) : '',
                'link' => isset($attrs['link']) ? esc_url_raw($attrs['link']) : '',
                'link_target' => !empty($attrs['linkTarget']),
                'image' => array(
                    'id' => isset($attrs['imageId']) ? absint($attrs['imageId']) : 0,
                    'url' => isset($attrs['imageUrl']) ? esc_url_raw($attrs['imageUrl']) : '',
                    'alt' => isset($attrs['imageAlt']) ? sanitize_text_field((string) $attrs['imageAlt']) : '',
                ),
                'container_style' => array(
                    'mode' => 'boxed',
                ),
                'behavior' => array(),
                'image_settings' => array(),
            ),
        );
    }

    private static function generate_block_ad_id(array $attrs): string {
        $json = wp_json_encode($attrs);
        $hash = md5($json ? $json : '');
        return 'block_' . substr($hash, 0, 12);
    }
}
