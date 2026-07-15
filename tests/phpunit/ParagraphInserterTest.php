<?php
/**
 * Pure paragraph insertion tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Frontend\Paragraph_Inserter;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/ParagraphTestLocator.php';
require_once dirname( __DIR__, 2 ) . '/src/Frontend/Paragraph_Inserter.php';

/**
 * Covers Gutenberg marker preparation and rendered Classic HTML insertion.
 */
final class ParagraphInserterTest extends TestCase {
	private const SENTINEL = '<!-- npcink-ad-test-block-content -->';
	private const MARKER_1 = '<!-- npcink-ad-test-anchor-1 -->';
	private const MARKER_2 = '<!-- npcink-ad-test-anchor-2 -->';
	private const MARKER_3 = '<!-- npcink-ad-test-anchor-3 -->';

	/**
	 * Only top-level core/paragraph blocks create Gutenberg anchors.
	 */
	public function test_prepares_requested_top_level_core_paragraph_markers(): void {
		$blocks = array(
			$this->block( 'core/paragraph', '<p>One</p>' ),
			$this->block(
				'core/group',
				'<div>Group</div>',
				array( $this->block( 'core/paragraph', '<p>Nested</p>' ) )
			),
			$this->block( 'core/heading', '<h2>Heading</h2>' ),
			$this->block( 'core/paragraph', '<p>Two</p>' ),
		);
		$inserter = $this->inserter( $blocks );

		$prepared = $inserter->prepare_block_content(
			'serialized source',
			array(
				1 => self::MARKER_1,
				2 => self::MARKER_2,
				3 => self::MARKER_3,
			),
			self::SENTINEL
		);

		self::assertSame(
			self::SENTINEL
			. '<p>One</p>' . self::MARKER_1
			. '<div>Group</div>'
			. '<h2>Heading</h2>'
			. '<p>Two</p>' . self::MARKER_2,
			$prepared
		);
		self::assertStringNotContainsString( self::MARKER_3, $prepared );
	}

	/**
	 * Freeform content is left for rendered Classic paragraph counting.
	 */
	public function test_does_not_prepare_content_without_named_blocks(): void {
		$inserter = $this->inserter( array( $this->block( null, '<p>Classic</p>' ) ) );

		self::assertSame(
			'<p>Classic</p>',
			$inserter->prepare_block_content(
				'<p>Classic</p>',
				array( 1 => self::MARKER_1 ),
				self::SENTINEL
			)
		);
	}

	/**
	 * Prepared markers are replaced once and never leak into frontend output.
	 */
	public function test_replaces_prepared_markers_and_removes_the_sentinel(): void {
		$inserter = $this->inserter( array() );
		$content  = self::SENTINEL . '<p>One</p>' . self::MARKER_1 . '<p>Two</p>' . self::MARKER_2;

		$output = $inserter->replace_block_markers(
			$content,
			array(
				1 => self::MARKER_1,
				2 => self::MARKER_2,
			),
			array( 1 => '<aside>A</aside>' ),
			self::SENTINEL
		);

		self::assertSame( '<p>One</p><aside>A</aside><p>Two</p>', $output );
	}

	/**
	 * A copied marker inserts once and every extra internal comment is removed.
	 */
	public function test_duplicate_block_markers_insert_once_and_never_leak(): void {
		$inserter = $this->inserter( array() );
		$content  = self::SENTINEL
			. '<p>One</p>' . self::MARKER_1
			. '<div class="copied-filter-output">' . self::MARKER_1 . '</div>'
			. self::MARKER_1
			. '<p>Two</p>' . self::MARKER_2 . self::MARKER_2;

		$output = $inserter->replace_block_markers(
			$content,
			array(
				1 => self::MARKER_1,
				2 => self::MARKER_2,
			),
			array( 1 => '<aside>A</aside>' ),
			self::SENTINEL
		);

		self::assertSame(
			'<p>One</p><aside>A</aside><div class="copied-filter-output"></div><p>Two</p>',
			$output
		);
		self::assertSame( 1, substr_count( $output, '<aside>A</aside>' ) );
		self::assertStringNotContainsString( 'npcink-ad-test-', $output );
	}

