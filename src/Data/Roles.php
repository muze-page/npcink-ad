<?php
/**
 * Plugin capability lifecycle.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Data;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Manages the single plugin capability.
 */
final class Roles {
	/**
	 * Grant promotion management to WordPress administrators and editors.
	 */
	public static function install(): void {
		foreach ( array( 'administrator', 'editor' ) as $role_name ) {
			$role = get_role( $role_name );
			if ( $role && ! $role->has_cap( 'manage_npcink_ads' ) ) {
				$role->add_cap( 'manage_npcink_ads' );
			}
		}
	}
}
