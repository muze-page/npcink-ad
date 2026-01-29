<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

final class Template_CPT {
    public function register(): void {
        add_action('init', array($this, 'register_cpt'));
    }

    public function register_cpt(): void {
        register_post_type('magick_template', array(
            'labels' => array(
                'name' => esc_html__('Magick Templates', 'magick-ad'),
                'singular_name' => esc_html__('Magick Template', 'magick-ad'),
            ),
            'public' => false,
            'show_ui' => false,
            'show_in_rest' => false,
            'supports' => array('title'),
            'capability_type' => 'post',
            'map_meta_cap' => true,
        ));
    }
}
