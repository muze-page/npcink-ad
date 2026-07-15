<?php
/**
 * Maps native WordPress posts to the delivery domain.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Data;

use DateTimeImmutable;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Read-only repository for promotions.
 */
final class Repository {
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
		if ( ! $post || Post_Types::PROMOTION_POST_TYPE !== $post->post_type ) {
			return null;
		}

		return array(
			'id'          => $post->ID,
			'status'      => $post->post_status,
			'content'     => $post->post_content,
			'location'    => Post_Types::sanitize_location( get_post_meta( $post->ID, Post_Types::LOCATION_META, true ) ),
			'page_scope'  => Post_Types::sanitize_page_scope( get_post_meta( $post->ID, Post_Types::PAGE_SCOPE_META, true ) ),
			'include_ids' => Post_Types::sanitize_post_ids( get_post_meta( $post->ID, Post_Types::INCLUDE_IDS_META, true ) ),
			'exclude_ids' => Post_Types::sanitize_post_ids( get_post_meta( $post->ID, Post_Types::EXCLUDE_IDS_META, true ) ),
			'device'      => Post_Types::sanitize_device( get_post_meta( $post->ID, Post_Types::DEVICE_META, true ) ),
			'start_at'    => $this->datetime_to_timestamp( (string) get_post_meta( $post->ID, Post_Types::START_AT_META, true ) ),
			'end_at'      => $this->datetime_to_timestamp( (string) get_post_meta( $post->ID, Post_Types::END_AT_META, true ) ),
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
	 * Parse a WordPress-local datetime without relying on PHP's server timezone.
	 *
	 * @param string $value WordPress-local datetime.
	 */
	private function datetime_to_timestamp( string $value ): int {
		if ( '' === $value ) {
			return 0;
		}

		$date = DateTimeImmutable::createFromFormat( '!Y-m-d H:i:s', $value, wp_timezone() );

		return false === $date ? 0 : $date->getTimestamp();
	}
}
