<?php
if (!defined('ABSPATH')) {
    exit;
}

$magick_ad_frontend_class = '\\MagickAD\\Frontend\\Frontend';
$magick_ad_original_template = null;

if (class_exists($magick_ad_frontend_class)) {
    $magick_ad_frontend_class::render_comments_top_ads();
    $magick_ad_original_template = $magick_ad_frontend_class::get_comments_template_original();
}

if ($magick_ad_original_template && is_string($magick_ad_original_template) && file_exists($magick_ad_original_template)) {
    require $magick_ad_original_template;
} else {
    require ABSPATH . WPINC . '/theme-compat/comments.php';
}

if (class_exists($magick_ad_frontend_class)) {
    $magick_ad_frontend_class::render_comments_bottom_ads();
}
