<?php
/**
 * Promotion editor integration.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Admin;

use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use WP_Post;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/**
 * Loads the focused delivery sidebar on promotion editor screens.
 */
final class Editor {
	private const SCRIPT_HANDLE = 'npcink-ad-block-editor';

	/**
	 * Enqueue editor behavior and promotion-bound preview settings.
	 */
	public static function enqueue(): void {
		$screen = get_current_screen();
		if ( ! $screen || Post_Types::PROMOTION_POST_TYPE !== $screen->post_type ) {
			return;
		}

		$post = get_post();
		if ( ! $post instanceof WP_Post || Post_Types::PROMOTION_POST_TYPE !== $post->post_type ) {
			return;
		}

		wp_enqueue_script( self::SCRIPT_HANDLE );
		$repository       = new Repository();
		$published        = $repository->find_published_automatic_promotions();
		$overlap_settings = self::editor_overlap_settings(
			$published,
			$repository->find_promotion( $post->ID ),
			$post->ID,
			$repository
		);

		$settings = array(
			'previewUrl'                   => Preview_Page::url(),
			'nonce'                        => wp_create_nonce( 'npcink_ad_preview_' . $post->ID ),
			'defaultTargetId'              => self::default_target_id(),
			'publicContentIds'              => $overlap_settings['publicContentIds'],
			'publishedAutomaticPromotions' => $overlap_settings['publishedAutomaticPromotions'],
		);

		wp_add_inline_script(
			self::SCRIPT_HANDLE,
			'window.NpcinkAdEditorSettings = ' . wp_json_encode( $settings ) . ';',
			'before'
		);
	}

	/**
	 * Reduce published domain records to the minimum safe editor-advisory shape.
	 *
	 * Creative content and titles intentionally stay server-side. The current
	 * Promotion is also removed because unsaved editor metadata is the candidate
	 * source of truth for the advisory.
	 *
	 * @param array<int, array<string, mixed>> $promotions      Published automatic Promotions.
	 * @param array<string, mixed>|null        $current         Stored current Promotion.
	 * @param int                              $current_id      Current Promotion ID.
	 * @param Repository                       $repository      Public-content query service.
	 * @return array{publicContentIds: list<int>, publishedAutomaticPromotions: list<array{id: int, location: string, pageScope: string, includeIds: list<int>, excludeIds: list<int>, device: string, startAt: string, endAt: string, scheduleValid: bool}>}
	 */
	private static function editor_overlap_settings( array $promotions, ?array $current, int $current_id, Repository $repository ): array {
		$normalized  = array();
		$current_ids = null === $current
			? array()
			: array_values(
				array_unique(
					array_merge(
						Post_Types::sanitize_post_ids( $current['include_ids'] ?? array() ),
						Post_Types::sanitize_post_ids( $current['exclude_ids'] ?? array() )
					)
				)
			);
		$candidate_ids = $current_ids;
		foreach ( $promotions as $promotion ) {
			$promotion_id = isset( $promotion['id'] ) ? absint( $promotion['id'] ) : 0;
			if ( 1 > $promotion_id || $promotion_id === $current_id ) {
				continue;
			}

			$include_ids   = Post_Types::sanitize_post_ids( $promotion['include_ids'] ?? array() );
			$exclude_ids   = Post_Types::sanitize_post_ids( $promotion['exclude_ids'] ?? array() );
			$candidate_ids = array_merge( $candidate_ids, $include_ids, $exclude_ids );
			$normalized[] = array(
				'promotion'  => $promotion,
				'id'         => $promotion_id,
				'pageScope'  => Post_Types::sanitize_page_scope( $promotion['page_scope'] ?? '' ),
				'includeIds' => $include_ids,
				'excludeIds' => $exclude_ids,
			);
		}

		$public_lookup      = array_fill_keys( $repository->filter_public_content_ids( $candidate_ids ), true );
		$public_content_ids = array_values( array_filter( $current_ids, static fn ( int $id ): bool => isset( $public_lookup[ $id ] ) ) );
		$rules = array();
		foreach ( $normalized as $item ) {
			$promotion   = $item['promotion'];
			$start_at    = isset( $promotion['start_at'] ) ? (int) $promotion['start_at'] : 0;
			$end_at      = isset( $promotion['end_at'] ) ? (int) $promotion['end_at'] : 0;
			$include_ids = array_values( array_filter( $item['includeIds'], static fn ( int $id ): bool => isset( $public_lookup[ $id ] ) ) );
			$exclude_ids = array_values( array_filter( $item['excludeIds'], static fn ( int $id ): bool => isset( $public_lookup[ $id ] ) ) );
			if ( 'selected' === $item['pageScope'] ) {
				$include_lookup = array_fill_keys( $include_ids, true );
				$exclude_ids    = array_values( array_filter( $exclude_ids, static fn ( int $id ): bool => isset( $include_lookup[ $id ] ) ) );
			} else {
				$include_ids = array();
			}

			$rules[] = array(
				'id'            => $item['id'],
				'location'      => Post_Types::sanitize_location( $promotion['location'] ?? '' ),
				'pageScope'     => $item['pageScope'],
				'includeIds'    => $include_ids,
				'excludeIds'    => $exclude_ids,
				'device'        => Post_Types::sanitize_device( $promotion['device'] ?? '' ),
				'startAt'       => self::local_datetime( $start_at ),
				'endAt'         => self::local_datetime( $end_at ),
				'scheduleValid' => (bool) ( $promotion['start_at_valid'] ?? true )
					&& (bool) ( $promotion['end_at_valid'] ?? true ),
			);
		}

		return array(
			'publicContentIds'              => $public_content_ids,
			'publishedAutomaticPromotions' => $rules,
		);
	}

	/**
	 * Format one stored timestamp for comparison with unsaved local editor data.
	 *
	 * @param int $timestamp Stored Unix timestamp, or zero for an open boundary.
	 */
	private static function local_datetime( int $timestamp ): string {
		return 0 < $timestamp
			? wp_date( 'Y-m-d H:i:s', $timestamp, wp_timezone() )
			: '';
	}

	/**
	 * Choose a useful initial real-page preview target.
	 */
	private static function default_target_id(): int {
		$front_page_id = absint( get_option( 'page_on_front' ) );
		if ( 0 < $front_page_id && 'publish' === get_post_status( $front_page_id ) ) {
			return $front_page_id;
		}

		$target_ids = get_posts(
			array(
				'post_type'      => array( 'page', 'post' ),
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'orderby'        => 'date',
				'order'          => 'DESC',
			)
		);

		return isset( $target_ids[0] ) ? absint( $target_ids[0] ) : 0;
	}
}
