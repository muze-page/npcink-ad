<?php
/**
 * Minimal WordPress classes for Promotion list unit tests.
 *
 * @package NpcinkAd
 */

if ( ! class_exists( 'WP_Post_Type' ) ) {
	/**
	 * Minimal post type with the capabilities used by Promotion_List.
	 */
	final class WP_Post_Type {
		/**
		 * Post type capabilities.
		 *
		 * @var object{edit_post: string, publish_posts: string}
		 */
		public object $cap;

		/**
		 * Create the test capability map.
		 */
		public function __construct() {
			$this->cap = (object) array(
				'edit_post'     => 'manage_npcink_ads',
				'publish_posts' => 'manage_npcink_ads',
			);
		}
	}
}
