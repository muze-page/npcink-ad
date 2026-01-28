<?php
if (!defined('ABSPATH')) {
    exit;
}

$original_template = null;
if (class_exists('Magick_AD_Frontend')) {
    Magick_AD_Frontend::render_comments_top_ads();
    $original_template = Magick_AD_Frontend::get_comments_template_original();
}

if ($original_template && file_exists($original_template)) {
    require $original_template;
} else {
    require ABSPATH . WPINC . '/theme-compat/comments.php';
}

if (class_exists('Magick_AD_Frontend')) {
    Magick_AD_Frontend::render_comments_bottom_ads();
}
