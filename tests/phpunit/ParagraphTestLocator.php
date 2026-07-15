<?php
/**
 * Deterministic Classic paragraph locator for isolated unit tests.
 *
 * Production never uses this regex boundary; WordPress Playground exercises
 * the real Core HTML tokenizer integration.
 *
 * @package NpcinkAd
 */

/**
 * Supplies byte spans to pure services without loading WordPress Core.
 */
final class ParagraphTestLocator {
	/**
	 * Locate simple closing paragraph tags in controlled test fixtures.
	 *
	 * @param string $html Controlled fixture HTML.
	 * @return list<array{offset: int, length: int}>
	 */
	public static function locate( string $html ): array {
		$matched = preg_match_all( '/<\/p\s*>/i', $html, $matches, PREG_OFFSET_CAPTURE );
		if ( false === $matched || 0 === $matched ) {
			return array();
		}

		$closing_tags = array();
		foreach ( $matches[0] as $match ) {
			$closing_tags[] = array(
				'offset' => (int) $match[1],
				'length' => strlen( (string) $match[0] ),
			);
		}

		return $closing_tags;
	}
}
