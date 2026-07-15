<?php
/**
 * Eligibility evaluator contract tests.
 *
 * @package MagickAD
 */

use MagickAD\Domain\Eligibility_Evaluator;
use PHPUnit\Framework\TestCase;

/**
 * Covers the pure server-side eligibility policy.
 */
final class EligibilityEvaluatorTest extends TestCase {
	private const NOW = 1_800_000_000;

	/**
	 * Create a valid placement fixture.
	 *
	 * @return array{status: string, device: string}
	 */
	private function valid_placement(): array {
		return array(
			'status' => 'publish',
			'device' => 'all',
		);
	}

	/**
	 * Create a valid ad fixture.
	 *
	 * @return array{status: string, end_at: int, content: string}
	 */
	private function valid_ad(): array {
		return array(
			'status' => 'publish',
			'end_at' => self::NOW + 3600,
			'content' => '<p>Current creative</p>',
		);
	}

	/**
	 * Create a desktop request context.
	 *
	 * @return array{now: int, is_mobile: bool}
	 */
	private function desktop_context(): array {
		return array(
			'now'       => self::NOW,
			'is_mobile' => false,
		);
	}

	/**
	 * A published, current ad is eligible.
	 */
	public function test_allows_a_published_current_ad_for_matching_device(): void {
		$result = ( new Eligibility_Evaluator() )->evaluate(
			$this->valid_placement(),
			$this->valid_ad(),
			$this->desktop_context()
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
	 * Draft placements are ineligible.
	 */
	public function test_rejects_an_unpublished_placement(): void {
		$placement           = $this->valid_placement();
		$placement['status'] = 'draft';

		$result = ( new Eligibility_Evaluator() )->evaluate(
			$placement,
			$this->valid_ad(),
			$this->desktop_context()
		);

		self::assertFalse( $result['allowed'] );
		self::assertContains( 'placement_not_published', $result['reasons'] );
	}

	/**
	 * A placement cannot render without its referenced ad.
	 */
	public function test_rejects_a_missing_ad(): void {
		$result = ( new Eligibility_Evaluator() )->evaluate(
			$this->valid_placement(),
			null,
			$this->desktop_context()
		);

		self::assertFalse( $result['allowed'] );
		self::assertContains( 'ad_missing', $result['reasons'] );
	}

	/**
	 * Draft ads are ineligible.
	 */
	public function test_rejects_an_unpublished_ad(): void {
		$ad           = $this->valid_ad();
		$ad['status'] = 'draft';

		$result = ( new Eligibility_Evaluator() )->evaluate(
			$this->valid_placement(),
			$ad,
			$this->desktop_context()
		);

		self::assertFalse( $result['allowed'] );
		self::assertContains( 'ad_not_published', $result['reasons'] );
	}

	/**
	 * Ads stop being eligible at their expiry timestamp.
	 */
	public function test_rejects_an_expired_ad(): void {
		$ad           = $this->valid_ad();
		$ad['end_at'] = self::NOW;

		$result = ( new Eligibility_Evaluator() )->evaluate(
			$this->valid_placement(),
			$ad,
			$this->desktop_context()
		);

		self::assertFalse( $result['allowed'] );
		self::assertContains( 'ad_expired', $result['reasons'] );
	}

	/**
	 * Empty creative content is not renderable.
	 */
	public function test_rejects_an_ad_with_empty_content(): void {
		$ad            = $this->valid_ad();
		$ad['content'] = '   ';

		$result = ( new Eligibility_Evaluator() )->evaluate(
			$this->valid_placement(),
			$ad,
			$this->desktop_context()
		);

		self::assertFalse( $result['allowed'] );
		self::assertContains( 'ad_content_empty', $result['reasons'] );
	}

	/**
	 * Device-specific placements must match request context.
	 */
	public function test_rejects_a_device_mismatch(): void {
		$placement           = $this->valid_placement();
		$placement['device'] = 'mobile';

		$result = ( new Eligibility_Evaluator() )->evaluate(
			$placement,
			$this->valid_ad(),
			$this->desktop_context()
		);

		self::assertFalse( $result['allowed'] );
		self::assertContains( 'device_mismatch', $result['reasons'] );
	}
}
