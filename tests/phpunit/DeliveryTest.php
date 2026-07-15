<?php
/**
 * Automatic Promotion delivery scope tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use Npcink\Ad\Frontend\Delivery;
use Npcink\Ad\Frontend\Paragraph_Inserter;
use Npcink\Ad\Frontend\Renderer;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once __DIR__ . '/PromotionStatusWordPressPost.php';
require_once __DIR__ . '/DeliveryWordPressStubs.php';
require_once __DIR__ . '/ParagraphTestLocator.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Post_Types.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Repository.php';
require_once dirname( __DIR__, 2 ) . '/src/Presentation/Eligibility_Messages.php';
require_once dirname( __DIR__, 2 ) . '/src/Frontend/Renderer.php';
require_once dirname( __DIR__, 2 ) . '/src/Frontend/Paragraph_Inserter.php';
require_once dirname( __DIR__, 2 ) . '/src/Frontend/Delivery.php';

/**
 * Covers the request-level guard around automatic content placement.
 */
final class DeliveryTest extends TestCase {
	/**
	 * Reset request fixtures.
	 */
	protected function setUp(): void {
		$GLOBALS['npcink_ad_test_singular_post_type']  = 'post';
		$GLOBALS['npcink_ad_test_singular_arguments'] = array();
		$GLOBALS['npcink_ad_test_current_post_id']    = 99;
		$GLOBALS['npcink_ad_test_queried_post_id']    = 99;
		$GLOBALS['npcink_ad_test_preview_target_id']  = 99;
		$GLOBALS['npcink_ad_test_posts']              = array();
		$GLOBALS['npcink_ad_test_meta']               = array();
		$GLOBALS['npcink_ad_test_get_posts_queries']  = array();
		$GLOBALS['npcink_ad_test_enqueued_styles']    = array();
	}

	/**
	 * Automatic placement does not extend to arbitrary singular post types.
	 */
	public function test_automatic_content_placement_is_limited_to_posts_and_pages(): void {
		$GLOBALS['npcink_ad_test_singular_post_type'] = 'product';
		$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );
		$content  = '<p>Product body</p>';

