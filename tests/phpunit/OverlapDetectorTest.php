<?php
/**
 * Advisory Promotion overlap policy tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Domain\Overlap_Detector;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Covers pure location, content-scope, schedule, and device overlap semantics.
 */
final class OverlapDetectorTest extends TestCase {
	/**
	 * Non-overlap gates must be independent and deterministic.
	 *
	 * @param array<string, mixed> $promotion_changes Candidate changes.
	 * @param array<string, mixed> $other_changes     Published-rule changes.
	 */
	#[DataProvider( 'non_overlap_gates' )]
	public function test_rejects_rules_that_cannot_share_a_delivery_context( array $promotion_changes, array $other_changes ): void {
		$promotion = array_replace( $this->promotion(), $promotion_changes );
		$other     = array_replace( $this->promotion( 2 ), $other_changes );

		self::assertFalse( ( new Overlap_Detector() )->may_overlap( $promotion, $other ) );
	}

	/**
	 * Provide independent overlap gates.
	 *
	 * @return array<string, array{array<string, mixed>, array<string, mixed>}>
	 */
	public static function non_overlap_gates(): array {
		return array(
			'same record'                => array( array(), array( 'id' => 1 ) ),
			'other record is not live'   => array( array(), array( 'status' => 'draft' ) ),
			'manual block location'      => array( array( 'location' => 'block' ), array( 'location' => 'block' ) ),
			'different automatic place'  => array( array(), array( 'location' => 'content_before' ) ),
			'desktop and mobile devices' => array( array( 'device' => 'desktop' ), array( 'device' => 'mobile' ) ),
			'touching schedule boundary' => array(
				array(
					'start_at' => 100,
					'end_at' => 200,
				),
				array(
					'start_at' => 200,
					'end_at' => 300,
				),
			),
			'invalid candidate schedule' => array(
				array(
					'start_at' => 300,
					'end_at' => 200,
				),
				array(),
			),
			'invalid stored timestamp'   => array( array(), array( 'start_at_valid' => false ) ),
		);
	}

	/**
	 * Open and intersecting half-open windows may overlap.
	 *
	 * @param array<string, int> $promotion_window Candidate window.
	 * @param array<string, int> $other_window     Published window.
	 */
	#[DataProvider( 'overlapping_schedule_windows' )]
	public function test_accepts_intersecting_schedule_windows( array $promotion_window, array $other_window ): void {
		$promotion = array_replace( $this->promotion(), $promotion_window );
		$other     = array_replace( $this->promotion( 2 ), $other_window );

		self::assertTrue( ( new Overlap_Detector() )->may_overlap( $promotion, $other ) );
	}

	/**
	 * Provide intersecting schedule windows.
	 *
	 * @return array<string, array{array<string, int>, array<string, int>}>
	 */
	public static function overlapping_schedule_windows(): array {
		return array(
			'both open'          => array( array(), array() ),
			'candidate open end' => array(
				array( 'start_at' => 200 ),
				array(
					'start_at' => 100,
					'end_at' => 300,
				),
			),
			'other open start'   => array(
				array(
					'start_at' => 100,
					'end_at' => 300,
				),
				array( 'end_at' => 200 ),
			),
			'one-second overlap' => array(
				array(
					'start_at' => 100,
					'end_at' => 201,
				),
				array(
					'start_at' => 200,
					'end_at' => 300,
				),
			),
		);
	}

	/**
	 * Content overlap keeps selected IDs exact and broad scopes conservative.
	 *
	 * @param array<string, mixed> $promotion_changes Candidate scope changes.
	 * @param array<string, mixed> $other_changes     Published scope changes.
	 * @param bool                 $expected          Expected overlap result.
	 */
	#[DataProvider( 'content_scope_cases' )]
	public function test_compares_effective_content_scopes( array $promotion_changes, array $other_changes, bool $expected ): void {
		$promotion = array_replace( $this->promotion(), $promotion_changes );
		$other     = array_replace( $this->promotion( 2 ), $other_changes );

		self::assertSame( $expected, ( new Overlap_Detector() )->may_overlap( $promotion, $other ) );
	}

