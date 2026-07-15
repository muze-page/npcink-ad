<?php
/**
 * Minimal WordPress error class for Promotion preflight tests.
 *
 * @package NpcinkAd
 */

if ( ! class_exists( 'WP_Error' ) ) {
	/**
	 * Minimal structured WordPress error.
	 */
	final class WP_Error {
		/**
		 * Create one test error.
		 *
		 * @param string $code    Stable error code.
		 * @param string $message Human-readable message.
		 * @param mixed  $data    Structured error data.
		 */
		public function __construct(
			private readonly string $code,
			private readonly string $message,
			private readonly mixed $data = null
		) {}

		/**
		 * Get the stable error code.
		 */
		public function get_error_code(): string {
			return $this->code;
		}

		/**
		 * Get the human-readable message.
		 */
		public function get_error_message(): string {
			return $this->message;
		}

		/**
		 * Get structured error data.
		 *
		 * @return mixed
		 */
		public function get_error_data(): mixed {
			return $this->data;
		}
	}
}
