<?php
/**
 * Promotion management-list status tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Admin\Promotion_List;
use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use Npcink\Ad\Domain\Overlap_Detector;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once __DIR__ . '/PromotionStatusWordPressClasses.php';
require_once __DIR__ . '/PromotionStatusWordPressPost.php';
require_once __DIR__ . '/PromotionStatusWordPressQuery.php';
require_once __DIR__ . '/PromotionPreflightWordPressClasses.php';
require_once __DIR__ . '/EditorialScopeWordPressStubs.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Post_Types.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Repository.php';
require_once dirname( __DIR__, 2 ) . '/src/Presentation/Eligibility_Messages.php';
require_once dirname( __DIR__, 2 ) . '/src/Admin/Promotion_Status_Action.php';
require_once dirname( __DIR__, 2 ) . '/src/Admin/Promotion_List.php';

/**
 * Covers truthful list labels for WordPress post statuses.
 */
final class PromotionListTest extends TestCase {
	/**
	 * Reset list and query fixtures.
	 */
	protected function setUp(): void {
		$GLOBALS['npcink_ad_test_posts']             = array();
		$GLOBALS['npcink_ad_test_meta']              = array();
		$GLOBALS['npcink_ad_test_titles']            = array();
		$GLOBALS['npcink_ad_test_get_posts_queries'] = array();
		$GLOBALS['npcink_ad_test_get_terms_queries'] = array();
		$GLOBALS['npcink_ad_test_get_terms_errors']  = array();
		$GLOBALS['npcink_ad_test_get_terms_results'] = array();
		$GLOBALS['npcink_ad_test_term_taxonomies']   = array();
		unset( $GLOBALS['npcink_ad_test_public_ids'], $GLOBALS['wp_query'] );
	}

	/**
	 * Provide post-status labels that do not imply active delivery.
	 *
	 * @return array<string, array{string, string}>
	 */
	public static function status_labels(): array {
		return array(
			'draft is paused'       => array( 'draft', 'Paused' ),
			'future has not started' => array( 'future', 'Not started' ),
			'private is unpublished' => array( 'private', 'Not published' ),
			'pending is unpublished' => array( 'pending', 'Not published' ),
			'published is ready'     => array( 'publish', 'Rule ready' ),
		);
	}

	/**
	 * List labels distinguish paused drafts from other unpublished statuses.
	 *
	 * @param string $status         Promotion post status.
	 * @param string $expected_label Expected management label.
	 */
	#[DataProvider( 'status_labels' )]
	public function test_status_label_is_truthful( string $status, string $expected_label ): void {
		$list   = $this->promotion_list();
		$method = new ReflectionMethod( $list, 'status_label' );
		$label  = $method->invoke(
			$list,
			array(
				'id'            => 1,
				'status'        => $status,
				'content'       => '<p>Creative</p>',
				'location'      => 'block',
				'content_scope' => 'all',
				'include_ids'   => array(),
				'exclude_ids'   => array(),
				'device'        => 'all',
				'start_at'      => 0,
				'end_at'        => 0,
			)
		);

		self::assertSame( $expected_label, $label );
	}

	/**
	 * Row buttons target unique standalone POST forms rendered in the footer.
	 */
	public function test_status_buttons_use_standalone_footer_forms(): void {
		$GLOBALS['npcink_ad_test_titles'][7] = 'Summer promotion';
		$list          = $this->promotion_list();
		$publish_button = $this->render_status_action( $list, 7, 'publish' );
		$draft_button   = $this->render_status_action( $list, 8, 'draft' );

		self::assertStringNotContainsString( '<form', $publish_button . $draft_button );
		self::assertStringContainsString( 'form="npcink-ad-status-pause-7"', $publish_button );
		self::assertStringContainsString( 'form="npcink-ad-status-resume-8"', $draft_button );
		self::assertStringContainsString( 'aria-label="Pause: Summer promotion"', $publish_button );
		self::assertStringContainsString( 'aria-label="Resume: #8"', $draft_button );

		ob_start();
		$list->render_status_forms();
		$forms = (string) ob_get_clean();

		self::assertStringContainsString( '<form id="npcink-ad-status-pause-7" method="post"', $forms );
		self::assertStringContainsString( '<form id="npcink-ad-status-resume-8" method="post"', $forms );
		self::assertStringContainsString( 'action="https://example.test/wp-admin/admin-post.php"', $forms );
		self::assertStringContainsString( 'name="action" value="npcink_ad_change_promotion_status"', $forms );
		self::assertStringContainsString( 'name="promotion_id" value="7"', $forms );
		self::assertStringContainsString( 'name="operation" value="pause"', $forms );
		self::assertStringContainsString( 'value="nonce:npcink_ad_change_promotion_status_pause_7"', $forms );
		self::assertStringContainsString( 'name="_wp_http_referer"', $forms );

		ob_start();
		$list->render_status_forms();
		self::assertSame( '', (string) ob_get_clean() );
	}

