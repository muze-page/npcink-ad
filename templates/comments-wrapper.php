<?php
if (!defined('ABSPATH')) {
    exit;
}

$frontend_class = '\\MagickAD\\Frontend\\Frontend';
$original_template = null;

if (class_exists($frontend_class)) {
    $frontend_class::render_comments_top_ads();
    $original_template = $frontend_class::get_comments_template_original();
}

if ($original_template && is_string($original_template) && file_exists($original_template)) {
    require $original_template;
} else {
    require ABSPATH . WPINC . '/theme-compat/comments.php';
}

if (class_exists($frontend_class)) {
    $frontend_class::render_comments_bottom_ads();
}
