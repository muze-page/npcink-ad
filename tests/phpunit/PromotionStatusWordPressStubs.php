<?php
/**
 * Minimal WordPress function stubs for Promotion status unit tests.
 *
 * @package NpcinkAd
 */

if ( ! function_exists( '__' ) ) {
	/**
	 * Return untranslated unit-test text.
	 *
	 * @param string $text Source text.
	 */
	function __( string $text ): string {
		return $text;
	}
}

if ( ! function_exists( '_n' ) ) {
	/**
	 * Return the singular or plural unit-test text.
	 *
	 * @param string $single Singular source text.
	 * @param string $plural Plural source text.
	 * @param int    $number Item count.
	 */
	function _n( string $single, string $plural, int $number ): string {
		return 1 === $number ? $single : $plural;
	}
}

if ( ! function_exists( 'sanitize_key' ) ) {
	/**
	 * Sanitize one key for pure unit tests.
	 *
	 * @param string $key Raw key.
	 */
	function sanitize_key( string $key ): string {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $key ) ) ?? '';
	}
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
	/**
	 * Sanitize one scalar text field for isolated tests.
	 *
	 * @param mixed $value Raw value.
	 */
	function sanitize_text_field( mixed $value ): string {
		return trim( strip_tags( (string) $value ) );
	}
}

if ( ! function_exists( 'absint' ) ) {
	/**
	 * Convert one value to a non-negative integer.
	 *
	 * @param mixed $value Raw value.
	 */
	function absint( mixed $value ): int {
		return abs( (int) $value );
	}
}

if ( ! function_exists( 'current_datetime' ) ) {
	/**
	 * Return a stable current timestamp for list-status tests.
	 */
	function current_datetime(): DateTimeImmutable {
		return new DateTimeImmutable( '@1800000000' );
	}
}

if ( ! function_exists( 'wp_timezone' ) ) {
	/**
	 * Use UTC for deterministic repository datetime tests.
	 */
	function wp_timezone(): DateTimeZone {
		return new DateTimeZone( 'UTC' );
	}
}

if ( ! function_exists( 'get_post_type_object' ) ) {
	/**
	 * Get the test Promotion post type object.
	 *
	 * @param string $post_type Post type name.
	 */
	function get_post_type_object( string $post_type ): ?WP_Post_Type {
		unset( $post_type );

		return new WP_Post_Type();
	}
}

if ( ! function_exists( 'current_user_can' ) ) {
	/**
	 * Grant capabilities inside the isolated list-rendering tests.
	 *
	 * @param string $capability Capability name.
	 * @param mixed  ...$args    Optional capability context.
	 */
	function current_user_can( string $capability, mixed ...$args ): bool {
		unset( $capability, $args );

		return true;
	}
}

if ( ! function_exists( 'admin_url' ) ) {
	/**
	 * Build a deterministic test admin URL.
	 *
	 * @param string $path Relative admin path.
	 */
	function admin_url( string $path = '' ): string {
		return 'https://example.test/wp-admin/' . ltrim( $path, '/' );
	}
}

