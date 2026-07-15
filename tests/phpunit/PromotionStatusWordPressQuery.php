<?php
/**
 * Minimal WordPress query class for Promotion list unit tests.
 *
 * @package NpcinkAd
 */

if ( ! class_exists( 'WP_Query' ) ) {
	/**
	 * Minimal main query used by Promotion_List cache priming.
	 */
	final class WP_Query {
		/**
		 * Query posts.
		 *
		 * @var list<WP_Post>
		 */
		public array $posts;

		/**
		 * Create one query fixture.
		 *
		 * @param array $posts Query posts.
		 * @phpstan-param list<WP_Post> $posts
		 */
		public function __construct( array $posts ) {
			$this->posts = $posts;
		}
	}
}
