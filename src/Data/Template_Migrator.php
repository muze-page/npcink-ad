<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

final class Template_Migrator {
    private const OPTION_FLAG = 'magick_ad_templates_migrated';

    public static function maybe_migrate(): void {
        if (get_option(self::OPTION_FLAG) === '1') {
            return;
        }

        $templates = get_posts(array(
            'post_type' => 'magick_template',
            'post_status' => 'any',
            'numberposts' => -1,
        ));

        if (empty($templates)) {
            update_option(self::OPTION_FLAG, '1');
            return;
        }

        foreach ($templates as $template) {
            $type = get_post_meta($template->ID, 'magick_template_type', true);
            $data = get_post_meta($template->ID, 'magick_template_data', true);
            $content = self::build_block_content($type, is_array($data) ? $data : array());

            if (!$content) {
                continue;
            }

            $new_id = wp_insert_post(array(
                'post_type' => 'wp_block',
                'post_status' => 'publish',
                'post_title' => $template->post_title ? $template->post_title : '模板',
                'post_content' => $content,
            ));

            if (!is_wp_error($new_id) && $new_id) {
                wp_trash_post($template->ID);
            }
        }

        update_option(self::OPTION_FLAG, '1');
    }

    private static function build_block_content(string $type, array $data): string {
        $attrs = array(
            'creativeType' => $type ?: 'html',
        );

        if ($type === 'image') {
            $image = isset($data['image']) && is_array($data['image']) ? $data['image'] : array();
            $attrs['imageId'] = isset($image['id']) ? absint($image['id']) : 0;
            $attrs['imageUrl'] = isset($image['url']) ? esc_url_raw($image['url']) : '';
            $attrs['imageAlt'] = isset($image['alt']) ? sanitize_text_field($image['alt']) : '';
            $attrs['link'] = isset($data['link']) ? esc_url_raw($data['link']) : '';
            $attrs['linkTarget'] = !empty($data['link_target']);
        } elseif ($type === 'video') {
            $attrs['videoUrl'] = isset($data['video_url']) ? esc_url_raw($data['video_url']) : '';
        } elseif ($type === 'block') {
            $attrs['blocks'] = isset($data['blocks']) ? (string) $data['blocks'] : '';
        } else {
            $attrs['creativeType'] = 'html';
            $attrs['html'] = isset($data['html']) ? (string) $data['html'] : '';
        }

        $json = wp_json_encode($attrs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!$json) {
            return '';
        }

        return sprintf('<!-- wp:magick-ad/ad %s /-->', $json);
    }
}
