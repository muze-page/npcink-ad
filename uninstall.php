<?php

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

global $wpdb;

$table = $wpdb->prefix . 'magick_ad_stats';
$log_table = $wpdb->prefix . 'magick_ad_stats_log';
$wpdb->query("DROP TABLE IF EXISTS {$table}");
$wpdb->query("DROP TABLE IF EXISTS {$log_table}");

delete_option('magick_ad_db_version');
delete_option('magick_ad_settings');
delete_option('magick_ad_debug');
delete_option('magick_ad_debug_log_settings');
delete_option('magick_ad_classic_editor');
delete_option('magick_ad_stats_diagnostics');

$templates = get_posts(array(
    'post_type' => 'magick_template',
    'post_status' => 'any',
    'numberposts' => -1,
    'fields' => 'ids',
));

foreach ($templates as $template_id) {
    wp_delete_post($template_id, true);
}
