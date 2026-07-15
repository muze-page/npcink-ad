<?php
/**
 * Promotion REST preflight contract tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use Npcink\Ad\REST\Promotion_Preflight;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once __DIR__ . '/PromotionStatusWordPressPost.php';
require_once __DIR__ . '/PromotionPreflightWordPressClasses.php';
require_once __DIR__ . '/PromotionPreflightWordPressRequest.php';
require_once __DIR__ . '/EditorialScopeWordPressStubs.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Post_Types.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Repository.php';
require_once dirname( __DIR__, 2 ) . '/src/REST/Promotion_Preflight.php';

/**
 * Covers REST candidate metadata before Core persists it.
 */
final class PromotionPreflightTest extends TestCase {
	/**
	 * Reset repository fixtures used by complete candidate validation.
	 */
	protected function setUp(): void {
		$GLOBALS['npcink_ad_test_posts']             = array();
		$GLOBALS['npcink_ad_test_meta']              = array();
		$GLOBALS['npcink_ad_test_get_posts_queries'] = array();
		$GLOBALS['npcink_ad_test_get_terms_queries'] = array();
		$GLOBALS['npcink_ad_test_get_terms_errors']  = array();
		$GLOBALS['npcink_ad_test_term_taxonomies']   = array();
	}

	/**
	 * Invalid non-empty request dates reach the evaluator as invalid schedules.
	 */
	public function test_invalid_request_calendar_date_is_not_an_open_boundary(): void {
		$repository = new Repository();
		$evaluator  = new Eligibility_Evaluator();
		$preflight  = new Promotion_Preflight( $repository, $evaluator );
		$promotion  = array(
			'content'        => '<p>Creative</p>',
			'content_scope'  => 'all',
			'include_ids'    => array(),
			'exclude_ids'    => array(),
			'category_ids'   => array(),
			'tag_ids'        => array(),
			'terms_valid'    => true,
			'start_at'       => 0,
			'start_at_valid' => true,
			'end_at'         => 0,
			'end_at_valid'   => true,
		);
		$method     = new ReflectionMethod( $preflight, 'apply_meta' );
		$arguments  = array(
			&$promotion,
			array(
				Post_Types::START_AT_META => '2027-02-30 08:00:00',
				Post_Types::END_AT_META   => '',
			),
		);

		$method->invokeArgs( $preflight, $arguments );
		$result = $evaluator->validate_configuration( $promotion );

		self::assertSame( 0, $promotion['start_at'] );
		self::assertFalse( $promotion['start_at_valid'] );
		self::assertTrue( $promotion['end_at_valid'] );
		self::assertSame( array( 'promotion_schedule_invalid' ), $result['reasons'] );
	}

	/**
	 * Integer range errors remain saveable while the Promotion is a draft.
	 */
	public function test_draft_can_retain_an_invalid_integer_paragraph_number(): void {
		$prepared = $this->prepared_post( 'draft' );
		$request  = $this->request_with_meta(
			array(
				Post_Types::LOCATION_META         => 'content_after_paragraph',
				Post_Types::PARAGRAPH_NUMBER_META => 0,
			)
		);

		self::assertSame( $prepared, $this->preflight()->validate_before_save( $prepared, $request ) );
	}

	/**
	 * Provide publish states and invalid raw integer anchors.
	 *
	 * @return array<string, array{string, int}>
	 */
	public static function invalid_publish_paragraphs(): array {
		return array(
			'publish zero'      => array( 'publish', 0 ),
			'future above max'  => array( 'future', 21 ),
			'publish negative'  => array( 'publish', -1 ),
		);
	}

