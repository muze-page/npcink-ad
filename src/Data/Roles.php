<?php
/**
 * Plugin capability lifecycle.
 *
 * @package MagickAD
 */

namespace MagickAD\Data;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Manages the single plugin capability.
 */
final class Roles {
	/**
	 * Grant Magick AD management to administrators.
	 */
	public static function install(): void {
		$administrator = get_role( 'administrator' );
		if ( $administrator && ! $administrator->has_cap( 'manage_magick_ads' ) ) {
			$administrator->add_cap( 'manage_magick_ads' );
		}
	}
}
