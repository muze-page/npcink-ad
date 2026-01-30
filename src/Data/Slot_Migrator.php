<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

final class Slot_Migrator {
    private const OPTION_FLAG = 'magick_ad_slots_migrated';

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

        $slots = Slots::get_slots();
        $slot_map = array();
        foreach ($slots as $slot) {
            if (!is_array($slot) || empty($slot['id'])) {
                continue;
            }
            $slot_id = (string) $slot['id'];
            $slot_map[$slot_id] = array(
                'id' => $slot_id,
                'label' => isset($slot['label']) ? (string) $slot['label'] : $slot_id,
                'ad_ids' => isset($slot['ad_ids']) && is_array($slot['ad_ids']) ? $slot['ad_ids'] : array(),
                'weights' => isset($slot['weights']) && is_array($slot['weights']) ? $slot['weights'] : array(),
                'limit' => isset($slot['limit']) ? absint($slot['limit']) : 1,
            );
        }

        foreach ($posts as $post) {
            $ad_id = get_post_meta($post->ID, Ads::META_ID, true);
            if (!$ad_id) {
                $ad_id = 'ad_' . $post->ID;
            }

            $data = get_post_meta($post->ID, Ads::META_DATA, true);
            $slot = '';
            if (is_array($data) && isset($data['options']['slot'])) {
                $slot = sanitize_title((string) $data['options']['slot']);
            }
            if ($slot === '') {
                continue;
            }
            if (!isset($slot_map[$slot])) {
                $slot_map[$slot] = array(
                    'id' => $slot,
                    'label' => $slot,
                    'ad_ids' => array(),
                    'weights' => array(),
                    'limit' => 1,
                );
            }
            if (!in_array($ad_id, $slot_map[$slot]['ad_ids'], true)) {
                $slot_map[$slot]['ad_ids'][] = $ad_id;
            }

            delete_post_meta($post->ID, '_magick_ad_slot');
        }

        Slots::save_slots(array_values($slot_map));
        update_option(self::OPTION_FLAG, '1');
    }
}
