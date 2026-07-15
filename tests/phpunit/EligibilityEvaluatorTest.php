<?php
/**
 * Eligibility evaluator contract tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Domain\Eligibility_Evaluator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Covers the pure server-side eligibility policy.
 */
final class EligibilityEvaluatorTest extends TestCase {
	private const NOW     = 1_800_000_000;
	private const POST_ID = 42;

	/**
	 * Create a valid promotion fixture.
	 *
	 * @return array<string, mixed>
	 */
	private function valid_promotion(): array {
		return array(
			'status'      => 'publish',
			'content'     => '<p>Current creative</p>',
			'location'    => 'block',
			'page_scope'  => 'all',
			'include_ids' => array(),
			'exclude_ids' => array(),
			'device'      => 'all',
			'start_at'    => self::NOW - 3600,
			'end_at'      => self::NOW + 3600,
		);
	}

	/**
	 * Create a matching request context.
	 *
	 * @return array<string, mixed>
	 */
	private function matching_context(): array {
		return array(
			'now'              => self::NOW,
			'post_id'          => self::POST_ID,
			'expected_location' => 'block',
			'simulated_device'  => null,
		);
	}

	/**
	 * A published, current promotion is eligible.
	 */
	public function test_allows_a_published_current_promotion(): void {
		$result = ( new Eligibility_Evaluator() )->evaluate(
			$this->valid_promotion(),
			$this->matching_context()
		);

		self::assertSame(
			array(
				'allowed' => true,
				'reasons' => array(),
			),
			$result
		);
	}

	/**
	 * Provide independent status, time, and content failures.
	 *
	 * @return array<string, array{string, mixed, string}>
	 */
	public static function promotion_rule_failures(): array {
		return array(
			'unpublished' => array( 'status', 'draft', 'promotion_not_published' ),
			'not started' => array( 'start_at', self::NOW + 1, 'promotion_not_started' ),
			'expired'     => array( 'end_at', self::NOW, 'promotion_expired' ),
			'empty'       => array( 'content', '   ', 'promotion_content_empty' ),
		);
	}

	/**
	 * Status, time, and content failures have stable reason codes.
	 *
	 * @param string $field  Promotion field to change.
	 * @param mixed  $value  Replacement value.
	 * @param string $reason Expected reason code.
	 */
	#[DataProvider( 'promotion_rule_failures' )]
	public function test_rejects_promotion_rule_failures( string $field, mixed $value, string $reason ): void {
		$promotion           = $this->valid_promotion();
		$promotion[ $field ] = $value;

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $this->matching_context() );

		self::assertFalse( $result['allowed'] );
		self::assertSame( array( $reason ), $result['reasons'] );
	}

	/**
	 * A promotion starts exactly at its start timestamp.
	 */
	public function test_start_time_is_inclusive(): void {
		$promotion             = $this->valid_promotion();
		$promotion['start_at'] = self::NOW;

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $this->matching_context() );

		self::assertTrue( $result['allowed'] );
	}

	/**
	 * Selected scope requires the current page in the include list.
	 */
	public function test_selected_page_scope_requires_an_included_page(): void {
		$promotion                = $this->valid_promotion();
		$promotion['page_scope']  = 'selected';
		$promotion['include_ids'] = array( self::POST_ID + 1 );

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $this->matching_context() );

		self::assertSame( array( 'page_not_included' ), $result['reasons'] );
	}

	/**
	 * Selected scope allows an explicitly included page.
	 */
	public function test_selected_page_scope_allows_an_included_page(): void {
		$promotion                = $this->valid_promotion();
		$promotion['page_scope']  = 'selected';
		$promotion['include_ids'] = array( self::POST_ID );

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $this->matching_context() );

		self::assertTrue( $result['allowed'] );
	}

	/**
	 * Exclusion takes precedence over all-page and selected-page scope.
	 *
	 * @param string $scope Page scope.
	 */
	#[DataProvider( 'page_scopes' )]
	public function test_excluded_page_is_always_rejected( string $scope ): void {
		$promotion                = $this->valid_promotion();
		$promotion['page_scope']  = $scope;
		$promotion['include_ids'] = array( self::POST_ID );
		$promotion['exclude_ids'] = array( self::POST_ID );

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $this->matching_context() );

		self::assertSame( array( 'page_excluded' ), $result['reasons'] );
	}

	/**
	 * Provide supported page scopes.
	 *
	 * @return array<string, array{string}>
	 */
	public static function page_scopes(): array {
		return array(
			'all'      => array( 'all' ),
			'selected' => array( 'selected' ),
		);
	}

	/**
	 * Delivery locations must match.
	 */
	public function test_rejects_a_location_mismatch(): void {
		$context                      = $this->matching_context();
		$context['expected_location'] = 'content_after';

		$result = ( new Eligibility_Evaluator() )->evaluate( $this->valid_promotion(), $context );

		self::assertSame( array( 'location_mismatch' ), $result['reasons'] );
	}

	/**
	 * Preview device simulation rejects a mismatched targeted device.
	 */
	public function test_preview_rejects_a_device_mismatch(): void {
		$promotion                      = $this->valid_promotion();
		$promotion['device']            = 'mobile';
		$context                        = $this->matching_context();
		$context['simulated_device']    = 'desktop';

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $context );

		self::assertSame( array( 'device_mismatch' ), $result['reasons'] );
	}

	/**
	 * Matching preview simulation allows the targeted device.
	 */
	public function test_preview_allows_a_matching_device(): void {
		$promotion                   = $this->valid_promotion();
		$promotion['device']         = 'mobile';
		$context                     = $this->matching_context();
		$context['simulated_device'] = 'mobile';

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $context );

		self::assertTrue( $result['allowed'] );
	}

	/**
	 * Normal delivery never server-splits HTML by device.
	 */
	public function test_normal_delivery_ignores_device_targeting(): void {
		$promotion           = $this->valid_promotion();
		$promotion['device'] = 'mobile';

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $this->matching_context() );

		self::assertTrue( $result['allowed'] );
		self::assertSame( array(), $result['reasons'] );
	}
}
