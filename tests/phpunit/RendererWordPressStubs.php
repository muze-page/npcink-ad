<?php
/**
 * Minimal isolated WordPress rendering stubs for Renderer tests.
 *
 * @package NpcinkAd
 */

if ( ! function_exists( 'has_blocks' ) ) {
	/**
	 * Detect serialized block comments.
	 *
	 * @param string $content Promotion content.
	 */
	function has_blocks( string $content ): bool {
		return str_contains( $content, '<!-- wp:' );
	}
}

if ( ! function_exists( 'do_blocks' ) ) {
	/**
	 * Model the rendered HTML returned by WordPress for static core blocks.
	 *
	 * @param string $content Serialized block content.
	 */
	function do_blocks( string $content ): string {
		$GLOBALS['npcink_ad_renderer_test_do_blocks'][] = $content;

		return (string) preg_replace( '/<!--\s*\/?wp:[^>]*-->/', '', $content );
	}
}

if ( ! function_exists( 'wptexturize' ) ) {
	/**
	 * Keep HTML fixtures unchanged.
	 *
	 * @param string $content Promotion content.
	 */
	function wptexturize( string $content ): string {
		return $content;
	}
}

if ( ! function_exists( 'wpautop' ) ) {
	/**
	 * Keep media HTML as a block-level fixture.
	 *
	 * @param string $content Promotion content.
	 */
	function wpautop( string $content ): string {
		return $content;
	}
}

if ( ! function_exists( 'wp_kses_post' ) ) {
	/**
	 * Model the WordPress post-context safety rules relevant to native video.
	 *
	 * This intentionally covers only the security boundary exercised here:
	 * executable elements and event handlers are removed, video URL attributes
	 * reject executable schemes, and ordinary media attributes are retained.
	 *
	 * @param string $content Rendered promotion content.
	 */
	function wp_kses_post( string $content ): string {
		$GLOBALS['npcink_ad_renderer_test_kses'][] = $content;
		$content = (string) preg_replace(
			'#<(script|style|iframe|object|embed)\b[^>]*>.*?</\1\s*>#is',
			'',
			$content
		);
		$content = (string) preg_replace( '#<(script|style|iframe|object|embed)\b[^>]*/?>#is', '', $content );
		$content = (string) preg_replace( '/\s+on[a-z]+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $content );

		return (string) preg_replace_callback(
			'/\s+(src|poster)\s*=\s*(["\'])(.*?)\2/is',
			static function ( array $matches ): string {
				$url = trim( html_entity_decode( $matches[3], ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
				if ( preg_match( '/^(?:javascript|vbscript|data):/i', $url ) ) {
					return '';
				}

				return ' ' . strtolower( $matches[1] ) . '=' . $matches[2] . $matches[3] . $matches[2];
			},
			$content
		);
	}
}

if ( ! function_exists( 'absint' ) ) {
	/**
	 * Return a non-negative integer.
	 *
	 * @param mixed $value Input value.
	 */
	function absint( mixed $value ): int {
		return abs( (int) $value );
	}
}

if ( ! function_exists( 'sanitize_key' ) ) {
	/**
	 * Normalize a key using the subset needed by the fixture.
	 *
	 * @param string $key Input key.
	 */
	function sanitize_key( string $key ): string {
		return (string) preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $key ) );
	}
}

if ( ! function_exists( 'wp_enqueue_style' ) ) {
	/**
	 * Record a requested frontend stylesheet.
	 *
	 * @param string $handle Style handle.
	 */
	function wp_enqueue_style( string $handle ): void {
		$GLOBALS['npcink_ad_renderer_test_styles'][] = $handle;
	}
}

if ( ! function_exists( 'esc_attr' ) ) {
	/**
	 * Escape an HTML attribute.
	 *
	 * @param string $text Attribute value.
	 */
	function esc_attr( string $text ): string {
		return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_attr__' ) ) {
	/**
	 * Return escaped source text for the isolated renderer fixture.
	 *
	 * @param string $text Source text.
	 */
	function esc_attr__( string $text ): string {
		return esc_attr( $text );
	}
}
