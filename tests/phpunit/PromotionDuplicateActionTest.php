<?php
/**
 * Promotion duplication tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Admin\Promotion_Duplicate_Action;
use Npcink\Ad\Data\Post_Types;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once __DIR__ . '/PromotionStatusWordPressClasses.php';
require_once __DIR__ . '/PromotionStatusWordPressPost.php';
require_once __DIR__ . '/PromotionPreflightWordPressClasses.php';
require_once __DIR__ . '/PromotionDuplicateWordPressStubs.php';

require_once dirname( __DIR__, 2 ) . '/src/Data/Post_Types.php';
require_once dirname( __DIR__, 2 ) . '/src/Admin/Promotion_Duplicate_Action.php';

/**
 * Covers the explicit safe-copy boundary and list action.
 */
final class PromotionDuplicateActionTest extends TestCase {
	/**
	 * Source Promotion and mutation fixtures.
	 */
	protected function setUp(): void {
		$GLOBALS['npcink_ad_test_actions']           = array();
		$GLOBALS['npcink_ad_test_filters']           = array();
		$GLOBALS['npcink_ad_test_insert_calls']      = array();
		$GLOBALS['npcink_ad_test_update_meta_calls'] = array();
		$GLOBALS['npcink_ad_test_delete_meta_calls'] = array();
		$GLOBALS['npcink_ad_test_delete_post_calls'] = array();
		$GLOBALS['npcink_ad_test_current_user_id']   = 42;
		$GLOBALS['npcink_ad_test_next_post_id']      = 200;
		$GLOBALS['npcink_ad_test_new_post_meta']     = array(
			Post_Types::START_AT_META => '2030-01-01 00:00:00',
			Post_Types::END_AT_META   => '2030-01-02 00:00:00',
		);
		$GLOBALS['npcink_ad_test_posts'] = array(
			7 => new WP_Post(
				array(
					'ID'           => 7,
					'post_type'    => Post_Types::PROMOTION_POST_TYPE,
					'post_status'  => 'publish',
					'post_title'   => "Spring 'Sale'",
					'post_content' => '<!-- wp:paragraph --><p>Original creative</p><!-- /wp:paragraph -->',
				)
			),
		);
		$GLOBALS['npcink_ad_test_meta'] = array(
			7 => array(
				Post_Types::LOCATION_META         => 'content_after_paragraph',
				Post_Types::CONTENT_SCOPE_META    => 'terms',
				Post_Types::INCLUDE_IDS_META      => array( 10, 11 ),
				Post_Types::EXCLUDE_IDS_META      => array( 11 ),
				Post_Types::CATEGORY_IDS_META     => array( 3 ),
				Post_Types::TAG_IDS_META          => array( 4 ),
				Post_Types::DEVICE_META           => 'mobile',
				Post_Types::PARAGRAPH_NUMBER_META => '5',
				Post_Types::START_AT_META         => '2029-01-01 00:00:00',
				Post_Types::END_AT_META           => '2029-01-02 00:00:00',
				'_npcink_ad_unknown'              => 'do not copy',
			),
		);
		unset(
			$GLOBALS['npcink_ad_test_capabilities'],
			$GLOBALS['npcink_ad_test_delete_post_failure'],
			$GLOBALS['npcink_ad_test_fail_meta_key'],
			$GLOBALS['npcink_ad_test_insert_error'],
			$GLOBALS['npcink_ad_test_inserted_post_overrides']
		);
	}

	/**
	 * The feature registers only its bounded admin hooks.
	 */
	public function test_registers_row_action_form_handler_and_notice_hooks(): void {
		$action = new Promotion_Duplicate_Action();
		$action->register();

		self::assertContains( 'post_row_actions', array_column( $GLOBALS['npcink_ad_test_filters'], 'hook_name' ) );
		self::assertSame(
			array(
				'admin_footer',
				'admin_post_npcink_ad_duplicate_promotion',
				'admin_enqueue_scripts',
				'admin_notices',
			),
			array_column( $GLOBALS['npcink_ad_test_actions'], 'hook_name' )
		);
	}

	/**
	 * The visible row action submits a standalone nonce-bound POST form.
	 */
	public function test_row_action_uses_a_standalone_post_form(): void {
		$action  = new Promotion_Duplicate_Action();
		$actions = $action->add_row_action( array( 'edit' => '<a>Edit</a>' ), $GLOBALS['npcink_ad_test_posts'][7] );

		self::assertArrayHasKey( 'npcink_ad_duplicate', $actions );
		self::assertStringContainsString( 'type="submit"', $actions['npcink_ad_duplicate'] );
		self::assertStringContainsString( 'form="npcink-ad-duplicate-7"', $actions['npcink_ad_duplicate'] );
		self::assertStringContainsString( 'aria-label="Duplicate as draft: Spring &#039;Sale&#039;"', $actions['npcink_ad_duplicate'] );
		self::assertStringNotContainsString( 'href=', $actions['npcink_ad_duplicate'] );

		ob_start();
		$action->render_forms();
		$output = (string) ob_get_clean();
		self::assertStringContainsString( 'method="post"', $output );
		self::assertStringContainsString( 'admin-post.php', $output );
		self::assertStringContainsString( 'name="action" value="npcink_ad_duplicate_promotion"', $output );
		self::assertStringContainsString( 'name="promotion_id" value="7"', $output );
		self::assertStringContainsString( 'nonce:npcink_ad_duplicate_promotion_7', $output );

		ob_start();
		$action->render_forms();
		self::assertSame( '', (string) ob_get_clean() );
	}