	/**
	 * Publish and future candidates retain raw evidence until evaluator preflight.
	 *
	 * @param string $status           Native target status.
	 * @param int    $paragraph_number Invalid raw integer.
	 */
	#[DataProvider( 'invalid_publish_paragraphs' )]
	public function test_publish_and_future_reject_invalid_paragraph_numbers( string $status, int $paragraph_number ): void {
		$result = $this->preflight()->validate_before_save(
			$this->prepared_post( $status ),
			$this->request_with_meta(
				array(
					Post_Types::LOCATION_META         => 'content_after_paragraph',
					Post_Types::PARAGRAPH_NUMBER_META => $paragraph_number,
				)
			)
		);

		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( 'npcink_ad_promotion_not_ready', $result->get_error_code() );
		self::assertSame( array( 'promotion_paragraph_invalid' ), $result->get_error_data()['reasons'] );
	}

	/**
	 * A missing paragraph meta value uses the registered default.
	 */
	public function test_publish_without_paragraph_meta_uses_default_three(): void {
		$prepared = $this->prepared_post( 'publish' );
		$request  = $this->request_with_meta(
			array( Post_Types::LOCATION_META => 'content_after_paragraph' )
		);

		self::assertSame( $prepared, $this->preflight()->validate_before_save( $prepared, $request ) );
	}

	/**
	 * Paragraph range endpoints are publishable.
	 *
	 * @param int $paragraph_number Valid paragraph number.
	 */
	#[DataProvider( 'valid_publish_paragraphs' )]
	public function test_publish_accepts_valid_paragraph_range_endpoints( int $paragraph_number ): void {
		$prepared = $this->prepared_post( 'publish' );
		$request  = $this->request_with_meta(
			array(
				Post_Types::LOCATION_META         => 'content_after_paragraph',
				Post_Types::PARAGRAPH_NUMBER_META => $paragraph_number,
			)
		);

		self::assertSame( $prepared, $this->preflight()->validate_before_save( $prepared, $request ) );
	}

	/**
	 * An active automatic term scope must contain at least one selected term.
	 */
	public function test_publish_rejects_empty_active_term_scope(): void {
		$result = $this->preflight()->validate_before_save(
			$this->prepared_post( 'publish' ),
			$this->request_with_meta(
				array(
					Post_Types::LOCATION_META      => 'content_after',
					Post_Types::CONTENT_SCOPE_META => 'terms',
				)
			)
		);

		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( array( 'promotion_targets_empty' ), $result->get_error_data()['reasons'] );
	}

	/**
	 * Existing terms are publishable even when no current post uses them.
	 */
	public function test_publish_accepts_existing_term_without_content_matches(): void {
		$GLOBALS['npcink_ad_test_term_taxonomies']['category'] = array( 7 );
		$prepared = $this->prepared_post( 'publish' );
		$request  = $this->request_with_meta(
			array(
				Post_Types::LOCATION_META      => 'content_after',
				Post_Types::CONTENT_SCOPE_META => 'terms',
				Post_Types::CATEGORY_IDS_META  => array( 7 ),
			)
		);

		self::assertSame( $prepared, $this->preflight()->validate_before_save( $prepared, $request ) );
	}

	/**
	 * Wrong-taxonomy IDs retain evidence and block publication.
	 */
	public function test_publish_rejects_term_id_from_wrong_taxonomy(): void {
		$GLOBALS['npcink_ad_test_term_taxonomies'] = array(
			'category' => array(),
			'post_tag' => array( 7 ),
		);
		$result = $this->preflight()->validate_before_save(
			$this->prepared_post( 'publish' ),
			$this->request_with_meta(
				array(
					Post_Types::LOCATION_META      => 'content_after',
					Post_Types::CONTENT_SCOPE_META => 'terms',
					Post_Types::CATEGORY_IDS_META  => array( 7 ),
				)
			)
		);

		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( array( 'promotion_terms_invalid' ), $result->get_error_data()['reasons'] );
	}

