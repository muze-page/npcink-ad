<?php

namespace MagickAD\Blocks;

use MagickAD\Frontend\Frontend;

if (!defined('ABSPATH')) {
    exit;
}

final class Blocks {
    public function register(): void {
        add_action('init', array($this, 'register_blocks'));
    }

    public function register_blocks(): void {
        $block_dir = MAGICK_AD_PATH . 'assets/blocks/magick-ad-ad';
        if (!file_exists($block_dir . '/block.json')) {
            return;
        }

        $editor_handle = 'magick-ad-block-editor';
        wp_register_script(
            $editor_handle,
            MAGICK_AD_URL . 'assets/blocks/magick-ad-ad/editor.js',
            array('wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-data', 'wp-core-data', 'wp-server-side-render'),
            MAGICK_AD_VERSION,
            true
        );

        register_block_type($block_dir, array(
            'editor_script' => $editor_handle,
            'render_callback' => array(__CLASS__, 'render_ad_block'),
        ));
    }

    public static function render_ad_block($attributes) {
        $attrs = is_array($attributes) ? $attributes : array();
        $slot = isset($attrs['slot']) ? sanitize_title((string) $attrs['slot']) : '';
        $ad_id = isset($attrs['adId']) ? sanitize_text_field((string) $attrs['adId']) : '';
        if ($slot || $ad_id) {
            $args = array('position' => 'block');
            if ($slot) {
                $args['slot'] = $slot;
            } elseif ($ad_id) {
                $args['id'] = $ad_id;
            }
            return Frontend::render_slot($slot ?: $ad_id, $args);
        }

        $creative = isset($attrs['creativeType']) ? (string) $attrs['creativeType'] : 'html';
        if (!in_array($creative, array('html', 'image', 'video', 'block'), true)) {
            $creative = 'html';
        }

        $container = isset($attrs['containerType']) ? (string) $attrs['containerType'] : 'inline';
        if (!in_array($container, array('inline', 'popup', 'banner', 'floating', 'interstitial'), true)) {
            $container = 'inline';
        }

        $html = isset($attrs['html']) ? (string) $attrs['html'] : '';
        $blocks = isset($attrs['blocks']) ? (string) $attrs['blocks'] : '';
        if ($creative === 'html' && !current_user_can('unfiltered_html')) {
            $html = wp_kses_post($html);
        }

        $image_url = isset($attrs['imageUrl']) ? esc_url_raw($attrs['imageUrl']) : '';
        $image_alt = isset($attrs['imageAlt']) ? sanitize_text_field($attrs['imageAlt']) : '';
        $image_id = isset($attrs['imageId']) ? absint($attrs['imageId']) : 0;
        $link = isset($attrs['link']) ? esc_url_raw($attrs['link']) : '';
        $link_target = !empty($attrs['linkTarget']);
        $video_url = isset($attrs['videoUrl']) ? esc_url_raw($attrs['videoUrl']) : '';

        $ad = array(
            'id' => 'block_' . substr(md5(wp_json_encode($attrs)), 0, 12),
            'options' => array(
                'creative_type' => $creative,
                'container_type' => $container,
                'display_mode' => 'show',
                'random_strategy' => 'request',
                'placement_hook' => 'content',
                'placement_position' => 'before',
                'placement_paragraph' => 0,
            ),
            'content' => array(
                'html' => $html,
                'blocks' => $blocks,
                'video_url' => $video_url,
                'link' => $link,
                'link_target' => $link_target,
                'image' => array(
                    'id' => $image_id,
                    'url' => $image_url,
                    'alt' => $image_alt,
                ),
                'container_style' => array(
                    'mode' => 'boxed',
                ),
                'behavior' => array(),
                'image_settings' => array(),
            ),
        );

        return Frontend::render_ad_array($ad, array('position' => 'block'));
    }
}
