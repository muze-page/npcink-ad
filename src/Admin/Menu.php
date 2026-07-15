<?php
/**
 * Native admin menu registration.
 *
 * @package MagickAD
 */

namespace MagickAD\Admin;

use MagickAD\Data\Post_Types;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Adds one menu containing the two native post type list screens.
 */
final class Menu {
	/**
	 * Register the Magick AD menu and native list submenus.
	 */
	public static function register(): void {
		$ads_url        = 'edit.php?post_type=' . Post_Types::AD_POST_TYPE;
		$placements_url = 'edit.php?post_type=' . Post_Types::PLACEMENT_POST_TYPE;

		add_menu_page(
			__( 'Magick AD', 'magick-ad' ),
			__( 'Magick AD', 'magick-ad' ),
			'manage_magick_ads',
			$ads_url,
			'',
			'dashicons-megaphone',
			25
		);

		add_submenu_page(
			$ads_url,
			__( 'Ads', 'magick-ad' ),
			__( 'Ads', 'magick-ad' ),
			'manage_magick_ads',
			$ads_url
		);

		add_submenu_page(
			$ads_url,
			__( 'Placements', 'magick-ad' ),
			__( 'Placements', 'magick-ad' ),
			'manage_magick_ads',
			$placements_url
		);
	}
}
