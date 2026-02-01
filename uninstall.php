<?php

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

global $wpdb;

$table = $wpdb->prefix . 'magick_ad_stats';
$log_table = $wpdb->prefix . 'magick_ad_stats_log';
$dim_table = $wpdb->prefix . 'magick_ad_stats_dim';
$safe_table = preg_replace('/[^A-Za-z0-9_]/', '', $table);
$safe_log_table = preg_replace('/[^A-Za-z0-9_]/', '', $log_table);
$safe_dim_table = preg_replace('/[^A-Za-z0-9_]/', '', $dim_table);
$wpdb->query("DROP TABLE IF EXISTS {$safe_table}");
$wpdb->query("DROP TABLE IF EXISTS {$safe_log_table}");
$wpdb->query("DROP TABLE IF EXISTS {$safe_dim_table}");

$option_like = $wpdb->esc_like('magick_ad_') . '%';
$transient_like = $wpdb->esc_like('_transient_magick_ad_') . '%';
$transient_timeout_like = $wpdb->esc_like('_transient_timeout_magick_ad_') . '%';

$wpdb->query(
    $wpdb->prepare(
        "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
        $option_like
    )
);
$wpdb->query(
    $wpdb->prepare(
        "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
        $transient_like
    )
);
$wpdb->query(
    $wpdb->prepare(
        "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
        $transient_timeout_like
    )
);

if (is_multisite()) {
    $wpdb->query(
        $wpdb->prepare(
            "DELETE FROM {$wpdb->sitemeta} WHERE meta_key LIKE %s",
            $option_like
        )
    );
    $wpdb->query(
        $wpdb->prepare(
            "DELETE FROM {$wpdb->sitemeta} WHERE meta_key LIKE %s",
            $wpdb->esc_like('_site_transient_magick_ad_') . '%'
        )
    );
    $wpdb->query(
        $wpdb->prepare(
            "DELETE FROM {$wpdb->sitemeta} WHERE meta_key LIKE %s",
            $wpdb->esc_like('_site_transient_timeout_magick_ad_') . '%'
        )
    );
}

if (function_exists('remove_role')) {
    remove_role('magick_ad_manager');
    $admin = get_role('administrator');
    if ($admin?->has_cap('manage_magick_ads')) {
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
