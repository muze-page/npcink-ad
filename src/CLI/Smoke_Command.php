<?php

namespace MagickAD\CLI;

use MagickAD\Blocks\Blocks;
use MagickAD\Data\Ads;
use MagickAD\Data\Settings;
use MagickAD\Data\Slots;
use WP_CLI;

if (!defined('ABSPATH')) {
    exit;
}

final class Smoke_Command {
    public function register(): void {
        if (!class_exists('WP_CLI')) {
            return;
        }

        WP_CLI::add_command('magick-ad smoke', array($this, 'run'));
    }

    public function run(): void {
        $errors = array();

        $ad_payload = array(
            'id' => '',
            'name' => 'Smoke Ad',
            'options' => array(
                'enabled' => true,
                'placement_hook' => 'footer',
            ),
            'content' => array(
                'html' => '<div>Smoke Test</div>',
                'container_style' => array('mode' => 'boxed'),
            ),
        );

        $stored = Ads::store_ads(array($ad_payload));
        if (is_wp_error($stored)) {
            $errors[] = 'Save ad failed: ' . $stored->get_error_message();
        } else {
            WP_CLI::success('Save ad: ok');
        }

        $saved_post_id = 0;
        $posts = get_posts(
            array(
                'post_type' => Ads::POST_TYPE,
                'post_status' => array('publish', 'draft', 'future', 'private'),
                'numberposts' => 1,
            )
        );
        if ($posts) {
            $saved_post_id = $posts[0]->ID;
        }

        if (!is_wp_error($stored) && $stored && isset($stored[0]['id'])) {
            Slots::save_slots(array(
                array(
                    'id' => 'smoke-slot',
                    'label' => 'Smoke Slot',
                    'ad_ids' => array($stored[0]['id']),
                    'weights' => array(1),
                    'limit' => 1,
                ),
            ));
        }

        $dup_check = Settings::sanitize_slots(array(
            array(
                'id' => 'dup-slot',
                'label' => 'Dup 1',
            ),
            array(
                'id' => 'dup-slot',
                'label' => 'Dup 2',
            ),
        ));
        if (count($dup_check) === 2 && $dup_check[0]['id'] !== $dup_check[1]['id']) {
            WP_CLI::success('Slot uniqueness: ok');
        } else {
            $errors[] = 'Slot uniqueness: expected auto-fix for duplicate slot ids.';
        }

        $rendered = Blocks::render_ad_block(array(
            'creativeType' => 'html',
            'html' => '<div>Smoke Render</div>',
        ));
        if (is_string($rendered) && strpos($rendered, 'Smoke Render') !== false) {
            WP_CLI::success('Block render: ok');
        } else {
            $errors[] = 'Block render: output mismatch.';
        }

        if ($saved_post_id) {
            wp_delete_post($saved_post_id, true);
        }

        if ($errors) {
            WP_CLI::error(implode(' | ', $errors));
        }

        WP_CLI::success('Smoke tests passed.');
    }
}
