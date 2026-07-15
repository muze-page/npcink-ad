<?php
/**
 * Namespaced WordPress stubs for real-page preview request tests.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Frontend;

use PreviewRequestWpDieException;

if ( ! function_exists( __NAMESPACE__ . '\\wp_unslash' ) ) {
	/**
	 * Return already unslashed fixture input.
	 *
	 * @param mixed $value Input value.
	 */
	function wp_unslash( mixed $value ): mixed {
		return $value;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\wp_verify_nonce' ) ) {
	/**
	 * Validate the deterministic preview nonce.
	 *
	 * @param string $nonce  Submitted nonce.
	 * @param string $action Expected action.
	 */
	function wp_verify_nonce( string $nonce, string $action ): bool {
		return 'nonce:' . $action === $nonce;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\esc_html__' ) ) {
	/**
	 * Return untranslated test text.
	 *
	 * @param string $text Source text.
	 */
	function esc_html__( string $text ): string {
		return $text;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\wp_die' ) ) {
	/**
	 * Convert a WordPress termination into an inspectable exception.
	 *
	 * @param string               $message Error message.
	 * @param string               $title   Error title.
	 * @param array<string, mixed> $args    Response arguments.
	 * @throws PreviewRequestWpDieException Always.
	 */
	function wp_die( string $message, string $title = '', array $args = array() ): never {
		unset( $title );
		// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Test stub captures the production-escaped message.
		throw new PreviewRequestWpDieException( $message, (int) ( $args['response'] ?? 500 ) );
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\get_queried_object_id' ) ) {
	/**
	 * Return the current fixture post ID.
	 */
	function get_queried_object_id(): int {
		return (int) ( $GLOBALS['npcink_ad_test_preview_target_id'] ?? 0 );
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\get_post_type' ) ) {
	/**
	 * Return the current fixture post type.
	 *
	 * @param int $post_id Queried post ID.
	 */
	function get_post_type( int $post_id ): string|false {
		unset( $post_id );

		return $GLOBALS['npcink_ad_test_preview_target_type'] ?? false;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\nocache_headers' ) ) {
	/**
	 * Record that preview responses disabled caching.
	 */
	function nocache_headers(): void {
		$GLOBALS['npcink_ad_test_preview_nocache'] = true;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\header' ) ) {
	/**
	 * Capture a preview response header without sending real CLI headers.
	 *
	 * @param string $header        Header value.
	 * @param bool   $replace       Whether to replace an existing header.
	 * @param int    $response_code Optional response code.
	 */
	function header( string $header, bool $replace = true, int $response_code = 0 ): void {
		unset( $replace, $response_code );
		$GLOBALS['npcink_ad_test_preview_headers'][] = $header;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\remove_filter' ) ) {
	/**
	 * Record removal of normal automatic delivery.
	 *
	 * @param string $hook_name Filter hook.
	 * @param mixed  $callback  Filter callback.
	 */
	function remove_filter( string $hook_name, mixed $callback ): bool {
		unset( $callback );
		$GLOBALS['npcink_ad_test_preview_filters'][] = 'remove:' . $hook_name;

		return true;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\add_filter' ) ) {
	/**
	 * Record installation of forced preview delivery.
	 *
	 * @param string $hook_name    Filter hook.
	 * @param mixed  $callback     Filter callback.
	 * @param int    $priority     Filter priority.
	 * @param int    $accepted_args Accepted argument count.
	 */
	function add_filter( string $hook_name, mixed $callback, int $priority = 10, int $accepted_args = 1 ): bool {
		unset( $callback, $accepted_args );
		$GLOBALS['npcink_ad_test_preview_filters'][] = 'add:' . $hook_name . ':' . $priority;

		return true;
	}
}
