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
		unset( $args );
		$capabilities = $GLOBALS['npcink_ad_test_capabilities'] ?? null;
		if ( is_array( $capabilities ) && array_key_exists( $capability, $capabilities ) ) {
			return (bool) $capabilities[ $capability ];
		}

		return true;
	}
}

if ( ! function_exists( 'add_action' ) ) {
	/**
	 * Capture action registrations for isolated list tests.
	 *
	 * @param string $hook_name     Action name.
	 * @param mixed  $callback      Registered callback.
	 * @param int    $priority      Hook priority.
	 * @param int    $accepted_args Accepted argument count.
	 */
	function add_action( string $hook_name, mixed $callback, int $priority = 10, int $accepted_args = 1 ): bool {
		$GLOBALS['npcink_ad_test_actions'][] = compact( 'hook_name', 'callback', 'priority', 'accepted_args' );

		return true;
	}
}

if ( ! function_exists( 'add_filter' ) ) {
	/**
	 * Capture filter registrations for isolated list tests.
	 *
	 * @param string $hook_name     Filter name.
	 * @param mixed  $callback      Registered callback.
	 * @param int    $priority      Hook priority.
	 * @param int    $accepted_args Accepted argument count.
	 */
	function add_filter( string $hook_name, mixed $callback, int $priority = 10, int $accepted_args = 1 ): bool {
		$GLOBALS['npcink_ad_test_filters'][] = compact( 'hook_name', 'callback', 'priority', 'accepted_args' );

		return true;
	}
}

if ( ! function_exists( 'get_current_screen' ) ) {
	/**
	 * Return the current deterministic admin screen.
	 */
	function get_current_screen(): object|false {
		$screen = $GLOBALS['npcink_ad_test_current_screen'] ?? false;

		return is_object( $screen ) ? $screen : false;
	}
}

if ( ! function_exists( 'wp_count_posts' ) ) {
	/**
	 * Return deterministic post counts for every status.
	 *
	 * @param string $post_type Post type being counted.
	 * @param string $perm      Permission context.
	 */
	function wp_count_posts( string $post_type, string $perm = '' ): object {
		$GLOBALS['npcink_ad_test_count_posts_calls'][] = array(
			'post_type' => $post_type,
			'perm'      => $perm,
		);

		$counts = $GLOBALS['npcink_ad_test_post_counts'] ?? (object) array();

		return is_object( $counts ) ? $counts : (object) array();
	}
}

if ( ! function_exists( 'wp_unslash' ) ) {
	/**
	 * Return already-unslashed deterministic request input.
	 *
	 * @param mixed $value Raw request value.
	 */
	function wp_unslash( mixed $value ): mixed {
		return $value;
	}
}

if ( ! function_exists( 'register_post_meta' ) ) {
	/**
	 * Capture typed post-meta registrations for isolated schema tests.
	 *
	 * @param string               $post_type Post type.
	 * @param string               $meta_key  Metadata key.
	 * @param array<string, mixed> $args      Registration arguments.
	 */
	function register_post_meta( string $post_type, string $meta_key, array $args ): bool {
		$GLOBALS['npcink_ad_test_registered_post_meta'][ $meta_key ] = array(
			'post_type' => $post_type,
			'args'      => $args,
		);

		return true;
	}
}

