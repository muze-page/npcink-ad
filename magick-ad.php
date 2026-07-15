<?php
/**
 * Plugin Name: Magick AD
 * Description: A small, native WordPress ad and placement manager.
 * Version: 0.2.0
 * Requires at least: 6.5
 * Tested up to: 7.0
 * Requires PHP: 8.1
 * Author: Magick AD
 * Text Domain: magick-ad
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package MagickAD
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MAGICK_AD_FILE', __FILE__ );
define( 'MAGICK_AD_PATH', plugin_dir_path( __FILE__ ) );
define( 'MAGICK_AD_URL', plugin_dir_url( __FILE__ ) );
define( 'MAGICK_AD_VERSION', '0.2.0' );

/**
 * Load Magick AD classes from the src directory.
 *
 * @param string $class_name Fully qualified class name.
 */
function magick_ad_autoload( string $class_name ): void {
	$prefix = 'MagickAD\\';
	if ( ! str_starts_with( $class_name, $prefix ) ) {
		return;
	}

	$relative = str_replace( '\\', '/', substr( $class_name, strlen( $prefix ) ) );
	$file     = MAGICK_AD_PATH . 'src/' . $relative . '.php';
	if ( is_readable( $file ) ) {
		require_once $file;
	}
}
spl_autoload_register( 'magick_ad_autoload' );

/**
 * Establish the clean-baseline content types and capability.
 *
 * @param bool $network_wide Whether activation applies to the current network.
 */
function magick_ad_activate( bool $network_wide = false ): void {
	\MagickAD\Lifecycle::activate( $network_wide );
}

/**
 * Remove obsolete scheduled events and refresh rewrite rules.
 *
 * @param bool $network_wide Whether deactivation applies to the current network.
 */
function magick_ad_deactivate( bool $network_wide = false ): void {
	\MagickAD\Lifecycle::deactivate( $network_wide );
}

register_activation_hook( __FILE__, 'magick_ad_activate' );
register_deactivation_hook( __FILE__, 'magick_ad_deactivate' );

( new \MagickAD\Plugin() )->init();
