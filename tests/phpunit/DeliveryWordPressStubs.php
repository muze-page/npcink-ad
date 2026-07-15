<?php
/**
 * Minimal WordPress request-condition stubs for Delivery tests.
 *
 * @package NpcinkAd
 */

if ( ! function_exists( 'is_admin' ) ) {
	/**
	 * Report frontend context in Delivery tests.
	 */
	function is_admin(): bool {
		return false;
	}
}

if ( ! function_exists( 'is_feed' ) ) {
	/**
	 * Report a normal document request in Delivery tests.
	 */
	function is_feed(): bool {
		return false;
	}
}

if ( ! function_exists( 'is_singular' ) ) {
	/**
	 * Model WordPress's post-type-aware singular conditional.
	 *
	 * @param string|string[] $post_types Optional post type constraint.
	 */
	function is_singular( string|array $post_types = '' ): bool {
		$GLOBALS['npcink_ad_test_singular_arguments'][] = $post_types;
		$actual_post_type = (string) ( $GLOBALS['npcink_ad_test_singular_post_type'] ?? '' );
		if ( '' === $actual_post_type ) {
			return false;
		}
		if ( '' === $post_types || array() === $post_types ) {
			return true;
		}

		return in_array( $actual_post_type, (array) $post_types, true );
	}
}

if ( ! function_exists( 'in_the_loop' ) ) {
	/**
	 * Report main-loop content in Delivery tests.
	 */
	function in_the_loop(): bool {
		return true;
	}
}

if ( ! function_exists( 'is_main_query' ) ) {
	/**
	 * Report the main query in Delivery tests.
	 */
	function is_main_query(): bool {
		return true;
	}
}
