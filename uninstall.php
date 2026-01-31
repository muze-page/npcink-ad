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
delete_option('magick_ad_ads_migrated');
delete_option('magick_ad_debug');
delete_option('magick_ad_debug_log_settings');
delete_option('magick_ad_classic_editor');
delete_option('magick_ad_stats_diagnostics');
delete_option('magick_ad_template_categories');
delete_option('magick_ad_tracking_strategy');
delete_option('magick_ad_tracking_require_consent');
delete_option('magick_ad_brand_name');
delete_option('magick_ad_brand_tagline');
delete_option('magick_ad_manage_capability');

$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE 'magick_ad_%'");
$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_magick_ad_%'");
$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_magick_ad_%'");

if (is_multisite()) {
    $wpdb->query("DELETE FROM {$wpdb->sitemeta} WHERE meta_key LIKE 'magick_ad_%'");
    $wpdb->query("DELETE FROM {$wpdb->sitemeta} WHERE meta_key LIKE '_site_transient_magick_ad_%'");
    $wpdb->query("DELETE FROM {$wpdb->sitemeta} WHERE meta_key LIKE '_site_transient_timeout_magick_ad_%'");
}

if (function_exists('remove_role')) {
    remove_role('magick_ad_manager');
    $admin = get_role('administrator');
    if ($admin && $admin->has_cap('manage_magick_ads')) {
        $admin->remove_cap('manage_magick_ads');
    }
}

$ads = get_posts(array(
    'post_type' => 'magick_ad',
    'post_status' => 'any',
    'numberposts' => -1,
    'fields' => 'ids',
));

foreach ($ads as $ad_id) {
    wp_delete_post($ad_id, true);
}
