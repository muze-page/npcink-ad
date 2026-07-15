<?php
/**
 * Inserts rendered Promotions after deterministic content paragraph anchors.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Frontend;

use Closure;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Pure paragraph-anchor preparation and HTML insertion service.
 */
final class Paragraph_Inserter {
	/**
	 * WordPress block parser.
	 *
	 * @var Closure(string): array<int, array<string, mixed>>
	 */
	private readonly Closure $block_parser;

	/**
	 * WordPress block serializer.
	 *
	 * @var Closure(array<int, array<string, mixed>>): string
	 */
	private readonly Closure $block_serializer;

	/**
	 * Optional Classic paragraph locator boundary for pure tests.
	 *
	 * Production uses WordPress's HTML tokenizer when this is null.
	 *
	 * @var (Closure(string): list<array{offset: int, length: int}>)|null
	 */
	private readonly ?Closure $classic_paragraph_locator;

	/**
	 * Allow pure tests to provide block parsing and serialization boundaries.
	 *
	 * @param Closure(string): array<int, array<string, mixed>>|null      $block_parser              Block parser.
	 * @param Closure(array<int, array<string, mixed>>): string|null      $block_serializer          Block serializer.
	 * @param Closure(string): list<array{offset: int, length: int}>|null $classic_paragraph_locator Classic paragraph locator.
	 */
	public function __construct(
		?Closure $block_parser = null,
		?Closure $block_serializer = null,
		?Closure $classic_paragraph_locator = null
	) {
		$this->block_parser = $block_parser ?? static fn ( string $content ): array => parse_blocks( $content );
		$this->block_serializer = $block_serializer ?? static fn ( array $blocks ): string => serialize_blocks( $blocks );
		$this->classic_paragraph_locator = $classic_paragraph_locator;
	}

	/**
	 * Insert unique freeform markers after requested top-level core paragraphs.
	 *
	 * The sentinel records that named blocks were present even when the requested
	 * paragraph does not exist. This prevents the rendered HTML phase from
	 * silently falling back to Classic paragraph counting for block content.
	 *
	 * @param string             $content  Serialized post content.
	 * @param array<int, string> $markers  Paragraph number to unique marker.
	 * @param string             $sentinel Unique block-content sentinel.
	 */
	public function prepare_block_content( string $content, array $markers, string $sentinel ): string {
		$blocks = ( $this->block_parser )( $content );
		if ( ! $this->contains_named_block( $blocks ) ) {
			return $content;
		}

		$prepared        = array( $this->freeform_block( $sentinel ) );
		$paragraph_index = 0;
		foreach ( $blocks as $block ) {
			$prepared[] = $block;
			if ( 'core/paragraph' !== ( $block['blockName'] ?? null ) ) {
				continue;
			}

			++$paragraph_index;
			if ( isset( $markers[ $paragraph_index ] ) ) {
				$prepared[] = $this->freeform_block( $markers[ $paragraph_index ] );
			}
		}

		return ( $this->block_serializer )( $prepared );
	}

	/**
	 * Check whether block preparation survived later content filters.
	 *
	 * @param string $content  Filtered content.
	 * @param string $sentinel Unique block-content sentinel.
	 */
	public function has_block_sentinel( string $content, string $sentinel ): bool {
		return str_contains( $content, $sentinel );
	}

	/**
	 * Report requested block anchors whose prepared markers survived rendering.
	 *
	 * @param string             $content Filtered content.
	 * @param array<int, string> $markers Paragraph number to unique marker.
	 * @return list<int>
	 */
	public function available_block_anchors( string $content, array $markers ): array {
		$available = array();
		foreach ( $markers as $paragraph_number => $marker ) {
			if ( str_contains( $content, $marker ) ) {
				$available[] = (int) $paragraph_number;
			}
		}

		sort( $available, SORT_NUMERIC );

		return $available;
	}

	/**
	 * Replace prepared block markers and always remove the internal sentinel.
	 *
	 * @param string             $content      Filtered content.
	 * @param array<int, string> $markers      Paragraph number to marker.
	 * @param array<int, string> $replacements Paragraph number to rendered output.
	 * @param string             $sentinel     Unique block-content sentinel.
	 */
	public function replace_block_markers( string $content, array $markers, array $replacements, string $sentinel ): string {
		$content = str_replace( $sentinel, '', $content );
		foreach ( $markers as $paragraph_number => $marker ) {
			$replacement = $replacements[ $paragraph_number ] ?? '';
			$content     = $this->replace_first_and_remove_duplicates( $marker, $replacement, $content );
		}

		return $content;
	}

	/**
	 * Return requested Classic paragraph numbers that exist in rendered HTML.
	 *
	 * @param string $html              Rendered Classic content.
	 * @param array  $paragraph_numbers Requested paragraph numbers.
	 * @return list<int>
	 * @phpstan-param list<int> $paragraph_numbers
	 */
	public function available_classic_anchors( string $html, array $paragraph_numbers ): array {
		$closing_tags = $this->closing_paragraph_tags( $html );
		$available    = array();
		foreach ( $this->normalize_paragraph_numbers( $paragraph_numbers ) as $paragraph_number ) {
			if ( isset( $closing_tags[ $paragraph_number - 1 ] ) ) {
				$available[] = $paragraph_number;
			}
		}

		return $available;
	}

