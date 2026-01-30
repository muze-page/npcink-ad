<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

final class Slot_Migrator {
    private const OPTION_FLAG = 'magick_ad_slot_meta_migrated';

    public static function maybe_migrate(): void {
        if (get_option(self::OPTION_FLAG, '') === '1') {
            return;
        }

        $posts = get_posts(
            array(
                'post_type' => Ads::POST_TYPE,
                'post_status' => array('publish', 'draft', 'future', 'private'),
                'numberposts' => -1,
                'orderby' => array(
                    'menu_order' => 'ASC',
                    'date' => 'DESC',
                ),
            )
        );

        if (!$posts) {
            update_option(self::OPTION_FLAG, '1');
            return;
        }

        $existing_slots = array();
        foreach ($posts as $post) {
            $slot = get_post_meta($post->ID, Ads::META_SLOT, true);
            if (is_string($slot) && $slot !== '') {
                $normalized = sanitize_title($slot);
                if ($normalized !== $slot) {
                    update_post_meta($post->ID, Ads::META_SLOT, $normalized);
                    $slot = $normalized;
                }
                if ($slot !== '') {
                    $existing_slots[$slot] = true;
                }
            }
        }

        foreach ($posts as $post) {
            $slot = get_post_meta($post->ID, Ads::META_SLOT, true);
            if (is_string($slot) && $slot !== '') {
                continue;
            }

            $slot = '';
            $data = get_post_meta($post->ID, Ads::META_DATA, true);
            if (is_array($data) && isset($data['options']['slot'])) {
                $slot = sanitize_title((string) $data['options']['slot']);
            }

            if ($slot === '') {
                $slot = sanitize_title($post->post_name ? $post->post_name : $post->post_title);
            }

            if ($slot === '') {
                continue;
            }

            $unique = self::unique_slot($slot, $existing_slots);
            update_post_meta($post->ID, Ads::META_SLOT, $unique);
            $existing_slots[$unique] = true;
        }

        update_option(self::OPTION_FLAG, '1');
    }

    private static function unique_slot(string $slot, array $existing): string {
        $base = $slot;
        $suffix = 2;
        while (isset($existing[$slot])) {
            $slot = $base . '-' . $suffix;
            $suffix++;
        }
        return $slot;
    }
}
