<?php
/**
 * Runtime constants for static analysis.
 *
 * @package MagickAD
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

if ( ! defined( 'MAGICK_AD_FILE' ) ) {
	define( 'MAGICK_AD_FILE', dirname( __DIR__, 2 ) . '/magick-ad.php' );
}

if ( ! defined( 'MAGICK_AD_PATH' ) ) {
	define( 'MAGICK_AD_PATH', dirname( __DIR__, 2 ) . '/' );
}

if ( ! defined( 'MAGICK_AD_URL' ) ) {
	define( 'MAGICK_AD_URL', 'https://example.test/wp-content/plugins/magick-ad/' );
}

if ( ! defined( 'MAGICK_AD_VERSION' ) ) {
	define( 'MAGICK_AD_VERSION', '0.2.0' );
}
