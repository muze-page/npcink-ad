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
				Post_Types::PAGE_SCOPE_META  => 'selected',
				Post_Types::INCLUDE_IDS_META => array( 10 ),
				Post_Types::EXCLUDE_IDS_META => array(),
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
	 * Stored invalid calendar dates block resume through the shared evaluator.
	 */
	public function test_resume_preflight_rejects_an_invalid_stored_calendar_date(): void {
		$GLOBALS['npcink_ad_test_meta'][1][ Post_Types::START_AT_META ] = '2027-02-30 08:00:00';

		self::assertSame( 'promotion_schedule_invalid', $this->resume_blocking_reason() );
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