	/**
	 * An empty footer queue emits no markup.
	 */
	public function test_empty_status_form_queue_outputs_nothing(): void {
		$list = $this->promotion_list();

		ob_start();
		$list->render_status_forms();
		self::assertSame( '', (string) ob_get_clean() );
	}

	/**
	 * Promotion list editing stays on the validated block-editor path.
	 */
	public function test_disables_native_quick_and_bulk_edit_and_forces_block_editor(): void {
		$list = $this->promotion_list();

		self::assertFalse( $list->disable_quick_edit( true, Post_Types::PROMOTION_POST_TYPE ) );
		self::assertTrue( $list->disable_quick_edit( true, 'post' ) );
		self::assertSame(
			array( 'trash' => 'Move to Trash' ),
			$list->remove_bulk_edit(
				array(
					'edit'  => 'Edit',
					'trash' => 'Move to Trash',
				)
			)
		);
		self::assertTrue( $list->force_block_editor( false, Post_Types::PROMOTION_POST_TYPE ) );
		self::assertFalse( $list->force_block_editor( false, 'post' ) );
		self::assertTrue(
			$list->force_block_editor_for_post(
				false,
				new WP_Post(
					array(
						'ID'        => 7,
						'post_type' => Post_Types::PROMOTION_POST_TYPE,
					)
				)
			)
		);
		self::assertFalse(
			$list->force_block_editor_for_post(
				false,
				new WP_Post(
					array(
						'ID'        => 8,
						'post_type' => 'post',
					)
				)
			)
		);
	}

	/**
	 * The existing scope column exposes the canonical content contract.
	 */
	public function test_columns_rename_the_existing_scope_column_without_adding_another(): void {
		$columns = $this->promotion_list()->columns(
			array(
				'title' => 'Title',
				'date'  => 'Date',
			)
		);

		self::assertSame( 'Content scope', $columns['npcink_ad_content_scope'] );
		self::assertArrayNotHasKey( 'npcink_ad_page_scope', $columns );
		self::assertSame( 'Date', $columns['date'] );
	}

	/**
	 * Scope summaries stay bounded and expose invalid term configuration.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 * @param array                $expected  Expected summary fragments.
	 * @param array                $absent    Fragments that must stay hidden.
	 */
	#[DataProvider( 'content_scope_summaries' )]
	public function test_scope_summary_reflects_the_effective_canonical_scope(
		array $promotion,
		array $expected,
		array $absent = array()
	): void {
		$output = $this->render_scope( $promotion );

		foreach ( $expected as $fragment ) {
			self::assertStringContainsString( $fragment, $output );
		}
		foreach ( $absent as $fragment ) {
			self::assertStringNotContainsString( $fragment, $output );
		}
	}

