<?php
/**
 * Promotion editor integration.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Admin;

use Npcink\Ad\Data\Post_Types;
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

		$settings = array(
			'previewUrl'     => Preview_Page::url(),
			'nonce'          => wp_create_nonce( 'npcink_ad_preview_' . $post->ID ),
			'defaultTargetId' => self::default_target_id(),
		);

		wp_add_inline_script(
			self::SCRIPT_HANDLE,
			'window.NpcinkAdEditorSettings = ' . wp_json_encode( $settings ) . ';',
			'before'
		);
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