		self::assertSame( $content, $delivery->filter_content( $content ) );
		self::assertSame(
			array( array( 'post', 'page' ) ),
			$GLOBALS['npcink_ad_test_singular_arguments']
		);
	}

	/**
	 * Gutenberg markers preserve group order and separate paragraph anchors.
	 */
	public function test_block_paragraph_promotions_render_in_deterministic_groups(): void {
		$this->add_paragraph_promotion( 11, 1 );
		$this->add_paragraph_promotion( 12, 1 );
		$this->add_paragraph_promotion( 13, 2 );
		$delivery = $this->delivery(
			array(
				$this->block( 'core/paragraph', '<p>One</p>' ),
				$this->block( 'core/heading', '<h2>Break</h2>' ),
				$this->block( 'core/paragraph', '<p>Two</p>' ),
			)
		);

		$output = $delivery->filter_content( $delivery->prepare_content( 'BLOCK_SOURCE' ) );
		$first  = strpos( $output, 'data-npcink-ad-promotion="11"' );
		$second = strpos( $output, 'data-npcink-ad-promotion="12"' );
		$third  = strpos( $output, 'data-npcink-ad-promotion="13"' );

		self::assertIsInt( $first );
		self::assertIsInt( $second );
		self::assertIsInt( $third );
		self::assertLessThan( $second, $first );
		self::assertLessThan( strpos( $output, '<h2>Break</h2>' ), $second );
		self::assertGreaterThan( strpos( $output, '<p>Two</p>' ), $third );
		self::assertStringNotContainsString( 'npcink-ad-paragraph-anchor-', $output );
		self::assertStringNotContainsString( 'npcink-ad-block-content-', $output );
	}

	/**
	 * Classic content uses rendered closing paragraphs, not source blocks.
	 */
	public function test_classic_paragraph_promotions_render_after_the_requested_paragraph(): void {
		$this->add_paragraph_promotion( 21, 2 );
		$this->add_paragraph_promotion( 22, 2 );
		$delivery = $this->delivery( array( $this->block( null, '<p>Classic</p>' ) ) );
		$content  = '<p>One</p><p>Two</p><p>Three</p>';

		$output       = $delivery->filter_content( $delivery->prepare_content( $content ) );
		$second_close = strpos( $output, '</p>', (int) strpos( $output, '</p>' ) + 4 );
		$first_ad     = strpos( $output, 'data-npcink-ad-promotion="21"' );
		$second_ad    = strpos( $output, 'data-npcink-ad-promotion="22"' );
		$third_open   = strrpos( $output, '<p>Three</p>' );

		self::assertIsInt( $second_close );
		self::assertIsInt( $first_ad );
		self::assertIsInt( $second_ad );
		self::assertIsInt( $third_open );
		self::assertGreaterThan( $second_close, $first_ad );
		self::assertLessThan( $third_open, $second_ad );
		self::assertLessThan( $second_ad, $first_ad );
	}

	/**
	 * Normal delivery never turns a missing anchor into end-of-content output.
	 */
	public function test_missing_paragraph_anchor_does_not_render_normally(): void {
		$this->add_paragraph_promotion( 31, 3 );
		$delivery = $this->delivery(
			array(
				$this->block( 'core/paragraph', '<p>One</p>' ),
				$this->block( 'core/paragraph', '<p>Two</p>' ),
			)
		);

		$output = $delivery->filter_content( $delivery->prepare_content( 'BLOCK_SOURCE' ) );

		self::assertSame( '<p>One</p><p>Two</p>', $output );
		self::assertStringNotContainsString( 'data-npcink-ad-promotion=', $output );
	}

	/**
	 * Compose Delivery around deterministic parsed block fixtures.
	 *
	 * @param array<int, array<string, mixed>> $blocks Parsed blocks.
	 */
	private function delivery( array $blocks ): Delivery {
		$inserter = new Paragraph_Inserter(
			static fn ( string $content ): array => $blocks,
			static function ( array $serialized_blocks ): string {
				$output = '';
				foreach ( $serialized_blocks as $block ) {
					$output .= (string) ( $block['innerHTML'] ?? '' );
				}

				return $output;
			},
			\Closure::fromCallable( array( ParagraphTestLocator::class, 'locate' ) )
		);

		return new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer(), $inserter );
	}

	/**
	 * Add one eligible published paragraph Promotion fixture.
	 *
	 * @param int $promotion_id    Promotion ID.
	 * @param int $paragraph_number Paragraph number.
	 */
	private function add_paragraph_promotion( int $promotion_id, int $paragraph_number ): void {
		$GLOBALS['npcink_ad_test_posts'][ $promotion_id ] = new WP_Post(
			array(
				'ID'           => $promotion_id,
				'post_type'    => Post_Types::PROMOTION_POST_TYPE,
				'post_status'  => 'publish',
				'post_content' => 'Promotion ' . $promotion_id,
			)
		);
		$GLOBALS['npcink_ad_test_meta'][ $promotion_id ] = array(
			Post_Types::LOCATION_META         => 'content_after_paragraph',
			Post_Types::PARAGRAPH_NUMBER_META => $paragraph_number,
			Post_Types::PAGE_SCOPE_META       => 'all',
			Post_Types::INCLUDE_IDS_META      => array(),
			Post_Types::EXCLUDE_IDS_META      => array(),
			Post_Types::DEVICE_META           => 'all',
			Post_Types::START_AT_META         => '',
			Post_Types::END_AT_META           => '',
		);
	}

	/**
	 * Build one parsed block fixture.
	 *
	 * @param string|null $name Block name.
	 * @param string      $html Block inner HTML.
	 * @return array<string, mixed>
	 */
	private function block( ?string $name, string $html ): array {
		return array(
			'blockName'    => $name,
			'attrs'        => array(),
			'innerBlocks'  => array(),
			'innerHTML'    => $html,
			'innerContent' => array( $html ),
		);
	}
}
