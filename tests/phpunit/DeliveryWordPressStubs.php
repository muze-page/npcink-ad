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

if ( ! function_exists( 'get_the_ID' ) ) {
	/**
	 * Return the current content fixture ID.
	 */
	function get_the_ID(): int { // phpcs:ignore WordPress.NamingConventions.ValidFunctionName.FunctionNameInvalid -- Mirrors the WordPress API.
		return (int) ( $GLOBALS['npcink_ad_test_current_post_id'] ?? 0 );
	}
}

if ( ! function_exists( 'get_queried_object_id' ) ) {
	/**
	 * Return the current queried content fixture ID.
	 */
	function get_queried_object_id(): int {
		return (int) ( $GLOBALS['npcink_ad_test_queried_post_id'] ?? get_the_ID() );
	}
}

if ( ! function_exists( 'has_blocks' ) ) {
	/**
	 * Detect serialized block comments in test content.
	 *
	 * @param string $content Serialized content.
	 */
	function has_blocks( string $content ): bool {
		return str_contains( $content, '<!-- wp:' );
	}
}

if ( ! function_exists( 'do_blocks' ) ) {
	/**
	 * Return already-renderable block fixture content.
	 *
	 * @param string $content Serialized content.
	 */
	function do_blocks( string $content ): string {
		return $content;
	}
}

if ( ! function_exists( 'wptexturize' ) ) {
	/**
	 * Keep fixture text unchanged.
	 *
	 * @param string $content Raw content.
	 */
	function wptexturize( string $content ): string {
		return $content;
	}
}

if ( ! function_exists( 'wpautop' ) ) {
	/**
	 * Wrap plain fixture text in one paragraph.
	 *
	 * @param string $content Raw content.
	 */
	function wpautop( string $content ): string {
		return '<p>' . $content . '</p>';
	}
}

if ( ! function_exists( 'wp_kses_post' ) ) {
	/**
	 * Keep trusted unit-test HTML unchanged.
	 *
	 * @param string $content Rendered content.
	 */
	function wp_kses_post( string $content ): string {
		return $content;
	}
}

if ( ! function_exists( 'wp_enqueue_style' ) ) {
	/**
	 * Record frontend style enqueueing.
	 *
	 * @param string $handle Registered style handle.
	 */
	function wp_enqueue_style( string $handle ): void {
		$GLOBALS['npcink_ad_test_enqueued_styles'][] = $handle;
	}
}

if ( ! function_exists( 'wp_enqueue_script' ) ) {
	/**
	 * Record frontend script enqueueing.
	 *
	 * @param string $handle Registered script handle.
	 */
	function wp_enqueue_script( string $handle ): void {
		$GLOBALS['npcink_ad_test_enqueued_scripts'][] = $handle;
	}
}

if ( ! function_exists( 'esc_attr__' ) ) {
	/**
	 * Return escaped untranslated fixture text.
	 *
	 * @param string $text Source text.
	 */
	function esc_attr__( string $text ): string {
		return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_html__' ) ) {
	/**
	 * Return escaped untranslated fixture text.
	 *
	 * @param string $text Source text.
	 */
	function esc_html__( string $text ): string {
		return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
	}
}