	/**
	 * Provide canonical scope combinations.
	 *
	 * @return array<string, array{array<string, mixed>, array<string, mixed>, bool}>
	 */
	public static function content_scope_cases(): array {
		return array(
			'all and all remain possible'           => array(
				array( 'exclude_ids' => array( 10 ) ),
				array( 'exclude_ids' => array( 11 ) ),
				true,
			),
			'posts and pages are disjoint'          => array(
				array( 'content_scope' => 'posts' ),
				array( 'content_scope' => 'pages' ),
				false,
			),
			'pages and terms are disjoint'          => array(
				array( 'content_scope' => 'pages' ),
				array(
					'content_scope' => 'terms',
					'category_ids'  => array( 5 ),
				),
				false,
			),
			'posts and terms remain possible'       => array(
				array( 'content_scope' => 'posts' ),
				array(
					'content_scope' => 'terms',
					'tag_ids'       => array( 8 ),
				),
				true,
			),
			'different term sets remain possible'   => array(
				array(
					'content_scope' => 'terms',
					'category_ids'  => array( 5 ),
				),
				array(
					'content_scope' => 'terms',
					'tag_ids'       => array( 8 ),
				),
				true,
			),
			'all accepts selected content'          => array(
				array(),
				array(
					'content_scope' => 'selected',
					'include_ids'   => array( 10 ),
				),
				true,
			),
			'broad scope excludes selected content' => array(
				array( 'exclude_ids' => array( 10 ) ),
				array(
					'content_scope' => 'selected',
					'include_ids'   => array( 10 ),
				),
				false,
			),
			'selected and pages stay conservative'  => array(
				array(
					'content_scope' => 'selected',
					'include_ids'   => array( 10 ),
				),
				array( 'content_scope' => 'pages' ),
				true,
			),
			'selected and terms stay conservative'  => array(
				array(
					'content_scope' => 'selected',
					'include_ids'   => array( 10 ),
				),
				array(
					'content_scope' => 'terms',
					'category_ids'  => array( 5 ),
				),
				true,
			),
			'selected scopes intersect'             => array(
				array(
					'content_scope' => 'selected',
					'include_ids'   => array( 10, 11 ),
				),
				array(
					'content_scope' => 'selected',
					'include_ids'   => array( 11, 12 ),
				),
				true,
			),
			'own exclusion removes match'           => array(
				array(
					'content_scope' => 'selected',
					'include_ids'   => array( 10, 11 ),
					'exclude_ids'   => array( 11 ),
				),
				array(
					'content_scope' => 'selected',
					'include_ids'   => array( 11, 12 ),
				),
				false,
			),
			'selected scopes are disjoint'          => array(
				array(
					'content_scope' => 'selected',
					'include_ids'   => array( 10 ),
				),
				array(
					'content_scope' => 'selected',
					'include_ids'   => array( 11 ),
				),
				false,
			),
			'empty selected scope has no target'     => array(
				array(
					'content_scope' => 'selected',
					'include_ids'   => array(),
				),
				array(),
				false,
			),
			'empty term scope has no target'         => array(
				array(
					'content_scope' => 'terms',
					'category_ids'  => array(),
					'tag_ids'       => array(),
				),
				array(),
				false,
			),
			'invalid term scope has no target'       => array(
				array(
					'content_scope' => 'terms',
					'category_ids'  => array( 5 ),
					'terms_valid'   => false,
				),
				array(),
				false,
			),
		);
	}

	/**
	 * Active term rules require current validity evidence from the repository.
	 */
	public function test_term_scope_without_validity_evidence_has_no_overlap_target(): void {
		$promotion                  = $this->promotion();
		$promotion['content_scope'] = 'terms';
		$promotion['category_ids']  = array( 5 );
		unset( $promotion['terms_valid'] );

		self::assertFalse(
			( new Overlap_Detector() )->may_overlap( $promotion, $this->promotion( 2 ) )
		);
	}

	/**
	 * All-device and same-device rules may overlap.
	 */
	public function test_all_or_same_device_can_overlap(): void {
		$detector = new Overlap_Detector();

		self::assertTrue(
			$detector->may_overlap(
				array_replace( $this->promotion(), array( 'device' => 'all' ) ),
				array_replace( $this->promotion( 2 ), array( 'device' => 'mobile' ) )
			)
		);
		self::assertTrue(
			$detector->may_overlap(
				array_replace( $this->promotion(), array( 'device' => 'desktop' ) ),
				array_replace( $this->promotion( 2 ), array( 'device' => 'desktop' ) )
			)
		);
	}

	/**
	 * Paragraph placements overlap only when their validated anchors are equal.
	 */
	public function test_paragraph_placement_compares_the_configured_anchor(): void {
		$detector  = new Overlap_Detector();
		$candidate = array_replace(
			$this->promotion(),
			array(
				'location'         => 'content_after_paragraph',
				'paragraph_number' => 3,
			)
		);
		$same      = array_replace(
			$this->promotion( 2 ),
			array(
				'location'         => 'content_after_paragraph',
				'paragraph_number' => 3,
			)
		);

		self::assertTrue( $detector->may_overlap( $candidate, $same ) );
		self::assertFalse(
			$detector->may_overlap(
				$candidate,
				array_replace( $same, array( 'paragraph_number' => 4 ) )
			)
		);
		self::assertFalse(
			$detector->may_overlap(
				$candidate,
				array_replace( $same, array( 'paragraph_number_valid' => false ) )
			)
		);
	}

	/**
	 * Batch lookup returns unique published Promotion IDs only.
	 */
	public function test_finds_unique_overlapping_published_ids(): void {
		$overlap = $this->promotion( 2 );

		self::assertSame(
			array( 2 ),
			( new Overlap_Detector() )->find_overlapping_ids(
				$this->promotion(),
				array(
					$overlap,
					$overlap,
					array_replace( $this->promotion( 3 ), array( 'device' => 'mobile' ) ),
				)
			)
		);
	}

	/**
	 * Page bars use the existing same-location overlap advisory.
	 */
	public function test_page_bars_overlap_only_at_the_same_bar_location(): void {
		$detector  = new Overlap_Detector();
		$top       = array_replace( $this->promotion(), array( 'location' => 'bar_top' ) );
		$other_top = array_replace( $this->promotion( 2 ), array( 'location' => 'bar_top' ) );
		$bottom    = array_replace( $this->promotion( 3 ), array( 'location' => 'bar_bottom' ) );

		self::assertTrue( $detector->may_overlap( $top, $other_top ) );
		self::assertFalse( $detector->may_overlap( $top, $bottom ) );
	}

	/**
	 * Build one valid automatic Promotion rule.
	 *
	 * @param int $id Promotion ID.
	 * @return array<string, mixed>
	 */
	private function promotion( int $id = 1 ): array {
		return array(
			'id'             => $id,
			'status'         => 'publish',
			'location'       => 'content_after',
			'paragraph_number' => 3,
			'paragraph_number_valid' => true,
			'content_scope'  => 'all',
			'include_ids'    => array(),
			'exclude_ids'    => array(),
			'category_ids'   => array(),
			'tag_ids'        => array(),
			'terms_valid'    => true,
			'device'         => 'desktop',
			'start_at'       => 0,
			'start_at_valid' => true,
			'end_at'         => 0,
			'end_at_valid'   => true,
		);
	}
}
