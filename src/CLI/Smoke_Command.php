<?php

namespace MagickAD\CLI;

use MagickAD\Blocks\Blocks;
use MagickAD\Data\Ads;
use MagickAD\Data\Settings;
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
                'slot' => 'smoke-slot',
                'slot_mode' => 'manual',
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
                'meta_key' => Ads::META_SLOT,
                'meta_value' => 'smoke-slot',
                'numberposts' => 1,
            )
        );
        if ($posts) {
            $saved_post_id = $posts[0]->ID;
        }

        $dup_check = Settings::validate_settings(array(
            'ads' => array(
                array(
                    'id' => 'dup-1',
                    'name' => 'Dup 1',
                    'options' => array(
                        'slot' => 'dup-slot',
                        'placement_hook' => 'footer',
                    ),
                    'content' => array(),
                ),
                array(
                    'id' => 'dup-2',
                    'name' => 'Dup 2',
                    'options' => array(
                        'slot' => 'dup-slot',
                        'placement_hook' => 'footer',
                    ),
                    'content' => array(),
                ),
            ),
        ));
        if (is_wp_error($dup_check)) {
            WP_CLI::success('Slot uniqueness: ok');
        } else {
            $errors[] = 'Slot uniqueness: expected duplicate error but got success.';
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
