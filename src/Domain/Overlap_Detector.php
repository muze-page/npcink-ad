<?php
/**
 * Detects advisory overlap between automatic Promotion rules.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Domain;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Pure overlap policy with no WordPress API calls.
 */
final class Overlap_Detector {
	private const AUTOMATIC_LOCATIONS = array( 'content_before', 'content_after' );

	/**
	 * Find published Promotions that may share one delivery context.
	 *
	 * This is an advisory only. It does not participate in eligibility, ordering,
	 * or publication decisions.
	 *
	 * @param array<string, mixed>             $promotion Candidate Promotion.
	 * @param array<int, array<string, mixed>> $published Published automatic Promotions.
	 * @return list<int>
	 */
	public function find_overlapping_ids( array $promotion, array $published ): array {
		$overlapping_ids = array();
		foreach ( $published as $other ) {
			if ( ! $this->may_overlap( $promotion, $other ) ) {
				continue;
			}

			$other_id = isset( $other['id'] ) ? (int) $other['id'] : 0;
			if ( 0 < $other_id ) {
				$overlapping_ids[ $other_id ] = $other_id;
			}
		}

		return array_values( $overlapping_ids );
	}

	/**
	 * Determine whether a published Promotion may overlap the candidate.
	 *
	 * Schedule windows use the same half-open [start, end) boundary as delivery.
	 * Page rules are intentionally conservative: two all-page rules may overlap,
	 * while selected-page rules must retain at least one common effective ID.
	 *
	 * @param array<string, mixed> $promotion Candidate Promotion.
	 * @param array<string, mixed> $other     Published Promotion to compare.
	 */
	public function may_overlap( array $promotion, array $other ): bool {
		$promotion_id = isset( $promotion['id'] ) ? (int) $promotion['id'] : 0;
		$other_id     = isset( $other['id'] ) ? (int) $other['id'] : 0;
		if ( 0 < $promotion_id && $promotion_id === $other_id ) {
			return false;
		}

		if ( 'publish' !== ( $other['status'] ?? '' ) ) {
			return false;
		}

		$location       = isset( $promotion['location'] ) ? (string) $promotion['location'] : 'content_after';
		$other_location = isset( $other['location'] ) ? (string) $other['location'] : 'content_after';
		if (
			$location !== $other_location
			|| ! in_array( $location, self::AUTOMATIC_LOCATIONS, true )
		) {
			return false;
		}

		return $this->devices_overlap( $promotion, $other )
			&& $this->schedules_overlap( $promotion, $other )
			&& $this->page_scopes_overlap( $promotion, $other );
	}

	/**
	 * Determine whether device rules can address the same viewport.
	 *
	 * @param array<string, mixed> $promotion Candidate Promotion.
	 * @param array<string, mixed> $other     Published Promotion.
	 */
	private function devices_overlap( array $promotion, array $other ): bool {
		$device       = isset( $promotion['device'] ) ? (string) $promotion['device'] : 'all';
		$other_device = isset( $other['device'] ) ? (string) $other['device'] : 'all';

		return 'all' === $device || 'all' === $other_device || $device === $other_device;
	}

	/**
	 * Compare two half-open schedule windows with optional open boundaries.
	 *
	 * @param array<string, mixed> $promotion Candidate Promotion.
	 * @param array<string, mixed> $other     Published Promotion.
	 */
	private function schedules_overlap( array $promotion, array $other ): bool {
		if ( ! $this->schedule_is_valid( $promotion ) || ! $this->schedule_is_valid( $other ) ) {
			return false;
		}

		$start_at       = isset( $promotion['start_at'] ) ? (int) $promotion['start_at'] : 0;
		$end_at         = isset( $promotion['end_at'] ) ? (int) $promotion['end_at'] : 0;
		$other_start_at = isset( $other['start_at'] ) ? (int) $other['start_at'] : 0;
		$other_end_at   = isset( $other['end_at'] ) ? (int) $other['end_at'] : 0;

		return ! (
			( 0 < $end_at && $end_at <= $other_start_at )
			|| ( 0 < $other_end_at && $other_end_at <= $start_at )
		);
	}

	/**
	 * Reject malformed schedules instead of treating them as unbounded.
	 *
	 * @param array<string, mixed> $promotion Promotion rule.
	 */
	private function schedule_is_valid( array $promotion ): bool {
		$start_at_valid = ! array_key_exists( 'start_at_valid', $promotion ) || (bool) $promotion['start_at_valid'];
		$end_at_valid   = ! array_key_exists( 'end_at_valid', $promotion ) || (bool) $promotion['end_at_valid'];
		$start_at       = isset( $promotion['start_at'] ) ? (int) $promotion['start_at'] : 0;
		$end_at         = isset( $promotion['end_at'] ) ? (int) $promotion['end_at'] : 0;

		return $start_at_valid
			&& $end_at_valid
			&& ! ( 0 < $start_at && 0 < $end_at && $end_at <= $start_at );
	}

	/**
	 * Compare effective page sets after applying exclusions.
	 *
	 * @param array<string, mixed> $promotion Candidate Promotion.
	 * @param array<string, mixed> $other     Published Promotion.
	 */
	private function page_scopes_overlap( array $promotion, array $other ): bool {
		$page_scope       = isset( $promotion['page_scope'] ) ? (string) $promotion['page_scope'] : 'all';
		$other_page_scope = isset( $other['page_scope'] ) ? (string) $other['page_scope'] : 'all';
		if ( 'all' === $page_scope && 'all' === $other_page_scope ) {
			return true;
		}

		if ( 'selected' === $page_scope && 'selected' === $other_page_scope ) {
			return array() !== array_intersect(
				$this->effective_selected_ids( $promotion ),
				$this->effective_selected_ids( $other )
			);
		}

		$selected = 'selected' === $page_scope ? $promotion : $other;
		$all      = 'all' === $page_scope ? $promotion : $other;

		return array() !== array_diff(
			$this->effective_selected_ids( $selected ),
			$this->normalize_post_ids( $all['exclude_ids'] ?? array() )
		);
	}

	/**
	 * Get selected IDs that remain after the rule's own exclusions.
	 *
	 * @param array<string, mixed> $promotion Promotion rule.
	 * @return list<int>
	 */
	private function effective_selected_ids( array $promotion ): array {
		return array_values(
			array_diff(
				$this->normalize_post_ids( $promotion['include_ids'] ?? array() ),
				$this->normalize_post_ids( $promotion['exclude_ids'] ?? array() )
			)
		);
	}

	/**
	 * Normalize post IDs without depending on the WordPress storage layer.
	 *
	 * @param mixed $value Raw post ID list.
	 * @return list<int>
	 */
	private function normalize_post_ids( mixed $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$ids = array();
		foreach ( $value as $raw_id ) {
			$id = (int) $raw_id;
			if ( 0 < $id ) {
				$ids[ $id ] = $id;
			}
		}

		return array_values( $ids );
	}
}
