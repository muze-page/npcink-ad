<?php
/**
 * Test exception emitted by the preview-request wp_die stub.
 *
 * @package NpcinkAd
 */

/**
 * Captures the HTTP response requested by Preview_Request.
 */
final class PreviewRequestWpDieException extends RuntimeException {
	/**
	 * Create a captured wp_die response.
	 *
	 * @param string $message  Error message.
	 * @param int    $response HTTP response code.
	 */
	public function __construct( string $message, public readonly int $response ) {
		parent::__construct( $message );
	}
}
