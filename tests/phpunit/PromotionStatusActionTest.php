<?php
/**
 * Promotion resume-preflight tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Admin\Promotion_Status_Action;
use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once __DIR__ . '/PromotionStatusWordPressClasses.php';
require_once __DIR__ . '/PromotionStatusWordPressPost.php';
require_once __DIR__ . '/PromotionPreflightWordPressClasses.php';
require_once __DIR__ . '/EditorialScopeWordPressStubs.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Post_Types.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Repository.php';
require_once dirname( __DIR__, 2 ) . '/src/Presentation/Eligibility_Messages.php';
require_once dirname( __DIR__, 2 ) . '/src/Admin/Promotion_Status_Action.php';

/**
 * Covers management-only public-target validation before resume.
 */
final class PromotionStatusActionTest extends TestCase {
	/**
	 * Reset the in-memory WordPress fixtures.
	 */
	protected function setUp(): void {
		$GLOBALS['npcink_ad_test_get_posts_queries'] = array();
		$GLOBALS['npcink_ad_test_get_terms_queries'] = array();
		$GLOBALS['npcink_ad_test_get_terms_errors']  = array();
		$GLOBALS['npcink_ad_test_term_taxonomies']   = array();
		unset( $GLOBALS['npcink_ad_test_public_ids'] );
		$GLOBALS['npcink_ad_test_posts'] = array(
			1  => new WP_Post(
				array(
					'ID'           => 1,
					'post_type'    => Post_Types::PROMOTION_POST_TYPE,
					'post_status'  => 'draft',
					'post_content' => '<p>Creative</p>',
				)
			),
			10 => new WP_Post(
				array(
					'ID'           => 10,
					'post_type'    => 'page',
					'post_status'  => 'publish',
					'post_content' => 'Target',
				)
			),
			11 => new WP_Post(
				array(
					'ID'           => 11,
					'post_type'    => 'post',
					'post_status'  => 'draft',
					'post_content' => 'Private target',
				)
			),
		);
		$GLOBALS['npcink_ad_test_meta']  = array(
			1 => array(
				Post_Types::LOCATION_META    => 'block',
				Post_Types::CONTENT_SCOPE_META => 'selected',
				Post_Types::INCLUDE_IDS_META => array( 10 ),
				Post_Types::EXCLUDE_IDS_META => array(),
				Post_Types::CATEGORY_IDS_META => array(),
				Post_Types::TAG_IDS_META      => array(),
				Post_Types::DEVICE_META      => 'all',
				Post_Types::START_AT_META    => '',
				Post_Types::END_AT_META      => '',
			),
		);
	}

	/**
	 * A selected public target passes resume configuration validation.
	 */
	public function test_resume_preflight_accepts_a_public_selected_target(): void {
		self::assertNull( $this->resume_blocking_reason() );
	}

	/**
	 * A stored target that is not public is absent from the effective selection.
	 */
	public function test_resume_preflight_rejects_a_non_public_selected_target(): void {
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::INCLUDE_IDS_META ] = array( 11 );

