<?php
/**
 * Minimal WordPress REST request class for Promotion preflight tests.
 *
 * @package NpcinkAd
 */

if ( ! class_exists( 'WP_REST_Request' ) ) {
	/**
	 * Minimal REST request parameter bag.
	 */
	final class WP_REST_Request {
		/**
		 * Create one test request.
		 *
		 * @param string               $route  REST route.
		 * @param array<string, mixed> $params Request parameters.
		 */
		public function __construct(
			private readonly string $route,
			private readonly array $params = array()
		) {}

		/**
		 * Get the current route.
		 */
		public function get_route(): string {
			return $this->route;
		}

		/**
		 * Get one request parameter.
		 *
		 * @param string $key Parameter key.
		 * @return mixed
		 */
		public function get_param( string $key ): mixed {
			return $this->params[ $key ] ?? null;
		}
	}
}
