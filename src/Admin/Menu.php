<?php
/**
 * Native admin menu registration.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Admin;

use Npcink\Ad\Data\Post_Types;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Adds one menu for the native promotion workflow.
 */
final class Menu {
	/**
	 * Register the Npcink Ad menu and promotion list submenu.
	 */
	public static function register(): void {
		$promotions_url = 'edit.php?post_type=' . Post_Types::PROMOTION_POST_TYPE;

		add_menu_page(
			__( 'Npcink Ad', 'npcink-ad' ),
			__( 'Npcink Ad', 'npcink-ad' ),
			'manage_npcink_ads',
			$promotions_url,
			'',
			'dashicons-megaphone',
			25
		);

		add_submenu_page(
			$promotions_url,
			__( 'Promotions', 'npcink-ad' ),
			__( 'Promotions', 'npcink-ad' ),
			'manage_npcink_ads',
			$promotions_url
		);
	}
}