	/**
	 * Missing management capability hides the mutation control.
	 */
	public function test_row_action_is_hidden_without_capability(): void {
		$GLOBALS['npcink_ad_test_capabilities'] = array( 'manage_npcink_ads' => false );
		$action = new Promotion_Duplicate_Action();

		self::assertSame(
			array( 'edit' => '<a>Edit</a>' ),
			$action->add_row_action( array( 'edit' => '<a>Edit</a>' ), $GLOBALS['npcink_ad_test_posts'][7] )
		);
	}

	/**
	 * Non-Promotion rows never receive the action.
	 */
	public function test_row_action_ignores_other_post_types(): void {
		$action = new Promotion_Duplicate_Action();
		$post   = new WP_Post(
			array(
				'ID'        => 8,
				'post_type' => 'post',
			)
		);

		self::assertSame( array(), $action->add_row_action( array(), $post ) );
	}

	/**
	 * Native content and only the allowlisted placement metadata are copied.
	 */
	public function test_duplicates_content_and_allowlisted_meta_as_an_unscheduled_draft(): void {
		$source_meta = $GLOBALS['npcink_ad_test_meta'][7];
		$result      = $this->duplicate_source();

		self::assertSame( 200, $result );
		self::assertCount( 1, $GLOBALS['npcink_ad_test_insert_calls'] );
		$insert = $GLOBALS['npcink_ad_test_insert_calls'][0];
		self::assertSame( Post_Types::PROMOTION_POST_TYPE, $insert['post_type'] );
		self::assertSame( 'draft', $insert['post_status'] );
		self::assertSame( 42, $insert['post_author'] );
		self::assertSame( wp_slash( "Spring 'Sale' — Copy" ), $insert['post_title'] );
		self::assertSame( wp_slash( '<!-- wp:paragraph --><p>Original creative</p><!-- /wp:paragraph -->' ), $insert['post_content'] );
		self::assertArrayNotHasKey( 'post_date', $insert );
		self::assertArrayNotHasKey( 'post_date_gmt', $insert );
		self::assertSame( 'draft', $GLOBALS['npcink_ad_test_posts'][200]->post_status );
		self::assertSame( 42, $GLOBALS['npcink_ad_test_posts'][200]->post_author );

		$copy_meta = $GLOBALS['npcink_ad_test_meta'][200];
		foreach ( $this->copy_meta_keys() as $meta_key ) {
			self::assertArrayHasKey( $meta_key, $copy_meta );
			self::assertSame( $source_meta[ $meta_key ], $copy_meta[ $meta_key ] );
		}
		self::assertArrayNotHasKey( Post_Types::START_AT_META, $copy_meta );
		self::assertArrayNotHasKey( Post_Types::END_AT_META, $copy_meta );
		self::assertArrayNotHasKey( '_npcink_ad_unknown', $copy_meta );
		self::assertSame( $source_meta, $GLOBALS['npcink_ad_test_meta'][7] );
		self::assertSame( 'publish', $GLOBALS['npcink_ad_test_posts'][7]->post_status );
		self::assertSame(
			array(
				array( 200, Post_Types::START_AT_META ),
				array( 200, Post_Types::END_AT_META ),
			),
			$GLOBALS['npcink_ad_test_delete_meta_calls']
		);
	}

	/**
	 * An absent allowlisted value remains absent instead of materializing state.
	 */
	public function test_absent_allowlisted_meta_is_not_created(): void {
		unset( $GLOBALS['npcink_ad_test_meta'][7][ Post_Types::TAG_IDS_META ] );

		self::assertSame( 200, $this->duplicate_source() );
		self::assertArrayNotHasKey( Post_Types::TAG_IDS_META, $GLOBALS['npcink_ad_test_meta'][200] );
	}

	/**
	 * An untitled source receives a useful translated fallback title.
	 */
	public function test_untitled_source_uses_a_copy_title(): void {
		$GLOBALS['npcink_ad_test_posts'][7]->post_title = '   ';

		self::assertSame( 200, $this->duplicate_source() );
		self::assertSame( 'Promotion copy', stripslashes( $GLOBALS['npcink_ad_test_insert_calls'][0]['post_title'] ) );
	}