	/**
	 * Provide canonical management summaries.
	 *
	 * @return array<string, array{array<string, mixed>, list<string>, list<string>?}>
	 */
	public static function content_scope_summaries(): array {
		return array(
			'all content with exclusions' => array(
				array(
					'location'      => 'content_after',
					'content_scope' => 'all',
					'exclude_ids'   => array( 10, 11 ),
				),
				array( 'All posts and pages', 'Configured exclusions: 2' ),
			),
			'all posts'                   => array(
				array(
					'location'      => 'content_after',
					'content_scope' => 'posts',
				),
				array( 'All posts' ),
				array( 'All posts and pages' ),
			),
			'all pages'                   => array(
				array(
					'location'      => 'content_after',
					'content_scope' => 'pages',
				),
				array( 'All pages' ),
			),
			'valid term scope'            => array(
				array(
					'location'      => 'content_after',
					'content_scope' => 'terms',
					'category_ids'  => array( 2, 3 ),
					'tag_ids'       => array( 7 ),
					'terms_valid'   => true,
				),
				array( 'Posts matching categories/tags', 'Configured terms: 3' ),
				array( 'Invalid category/tag selection' ),
			),
			'invalid term scope'          => array(
				array(
					'location'      => 'content_after',
					'content_scope' => 'terms',
					'category_ids'  => array( 999 ),
					'tag_ids'       => array(),
					'terms_valid'   => false,
				),
				array( 'Configured terms: 1', 'Invalid category/tag selection' ),
			),
			'empty term scope'            => array(
				array(
					'location'      => 'content_after',
					'content_scope' => 'terms',
					'category_ids'  => array(),
					'tag_ids'       => array(),
					'terms_valid'   => true,
				),
				array( 'Configured terms: 0', 'Invalid category/tag selection' ),
			),
			'selected public content'     => array(
				array(
					'location'      => 'content_after',
					'content_scope' => 'selected',
					'include_ids'   => array( 10, 11, 12 ),
					'exclude_ids'   => array( 11 ),
				),
				array( 'Selected public posts/pages: 2', 'Configured exclusions: 1' ),
			),
			'manual advanced scope is all' => array(
				array(
					'location'      => 'block',
					'content_scope' => 'terms',
					'category_ids'  => array(),
					'tag_ids'       => array(),
					'terms_valid'   => false,
				),
				array( 'All posts and pages' ),
				array( 'Invalid category/tag selection', 'Configured terms:' ),
			),
		);
	}

	/**
	 * Paragraph placement labels expose the anchor without disguising invalid data.
	 */
	public function test_paragraph_placement_label_distinguishes_valid_and_invalid_anchors(): void {
		$method = new ReflectionMethod( $this->promotion_list(), 'location_label' );

		self::assertSame(
			'After paragraph 7',
			$method->invoke( $this->promotion_list(), 'content_after_paragraph', 7, true )
		);
		self::assertSame(
			'After paragraph (invalid)',
			$method->invoke( $this->promotion_list(), 'content_after_paragraph', 3, false )
		);
	}

	/**
	 * List cache aggregates include IDs once and intersects exclusions with them.
	 */
	public function test_list_uses_one_aggregated_public_include_lookup(): void {
		$first  = new WP_Post(
			array(
				'ID'           => 101,
				'post_type'    => Post_Types::PROMOTION_POST_TYPE,
				'post_status'  => 'publish',
				'post_content' => '<p>First</p>',
			)
		);
		$second = new WP_Post(
			array(
				'ID'           => 102,
				'post_type'    => Post_Types::PROMOTION_POST_TYPE,
				'post_status'  => 'publish',
				'post_content' => '<p>Second</p>',
			)
		);
		$GLOBALS['npcink_ad_test_posts'] = array(
			101 => $first,
			102 => $second,
		);
		$GLOBALS['npcink_ad_test_meta']  = array(
			101 => $this->selected_meta( range( 1, 50 ), array( 2, 999 ) ),
			102 => $this->selected_meta( range( 51, 100 ), array( 52, 998 ) ),
		);
		$GLOBALS['npcink_ad_test_public_ids'] = range( 2, 100, 2 );
		$GLOBALS['wp_query']                  = new WP_Query( array( $first, $second ) );
		$list                                = $this->promotion_list();
		$method                              = new ReflectionMethod( $list, 'promotion' );

		$first_promotion  = $method->invoke( $list, 101 );
		$second_promotion = $method->invoke( $list, 102 );
		$queries          = $GLOBALS['npcink_ad_test_get_posts_queries'];

		self::assertCount( 1, $queries );
		self::assertSame( range( 1, 100 ), $queries[0]['post__in'] );
		self::assertSame( range( 2, 50, 2 ), $first_promotion['include_ids'] );
		self::assertSame( array( 2 ), $first_promotion['exclude_ids'] );
		self::assertSame( range( 52, 100, 2 ), $second_promotion['include_ids'] );
		self::assertSame( array( 52 ), $second_promotion['exclude_ids'] );
	}