	/**
	 * Classic replacements are inserted after their own rendered paragraph.
	 */
	public function test_inserts_multiple_classic_replacements_at_distinct_anchors(): void {
		$inserter = $this->inserter( array() );
		$content  = '<p>One</p><h2>Break</h2><P>Two</P ><p>Three</p>';

		self::assertSame( array( 1, 2, 3 ), $inserter->available_classic_anchors( $content, array( 3, 1, 2, 2, 20 ) ) );
		self::assertSame(
			'<p>One</p><aside>A1A2</aside><h2>Break</h2><P>Two</P ><p>Three</p><aside>C</aside>',
			$inserter->insert_after_classic_paragraphs(
				$content,
				array(
					1 => '<aside>A1A2</aside>',
					3 => '<aside>C</aside>',
					4 => '<aside>Missing</aside>',
				)
			)
		);
	}

	/**
	 * Token spans preserve source bytes and exclude inert paragraph lookalikes.
	 */
	public function test_classic_token_spans_ignore_lookalikes_without_rewriting_html(): void {
		$content = '<!-- comment </p> -->'
			. '<script>window.fake = "</p>";</script>'
			. '<style>.fake::after{content:"</p>"}</style>'
			. '<template><p>Template paragraph</p></template>'
			. '<div data-fake="</p>">Attribute value</div>'
			. '<p data-order="kept">Real one</P >'
			. '<p>Real two</p >';
		$first_offset  = strpos( $content, '</P >' );
		$second_offset = strpos( $content, '</p >' );
		self::assertIsInt( $first_offset );
		self::assertIsInt( $second_offset );

		$locator = static function ( string $candidate ) use ( $content, $first_offset, $second_offset ): array {
			self::assertSame( $content, $candidate );

			return array(
				array(
					'offset' => $first_offset,
					'length' => strlen( '</P >' ),
				),
				array(
					'offset' => $second_offset,
					'length' => strlen( '</p >' ),
				),
			);
		};
		$inserter = $this->inserter( array(), $locator );

		self::assertSame( array( 1, 2 ), $inserter->available_classic_anchors( $content, array( 1, 2, 3 ) ) );
		self::assertSame(
			$content,
			$inserter->insert_after_classic_paragraphs( $content, array( 3 => '<aside>Never</aside>' ) )
		);
		self::assertSame(
			str_replace( '</p >', '</p ><aside>Inserted</aside>', $content ),
			$inserter->insert_after_classic_paragraphs( $content, array( 2 => '<aside>Inserted</aside>' ) )
		);
	}

	/**
	 * A missing Classic anchor does not become an end-of-content fallback.
	 */
	public function test_missing_classic_anchor_leaves_content_unchanged(): void {
		$inserter = $this->inserter( array() );
		$content  = '<p>Only one</p>';

		self::assertSame( array(), $inserter->available_classic_anchors( $content, array( 3 ) ) );
		self::assertSame(
			$content,
			$inserter->insert_after_classic_paragraphs( $content, array( 3 => '<aside>Never</aside>' ) )
		);
	}

	/**
	 * Compose the pure service around deterministic fake block boundaries.
	 *
	 * @param array<int, array<string, mixed>>                             $blocks                    Parsed block fixture.
	 * @param \Closure(string): list<array{offset: int, length: int}>|null $classic_paragraph_locator Classic paragraph locator.
	 */
	private function inserter( array $blocks, ?\Closure $classic_paragraph_locator = null ): Paragraph_Inserter {
		return new Paragraph_Inserter(
			static fn ( string $content ): array => $blocks,
			static function ( array $serialized_blocks ): string {
				$output = '';
				foreach ( $serialized_blocks as $block ) {
					$output .= (string) ( $block['innerHTML'] ?? '' );
				}

				return $output;
			},
			$classic_paragraph_locator ?? \Closure::fromCallable( array( ParagraphTestLocator::class, 'locate' ) )
		);
	}

	/**
	 * Build one parsed block fixture.
	 *
	 * @param string|null                      $name         Block name.
	 * @param string                           $html         Serialized inner HTML.
	 * @param array<int, array<string, mixed>> $inner_blocks Nested blocks.
	 * @return array<string, mixed>
	 */
	private function block( ?string $name, string $html, array $inner_blocks = array() ): array {
		return array(
			'blockName'    => $name,
			'attrs'        => array(),
			'innerBlocks'  => $inner_blocks,
			'innerHTML'    => $html,
			'innerContent' => array( $html ),
		);
	}
}
