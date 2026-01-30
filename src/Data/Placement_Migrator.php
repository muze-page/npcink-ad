<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

final class Placement_Migrator {
    private const OPTION_FLAG = 'magick_ad_placement_migrated';

    public static function maybe_migrate(): void {
        if (get_option(self::OPTION_FLAG, '') === '1') {
            return;
        }

        $posts = get_posts(
            array(
                'post_type' => Ads::POST_TYPE,
                'post_status' => array('publish', 'draft', 'future', 'private'),
                'numberposts' => -1,
            )
        );

        if (!$posts) {
            update_option(self::OPTION_FLAG, '1');
            return;
        }

        foreach ($posts as $post) {
            $data = get_post_meta($post->ID, Ads::META_DATA, true);
            if (!is_array($data) || empty($data['options']) || !is_array($data['options'])) {
                continue;
            }

            $options = $data['options'];
            $legacy = '';
            if (isset($options['show_position']) && is_string($options['show_position'])) {
                $legacy = $options['show_position'];
            } elseif (isset($options['placement']) && is_string($options['placement'])) {
                $legacy = $options['placement'];
            } elseif (isset($options['position']) && is_string($options['position'])) {
                $legacy = $options['position'];
            } elseif (isset($options['placement_hook']) && is_string($options['placement_hook'])) {
                $legacy = $options['placement_hook'];
            }

            if ($legacy === '') {
                continue;
            }

            $legacy = (string) $legacy;
            $container_map = array(
                'popup' => 'popup',
                'bar' => 'banner',
                'banner' => 'banner',
                'floating' => 'floating',
                'interstitial' => 'interstitial',
            );
            if (!empty($container_map[$legacy])) {
                $options['container_type'] = $container_map[$legacy];
                $options['placement_hook'] = 'footer';
            } else {
                $placement_map = array(
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
                );
                if (isset($placement_map[$legacy])) {
                    $options['placement_hook'] = $placement_map[$legacy]['hook'];
                    $options['placement_position'] = $placement_map[$legacy]['position'] ?? '';
                }
            }

            unset($options['show_position'], $options['placement'], $options['position']);

            $data['options'] = $options;
            update_post_meta($post->ID, Ads::META_DATA, $data);
        }

        update_option(self::OPTION_FLAG, '1');
    }
}