	/**
	 * Placement advisories batch candidate and public-target queries for the list.
	 */
	public function test_placement_column_shows_a_batched_non_blocking_overlap_hint(): void {
		$current = new WP_Post(
			array(
				'ID'           => 201,
				'post_type'    => Post_Types::PROMOTION_POST_TYPE,
				'post_status'  => 'draft',
				'post_content' => '<p>Current</p>',
			)
		);
		$overlap = new WP_Post(
			array(
				'ID'           => 202,
				'post_type'    => Post_Types::PROMOTION_POST_TYPE,
				'post_status'  => 'publish',
				'post_content' => '<p>Overlap</p>',
			)
		);
		$mobile = new WP_Post(
			array(
				'ID'           => 203,
				'post_type'    => Post_Types::PROMOTION_POST_TYPE,
				'post_status'  => 'publish',
				'post_content' => '<p>Mobile only</p>',
			)
		);
		$GLOBALS['npcink_ad_test_posts'] = array(
			201 => $current,
			202 => $overlap,
			203 => $mobile,
		);
		$GLOBALS['npcink_ad_test_meta']  = array(
			201 => $this->automatic_selected_meta( array( 10, 11 ), 'desktop' ),
			202 => $this->automatic_selected_meta( array( 11, 12 ), 'desktop' ),
			203 => $this->automatic_selected_meta( array( 11 ), 'mobile' ),
		);
		$GLOBALS['npcink_ad_test_public_ids'] = array( 10, 11, 12 );
		$GLOBALS['wp_query']                  = new WP_Query( array( $current, $overlap, $mobile ) );
		$list                                = $this->promotion_list();

		ob_start();
		$list->render_column( 'npcink_ad_location', 201 );
		$output  = (string) ob_get_clean();
		$queries = $GLOBALS['npcink_ad_test_get_posts_queries'];

		self::assertStringContainsString( 'After content', $output );
		self::assertStringContainsString( 'May appear together with 1 published promotion.', $output );
		self::assertCount( 2, $queries );
		self::assertSame( Post_Types::PROMOTION_POST_TYPE, $queries[0]['post_type'] );
		self::assertSame( array( 10, 11, 12 ), $queries[1]['post__in'] );
	}

	/**
	 * Twenty term-scoped rows and the overlap catalog use four bounded queries.
	 */
	public function test_list_batches_term_validation_for_rows_and_overlap_catalog(): void {
		$posts      = array();
		$categories = range( 1, 20 );
		$tags       = range( 101, 120 );
		foreach ( $categories as $offset => $category_id ) {
			$promotion_id = $offset + 1;
			$post         = new WP_Post(
				array(
					'ID'           => $promotion_id,
					'post_type'    => Post_Types::PROMOTION_POST_TYPE,
					'post_status'  => 'publish',
					'post_content' => '<p>Promotion ' . $promotion_id . '</p>',
				)
			);
			$posts[ $promotion_id ] = $post;
			$GLOBALS['npcink_ad_test_meta'][ $promotion_id ] = array(
				Post_Types::LOCATION_META      => 'content_after',
				Post_Types::CONTENT_SCOPE_META => 'terms',
				Post_Types::INCLUDE_IDS_META   => array(),
				Post_Types::EXCLUDE_IDS_META   => array(),
				Post_Types::CATEGORY_IDS_META  => array( $category_id ),
				Post_Types::TAG_IDS_META       => array( $tags[ $offset ] ),
				Post_Types::DEVICE_META        => 'all',
				Post_Types::START_AT_META      => '',
				Post_Types::END_AT_META        => '',
			);
		}

		$GLOBALS['npcink_ad_test_posts'] = $posts;
		$GLOBALS['npcink_ad_test_term_taxonomies'] = array(
			'category' => $categories,
			'post_tag' => $tags,
		);
		$GLOBALS['wp_query'] = new WP_Query( array_values( $posts ) );
		$list               = $this->promotion_list();

		ob_start();
		$list->render_column( 'npcink_ad_content_scope', 1 );
		$scope = (string) ob_get_clean();
		ob_start();
		$list->render_column( 'npcink_ad_rule_status', 1 );
		$status = (string) ob_get_clean();

		self::assertStringContainsString( 'Posts matching categories/tags', $scope );
		self::assertStringContainsString( 'Rule ready', $status );
		self::assertLessThanOrEqual( 4, count( $GLOBALS['npcink_ad_test_get_terms_queries'] ) );
		self::assertSame(
			array( 'category', 'post_tag', 'category', 'post_tag' ),
			array_column( $GLOBALS['npcink_ad_test_get_terms_queries'], 'taxonomy' )
		);
		self::assertCount( 1, $GLOBALS['npcink_ad_test_get_posts_queries'] );
	}

