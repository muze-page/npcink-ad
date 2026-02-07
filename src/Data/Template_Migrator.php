<?php

namespace MagickAD\Data;

use MagickAD\Blocks\Patterns;

if (!defined('ABSPATH')) {
    exit;
}

final class Template_Migrator {
    private const OPTION_LEGACY_FLAG = 'magick_ad_templates_migrated';
    private const OPTION_SCHEMA_VERSION = 'magick_ad_template_schema_version';
    private const OPTION_SCHEMA_MIGRATED_AT = 'magick_ad_template_schema_migrated_at';
    private const CREATIVE_TYPES = array('html', 'image', 'video', 'block');
    private const CONTAINER_TYPES = array('inline', 'popup', 'banner', 'floating', 'interstitial');
    private const USAGE_TYPES = array('ad', 'promo', 'decorative');
    private const DEVICES = array('all', 'mobile', 'tablet', 'desktop');
    private const RISKS = array('low', 'medium', 'high');
    private const INDUSTRIES = array('general', 'corporate', 'content', 'ecommerce');

    public static function maybe_migrate(): void {
        self::maybe_migrate_legacy_templates();
        self::maybe_migrate_template_schema();
    }

    private static function maybe_migrate_legacy_templates(): void {
        if (get_option(self::OPTION_LEGACY_FLAG) === '1') {
            return;
        }

        $templates = get_posts(array(
            'post_type' => 'magick_template',
            'post_status' => 'any',
            'numberposts' => -1,
        ));

        if (empty($templates)) {
            update_option(self::OPTION_LEGACY_FLAG, '1');
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

        update_option(self::OPTION_LEGACY_FLAG, '1');
    }

    private static function maybe_migrate_template_schema(): void {
        $target_version = (int) Patterns::TEMPLATE_SCHEMA_VERSION;
        $stored_version = (int) get_option(self::OPTION_SCHEMA_VERSION, 0);
        if ($stored_version >= $target_version) {
            return;
        }

        $batch_size = (int) apply_filters('magick_ad_template_migration_batch_size', 200);
        $batch_size = max(20, min($batch_size, 1000));
        $offset = 0;

        do {
            $posts = get_posts(array(
                'post_type' => 'wp_block',
                'post_status' => 'any',
                'numberposts' => $batch_size,
                'offset' => $offset,
                'orderby' => 'ID',
                'order' => 'ASC',
            ));

            if (empty($posts)) {
                break;
            }

            foreach ($posts as $post) {
                $content = isset($post->post_content) ? (string) $post->post_content : '';
                if ($content === '' || !str_contains($content, 'wp:magick-ad/ad')) {
                    continue;
                }
                $migrated = self::migrate_block_content($content, $target_version);
                if ($migrated === '' || $migrated === $content) {
                    continue;
                }

                wp_update_post(array(
                    'ID' => (int) $post->ID,
                    'post_content' => $migrated,
                ));
            }

            $offset += $batch_size;
        } while (count($posts) === $batch_size);

        update_option(self::OPTION_SCHEMA_VERSION, (string) $target_version, false);
        update_option(self::OPTION_SCHEMA_MIGRATED_AT, (string) current_time('timestamp'), false);
    }

    private static function migrate_block_content(string $content, int $target_version): string {
        $changed = false;
        $migrated = preg_replace_callback(
            '/<!--\s*wp:magick-ad\/ad\s+({[\s\S]*?})\s*\/-->/i',
            static function (array $matches) use ($target_version, &$changed): string {
                $json = isset($matches[1]) ? (string) $matches[1] : '';
                if ($json === '') {
                    return isset($matches[0]) ? (string) $matches[0] : '';
                }
                $attrs = json_decode($json, true);
                if (!is_array($attrs)) {
                    return isset($matches[0]) ? (string) $matches[0] : '';
                }
                $next = self::migrate_template_attrs($attrs, $target_version);
                if ($next === $attrs) {
                    return isset($matches[0]) ? (string) $matches[0] : '';
                }
                $encoded = wp_json_encode($next, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                if (!$encoded) {
                    return isset($matches[0]) ? (string) $matches[0] : '';
                }
                $changed = true;
                return sprintf('<!-- wp:magick-ad/ad %s /-->', $encoded);
            },
            $content
        );

        if (!is_string($migrated) || !$changed) {
            return $content;
        }

        return $migrated;
    }

    private static function migrate_template_attrs(array $attrs, int $target_version): array {
        $next = $attrs;

        if (isset($next['video_url']) && !isset($next['videoUrl'])) {
            $next['videoUrl'] = $next['video_url'];
        }
        if (isset($next['link_target']) && !isset($next['linkTarget'])) {
            $next['linkTarget'] = $next['link_target'];
        }
        if (isset($next['image']) && is_array($next['image'])) {
            if (!isset($next['imageId']) && isset($next['image']['id'])) {
                $next['imageId'] = $next['image']['id'];
            }
            if (!isset($next['imageUrl']) && isset($next['image']['url'])) {
                $next['imageUrl'] = $next['image']['url'];
            }
            if (!isset($next['imageAlt']) && isset($next['image']['alt'])) {
                $next['imageAlt'] = $next['image']['alt'];
            }
        }
        if (isset($next['category']) && !isset($next['templateCategory'])) {
            $next['templateCategory'] = $next['category'];
        }
        if (isset($next['scenario']) && !isset($next['templateScenario'])) {
            $next['templateScenario'] = $next['scenario'];
        }
        if (isset($next['device']) && !isset($next['templateDevice'])) {
            $next['templateDevice'] = $next['device'];
        }
        if (isset($next['risk']) && !isset($next['templateRisk'])) {
            $next['templateRisk'] = $next['risk'];
        }
        if (isset($next['industry']) && !isset($next['templateIndustry'])) {
            $next['templateIndustry'] = $next['industry'];
        }
        if (isset($next['usage_type']) && !isset($next['usageType'])) {
            $next['usageType'] = $next['usage_type'];
        }

        $type = isset($next['creativeType']) ? (string) $next['creativeType'] : '';
        if ($type === 'visual') {
            $type = 'block';
        } elseif ($type === 'code') {
            $type = 'html';
        }
        if (!in_array($type, self::CREATIVE_TYPES, true)) {
            $type = 'html';
        }
        $next['creativeType'] = $type;

        $container = isset($next['containerType']) ? (string) $next['containerType'] : 'inline';
        if (!in_array($container, self::CONTAINER_TYPES, true)) {
            $container = 'inline';
        }
        $next['containerType'] = $container;

        $next['templateVersion'] = max($target_version, (int) ($next['templateVersion'] ?? 1));
        $next['templateCategory'] = isset($next['templateCategory'])
            ? sanitize_text_field((string) $next['templateCategory'])
            : '';
        $next['templateScenario'] = isset($next['templateScenario'])
            ? sanitize_text_field((string) $next['templateScenario'])
            : '';

        $device = isset($next['templateDevice']) ? (string) $next['templateDevice'] : 'all';
        if (!in_array($device, self::DEVICES, true)) {
            $device = 'all';
        }
        $next['templateDevice'] = $device;

        $risk = isset($next['templateRisk']) ? (string) $next['templateRisk'] : 'low';
        if (!in_array($risk, self::RISKS, true)) {
            $risk = 'low';
        }
        $next['templateRisk'] = $risk;
        $industry = isset($next['templateIndustry']) ? (string) $next['templateIndustry'] : 'general';
        $industry_alias = array(
            '通用' => 'general',
            '企业站' => 'corporate',
            '内容站' => 'content',
            '电商站' => 'ecommerce',
        );
        if (isset($industry_alias[$industry])) {
            $industry = $industry_alias[$industry];
        }
        if (!in_array($industry, self::INDUSTRIES, true)) {
            $industry = 'general';
        }
        $next['templateIndustry'] = $industry;
        $usage_type = isset($next['usageType']) ? (string) $next['usageType'] : 'ad';
        if (!in_array($usage_type, self::USAGE_TYPES, true)) {
            $usage_type = 'ad';
        }
        $next['usageType'] = $usage_type;

        $next['imageId'] = isset($next['imageId']) ? absint($next['imageId']) : 0;
        $next['imageUrl'] = isset($next['imageUrl']) ? esc_url_raw((string) $next['imageUrl']) : '';
        $next['imageAlt'] = isset($next['imageAlt']) ? sanitize_text_field((string) $next['imageAlt']) : '';
        $next['link'] = isset($next['link']) ? esc_url_raw((string) $next['link']) : '';
        $next['linkTarget'] = !empty($next['linkTarget']);
        $next['videoUrl'] = isset($next['videoUrl']) ? esc_url_raw((string) $next['videoUrl']) : '';

        unset(
            $next['video_url'],
            $next['link_target'],
            $next['image'],
            $next['category'],
            $next['scenario'],
            $next['device'],
            $next['risk'],
            $next['industry'],
            $next['usage_type']
        );

        return $next;
    }

    private static function build_block_content(string $type, array $data): string {
        $attrs = array(
            'creativeType' => $type ?: 'html',
            'templateVersion' => Patterns::TEMPLATE_SCHEMA_VERSION,
            'templateIndustry' => 'general',
            'usageType' => 'ad',
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
