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
	 * batch. Active term rules share one validity snapshot, limiting taxonomy
	 * catalog lookup to at most one query per supported taxonomy.
	 *
	 * @return list<array<string, mixed>>
	 */
	public function find_published_automatic_promotions(): array {
		return array_values( $this->find_published_automatic_catalog()['by_id'] );
	}

	/**
	 * Build one operation-local domain catalog for automatic delivery.
	 *
	 * Location and paragraph indexes are derived from the same mapped records and
	 * term-validity snapshot, so consumers never need to remap individual IDs.
	 *
	 * @return array{
	 *     by_id: array<int, array<string, mixed>>,
	 *     location_ids: array{content_before: list<int>, content_after: list<int>, bar_top: list<int>, bar_bottom: list<int>},
	 *     paragraph_ids: array<int, list<int>>
	 * }
	 */
	public function find_published_automatic_catalog(): array {
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
						'value'   => Post_Types::AUTOMATIC_LOCATIONS,
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

		$promotion_posts = array();
		foreach ( $posts as $post ) {
			if ( $post instanceof WP_Post ) {
				$promotion_posts[] = $post;
			}
		}

		$term_snapshot = $this->build_term_validity_snapshot( $promotion_posts );
		$catalog       = array(
			'by_id'         => array(),
			'location_ids'  => array(
				'content_before' => array(),
				'content_after'  => array(),
				'bar_top'       => array(),
				'bar_bottom'    => array(),
			),
			'paragraph_ids' => array(),
		);
		foreach ( $promotion_posts as $post ) {
			$promotion    = $this->map_promotion( $post, $term_snapshot );
			$promotion_id = (int) $promotion['id'];
			$location     = (string) $promotion['location'];
			$catalog['by_id'][ $promotion_id ] = $promotion;
			if ( isset( $catalog['location_ids'][ $location ] ) ) {
				$catalog['location_ids'][ $location ][] = $promotion_id;
			} elseif ( 'content_after_paragraph' === $location && $promotion['paragraph_number_valid'] ) {
				$paragraph_number = (int) $promotion['paragraph_number'];
				$catalog['paragraph_ids'][ $paragraph_number ][] = $promotion_id;
			}
		}

		return $catalog;
	}

	/**
	 * Map an explicit Promotion post batch with one shared term snapshot.
	 *
	 * @param array $posts Native Promotion posts in caller order.
	 * @return array<int, array<string, mixed>> Mapped records keyed by post ID.
	 * @phpstan-param list<WP_Post> $posts
	 */
	public function map_promotions( array $posts ): array {
		$promotion_posts = array();
		foreach ( $posts as $post ) {
			if ( $post instanceof WP_Post && Post_Types::PROMOTION_POST_TYPE === $post->post_type ) {
				$promotion_posts[] = $post;
			}
		}

		$term_snapshot = $this->build_term_validity_snapshot( $promotion_posts );
		$promotions    = array();
		foreach ( $promotion_posts as $post ) {
			$promotions[ $post->ID ] = $this->map_promotion( $post, $term_snapshot );
		}

		return $promotions;
	}

	/**
	 * Map one native Promotion post with its typed metadata.
	 *
	 * @param WP_Post    $post          Promotion post.
	 * @param array|null $term_snapshot Request-local term evidence.
	 * @return array<string, mixed>
	 * @phpstan-param array{category: array<int, true>, post_tag: array<int, true>}|null $term_snapshot
	 */
	private function map_promotion( WP_Post $post, ?array $term_snapshot = null ): array {
		$start_at      = $this->parse_datetime( (string) get_post_meta( $post->ID, Post_Types::START_AT_META, true ) );
		$end_at        = $this->parse_datetime( (string) get_post_meta( $post->ID, Post_Types::END_AT_META, true ) );
		$paragraph     = $this->stored_paragraph_number( $post->ID );
		$location      = Post_Types::sanitize_location( get_post_meta( $post->ID, Post_Types::LOCATION_META, true ) );
		$content_scope = Post_Types::sanitize_content_scope( get_post_meta( $post->ID, Post_Types::CONTENT_SCOPE_META, true ) );
		$category_ids  = Post_Types::sanitize_post_ids( get_post_meta( $post->ID, Post_Types::CATEGORY_IDS_META, true ) );
		$tag_ids       = Post_Types::sanitize_post_ids( get_post_meta( $post->ID, Post_Types::TAG_IDS_META, true ) );
		$terms_valid   = true;
		if ( 'terms' === $content_scope && in_array( $location, Post_Types::AUTOMATIC_LOCATIONS, true ) ) {
			if ( null === $term_snapshot ) {
				$terms_valid = $category_ids === $this->filter_existing_term_ids( $category_ids, 'category' )
					&& $tag_ids === $this->filter_existing_term_ids( $tag_ids, 'post_tag' );
			} else {
				$terms_valid = $this->term_ids_exist_in_snapshot( $category_ids, $term_snapshot['category'] )
					&& $this->term_ids_exist_in_snapshot( $tag_ids, $term_snapshot['post_tag'] );
			}
		}

		return array(
			'id'          => $post->ID,
			'status'      => $post->post_status,
			'content'     => $post->post_content,
			'location'    => $location,
			'paragraph_number' => $paragraph['number'],
			'paragraph_number_valid' => $paragraph['valid'],
			'content_scope' => $content_scope,
			'include_ids' => Post_Types::sanitize_post_ids( get_post_meta( $post->ID, Post_Types::INCLUDE_IDS_META, true ) ),
			'exclude_ids' => Post_Types::sanitize_post_ids( get_post_meta( $post->ID, Post_Types::EXCLUDE_IDS_META, true ) ),
			'category_ids' => $category_ids,
			'tag_ids'      => $tag_ids,
			'terms_valid'  => $terms_valid,
			'device'      => Post_Types::sanitize_device( get_post_meta( $post->ID, Post_Types::DEVICE_META, true ) ),
			'start_at'    => $start_at['timestamp'],
			'start_at_valid' => $start_at['valid'],
			'end_at'      => $end_at['timestamp'],
			'end_at_valid' => $end_at['valid'],
		);
	}

	/**
	 * Resolve active term-rule IDs once for one catalog mapping operation.
	 *
	 * @param array $posts Promotion posts from the current query only.
	 * @return array{category: array<int, true>, post_tag: array<int, true>}
	 * @phpstan-param list<WP_Post> $posts
	 */
	private function build_term_validity_snapshot( array $posts ): array {
		$candidate_ids = array(
			'category' => array(),
			'post_tag' => array(),
		);

		foreach ( $posts as $post ) {
			$location      = Post_Types::sanitize_location( get_post_meta( $post->ID, Post_Types::LOCATION_META, true ) );
			$content_scope = Post_Types::sanitize_content_scope( get_post_meta( $post->ID, Post_Types::CONTENT_SCOPE_META, true ) );
			if ( 'terms' !== $content_scope || ! in_array( $location, Post_Types::AUTOMATIC_LOCATIONS, true ) ) {
				continue;
			}

			foreach ( Post_Types::sanitize_post_ids( get_post_meta( $post->ID, Post_Types::CATEGORY_IDS_META, true ) ) as $category_id ) {
				$candidate_ids['category'][ $category_id ] = $category_id;
			}
			foreach ( Post_Types::sanitize_post_ids( get_post_meta( $post->ID, Post_Types::TAG_IDS_META, true ) ) as $tag_id ) {
				$candidate_ids['post_tag'][ $tag_id ] = $tag_id;
			}
		}

		return array(
			'category' => array_fill_keys(
				$this->filter_existing_term_ids( array_values( $candidate_ids['category'] ), 'category' ),
				true
			),
			'post_tag' => array_fill_keys(
				$this->filter_existing_term_ids( array_values( $candidate_ids['post_tag'] ), 'post_tag' ),
				true
			),
		);
	}

	/**
	 * Confirm every rule ID using one request-local taxonomy snapshot.
	 *
	 * @param array $ids      Candidate IDs in stored order.
	 * @param array $snapshot Existing IDs for exactly one taxonomy.
	 * @phpstan-param list<int> $ids
	 * @phpstan-param array<int, true> $snapshot
	 */
	private function term_ids_exist_in_snapshot( array $ids, array $snapshot ): bool {
		foreach ( $ids as $id ) {
			if ( ! isset( $snapshot[ $id ] ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Parse stored paragraph metadata while treating absence as the default.
	 *
	 * @param int $promotion_id Promotion post ID.
	 * @return array{number: int, valid: bool}
	 */
	private function stored_paragraph_number( int $promotion_id ): array {
		if ( ! metadata_exists( 'post', $promotion_id, Post_Types::PARAGRAPH_NUMBER_META ) ) {
			return array(
				'number' => Post_Types::DEFAULT_PARAGRAPH_NUMBER,
				'valid'  => true,
			);
		}

		return Post_Types::parse_paragraph_number(
			get_post_meta( $promotion_id, Post_Types::PARAGRAPH_NUMBER_META, true )
		);
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
	 * Keep only existing terms from one supported core taxonomy.
	 *
	 * Input order is preserved so callers can compare the result with normalized
	 * metadata without losing invalid-ID evidence. Query errors and malformed
	 * result shapes fail closed.
	 *
	 * @param array<int, int|string> $ids      Candidate term IDs.
	 * @param string                 $taxonomy Core taxonomy name.
	 * @return list<int>
	 */
	public function filter_existing_term_ids( array $ids, string $taxonomy ): array {
		if ( ! in_array( $taxonomy, array( 'category', 'post_tag' ), true ) ) {
			return array();
		}

		$ids = Post_Types::sanitize_post_ids( $ids );
		if ( array() === $ids ) {
			return array();
		}

		$existing_ids = get_terms(
			array(
				'taxonomy'   => $taxonomy,
				'include'    => $ids,
				'hide_empty' => false,
				'fields'     => 'ids',
			)
		);
		if ( is_wp_error( $existing_ids ) || ! is_array( $existing_ids ) ) {
			return array();
		}

		$existing_lookup = array();
		foreach ( $existing_ids as $existing_id ) {
			if ( ! is_int( $existing_id ) && ( ! is_string( $existing_id ) || 1 !== preg_match( '/\A[1-9][0-9]*\z/', $existing_id ) ) ) {
				return array();
			}

			$normalized_id = filter_var( $existing_id, FILTER_VALIDATE_INT, array( 'options' => array( 'min_range' => 1 ) ) );
			if ( false === $normalized_id ) {
				return array();
			}

			$existing_lookup[ $normalized_id ] = true;
		}

		return array_values(
			array_filter(
				$ids,
				static fn ( int $id ): bool => isset( $existing_lookup[ $id ] )
			)
		);
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