	/**
	 * A failed term-existence query blocks publication.
	 */
	public function test_publish_fails_closed_when_term_validation_query_fails(): void {
		$GLOBALS['npcink_ad_test_term_taxonomies']['category'] = array( 7 );
		$GLOBALS['npcink_ad_test_get_terms_errors']            = array( 'category' );
		$result = $this->preflight()->validate_before_save(
			$this->prepared_post( 'publish' ),
			$this->request_with_meta(
				array(
					Post_Types::LOCATION_META      => 'content_after',
					Post_Types::CONTENT_SCOPE_META => 'terms',
					Post_Types::CATEGORY_IDS_META  => array( 7 ),
				)
			)
		);

		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( array( 'promotion_terms_invalid' ), $result->get_error_data()['reasons'] );
	}

	/**
	 * Metadata overrides are validated as one recomputed candidate.
	 */
	public function test_request_term_override_recomputes_stored_validity(): void {
		$GLOBALS['npcink_ad_test_posts'][1] = new WP_Post(
			array(
				'ID'           => 1,
				'post_type'    => Post_Types::PROMOTION_POST_TYPE,
				'post_status'  => 'draft',
				'post_content' => '<p>Stored creative</p>',
			)
		);
		$GLOBALS['npcink_ad_test_meta'][1]  = array(
			Post_Types::LOCATION_META      => 'content_after',
			Post_Types::CONTENT_SCOPE_META => 'terms',
			Post_Types::CATEGORY_IDS_META  => array( 7 ),
			Post_Types::TAG_IDS_META       => array(),
			Post_Types::START_AT_META      => '',
			Post_Types::END_AT_META        => '',
		);
		$GLOBALS['npcink_ad_test_term_taxonomies']['category'] = array( 7 );
		$prepared     = $this->prepared_post( 'publish' );
		$prepared->ID = 1;

		$result = $this->preflight()->validate_before_save(
			$prepared,
			$this->request_with_meta( array( Post_Types::CATEGORY_IDS_META => array( 8 ) ) )
		);

		self::assertInstanceOf( WP_Error::class, $result );
		self::assertSame( array( 'promotion_terms_invalid' ), $result->get_error_data()['reasons'] );
	}

	/**
	 * Hidden term values never block non-term or manual publication.
	 */
	public function test_hidden_term_values_are_not_validated(): void {
		foreach (
			array(
				array( 'content_after', 'posts' ),
				array( 'block', 'terms' ),
			) as [ $location, $scope ]
		) {
			$prepared = $this->prepared_post( 'publish' );
			$request  = $this->request_with_meta(
				array(
					Post_Types::LOCATION_META      => $location,
					Post_Types::CONTENT_SCOPE_META => $scope,
					Post_Types::CATEGORY_IDS_META  => array( 999 ),
				)
			);
			self::assertSame( $prepared, $this->preflight()->validate_before_save( $prepared, $request ) );
		}

		self::assertSame( array(), $GLOBALS['npcink_ad_test_get_terms_queries'] );
	}

	/**
	 * Provide valid paragraph range endpoints.
	 *
	 * @return array<string, array{int}>
	 */
	public static function valid_publish_paragraphs(): array {
		return array(
			'minimum' => array( 1 ),
			'maximum' => array( 20 ),
		);
	}

	/**
	 * Compose the real preflight policy.
	 */
	private function preflight(): Promotion_Preflight {
		return new Promotion_Preflight( new Repository(), new Eligibility_Evaluator() );
	}

	/**
	 * Build one prepared Core REST post candidate.
	 *
	 * @param string $status Native target status.
	 */
	private function prepared_post( string $status ): stdClass {
		$prepared               = new stdClass();
		$prepared->post_status  = $status;
		$prepared->post_content = '<p>Creative</p>';

		return $prepared;
	}

	/**
	 * Build one Core REST request carrying typed metadata.
	 *
	 * @param array<string, mixed> $meta Candidate metadata.
	 */
	private function request_with_meta( array $meta ): WP_REST_Request {
		return new WP_REST_Request(
			'/wp/v2/' . Post_Types::PROMOTION_POST_TYPE,
			array( 'meta' => $meta )
		);
	}
}
