<?php
/**
 * Minimal taxonomy and content-context stubs for editorial scope tests.
 *
 * @package NpcinkAd
 */

if ( ! function_exists( 'get_terms' ) ) {
	/**
	 * Return existing term IDs from deterministic taxonomy fixtures.
	 *
	 * @param array<string, mixed> $args Term query arguments.
	 * @return mixed
	 */
	function get_terms( array $args ): mixed {
		$GLOBALS['npcink_ad_test_get_terms_queries'][] = $args;
		$taxonomy = (string) ( $args['taxonomy'] ?? '' );
		$errors   = $GLOBALS['npcink_ad_test_get_terms_errors'] ?? array();
		if ( in_array( $taxonomy, $errors, true ) ) {
			return new WP_Error( 'term_query_failed', 'Term query failed.' );
		}
		$results = $GLOBALS['npcink_ad_test_get_terms_results'] ?? array();
		if ( is_array( $results ) && array_key_exists( $taxonomy, $results ) ) {
			return $results[ $taxonomy ];
		}

		$fixtures = $GLOBALS['npcink_ad_test_term_taxonomies'][ $taxonomy ] ?? array();
		$lookup   = array_fill_keys( array_map( 'intval', is_array( $fixtures ) ? $fixtures : array() ), true );
		$include  = is_array( $args['include'] ?? null ) ? $args['include'] : array();

		return array_values(
			array_filter(
				array_map( 'intval', $include ),
				static fn ( int $id ): bool => isset( $lookup[ $id ] )
			)
		);
	}
}

if ( ! function_exists( 'get_post_type' ) ) {
	/**
	 * Return a fixture post type without querying WordPress.
	 *
	 * @param int $post_id Post ID.
	 * @return string|false
	 */
	function get_post_type( int $post_id ): string|false {
		$GLOBALS['npcink_ad_test_get_post_type_calls'][] = $post_id;
		$post = $GLOBALS['npcink_ad_test_posts'][ $post_id ] ?? null;
		if ( is_object( $post ) && is_string( $post->post_type ?? null ) ) {
			return $post->post_type;
		}

		$post_type = $GLOBALS['npcink_ad_test_singular_post_type'] ?? false;

		return is_string( $post_type ) && '' !== $post_type ? $post_type : false;
	}
}

if ( ! function_exists( 'get_the_terms' ) ) {
	/**
	 * Return directly assigned terms from deterministic relationship fixtures.
	 *
	 * @param int    $post_id  Post ID.
	 * @param string $taxonomy Taxonomy name.
	 * @return list<object{term_id: int}>|false|WP_Error
	 */
	function get_the_terms( int $post_id, string $taxonomy ): array|false|WP_Error {
		$GLOBALS['npcink_ad_test_get_the_terms_queries'][] = array(
			'post_id'  => $post_id,
			'taxonomy' => $taxonomy,
		);
		$errors = $GLOBALS['npcink_ad_test_get_the_terms_errors'][ $post_id ] ?? array();
		if ( in_array( $taxonomy, $errors, true ) ) {
			return new WP_Error( 'term_relationship_query_failed', 'Term relationship query failed.' );
		}
		$results = $GLOBALS['npcink_ad_test_get_the_terms_results'][ $post_id ] ?? array();
		if ( is_array( $results ) && array_key_exists( $taxonomy, $results ) ) {
			$result = $results[ $taxonomy ];

			return is_array( $result ) || false === $result ? $result : false;
		}

		$ids = $GLOBALS['npcink_ad_test_get_the_terms'][ $post_id ][ $taxonomy ] ?? array();
		if ( ! is_array( $ids ) || array() === $ids ) {
			return false;
		}

		return array_values(
			array_map(
				static fn ( mixed $id ): object => (object) array( 'term_id' => (int) $id ),
				$ids
			)
		);
	}
}
