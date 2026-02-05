<?php

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

global $wpdb;

$magick_ad_tables = array(
    $wpdb->prefix . 'magick_ad_stats',
    $wpdb->prefix . 'magick_ad_stats_log',
    $wpdb->prefix . 'magick_ad_stats_dim',
    $wpdb->prefix . 'magick_ad_stats_variant',
    $wpdb->prefix . 'magick_ad_stats_event',
);

foreach ($magick_ad_tables as $magick_ad_table) {
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- Uninstall schema cleanup.
    $wpdb->query($wpdb->prepare('DROP TABLE IF EXISTS %i', $magick_ad_table));
}

$magick_ad_option_like = $wpdb->esc_like('magick_ad_') . '%';
$magick_ad_transient_like = $wpdb->esc_like('_transient_magick_ad_') . '%';
$magick_ad_transient_timeout_like = $wpdb->esc_like('_transient_timeout_magick_ad_') . '%';

// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Uninstall cleanup.
$wpdb->query(
    $wpdb->prepare(
        'DELETE FROM %i WHERE option_name LIKE %s',
        $wpdb->options,
        $magick_ad_option_like
    )
);
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Uninstall cleanup.
$wpdb->query(
    $wpdb->prepare(
        'DELETE FROM %i WHERE option_name LIKE %s',
        $wpdb->options,
        $magick_ad_transient_like
    )
);
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Uninstall cleanup.
$wpdb->query(
    $wpdb->prepare(
        'DELETE FROM %i WHERE option_name LIKE %s',
        $wpdb->options,
        $magick_ad_transient_timeout_like
    )
);

if (is_multisite()) {
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Uninstall cleanup.
    $wpdb->query(
        $wpdb->prepare(
            'DELETE FROM %i WHERE meta_key LIKE %s',
            $wpdb->sitemeta,
            $magick_ad_option_like
        )
    );
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Uninstall cleanup.
    $wpdb->query(
        $wpdb->prepare(
            'DELETE FROM %i WHERE meta_key LIKE %s',
            $wpdb->sitemeta,
            $wpdb->esc_like('_site_transient_magick_ad_') . '%'
        )
    );
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Uninstall cleanup.
    $wpdb->query(
        $wpdb->prepare(
            'DELETE FROM %i WHERE meta_key LIKE %s',
            $wpdb->sitemeta,
            $wpdb->esc_like('_site_transient_timeout_magick_ad_') . '%'
        )
    );
}

if (function_exists('remove_role')) {
    remove_role('magick_ad_manager');
    $magick_ad_admin = get_role('administrator');
    if ($magick_ad_admin?->has_cap('manage_magick_ads')) {
        $magick_ad_admin->remove_cap('manage_magick_ads');
    }
}

$magick_ad_ads = get_posts(array(
    'post_type' => 'magick_ad',
    'post_status' => 'any',
    'numberposts' => -1,
    'fields' => 'ids',
));

foreach ($magick_ad_ads as $magick_ad_ad_id) {
    wp_delete_post($magick_ad_ad_id, true);
}
