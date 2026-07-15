<?php
/**
 * Exposes stable token spans from the WordPress HTML Tag Processor.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Frontend;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Minimal Core HTML processor extension for byte-preserving insertion.
 *
 * WordPress loads WP_HTML_Tag_Processor before plugins. The plugin's declared
 * WordPress 6.5 minimum also guarantees next_token() and bookmark lengths.
 */
final class Classic_Paragraph_Tag_Processor extends \WP_HTML_Tag_Processor {
	private const CURRENT_TOKEN_BOOKMARK = 'npcink-ad-current-token';

	/**
	 * Return the current token's original byte offset and length.
	 *
	 * @return array{offset: int, length: int}|null
	 */
	public function current_token_span(): ?array {
		if ( ! $this->set_bookmark( self::CURRENT_TOKEN_BOOKMARK ) ) {
			return null;
		}

		$span = $this->bookmarks[ self::CURRENT_TOKEN_BOOKMARK ] ?? null;
		$this->release_bookmark( self::CURRENT_TOKEN_BOOKMARK );
		if ( null === $span ) {
			return null;
		}

		$offset = (int) $span->start;
		$length = (int) $span->length;
		$end    = $offset + $length;

		/*
		 * WordPress 6.5 stops tag bookmark spans before the final ">";
		 * newer Core releases include it. Normalize both to the full token.
		 */
		if (
			0 < $length &&
			'>' !== $this->html[ $end - 1 ] &&
			isset( $this->html[ $end ] ) &&
			'>' === $this->html[ $end ]
		) {
			++$length;
		}

		return array(
			'offset' => $offset,
			'length' => $length,
		);
	}
}