	/**
	 * A metadata failure removes the partial draft and returns a bounded error.
	 */
	public function test_meta_failure_rolls_back_the_incomplete_copy(): void {
		$GLOBALS['npcink_ad_test_fail_meta_key'] = Post_Types::CATEGORY_IDS_META;

		$result = $this->duplicate_source();

		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( 'npcink_ad_duplicate_meta_failed', $result->get_error_code() );
		self::assertSame( array( array( 200, true ) ), $GLOBALS['npcink_ad_test_delete_post_calls'] );
		self::assertArrayNotHasKey( 200, $GLOBALS['npcink_ad_test_posts'] );
		self::assertArrayNotHasKey( 200, $GLOBALS['npcink_ad_test_meta'] );
		self::assertArrayHasKey( 7, $GLOBALS['npcink_ad_test_posts'] );
	}

	/**
	 * A blocked rollback returns an honest cleanup error and leaves evidence.
	 */
	public function test_blocked_rollback_reports_that_an_incomplete_draft_may_remain(): void {
		$GLOBALS['npcink_ad_test_fail_meta_key']          = Post_Types::CATEGORY_IDS_META;
		$GLOBALS['npcink_ad_test_delete_post_failure']    = true;

		$result = $this->duplicate_source();

		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( 'npcink_ad_duplicate_cleanup_failed', $result->get_error_code() );
		self::assertSame( array( array( 200, true ) ), $GLOBALS['npcink_ad_test_delete_post_calls'] );
		self::assertArrayHasKey( 200, $GLOBALS['npcink_ad_test_posts'] );
	}

	/**
	 * An insertion failure does not attempt to delete an unrelated record.
	 */
	public function test_insert_failure_does_not_run_rollback(): void {
		$GLOBALS['npcink_ad_test_insert_error'] = new WP_Error( 'db_failure', 'No insert' );

		$result = $this->duplicate_source();

		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( 'npcink_ad_duplicate_insert_failed', $result->get_error_code() );
		self::assertSame( array(), $GLOBALS['npcink_ad_test_delete_post_calls'] );
	}

	/**
	 * A filtered post field fails the exact-copy contract and is removed.
	 */
	public function test_filtered_insert_content_rolls_back_the_changed_copy(): void {
		$GLOBALS['npcink_ad_test_inserted_post_overrides'] = array(
			'post_content' => '<p>Changed by a filter</p>',
		);

		$result = $this->duplicate_source();

		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( 'npcink_ad_duplicate_insert_invalid', $result->get_error_code() );
		self::assertSame( array( array( 200, true ) ), $GLOBALS['npcink_ad_test_delete_post_calls'] );
		self::assertArrayNotHasKey( 200, $GLOBALS['npcink_ad_test_posts'] );
	}

	/**
	 * The source ID is part of every nonce action.
	 */
	public function test_nonce_is_bound_to_the_source_id(): void {
		self::assertSame( 'npcink_ad_duplicate_promotion_7', Promotion_Duplicate_Action::nonce_action( 7 ) );
		self::assertNotSame( Promotion_Duplicate_Action::nonce_action( 7 ), Promotion_Duplicate_Action::nonce_action( 8 ) );
	}

	/**
	 * Notices expose only the two accepted outcomes.
	 */
	public function test_notices_are_allowlisted(): void {
		$action = new Promotion_Duplicate_Action();
		$method = new ReflectionMethod( $action, 'notice_message' );

		self::assertSame( 'success', $method->invoke( $action, 'duplicated' )['type'] );
		self::assertSame( 'error', $method->invoke( $action, 'duplicate_failed' )['type'] );
		self::assertStringContainsString( 'may remain', $method->invoke( $action, 'cleanup_failed' )['text'] );
		self::assertNull( $method->invoke( $action, 'unexpected' ) );
	}

	/**
	 * Invoke the private copy seam after its request boundary.
	 *
	 * @return int|WP_Error
	 */
	private function duplicate_source(): int|WP_Error {
		$action = new Promotion_Duplicate_Action();
		$method = new ReflectionMethod( $action, 'duplicate_promotion' );

		return $method->invoke( $action, $GLOBALS['npcink_ad_test_posts'][7] );
	}

	/**
	 * Mirror the accepted metadata contract for assertions.
	 *
	 * @return list<string>
	 */
	private function copy_meta_keys(): array {
		return array(
			Post_Types::LOCATION_META,
			Post_Types::CONTENT_SCOPE_META,
			Post_Types::INCLUDE_IDS_META,
			Post_Types::EXCLUDE_IDS_META,
			Post_Types::CATEGORY_IDS_META,
			Post_Types::TAG_IDS_META,
			Post_Types::DEVICE_META,
			Post_Types::PARAGRAPH_NUMBER_META,
		);
	}
}
