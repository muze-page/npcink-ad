<?php
/**
 * Minimal WordPress post class for Promotion unit tests.
 *
 * @package NpcinkAd
 */

if ( ! class_exists( 'WP_Post' ) ) {
	/**
	 * Minimal native post record used by list batching tests.
	 */
	final class WP_Post {
		/**
		 * Post ID.
		 *
		 * @var int
		 */
		public int $ID;

		/**
		 * Native post type.
		 *
		 * @var string
		 */
		public string $post_type;

		/**
		 * Native post status.
		 *
		 * @var string
		 */
		public string $post_status;

		/**
		 * Serialized post content.
		 *
		 * @var string
		 */
		public string $post_content;

		/**
		 * Post title.
		 *
		 * @var string
		 */
		public string $post_title;

		/**
		 * GMT publication date.
		 *
		 * @var string
		 */
		public string $post_date_gmt;

		/**
		 * Create a test post record.
		 *
		 * @param array<string, int|string> $values Post field values.
		 */
		public function __construct( array $values ) {
			$this->ID            = (int) ( $values['ID'] ?? 0 );
			$this->post_type     = (string) ( $values['post_type'] ?? 'post' );
			$this->post_status   = (string) ( $values['post_status'] ?? 'draft' );
			$this->post_content  = (string) ( $values['post_content'] ?? '' );
			$this->post_title    = (string) ( $values['post_title'] ?? '' );
			$this->post_date_gmt = (string) ( $values['post_date_gmt'] ?? '0000-00-00 00:00:00' );
		}
	}
}