if ( ! function_exists( 'esc_url' ) ) {
	/**
	 * Escape a test URL.
	 *
	 * @param string $url URL to escape.
	 */
	function esc_url( string $url ): string {
		return htmlspecialchars( $url, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_attr' ) ) {
	/**
	 * Escape a test HTML attribute.
	 *
	 * @param string $text Text to escape.
	 */
	function esc_attr( string $text ): string {
		return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_html' ) ) {
	/**
	 * Escape test HTML text.
	 *
	 * @param string $text Text to escape.
	 */
	function esc_html( string $text ): string {
		return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'wp_nonce_field' ) ) {
	/**
	 * Render deterministic nonce and referer fields for tests.
	 *
	 * @param string $action  Nonce action.
	 * @param string $name    Nonce field name.
	 * @param bool   $referer Whether to include the referer field.
	 * @param bool   $display Whether to echo the fields.
	 */
	function wp_nonce_field( string $action, string $name = '_wpnonce', bool $referer = true, bool $display = true ): string {
		$output = '<input type="hidden" name="' . esc_attr( $name ) . '" value="' . esc_attr( 'nonce:' . $action ) . '" />';
		if ( $referer ) {
			$output .= '<input type="hidden" name="_wp_http_referer" value="/wp-admin/edit.php?post_type=npcink_promotion" />';
		}
		if ( $display ) {
			echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Fully escaped deterministic test fixture.
		}

		return $output;
	}
}

if ( ! function_exists( 'get_post' ) ) {
	/**
	 * Get one in-memory post fixture.
	 *
	 * @param int $post_id Post ID.
	 * @return object|null
	 */
	function get_post( int $post_id ): ?object {
		$posts = $GLOBALS['npcink_ad_test_posts'] ?? array();

		return $posts[ $post_id ] ?? null;
	}
}

if ( ! function_exists( 'get_post_meta' ) ) {
	/**
	 * Get one in-memory metadata fixture.
	 *
	 * @param int    $post_id Post ID.
	 * @param string $key     Metadata key.
	 * @param bool   $single  Whether a single value is requested.
	 * @return mixed
	 */
	function get_post_meta( int $post_id, string $key, bool $single = false ): mixed {
		unset( $single );
		$meta = $GLOBALS['npcink_ad_test_meta'] ?? array();

		return $meta[ $post_id ][ $key ] ?? '';
	}
}

if ( ! function_exists( 'get_the_title' ) ) {
	/**
	 * Get one deterministic test title.
	 *
	 * @param int $post_id Post ID.
	 */
	function get_the_title( int $post_id ): string {
		$titles = $GLOBALS['npcink_ad_test_titles'] ?? array();
		if ( isset( $titles[ $post_id ] ) ) {
			return (string) $titles[ $post_id ];
		}

		$post = get_post( $post_id );

		return is_object( $post ) ? (string) ( $post->post_title ?? '' ) : '';
	}
}

if ( ! function_exists( 'get_posts' ) ) {
	/**
	 * Return public post/page IDs from an in-memory bounded query.
	 *
	 * @param array $args Query arguments.
	 * @return list<int>
	 * @phpstan-param array<string, mixed> $args
	 */
	function get_posts( array $args = array() ): array {
		$GLOBALS['npcink_ad_test_get_posts_queries'][] = $args;

		$posts = $GLOBALS['npcink_ad_test_posts'] ?? array();
		$ids   = is_array( $args['post__in'] ?? null ) ? $args['post__in'] : array();
		if ( 'npcink_promotion' === ( $args['post_type'] ?? '' ) && array() === $ids ) {
			$meta = $GLOBALS['npcink_ad_test_meta'] ?? array();
			$automatic_posts = array_values(
				array_filter(
					$posts,
					static function ( object $post ) use ( $meta ): bool {
						$location = (string) ( $meta[ $post->ID ]['_npcink_ad_location'] ?? '' );

						return 'npcink_promotion' === ( $post->post_type ?? '' )
							&& 'publish' === ( $post->post_status ?? '' )
							&& in_array( $location, array( '', 'content_before', 'content_after' ), true );
					}
				)
			);
			usort(
				$automatic_posts,
				static fn ( object $first, object $second ): int => (int) $first->ID <=> (int) $second->ID
			);

			return $automatic_posts;
		}

		$public_ids = $GLOBALS['npcink_ad_test_public_ids'] ?? null;
		if ( is_array( $public_ids ) ) {
			$lookup = array_fill_keys( array_map( 'intval', $public_ids ), true );

			return array_values(
				array_filter(
					array_map( 'intval', $ids ),
					static fn ( int $post_id ): bool => isset( $lookup[ $post_id ] )
				)
			);
		}

		return array_values(
			array_filter(
				array_map( 'intval', $ids ),
				static function ( int $post_id ) use ( $posts ): bool {
					$post = $posts[ $post_id ] ?? null;

					return is_object( $post )
						&& 'publish' === ( $post->post_status ?? '' )
						&& in_array( $post->post_type ?? '', array( 'post', 'page' ), true );
				}
			)
		);
	}
}
