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
require_once __DIR__ . '/PromotionPreflightWordPressClasses.php';
require_once __DIR__ . '/DeliveryWordPressStubs.php';
require_once __DIR__ . '/EditorialScopeWordPressStubs.php';
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
		unset( $GLOBALS['npcink_ad_test_preview_target_type'] );
		$GLOBALS['npcink_ad_test_posts']              = array();
		$GLOBALS['npcink_ad_test_meta']               = array();
		$GLOBALS['npcink_ad_test_get_posts_queries']  = array();
		$GLOBALS['npcink_ad_test_get_terms_queries']  = array();
		$GLOBALS['npcink_ad_test_get_terms_errors']   = array();
		$GLOBALS['npcink_ad_test_get_terms_results']  = array();
		$GLOBALS['npcink_ad_test_term_taxonomies']    = array();
		$GLOBALS['npcink_ad_test_get_post_type_calls'] = array();
		$GLOBALS['npcink_ad_test_get_the_terms_queries'] = array();
		$GLOBALS['npcink_ad_test_get_the_terms_errors']  = array();
		$GLOBALS['npcink_ad_test_get_the_terms_results'] = array();
		$GLOBALS['npcink_ad_test_get_the_terms']         = array();
		$GLOBALS['npcink_ad_test_enqueued_styles']    = array();
		$GLOBALS['npcink_ad_test_enqueued_scripts']   = array();
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
	 * Top and bottom bars render through their real hooks, outside post content.
	 */
	public function test_page_bars_render_in_deterministic_hook_locations(): void {
		$this->add_automatic_promotion( 50, 'bar_top', 'all' );
		$this->add_automatic_promotion( 51, 'bar_bottom', 'all' );
		$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );

		$content = $delivery->filter_content( '<p>Body</p>' );
		ob_start();
		$delivery->render_top_page_bar();
		$top = (string) ob_get_clean();
		ob_start();
		$delivery->render_bottom_page_bar();
		$bottom = (string) ob_get_clean();

		self::assertSame( '<p>Body</p>', $content );
		self::assertStringContainsString( 'data-npcink-ad-promotion="50"', $top );
		self::assertStringNotContainsString( 'data-npcink-ad-promotion="51"', $top );
		self::assertStringContainsString( 'data-npcink-ad-promotion="51"', $bottom );
		self::assertStringNotContainsString( 'data-npcink-ad-promotion="50"', $bottom );
		self::assertSame(
			array( 'npcink-ad-page-bar', 'npcink-ad-page-bar' ),
			$GLOBALS['npcink_ad_test_enqueued_scripts']
		);
	}

	/**
	 * An authorized preview suppresses ordinary bars and uses the selected hook.
	 */
	public function test_page_bar_preview_uses_only_the_selected_real_hook(): void {
		$this->add_automatic_promotion( 52, 'bar_top', 'all' );
		$GLOBALS['npcink_ad_test_posts'][52]->post_status = 'draft';
		$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );
		$delivery->enable_preview_request();
		$delivery->enable_page_bar_preview( 52, 'bar_top', 'mobile', 99 );

		ob_start();
		$delivery->render_bottom_page_bar();
		$bottom = (string) ob_get_clean();
		ob_start();
		$delivery->render_top_page_bar();
		$top = (string) ob_get_clean();

		self::assertSame( '', $bottom );
		self::assertStringContainsString( 'data-npcink-ad-promotion="52"', $top );
		self::assertStringContainsString( 'Not currently eligible', $top );
		self::assertTrue( $delivery->has_rendered_page_bar_preview() );
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
	 * Automatic terms scope reads direct relationships and renders on any match.
	 */
	public function test_automatic_terms_scope_renders_on_direct_category_match(): void {
		$this->add_automatic_promotion( 41, 'content_before', 'terms', array( 7 ) );
		$GLOBALS['npcink_ad_test_term_taxonomies']['category']      = array( 7 );
		$GLOBALS['npcink_ad_test_get_the_terms'][99]['category']     = array( 7 );
		$GLOBALS['npcink_ad_test_get_the_terms'][99]['post_tag']     = array();
		$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );

		$output = $delivery->filter_content( '<p>Body</p>' );

		self::assertStringContainsString( 'data-npcink-ad-promotion="41"', $output );
		self::assertCount( 2, $GLOBALS['npcink_ad_test_get_the_terms_queries'] );
	}

	/**
	 * A readable post with no selected relationship fails with a stable reason.
	 */
	public function test_automatic_terms_scope_reports_a_relationship_mismatch(): void {
		$this->add_automatic_promotion( 42, 'content_before', 'terms', array( 7 ) );
		$GLOBALS['npcink_ad_test_term_taxonomies']['category']  = array( 7 );
		$GLOBALS['npcink_ad_test_get_the_terms'][99]['category'] = array( 8 );
		$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );

		$output = $delivery->filter_content( '<p>Body</p>' );

		self::assertStringContainsString( 'does not match the selected categories or tags', $output );
	}

	/**
	 * Core's false return is a readable empty relationship set, not an error.
	 */
	public function test_empty_term_relationships_are_available_but_do_not_match(): void {
		$this->add_automatic_promotion( 48, 'content_before', 'terms', array( 7 ) );
		$GLOBALS['npcink_ad_test_term_taxonomies']['category'] = array( 7 );
		$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );

		$output = $delivery->filter_content( '<p>Body</p>' );

		self::assertStringContainsString( 'does not match the selected categories or tags', $output );
		self::assertStringNotContainsString( 'could not be read', $output );
	}

	/**
	 * Failed relationship reads fail closed at runtime.
	 */
	public function test_automatic_terms_scope_fails_closed_when_relationships_are_unavailable(): void {
		$this->add_automatic_promotion( 43, 'content_before', 'terms', array( 7 ) );
		$GLOBALS['npcink_ad_test_term_taxonomies']['category'] = array( 7 );
		$GLOBALS['npcink_ad_test_get_the_terms_errors'][99]      = array( 'category' );
		$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );

		$output = $delivery->filter_content( '<p>Body</p>' );

		self::assertStringContainsString( 'categories or tags could not be read', $output );
	}

	/**
	 * A malformed taxonomy result fails closed even if the other taxonomy matches.
	 */
	public function test_automatic_terms_scope_rejects_malformed_relationship_shape(): void {
		$this->add_automatic_promotion( 49, 'content_before', 'terms', array(), array( 8 ) );
		$GLOBALS['npcink_ad_test_term_taxonomies']['post_tag']               = array( 8 );
		$GLOBALS['npcink_ad_test_get_the_terms_results'][99]['category']     = array( 'bad' );
		$GLOBALS['npcink_ad_test_get_the_terms'][99]['post_tag']             = array( 8 );
		$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );

		$output = $delivery->filter_content( '<p>Body</p>' );

		self::assertStringContainsString( 'categories or tags could not be read', $output );
		self::assertStringNotContainsString( 'data-npcink-ad-promotion="49"', $output );
	}

	/**
	 * Content type and term context are loaded once across automatic placements.
	 */
	public function test_automatic_content_context_is_cached_by_post_id(): void {
		$this->add_automatic_promotion( 44, 'content_before', 'terms', array( 7 ) );
		$this->add_automatic_promotion( 45, 'content_after', 'terms', array( 7 ) );
		$GLOBALS['npcink_ad_test_term_taxonomies']['category']  = array( 7 );
		$GLOBALS['npcink_ad_test_get_the_terms'][99]['category'] = array( 7 );
		$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );

		$delivery->filter_content( '<p>Body</p>' );

		self::assertSame( array( 99 ), $GLOBALS['npcink_ad_test_get_post_type_calls'] );
		self::assertCount( 2, $GLOBALS['npcink_ad_test_get_the_terms_queries'] );
	}

	/**
	 * One singular request shares two term catalogs across every auto location.
	 */
	public function test_filter_content_bounds_mixed_term_catalog_queries(): void {
		$category_ids = range( 1, 20 );
		$tag_ids      = range( 101, 120 );
		foreach ( $category_ids as $offset => $category_id ) {
			$promotion_id = $offset + 1;
			$location     = 7 > $offset
				? 'content_before'
				: ( 14 > $offset ? 'content_after' : 'content_after_paragraph' );
			$this->add_automatic_promotion(
				$promotion_id,
				$location,
				'terms',
				array( $category_id ),
				array( $tag_ids[ $offset ] )
			);
			if ( 'content_after_paragraph' === $location ) {
				$GLOBALS['npcink_ad_test_meta'][ $promotion_id ][ Post_Types::PARAGRAPH_NUMBER_META ] = 1 + ( $offset % 2 );
			}
		}

		$GLOBALS['npcink_ad_test_term_taxonomies'] = array(
			'category' => $category_ids,
			'post_tag' => $tag_ids,
		);
		$GLOBALS['npcink_ad_test_get_the_terms'][99] = array(
			'category' => $category_ids,
			'post_tag' => $tag_ids,
		);

		$output = $this->delivery( array( $this->block( null, '<p>One</p><p>Two</p>' ) ) )
			->filter_content( '<p>One</p><p>Two</p>' );

		self::assertSame( 20, substr_count( $output, 'data-npcink-ad-promotion=' ) );
		self::assertLessThanOrEqual( 2, count( $GLOBALS['npcink_ad_test_get_terms_queries'] ) );
		self::assertSame(
			array( 'category', 'post_tag' ),
			array_column( $GLOBALS['npcink_ad_test_get_terms_queries'], 'taxonomy' )
		);
		self::assertCount( 2, $GLOBALS['npcink_ad_test_get_the_terms_queries'] );
		self::assertCount( 1, $GLOBALS['npcink_ad_test_get_posts_queries'] );
	}

	/**
	 * Real preview and normal rendering share the same request-local context.
	 */
	public function test_real_preview_and_normal_rendering_share_content_context(): void {
		$this->add_automatic_promotion( 46, 'content_after', 'terms', array( 7 ) );
		$GLOBALS['npcink_ad_test_term_taxonomies']['category']  = array( 7 );
		$GLOBALS['npcink_ad_test_get_the_terms'][99]['category'] = array( 7 );
		$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );

		$delivery->render_promotion( 46, 'content_after', 0, null, 99 );
		$delivery->render_preview( 46, 'content_after', 'desktop', 99 );

		self::assertSame( array( 99 ), $GLOBALS['npcink_ad_test_get_post_type_calls'] );
		self::assertCount( 2, $GLOBALS['npcink_ad_test_get_the_terms_queries'] );
	}

	/**
	 * Manual placement treats advanced scope as all and performs no context reads.
	 */
	public function test_manual_block_ignores_advanced_scope_without_term_queries(): void {
		$GLOBALS['npcink_ad_test_singular_post_type'] = 'product';
		$this->add_automatic_promotion( 47, 'block', 'terms', array( 999 ) );
		$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );

		$output = $delivery->render_promotion( 47, 'block', 0, null, 99 );

		self::assertStringContainsString( 'data-npcink-ad-promotion="47"', $output );
		self::assertSame( array(), $GLOBALS['npcink_ad_test_get_post_type_calls'] );
		self::assertSame( array(), $GLOBALS['npcink_ad_test_get_the_terms_queries'] );
		self::assertSame( array(), $GLOBALS['npcink_ad_test_get_terms_queries'] );
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
			Post_Types::CONTENT_SCOPE_META    => 'all',
			Post_Types::INCLUDE_IDS_META      => array(),
			Post_Types::EXCLUDE_IDS_META      => array(),
			Post_Types::CATEGORY_IDS_META     => array(),
			Post_Types::TAG_IDS_META          => array(),
			Post_Types::DEVICE_META           => 'all',
			Post_Types::START_AT_META         => '',
			Post_Types::END_AT_META           => '',
		);
	}

	/**
	 * Add one published Promotion fixture for a requested location and scope.
	 *
	 * @param int    $promotion_id Promotion ID.
	 * @param string $location     Delivery location.
	 * @param string $scope        Content scope.
	 * @param array  $category_ids Selected category IDs.
	 * @param array  $tag_ids      Selected tag IDs.
	 * @phpstan-param list<int> $category_ids
	 * @phpstan-param list<int> $tag_ids
	 */
	private function add_automatic_promotion(
		int $promotion_id,
		string $location,
		string $scope,
		array $category_ids = array(),
		array $tag_ids = array()
	): void {
		$GLOBALS['npcink_ad_test_posts'][ $promotion_id ] = new WP_Post(
			array(
				'ID'           => $promotion_id,
				'post_type'    => Post_Types::PROMOTION_POST_TYPE,
				'post_status'  => 'publish',
				'post_content' => 'Promotion ' . $promotion_id,
			)
		);
		$GLOBALS['npcink_ad_test_meta'][ $promotion_id ] = array(
			Post_Types::LOCATION_META      => $location,
			Post_Types::CONTENT_SCOPE_META => $scope,
			Post_Types::INCLUDE_IDS_META   => array(),
			Post_Types::EXCLUDE_IDS_META   => array(),
			Post_Types::CATEGORY_IDS_META  => $category_ids,
			Post_Types::TAG_IDS_META       => $tag_ids,
			Post_Types::DEVICE_META        => 'all',
			Post_Types::START_AT_META      => '',
			Post_Types::END_AT_META        => '',
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
