<?php
/**
 * Single-site and multisite lifecycle operations.
 *
 * @package MagickAD
 */

namespace MagickAD;

use MagickAD\Data\Post_Types;
use MagickAD\Data\Roles;
use WP_Site;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Applies lifecycle work to every affected site in a network.
 */
final class Lifecycle {
	/**
	 * Obsolete action names whose scheduled events must be removed.
	 *
	 * @var list<string>
	 */
	private const LEGACY_CRON_HOOKS = array(
		'magick_ad_flush_stats_cache',
		'magick_ad_cleanup_stats_dim',
		'magick_ad_cleanup_diagnostics_log',
	);

	/**
	 * Activate the plugin on one site or every site in the current network.
	 *
	 * @param bool $network_wide Whether this is a network activation.
	 */
	public static function activate( bool $network_wide ): void {
		self::for_each_affected_site(
			$network_wide,
			static function (): void {
				Roles::install();
				Post_Types::register();
				flush_rewrite_rules();
			}
		);
	}

	/**
	 * Deactivate the plugin on one site or every site in the current network.
	 *
	 * @param bool $network_wide Whether this is a network deactivation.
	 */
	public static function deactivate( bool $network_wide ): void {
		self::for_each_affected_site(
			$network_wide,
			static function (): void {
				self::clear_legacy_cron();
				flush_rewrite_rules();
			}
		);
	}

	/**
	 * Register capability provisioning for sites created after activation.
	 */
	public static function register_new_site_hook(): void {
		if ( is_multisite() ) {
			add_action( 'wp_initialize_site', array( self::class, 'initialize_site' ), 100 );
		}
	}

	/**
	 * Provision a new site when Magick AD is network active.
	 *
	 * @param WP_Site $site Newly initialized site.
	 */
	public static function initialize_site( WP_Site $site ): void {
		$network_plugins = get_network_option( $site->network_id, 'active_sitewide_plugins', array() );
		$plugin_file     = plugin_basename( MAGICK_AD_FILE );
		if ( ! is_array( $network_plugins ) || ! isset( $network_plugins[ $plugin_file ] ) ) {
			return;
		}

		switch_to_blog( (int) $site->blog_id );
		try {
			Roles::install();
			Post_Types::register();
			flush_rewrite_rules();
		} finally {
			restore_current_blog();
		}
	}

	/**
	 * Run an operation for the current site or all sites in the current network.
	 *
	 * @param bool     $network_wide Whether the operation is network wide.
	 * @param callable $operation    Site-local operation.
	 */
	private static function for_each_affected_site( bool $network_wide, callable $operation ): void {
		if ( ! is_multisite() || ! $network_wide ) {
			$operation();
			return;
		}

		$site_ids = get_sites(
			array(
				'fields'     => 'ids',
				'number'     => 0,
				'network_id' => get_current_network_id(),
			)
		);
		foreach ( $site_ids as $site_id ) {
			switch_to_blog( (int) $site_id );
			try {
				$operation();
			} finally {
				restore_current_blog();
			}
		}
	}

	/**
	 * Remove all scheduled events registered by the discarded runtime.
	 */
	private static function clear_legacy_cron(): void {
		foreach ( self::LEGACY_CRON_HOOKS as $legacy_hook ) {
			wp_clear_scheduled_hook( $legacy_hook );
		}
	}
}