	/**
	 * Build selected-scope metadata for a list-row fixture.
	 *
	 * @param array $include_ids Included content IDs.
	 * @param array $exclude_ids Excluded content IDs.
	 * @return array<string, mixed>
	 * @phpstan-param list<int> $include_ids
	 * @phpstan-param list<int> $exclude_ids
	 */
	private function selected_meta( array $include_ids, array $exclude_ids ): array {
		return array(
			Post_Types::LOCATION_META      => 'block',
			Post_Types::CONTENT_SCOPE_META => 'selected',
			Post_Types::INCLUDE_IDS_META   => $include_ids,
			Post_Types::EXCLUDE_IDS_META   => $exclude_ids,
			Post_Types::DEVICE_META        => 'all',
			Post_Types::START_AT_META      => '',
			Post_Types::END_AT_META        => '',
		);
	}

	/**
	 * Build one selected automatic-placement fixture.
	 *
	 * @param array  $include_ids Included public content IDs.
	 * @param string $device      Stored device rule.
	 * @return array<string, mixed>
	 * @phpstan-param list<int> $include_ids
	 */
	private function automatic_selected_meta( array $include_ids, string $device ): array {
		return array(
			Post_Types::LOCATION_META      => 'content_after',
			Post_Types::CONTENT_SCOPE_META => 'selected',
			Post_Types::INCLUDE_IDS_META   => $include_ids,
			Post_Types::EXCLUDE_IDS_META   => array(),
			Post_Types::DEVICE_META        => $device,
			Post_Types::START_AT_META      => '',
			Post_Types::END_AT_META        => '',
		);
	}

	/**
	 * Compose the list presenter with both pure policies.
	 */
	private function promotion_list(): Promotion_List {
		return new Promotion_List( new Repository(), new Eligibility_Evaluator(), new Overlap_Detector() );
	}

	/**
	 * Render one private row-action seam for its real capability path.
	 *
	 * @param Promotion_List $list    List presenter.
	 * @param int            $post_id Promotion post ID.
	 * @param string         $status  Promotion post status.
	 */
	private function render_status_action( Promotion_List $list, int $post_id, string $status ): string {
		$method = new ReflectionMethod( $list, 'render_status_action' );

		ob_start();
		$method->invoke(
			$list,
			array(
				'id'     => $post_id,
				'status' => $status,
			)
		);

		return (string) ob_get_clean();
	}

	/**
	 * Render the private scope seam for one domain fixture.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 * @throws Throwable When the reflected renderer fails.
	 */
	private function render_scope( array $promotion ): string {
		$list   = $this->promotion_list();
		$method = new ReflectionMethod( $list, 'render_scope' );

		ob_start();
		try {
			$method->invoke( $list, $promotion );
			return (string) ob_get_clean();
		} catch ( Throwable $throwable ) {
			ob_end_clean();
			throw $throwable;
		}
	}
}
