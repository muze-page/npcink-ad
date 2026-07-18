<?php
/**
 * WordPress mutation stubs for Promotion duplication tests.
 *
 * @package NpcinkAd
 */

if ( ! function_exists( 'get_current_user_id' ) ) {
	/**
	 * Return the deterministic current user.
	 */
	function get_current_user_id(): int {
		return (int) ( $GLOBALS['npcink_ad_test_current_user_id'] ?? 42 );
	}
}

if ( ! function_exists( 'wp_slash' ) ) {
	/**
	 * Slash scalar or nested test data like WordPress.
	 *
	 * @param mixed $value Raw value.
	 * @return mixed
	 */
	function wp_slash( mixed $value ): mixed {
		if ( is_array( $value ) ) {
			return array_map( 'wp_slash', $value );
		}

		return is_string( $value ) ? addslashes( $value ) : $value;
	}
}

if ( ! function_exists( 'wp_insert_post' ) ) {
	/**
	 * Insert an in-memory post or return the configured error.
	 *
	 * @param array<string, mixed> $postarr  New post fields.
	 * @param bool                 $wp_error Whether callers requested WP_Error.
	 * @return int|WP_Error
	 */
	function wp_insert_post( array $postarr, bool $wp_error = false ): int|WP_Error {
		unset( $wp_error );
		$GLOBALS['npcink_ad_test_insert_calls'][] = $postarr;
		$error = $GLOBALS['npcink_ad_test_insert_error'] ?? null;
		if ( $error instanceof WP_Error ) {
			return $error;
		}

		$post_id = (int) ( $GLOBALS['npcink_ad_test_next_post_id'] ?? 200 );
		$GLOBALS['npcink_ad_test_next_post_id'] = $post_id + 1;
		$stored_post = array(
			'ID'           => $post_id,
			'post_type'    => (string) ( $postarr['post_type'] ?? 'post' ),
			'post_status'  => (string) ( $postarr['post_status'] ?? 'draft' ),
			'post_author'  => (int) ( $postarr['post_author'] ?? 0 ),
			'post_title'   => stripslashes( (string) ( $postarr['post_title'] ?? '' ) ),
			'post_content' => stripslashes( (string) ( $postarr['post_content'] ?? '' ) ),
		);
		$overrides = $GLOBALS['npcink_ad_test_inserted_post_overrides'] ?? array();
		if ( is_array( $overrides ) ) {
			$stored_post = array_merge( $stored_post, $overrides );
		}
		$GLOBALS['npcink_ad_test_posts'][ $post_id ] = new WP_Post( $stored_post );
		$GLOBALS['npcink_ad_test_meta'][ $post_id ] = $GLOBALS['npcink_ad_test_new_post_meta'] ?? array();

		return $post_id;
	}
}

if ( ! function_exists( 'update_post_meta' ) ) {
	/**
	 * Update in-memory post metadata unless the key is configured to fail.
	 *
	 * @param int    $post_id    Post ID.
	 * @param string $meta_key   Metadata key.
	 * @param mixed  $meta_value Metadata value.
	 * @return int|bool
	 */
	function update_post_meta( int $post_id, string $meta_key, mixed $meta_value ): int|bool {
		$GLOBALS['npcink_ad_test_update_meta_calls'][] = array( $post_id, $meta_key, $meta_value );
		if ( ( $GLOBALS['npcink_ad_test_fail_meta_key'] ?? null ) === $meta_key ) {
			return false;
		}

		$GLOBALS['npcink_ad_test_meta'][ $post_id ][ $meta_key ] = $meta_value;

		return 1;
	}
}

if ( ! function_exists( 'delete_post_meta' ) ) {
	/**
	 * Delete one in-memory post metadata value.
	 *
	 * @param int    $post_id  Post ID.
	 * @param string $meta_key Metadata key.
	 */
	function delete_post_meta( int $post_id, string $meta_key ): bool {
		$GLOBALS['npcink_ad_test_delete_meta_calls'][] = array( $post_id, $meta_key );
		$existed = array_key_exists( $meta_key, $GLOBALS['npcink_ad_test_meta'][ $post_id ] ?? array() );
		unset( $GLOBALS['npcink_ad_test_meta'][ $post_id ][ $meta_key ] );

		return $existed;
	}
}

if ( ! function_exists( 'wp_delete_post' ) ) {
	/**
	 * Permanently remove one in-memory post.
	 *
	 * @param int  $post_id     Post ID.
	 * @param bool $force_delete Whether deletion bypasses Trash.
	 * @return WP_Post|false
	 */
	function wp_delete_post( int $post_id, bool $force_delete = false ): WP_Post|false {
		$GLOBALS['npcink_ad_test_delete_post_calls'][] = array( $post_id, $force_delete );
		$post = $GLOBALS['npcink_ad_test_posts'][ $post_id ] ?? null;
		if ( $GLOBALS['npcink_ad_test_delete_post_failure'] ?? false ) {
			return false;
		}
		unset( $GLOBALS['npcink_ad_test_posts'][ $post_id ], $GLOBALS['npcink_ad_test_meta'][ $post_id ] );

		return $post instanceof WP_Post ? $post : false;
	}
}
