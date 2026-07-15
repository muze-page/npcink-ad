<?php
/**
 * Remove all Magick AD data.
 *
 * @package MagickAD
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/**
 * Remove Magick AD data from the current site in the network.
 */
function magick_ad_uninstall_site_data(): void {
	global $wpdb;

	$magick_ad_post_ids = get_posts(
		array(
			'post_type'      => array( 'magick_ad', 'magick_ad_placement' ),
			'post_status'    => array( 'publish', 'future', 'draft', 'pending', 'private', 'trash', 'auto-draft', 'inherit' ),
			'posts_per_page' => -1,
			'fields'         => 'ids',
		)
	);
	foreach ( $magick_ad_post_ids as $magick_ad_post_id ) {
		wp_delete_post( (int) $magick_ad_post_id, true );
	}

	$magick_ad_option_patterns = array(
		'magick_ad_%',
		'_transient_magick_ad_%',
		'_transient_timeout_magick_ad_%',
	);
	foreach ( $magick_ad_option_patterns as $magick_ad_option_pattern ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Explicit uninstall cleanup.
		$wpdb->query(
			$wpdb->prepare(
				'DELETE FROM %i WHERE option_name LIKE %s',
				$wpdb->options,
				$wpdb->esc_like( rtrim( $magick_ad_option_pattern, '%' ) ) . '%'
			)
		);
	}

	$magick_ad_legacy_tables = array(
		$wpdb->prefix . 'magick_ad_stats',
		$wpdb->prefix . 'magick_ad_stats_log',
		$wpdb->prefix . 'magick_ad_stats_dim',
		$wpdb->prefix . 'magick_ad_stats_variant',
		$wpdb->prefix . 'magick_ad_stats_event',
	);
	foreach ( $magick_ad_legacy_tables as $magick_ad_legacy_table ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange -- Explicit legacy table cleanup during uninstall.
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', $magick_ad_legacy_table ) );
	}

	$magick_ad_roles = wp_roles();
	foreach ( $magick_ad_roles->role_objects as $magick_ad_role ) {
		if ( $magick_ad_role->has_cap( 'manage_magick_ads' ) ) {
			$magick_ad_role->remove_cap( 'manage_magick_ads' );
		}
	}
	remove_role( 'magick_ad_manager' );
}

if ( is_multisite() ) {
	$magick_ad_site_ids = get_sites(
		array(
			'fields' => 'ids',
			'number' => 0,
		)
	);
	foreach ( $magick_ad_site_ids as $magick_ad_site_id ) {
		switch_to_blog( (int) $magick_ad_site_id );
		try {
			magick_ad_uninstall_site_data();
		} finally {
			restore_current_blog();
		}
	}

	global $wpdb;
	$magick_ad_network_patterns = array(
		'magick_ad_%',
		'_site_transient_magick_ad_%',
		'_site_transient_timeout_magick_ad_%',
	);
	foreach ( $magick_ad_network_patterns as $magick_ad_network_pattern ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Explicit network uninstall cleanup.
		$wpdb->query(
			$wpdb->prepare(
				'DELETE FROM %i WHERE meta_key LIKE %s',
				$wpdb->sitemeta,
				$wpdb->esc_like( rtrim( $magick_ad_network_pattern, '%' ) ) . '%'
			)
		);
	}
} else {
	magick_ad_uninstall_site_data();
}