	/**
	 * Insert outputs immediately after matching rendered Classic </p> tags.
	 *
	 * @param string             $html         Rendered Classic content.
	 * @param array<int, string> $replacements Paragraph number to rendered output.
	 */
	public function insert_after_classic_paragraphs( string $html, array $replacements ): string {
		$closing_tags = $this->closing_paragraph_tags( $html );
		$normalized   = array();
		foreach ( $replacements as $paragraph_number => $replacement ) {
			$paragraph_number = (int) $paragraph_number;
			if ( 1 <= $paragraph_number && 20 >= $paragraph_number && isset( $closing_tags[ $paragraph_number - 1 ] ) ) {
				$normalized[ $paragraph_number ] = $replacement;
			}
		}
		if ( array() === $normalized ) {
			return $html;
		}

		$output = '';
		$cursor = 0;
		foreach ( $closing_tags as $index => $closing_tag ) {
			$end    = $closing_tag['offset'] + $closing_tag['length'];
			$output .= substr( $html, $cursor, $end - $cursor );
			if ( isset( $normalized[ $index + 1 ] ) ) {
				$output .= $normalized[ $index + 1 ];
			}
			$cursor = $end;
		}

		return $output . substr( $html, $cursor );
	}

	/**
	 * Determine whether any parsed block is named.
	 *
	 * @param array<int, array<string, mixed>> $blocks Parsed blocks.
	 */
	private function contains_named_block( array $blocks ): bool {
		foreach ( $blocks as $block ) {
			if ( null !== ( $block['blockName'] ?? null ) ) {
				return true;
			}

			$inner_blocks = $block['innerBlocks'] ?? array();
			if ( is_array( $inner_blocks ) && $this->contains_named_block( $inner_blocks ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Build one freeform marker block for serialize_blocks().
	 *
	 * @param string $html Marker HTML.
	 * @return array<string, mixed>
	 */
	private function freeform_block( string $html ): array {
		return array(
			'blockName'    => null,
			'attrs'        => array(),
			'innerBlocks'  => array(),
			'innerHTML'    => $html,
			'innerContent' => array( $html ),
		);
	}

	/**
	 * Locate real closing paragraph tokens and their original byte offsets.
	 *
	 * Core tokenization excludes comment, raw-text, and attribute lookalikes.
	 * Template descendants are valid HTML tokens but are inert content, so their
	 * paragraph closers are skipped explicitly while template depth is positive.
	 *
	 * @param string $html Rendered Classic content.
	 * @return list<array{offset: int, length: int}>
	 */
	private function closing_paragraph_tags( string $html ): array {
		if ( null !== $this->classic_paragraph_locator ) {
			return ( $this->classic_paragraph_locator )( $html );
		}

		$processor      = new Classic_Paragraph_Tag_Processor( $html );
		$closing_tags   = array();
		$template_depth = 0;
		while ( $processor->next_token() ) {
			if ( '#tag' !== $processor->get_token_type() ) {
				continue;
			}

			$tag_name = $processor->get_tag();
			if ( 'TEMPLATE' === $tag_name ) {
				if ( $processor->is_tag_closer() ) {
					$template_depth = max( 0, $template_depth - 1 );
				} else {
					++$template_depth;
				}

				continue;
			}

			if ( 0 < $template_depth || 'P' !== $tag_name || ! $processor->is_tag_closer() ) {
				continue;
			}

			$span = $processor->current_token_span();
			if ( null !== $span ) {
				$closing_tags[] = $span;
			}
		}

		return $closing_tags;
	}

	/**
	 * Bound, deduplicate, and order paragraph numbers.
	 *
	 * @param array $paragraph_numbers Raw paragraph numbers.
	 * @return list<int>
	 * @phpstan-param list<int> $paragraph_numbers
	 */
	private function normalize_paragraph_numbers( array $paragraph_numbers ): array {
		$normalized = array();
		foreach ( $paragraph_numbers as $paragraph_number ) {
			$paragraph_number = (int) $paragraph_number;
			if ( 1 <= $paragraph_number && 20 >= $paragraph_number ) {
				$normalized[ $paragraph_number ] = $paragraph_number;
			}
		}

		sort( $normalized, SORT_NUMERIC );

		return $normalized;
	}

	/**
	 * Replace the first marker and remove all duplicates after it.
	 *
	 * @param string $search      Unique marker.
	 * @param string $replacement Rendered output.
	 * @param string $subject     Filtered content.
	 */
	private function replace_first_and_remove_duplicates( string $search, string $replacement, string $subject ): string {
		if ( '' === $search ) {
			return $subject;
		}

		$offset = strpos( $subject, $search );
		if ( false === $offset ) {
			return $subject;
		}

		$tail = substr( $subject, $offset + strlen( $search ) );

		return substr( $subject, 0, $offset ) . $replacement . str_replace( $search, '', $tail );
	}
}
