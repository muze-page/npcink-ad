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
	private const AUTOMATIC_LOCATIONS = array( 'content_before', 'content_after', 'content_after_paragraph' );

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
	 * Content rules are intentionally conservative. Only post/page type pairs and
	 * exact selected-ID sets can prove disjointness without querying the current
	 * content universe. Term scopes therefore remain possible overlaps even when
	 * their configured term IDs differ.
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

		return $this->automatic_anchors_overlap( $location, $promotion, $other )
			&& $this->devices_overlap( $promotion, $other )
			&& $this->schedules_overlap( $promotion, $other )
			&& $this->content_scopes_overlap( $promotion, $other );
	}

	/**
	 * Keep paragraph placements on the same configured paragraph anchor.
	 *
	 * @param string               $location  Shared automatic location.
	 * @param array<string, mixed> $promotion Candidate Promotion.
	 * @param array<string, mixed> $other     Published Promotion.
	 */
	private function automatic_anchors_overlap( string $location, array $promotion, array $other ): bool {
		if ( 'content_after_paragraph' !== $location ) {
			return true;
		}

		$paragraph_number       = isset( $promotion['paragraph_number'] ) ? (int) $promotion['paragraph_number'] : 3;
		$other_paragraph_number = isset( $other['paragraph_number'] ) ? (int) $other['paragraph_number'] : 3;
		$paragraph_valid        = ! array_key_exists( 'paragraph_number_valid', $promotion ) || (bool) $promotion['paragraph_number_valid'];
		$other_paragraph_valid  = ! array_key_exists( 'paragraph_number_valid', $other ) || (bool) $other['paragraph_number_valid'];

		return $paragraph_valid
			&& $other_paragraph_valid
			&& 1 <= $paragraph_number
			&& 20 >= $paragraph_number
			&& $paragraph_number === $other_paragraph_number;
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
	 * Compare bounded content scopes after applying explicit ID exclusions.
	 *
	 * Selected/selected remains an exact ID comparison. A selected rule paired
	 * with a broad rule remains conservative because this pure policy does not
	 * know the selected object's post type or term relationships. Broad scopes
	 * only prove disjointness for posts/pages and pages/terms.
	 *
	 * @param array<string, mixed> $promotion Candidate Promotion.
	 * @param array<string, mixed> $other     Published Promotion.
	 */
	private function content_scopes_overlap( array $promotion, array $other ): bool {
		$scope       = $this->content_scope( $promotion );
		$other_scope = $this->content_scope( $other );

		if ( ! $this->scope_has_possible_targets( $promotion, $scope )
			|| ! $this->scope_has_possible_targets( $other, $other_scope )
		) {
			return false;
		}

		if ( 'selected' === $scope && 'selected' === $other_scope ) {
			return array() !== array_intersect(
				$this->effective_selected_ids( $promotion ),
				$this->effective_selected_ids( $other )
			);
		}

		if ( 'selected' === $scope || 'selected' === $other_scope ) {
			$selected = 'selected' === $scope ? $promotion : $other;
			$broad    = 'selected' === $scope ? $other : $promotion;

			return array() !== array_diff(
				$this->effective_selected_ids( $selected ),
				$this->normalize_post_ids( $broad['exclude_ids'] ?? array() )
			);
		}

		return ! $this->broad_scopes_are_disjoint( $scope, $other_scope );
	}

	/**
	 * Normalize a content scope without widening malformed values unpredictably.
	 *
	 * @param array<string, mixed> $promotion Promotion rule.
	 */
	private function content_scope( array $promotion ): string {
		$scope = isset( $promotion['content_scope'] ) ? (string) $promotion['content_scope'] : 'all';

		return in_array( $scope, array( 'all', 'posts', 'pages', 'terms', 'selected' ), true )
			? $scope
			: 'all';
	}

	/**
	 * Determine whether a scope can address at least one content object.
	 *
	 * @param array<string, mixed> $promotion Promotion rule.
	 * @param string               $scope     Normalized content scope.
	 */
	private function scope_has_possible_targets( array $promotion, string $scope ): bool {
		if ( 'selected' === $scope ) {
			return array() !== $this->effective_selected_ids( $promotion );
		}

		if ( 'terms' !== $scope ) {
			return true;
		}

		$terms_valid = (bool) ( $promotion['terms_valid'] ?? false );

		return $terms_valid && array() !== array_merge(
			$this->normalize_post_ids( $promotion['category_ids'] ?? array() ),
			$this->normalize_post_ids( $promotion['tag_ids'] ?? array() )
		);
	}

	/**
	 * Return true only for type pairs that cannot share standard content.
	 *
	 * @param string $scope       First normalized content scope.
	 * @param string $other_scope Second normalized content scope.
	 */
	private function broad_scopes_are_disjoint( string $scope, string $other_scope ): bool {
		$pair = array( $scope, $other_scope );
		sort( $pair );

		return array( 'pages', 'posts' ) === $pair || array( 'pages', 'terms' ) === $pair;
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
