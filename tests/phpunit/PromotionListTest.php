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
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once __DIR__ . '/PromotionStatusWordPressClasses.php';
require_once __DIR__ . '/PromotionStatusWordPressPost.php';
require_once __DIR__ . '/PromotionStatusWordPressQuery.php';
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
		$list   = new Promotion_List( new Repository(), new Eligibility_Evaluator() );
		$method = new ReflectionMethod( $list, 'status_label' );
		$label  = $method->invoke(
			$list,
			array(
				'id'          => 1,
				'status'      => $status,
				'content'     => '<p>Creative</p>',
				'location'    => 'block',
				'page_scope'  => 'all',
				'include_ids' => array(),
				'exclude_ids' => array(),
				'device'      => 'all',
				'start_at'    => 0,
				'end_at'      => 0,
			)
		);

		self::assertSame( $expected_label, $label );
	}

	/**
	 * Row buttons target unique standalone POST forms rendered in the footer.
	 */
	public function test_status_buttons_use_standalone_footer_forms(): void {
		$GLOBALS['npcink_ad_test_titles'][7] = 'Summer promotion';
		$list          = new Promotion_List( new Repository(), new Eligibility_Evaluator() );
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
		$list = new Promotion_List( new Repository(), new Eligibility_Evaluator() );

		ob_start();
		$list->render_status_forms();
		self::assertSame( '', (string) ob_get_clean() );
	}

	/**
	 * Promotion list editing stays on the validated block-editor path.
	 */
	public function test_disables_native_quick_and_bulk_edit_and_forces_block_editor(): void {
		$list = new Promotion_List( new Repository(), new Eligibility_Evaluator() );

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
		$list                                = new Promotion_List( new Repository(), new Eligibility_Evaluator() );
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
			Post_Types::LOCATION_META    => 'block',
			Post_Types::PAGE_SCOPE_META  => 'selected',
			Post_Types::INCLUDE_IDS_META => $include_ids,
			Post_Types::EXCLUDE_IDS_META => $exclude_ids,
			Post_Types::DEVICE_META      => 'all',
			Post_Types::START_AT_META    => '',
			Post_Types::END_AT_META      => '',
		);
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
}