if ( ! function_exists( 'is_wp_error' ) ) {
	/**
	 * Check the minimal REST preflight error class.
	 *
	 * @param mixed $thing Candidate value.
	 */
	function is_wp_error( mixed $thing ): bool {
		return $thing instanceof WP_Error;
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

if ( ! function_exists( 'metadata_exists' ) ) {
	/**
	 * Distinguish absent metadata from an explicitly stored empty value.
	 *
	 * @param string $meta_type Object type.
	 * @param int    $object_id Object ID.
	 * @param string $meta_key  Metadata key.
	 */
	function metadata_exists( string $meta_type, int $object_id, string $meta_key ): bool {
		unset( $meta_type );
		$meta = $GLOBALS['npcink_ad_test_meta'] ?? array();

		return array_key_exists( $meta_key, $meta[ $object_id ] ?? array() );
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

if ( ! function_exists( 'get_edit_post_link' ) ) {
	/**
	 * Build one deterministic, capability-aware edit link.
	 *
	 * @param int    $post_id Post ID.
	 * @param string $context Escaping context.
	 */
	function get_edit_post_link( int $post_id, string $context = 'display' ): ?string {
		unset( $context );
		if ( ! current_user_can( 'manage_npcink_ads', $post_id ) ) {
			return null;
		}

		return 'https://example.test/wp-admin/post.php?post=' . $post_id . '&action=edit';
	}
}

if ( ! function_exists( 'get_posts' ) ) {
	/**
	 * Return public post/page IDs from an in-memory bounded query.
	 *
	 * @param array $args Query arguments.
	 * @return list<int|object>
	 * @phpstan-param array<string, mixed> $args
	 */
	function get_posts( array $args = array() ): array {
		$GLOBALS['npcink_ad_test_get_posts_queries'][] = $args;

		$posts = $GLOBALS['npcink_ad_test_posts'] ?? array();
		$ids   = is_array( $args['post__in'] ?? null ) ? $args['post__in'] : array();
		if ( 'npcink_promotion' === ( $args['post_type'] ?? '' ) && array() === $ids ) {
			$meta       = $GLOBALS['npcink_ad_test_meta'] ?? array();
			$meta_query = is_array( $args['meta_query'] ?? null ) ? $args['meta_query'] : array();
			$matches_meta_query = static function ( array $query, int $post_id ) use ( &$matches_meta_query, $meta ): bool {
				$results = array();
				foreach ( $query as $index => $clause ) {
					if ( 'relation' === $index || ! is_array( $clause ) ) {
						continue;
					}
					if ( isset( $clause['key'] ) ) {
						$key     = (string) $clause['key'];
						$exists  = array_key_exists( $key, $meta[ $post_id ] ?? array() );
						$value   = $exists ? $meta[ $post_id ][ $key ] : null;
						$compare = strtoupper( (string) ( $clause['compare'] ?? '=' ) );
						if ( 'NOT EXISTS' === $compare ) {
							$results[] = ! $exists;
						} elseif ( 'IN' === $compare ) {
							$allowed   = is_array( $clause['value'] ?? null ) ? $clause['value'] : array();
							$results[] = $exists && in_array( $value, $allowed, true );
						} else {
							$results[] = $exists && ( $clause['value'] ?? null ) === $value;
						}
						continue;
					}

					$results[] = $matches_meta_query( $clause, $post_id );
				}

				if ( array() === $results ) {
					return true;
				}

				return 'OR' === strtoupper( (string) ( $query['relation'] ?? 'AND' ) )
					? in_array( true, $results, true )
					: ! in_array( false, $results, true );
			};
			$automatic_posts   = array_values(
				array_filter(
					$posts,
					static function ( object $post ) use ( $args, $matches_meta_query, $meta_query ): bool {
						return 'npcink_promotion' === ( $post->post_type ?? '' )
							&& ( $args['post_status'] ?? 'publish' ) === ( $post->post_status ?? '' )
							&& $matches_meta_query( $meta_query, (int) $post->ID );
					}
				)
			);
			usort(
				$automatic_posts,
				static function ( object $first, object $second ): int {
					$menu_order = (int) ( $first->menu_order ?? 0 ) <=> (int) ( $second->menu_order ?? 0 );

					return 0 !== $menu_order ? $menu_order : (int) $first->ID <=> (int) $second->ID;
				}
			);

			if ( 'ids' === ( $args['fields'] ?? '' ) ) {
				return array_values( array_map( static fn ( object $post ): int => (int) $post->ID, $automatic_posts ) );
			}

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
