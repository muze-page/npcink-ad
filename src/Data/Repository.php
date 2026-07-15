<?php
/**
 * Maps native WordPress posts to the delivery domain.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Data;

use DateTimeImmutable;
use WP_Post;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Read-only repository for promotions.
 */
final class Repository {
	private const PUBLIC_CONTENT_QUERY_BATCH = 500;

	/**
	 * Get a promotion as normalized domain data.
	 *
	 * @param int $promotion_id Promotion post ID.
	 * @return array<string, mixed>|null
	 */
	public function find_promotion( int $promotion_id ): ?array {
		if ( 1 > $promotion_id ) {
			return null;
		}

		$post = get_post( $promotion_id );
		if ( ! $post instanceof WP_Post || Post_Types::PROMOTION_POST_TYPE !== $post->post_type ) {
			return null;
		}

		return $this->map_promotion( $post );
	}

	/**
	 * Find every published Promotion assigned to an automatic content location.
	 *
	 * Full post objects are requested so WordPress primes their metadata in one
	 * batch. Mapping the result therefore does not add one query per Promotion.
	 *
	 * @return list<array<string, mixed>>
	 */
	public function find_published_automatic_promotions(): array {
		$posts = get_posts(
			array(
				'post_type'              => Post_Types::PROMOTION_POST_TYPE,
				'post_status'            => 'publish',
				'posts_per_page'         => -1,
				'orderby'                => array(
					'menu_order' => 'ASC',
					'ID'         => 'ASC',
				),
				'meta_query'             => array(
					'relation' => 'OR',
					array(
						'key'     => Post_Types::LOCATION_META,
						'value'   => array( 'content_before', 'content_after' ),
						'compare' => 'IN',
					),
					array(
						'key'     => Post_Types::LOCATION_META,
						'compare' => 'NOT EXISTS',
					),
				),
				'no_found_rows'          => true,
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);

		$promotions = array();
		foreach ( $posts as $post ) {
			if ( $post instanceof WP_Post ) {
				$promotions[] = $this->map_promotion( $post );
			}
		}

		return $promotions;
	}

	/**
	 * Map one native Promotion post with its typed metadata.
	 *
	 * @param WP_Post $post Promotion post.
	 * @return array<string, mixed>
	 */
	private function map_promotion( WP_Post $post ): array {
		$start_at = $this->parse_datetime( (string) get_post_meta( $post->ID, Post_Types::START_AT_META, true ) );
		$end_at   = $this->parse_datetime( (string) get_post_meta( $post->ID, Post_Types::END_AT_META, true ) );

		return array(
			'id'          => $post->ID,
			'status'      => $post->post_status,
			'content'     => $post->post_content,
			'location'    => Post_Types::sanitize_location( get_post_meta( $post->ID, Post_Types::LOCATION_META, true ) ),
			'page_scope'  => Post_Types::sanitize_page_scope( get_post_meta( $post->ID, Post_Types::PAGE_SCOPE_META, true ) ),
			'include_ids' => Post_Types::sanitize_post_ids( get_post_meta( $post->ID, Post_Types::INCLUDE_IDS_META, true ) ),
			'exclude_ids' => Post_Types::sanitize_post_ids( get_post_meta( $post->ID, Post_Types::EXCLUDE_IDS_META, true ) ),
			'device'      => Post_Types::sanitize_device( get_post_meta( $post->ID, Post_Types::DEVICE_META, true ) ),
			'start_at'    => $start_at['timestamp'],
			'start_at_valid' => $start_at['valid'],
			'end_at'      => $end_at['timestamp'],
			'end_at_valid' => $end_at['valid'],
		);
	}

	/**
	 * Find all published promotion IDs for an automatic content location.
	 *
	 * @param string $location One of the automatic content locations.
	 * @return list<int>
	 */
	public function find_published_ids_by_location( string $location ): array {
		if ( ! in_array( $location, array( 'content_before', 'content_after' ), true ) ) {
			return array();
		}

		$location_query = array(
			array(
				'key'     => Post_Types::LOCATION_META,
				'value'   => $location,
				'compare' => '=',
			),
		);
		if ( 'content_after' === $location ) {
			$location_query = array(
				'relation' => 'OR',
				...$location_query,
				array(
					'key'     => Post_Types::LOCATION_META,
					'compare' => 'NOT EXISTS',
				),
			);
		}

		$ids = get_posts(
			array(
				'post_type'              => Post_Types::PROMOTION_POST_TYPE,
				'post_status'            => 'publish',
				'posts_per_page'         => -1,
				'fields'                 => 'ids',
				'orderby'                => array(
					'menu_order' => 'ASC',
					'ID'         => 'ASC',
				),
				'meta_query'             => $location_query,
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		return array_values( array_map( 'absint', $ids ) );
	}

	/**
	 * Keep only published posts and pages from an aggregated ID list.
	 *
	 * Management preflight uses this method to distinguish stored IDs from
	 * targets that can actually provide a public delivery context. Frontend
	 * delivery does not call it, avoiding an extra query on every request.
	 *
	 * @param array<int, int|string> $ids Candidate post IDs.
	 * @return list<int>
	 */
	public function filter_public_content_ids( array $ids ): array {
		$ids = $this->normalize_post_ids( $ids );
		if ( array() === $ids ) {
			return array();
		}

		$published_ids = array();
		foreach ( array_chunk( $ids, self::PUBLIC_CONTENT_QUERY_BATCH ) as $chunk ) {
			$published_ids = array_merge(
				$published_ids,
				get_posts(
					array(
						'post_type'              => array( 'post', 'page' ),
						'post_status'            => 'publish',
						'post__in'               => $chunk,
						'posts_per_page'         => count( $chunk ),
						'fields'                 => 'ids',
						'orderby'                => 'post__in',
						'no_found_rows'          => true,
						'update_post_meta_cache' => false,
						'update_post_term_cache' => false,
					)
				)
			);
		}

		return array_values( array_map( 'absint', $published_ids ) );
	}

	/**
	 * Parse an optional WordPress-local datetime and preserve input validity.
	 *
	 * Empty values are valid open boundaries. A non-empty invalid calendar
	 * value must remain distinguishable from an intentionally open boundary.
	 *
	 * @param string $value WordPress-local datetime.
	 * @return array{timestamp: int, valid: bool}
	 */
	public function parse_datetime( string $value ): array {
		if ( '' === $value ) {
			return array(
				'timestamp' => 0,
				'valid'     => true,
			);
		}

		$date   = DateTimeImmutable::createFromFormat( '!Y-m-d H:i:s', $value, wp_timezone() );
		$errors = DateTimeImmutable::getLastErrors();
		$valid  = false !== $date
			&& ( false === $errors || ( 0 === $errors['warning_count'] && 0 === $errors['error_count'] ) )
			&& $date->format( 'Y-m-d H:i:s' ) === $value;

		return array(
			'timestamp' => $valid ? $date->getTimestamp() : 0,
			'valid'     => $valid,
		);
	}

	/**
	 * Parse a WordPress-local datetime without relying on PHP's server timezone.
	 *
	 * @param string $value WordPress-local datetime.
	 */
	public function datetime_to_timestamp( string $value ): int {
		return $this->parse_datetime( $value )['timestamp'];
	}

	/**
	 * Normalize an aggregated public-target query without the metadata cap.
	 *
	 * @param array<int, int|string> $ids Candidate post IDs.
	 * @return list<int>
	 */
	private function normalize_post_ids( array $ids ): array {
		$normalized = array();
		foreach ( $ids as $raw_id ) {
			if ( ! is_int( $raw_id ) && ( ! is_string( $raw_id ) || 1 !== preg_match( '/^[1-9][0-9]*$/', $raw_id ) ) ) {
				continue;
			}

			$id = filter_var( $raw_id, FILTER_VALIDATE_INT, array( 'options' => array( 'min_range' => 1 ) ) );
			if ( false !== $id ) {
				$normalized[ $id ] = $id;
			}
		}

		return array_values( $normalized );
	}
}
