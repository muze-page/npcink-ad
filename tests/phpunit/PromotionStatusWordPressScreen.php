<?php
/**
 * Minimal WordPress screen class for Promotion list tests.
 *
 * @package NpcinkAd
 */

if ( ! class_exists( 'WP_Screen' ) ) {
	/**
	 * Minimal admin screen for default-column tests.
	 */
	final class WP_Screen {
		/**
		 * Current screen base.
		 *
		 * @var string
		 */
		public string $base = '';

		/**
		 * Current screen post type.
		 *
		 * @var string
		 */
		public string $post_type = '';
	}
}
