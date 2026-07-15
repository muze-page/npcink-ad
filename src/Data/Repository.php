<?php
/**
 * Maps native WordPress posts to the delivery domain.
 *
 * @package MagickAD
 */

namespace MagickAD\Data;

use DateTimeImmutable;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Read-only repository for ads and placements.
 */
final class Repository {
	/**
	 * Get a placement as domain data.
	 *
	 * @param int $placement_id Placement post ID.
	 * @return array<string, mixed>|null
	 */
	public function find_placement( int $placement_id ): ?array {
		$post = get_post( $placement_id );
		if ( ! $post || Post_Types::PLACEMENT_POST_TYPE !== $post->post_type ) {
			return null;
		}

		return array(
			'id'       => $post->ID,
			'status'   => $post->post_status,
			'ad_id'    => (int) get_post_meta( $post->ID, Post_Types::PLACEMENT_AD_META, true ),
			'location' => Post_Types::sanitize_location(
				get_post_meta( $post->ID, Post_Types::PLACEMENT_LOCATION, true )
			),
			'device'   => Post_Types::sanitize_device(
				get_post_meta( $post->ID, Post_Types::PLACEMENT_DEVICE_META, true )
			),
		);
	}

	/**
	 * Get an ad as domain data.
	 *
	 * @param int $ad_id Ad post ID.
	 * @return array<string, mixed>|null
	 */
	public function find_ad( int $ad_id ): ?array {
		if ( 1 > $ad_id ) {
			return null;
		}

		$post = get_post( $ad_id );
		if ( ! $post || Post_Types::AD_POST_TYPE !== $post->post_type ) {
			return null;
		}

		$end_at = (string) get_post_meta( $post->ID, Post_Types::AD_END_AT_META, true );

		return array(
			'id'      => $post->ID,
			'status'  => $post->post_status,
			'end_at'  => $this->datetime_to_timestamp( $end_at ),
			'content' => $post->post_content,
		);
	}

	/**
	 * Find all enabled placement IDs for a content location.
	 *
	 * @param string $location One of the registered content locations.
	 * @return list<int>
	 */
	public function find_published_ids_by_location( string $location ): array {
		if ( ! in_array( $location, array( 'content_before', 'content_after' ), true ) ) {
			return array();
		}

		$ids = get_posts(
			array(
				'post_type'      => Post_Types::PLACEMENT_POST_TYPE,
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'orderby'        => array(
					'menu_order' => 'ASC',
					'ID'         => 'ASC',
				),
				'meta_key'       => Post_Types::PLACEMENT_LOCATION,
				'meta_value'     => $location,
			)
		);

		return array_values( array_map( 'absint', $ids ) );
	}

	/**
	 * Parse a WordPress local datetime without relying on PHP's server timezone.
	 *
	 * @param string $value WordPress local datetime.
	 */
	private function datetime_to_timestamp( string $value ): int {
		if ( '' === $value ) {
			return 0;
		}

		$date = DateTimeImmutable::createFromFormat( '!Y-m-d H:i:s', $value, wp_timezone() );

		return false === $date ? 0 : $date->getTimestamp();
	}
}
