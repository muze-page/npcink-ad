<?php
/**
 * Conservative WordPress page-cache environment detection.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Environment;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Detects only WordPress's standard advanced-cache drop-in boundary.
 *
 * This intentionally makes no claim about the cache vendor, whether a given
 * response is cached, or whether a purge integration is available.
 */
final class Page_Cache {
	/**
	 * Check the current WordPress runtime for an enabled advanced-cache drop-in.
	 */
	public static function has_advanced_cache_drop_in(): bool {
		if ( ! defined( 'WP_CACHE' ) || ! defined( 'WP_CONTENT_DIR' ) ) {
			return false;
		}

		return self::matches_advanced_cache_boundary(
			constant( 'WP_CACHE' ),
			(string) constant( 'WP_CONTENT_DIR' )
		);
	}

	/**
	 * Evaluate the narrow detection boundary with explicit values.
	 *
	 * Kept separate from global constants so the contract remains deterministic
	 * and unit-testable without pretending to identify a cache implementation.
	 *
	 * @param mixed  $wp_cache       Candidate WP_CACHE value.
	 * @param string $wp_content_dir Candidate WordPress content directory.
	 */
	public static function matches_advanced_cache_boundary( mixed $wp_cache, string $wp_content_dir ): bool {
		// Match Core's `if ( WP_CACHE )` loading boundary rather than requiring
		// the constant to be the literal boolean true.
		if ( ! (bool) $wp_cache || '' === trim( $wp_content_dir ) ) {
			return false;
		}

		return is_file( rtrim( $wp_content_dir, '/\\' ) . DIRECTORY_SEPARATOR . 'advanced-cache.php' );
	}
}