		self::assertSame( 'promotion_targets_empty', $this->resume_blocking_reason() );
	}

	/**
	 * Resume reports shared configuration reasons in evaluator order.
	 */
	public function test_resume_preflight_reports_empty_content_before_empty_targets(): void {
		$GLOBALS['npcink_ad_test_posts'][1]->post_content                         = '';
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::INCLUDE_IDS_META ] = array( 11 );

		self::assertSame( 'promotion_content_empty', $this->resume_blocking_reason() );
	}

	/**
	 * A source-less video returns the shared configuration reason on resume.
	 */
	public function test_resume_preflight_reports_a_source_less_video(): void {
		$GLOBALS['npcink_ad_test_posts'][1]->post_content = '<video controls></video>';

		self::assertSame( 'promotion_video_source_missing', $this->resume_blocking_reason() );
	}

	/**
	 * Stored invalid calendar dates block resume through the shared evaluator.
	 */
	public function test_resume_preflight_rejects_an_invalid_stored_calendar_date(): void {
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::START_AT_META ] = '2027-02-30 08:00:00';

		self::assertSame( 'promotion_schedule_invalid', $this->resume_blocking_reason() );
	}

	/**
	 * Resume rejects an empty active automatic term scope.
	 */
	public function test_resume_preflight_rejects_empty_active_terms(): void {
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::LOCATION_META ]      = 'content_after';
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::CONTENT_SCOPE_META ] = 'terms';

		self::assertSame( 'promotion_targets_empty', $this->resume_blocking_reason() );
	}

	/**
	 * Resume rejects deleted or wrong-taxonomy term IDs.
	 */
	public function test_resume_preflight_rejects_invalid_terms(): void {
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::LOCATION_META ]      = 'content_after';
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::CONTENT_SCOPE_META ] = 'terms';
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::CATEGORY_IDS_META ]  = array( 7 );
		$GLOBALS['npcink_ad_test_term_taxonomies']['post_tag']               = array( 7 );

		self::assertSame( 'promotion_terms_invalid', $this->resume_blocking_reason() );
	}

	/**
	 * A valid term can resume even when no current post has that relationship.
	 */
	public function test_resume_preflight_accepts_valid_terms_without_content_matches(): void {
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::LOCATION_META ]      = 'content_after';
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::CONTENT_SCOPE_META ] = 'terms';
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::TAG_IDS_META ]       = array( 8 );
		$GLOBALS['npcink_ad_test_term_taxonomies']['post_tag']               = array( 8 );

		self::assertNull( $this->resume_blocking_reason() );
	}

	/**
	 * Manual block delivery ignores hidden advanced term scope values.
	 */
	public function test_resume_preflight_ignores_manual_hidden_terms(): void {
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::CONTENT_SCOPE_META ] = 'terms';
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::CATEGORY_IDS_META ]  = array( 999 );

		self::assertNull( $this->resume_blocking_reason() );
		self::assertSame( array(), $GLOBALS['npcink_ad_test_get_terms_queries'] );
	}

	/**
	 * Stored invalid paragraph placement returns its stable configuration reason.
	 */
	public function test_resume_preflight_returns_stable_reason_for_an_invalid_paragraph(): void {
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::LOCATION_META ]         = 'content_after_paragraph';
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::PARAGRAPH_NUMBER_META ] = 0;

		self::assertSame( 'promotion_paragraph_invalid', $this->resume_blocking_reason() );
	}

	/**
	 * The invalid-paragraph notice tells an operator how to correct the value.
	 */
	public function test_invalid_paragraph_notice_contains_actionable_guidance(): void {
		$message = $this->notice_message( 'promotion_paragraph_invalid' );

		self::assertNotNull( $message );
		self::assertSame( 'error', $message['type'] );
		self::assertStringContainsString( 'Choose a paragraph number from 1 to 20.', $message['text'] );
	}

	/**
	 * Invalid terms have an actionable resume notice.
	 */
	public function test_invalid_terms_notice_contains_actionable_guidance(): void {
		$message = $this->notice_message( 'promotion_terms_invalid' );

		self::assertNotNull( $message );
		self::assertSame( 'error', $message['type'] );
		self::assertStringContainsString( 'unavailable or could not be validated', $message['text'] );
	}

	/**
	 * A source-less video resume failure tells the operator what is wrong.
	 */
	public function test_source_less_video_notice_contains_actionable_guidance(): void {
		$message = $this->notice_message( 'promotion_video_source_missing' );

		self::assertNotNull( $message );
		self::assertSame( 'error', $message['type'] );
		self::assertStringContainsString( 'no usable source', $message['text'] );
	}

	/**
	 * Resume queries include IDs once and intersects exclusions with that result.
	 */
	public function test_resume_does_not_query_exclusion_only_ids(): void {
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::EXCLUDE_IDS_META ] = array( 11, 999 );

		self::assertNull( $this->resume_blocking_reason() );
		self::assertCount( 1, $GLOBALS['npcink_ad_test_get_posts_queries'] );
		self::assertSame( array( 10 ), $GLOBALS['npcink_ad_test_get_posts_queries'][0]['post__in'] );
	}

	/**
	 * Nonces bind both the requested operation and Promotion ID.
	 */
	public function test_nonce_action_is_bound_to_operation_and_id(): void {
		$pause = Promotion_Status_Action::nonce_action( 'pause', 1 );

		self::assertNotSame( $pause, Promotion_Status_Action::nonce_action( 'resume', 1 ) );
		self::assertNotSame( $pause, Promotion_Status_Action::nonce_action( 'pause', 2 ) );
	}

	/**
	 * An already published resume resolves idempotently before configuration preflight.
	 */
	public function test_published_resume_is_an_idempotent_transition(): void {
		self::assertSame(
			array(
				'target_status' => 'publish',
				'notice'        => 'already_resumed',
			),
			$this->transition_decision( 'publish', 'resume' )
		);
	}

	/**
	 * Only draft-to-publish proceeds to resume preflight and mutation.
	 */
	public function test_draft_resume_requires_a_real_transition(): void {
		self::assertSame(
			array(
				'target_status' => 'publish',
				'notice'        => null,
			),
			$this->transition_decision( 'draft', 'resume' )
		);
	}

	/**
	 * A WordPress-scheduled Promotion can be paused before it starts.
	 */
	public function test_future_pause_requires_a_real_transition(): void {
		self::assertSame(
			array(
				'target_status' => 'draft',
				'notice'        => null,
			),
			$this->transition_decision( 'future', 'pause' )
		);
	}

	/**
	 * Pause never overwrites unrelated native post statuses.
	 */
	public function test_pause_does_not_overwrite_other_post_statuses(): void {
		foreach ( array( 'private', 'pending', 'trash' ) as $status ) {
			self::assertSame( 'unsupported_status', $this->transition_decision( $status, 'pause' )['notice'] );
		}
	}

	/**
	 * Unsupported statuses remain protected from overwrite.
	 */
	public function test_resume_does_not_overwrite_other_post_statuses(): void {
		foreach ( array( 'future', 'private', 'pending', 'trash' ) as $status ) {
			self::assertSame( 'unsupported_status', $this->transition_decision( $status, 'resume' )['notice'] );
		}
	}

	/**
	 * A retained future WordPress publication date is reset during resume.
	 */
	public function test_resume_resets_a_retained_future_publication_date(): void {
		self::assertSame(
			array(
				'ID'            => 1,
				'post_status'   => 'publish',
				'post_date'     => '2027-01-15 08:00:00',
				'post_date_gmt' => '2027-01-15 08:00:00',
			),
			$this->resume_update_data( '2027-01-15 08:00:01' )
		);
	}

	/**
	 * Historical and current publication dates remain intact during resume.
	 */
	public function test_resume_preserves_non_future_publication_dates(): void {
		$expected = array(
			'ID'          => 1,
			'post_status' => 'publish',
		);

		self::assertSame( $expected, $this->resume_update_data( '2027-01-15 08:00:00' ) );
		self::assertSame( $expected, $this->resume_update_data( '2020-01-01 00:00:00' ) );
		self::assertSame( $expected, $this->resume_update_data( '0000-00-00 00:00:00' ) );
	}

	/**
	 * A successful update call is insufficient unless the re-read post published.
	 */
	public function test_resume_requires_the_re_read_post_to_be_published(): void {
		$action = new Promotion_Status_Action( new Repository(), new Eligibility_Evaluator() );
		$method = new ReflectionMethod( $action, 'did_reach_status' );
		$draft  = new WP_Post(
			array(
				'ID'          => 1,
				'post_type'   => Post_Types::PROMOTION_POST_TYPE,
				'post_status' => 'draft',
			)
		);
		$published = new WP_Post(
			array(
				'ID'          => 1,
				'post_type'   => Post_Types::PROMOTION_POST_TYPE,
				'post_status' => 'publish',
			)
		);

		self::assertFalse( $method->invoke( $action, $draft, 'publish' ) );
		self::assertTrue( $method->invoke( $action, $published, 'publish' ) );
	}

	/**
	 * Invoke the private preflight seam without bypassing its real collaborators.
	 */
	private function resume_blocking_reason(): ?string {
		$action = new Promotion_Status_Action( new Repository(), new Eligibility_Evaluator() );
		$method = new ReflectionMethod( $action, 'resume_blocking_reason' );

		return $method->invoke( $action, 1 );
	}

	/**
	 * Invoke the private notice seam for one result code.
	 *
	 * @param string $notice Notice code.
	 * @return array{type: string, text: string}|null
	 */
	private function notice_message( string $notice ): ?array {
		$action = new Promotion_Status_Action( new Repository(), new Eligibility_Evaluator() );
		$method = new ReflectionMethod( $action, 'notice_message' );

		return $method->invoke( $action, $notice );
	}

	/**
	 * Invoke the pure transition seam used before resume preflight.
	 *
	 * @param string $status    Current post status.
	 * @param string $operation Pause or resume.
	 * @return array{target_status: string, notice: string|null}
	 */
	private function transition_decision( string $status, string $operation ): array {
		$action = new Promotion_Status_Action( new Repository(), new Eligibility_Evaluator() );
		$method = new ReflectionMethod( $action, 'transition_decision' );

		return $method->invoke( $action, $status, $operation );
	}

	/**
	 * Invoke the pure resume-date update seam.
	 *
	 * @param string $post_date_gmt Retained GMT publication date.
	 * @return array<string, int|string>
	 */
	private function resume_update_data( string $post_date_gmt ): array {
		$action = new Promotion_Status_Action( new Repository(), new Eligibility_Evaluator() );
		$method = new ReflectionMethod( $action, 'resume_update_data' );

		return $method->invoke(
			$action,
			1,
			$post_date_gmt,
			1_800_000_000,
			'2027-01-15 08:00:00',
			'2027-01-15 08:00:00'
		);
	}
}
