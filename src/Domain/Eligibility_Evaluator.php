<?php
/**
 * Determines whether a promotion may render in a request context.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Domain;

/**
 * Pure eligibility policy with no WordPress API calls.
 */
final class Eligibility_Evaluator {
	/**
	 * Evaluate one promotion and the current request context.
	 *
	 * A null simulated_device means normal delivery. In that mode the server
	 * emits cache-stable HTML and CSS performs device visibility targeting.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 * @param array<string, mixed> $context   Request context.
	 * @return array{allowed: bool, reasons: list<string>}
	 */
	public function evaluate( array $promotion, array $context ): array {
		$reasons = array();

		if ( 'publish' !== ( $promotion['status'] ?? '' ) ) {
			$reasons[] = 'promotion_not_published';
		}

		$now      = isset( $context['now'] ) ? (int) $context['now'] : 0;
		$start_at = isset( $promotion['start_at'] ) ? (int) $promotion['start_at'] : 0;
		$end_at   = isset( $promotion['end_at'] ) ? (int) $promotion['end_at'] : 0;
		if ( 0 < $start_at && $now < $start_at ) {
			$reasons[] = 'promotion_not_started';
		}
		if ( 0 < $end_at && $now >= $end_at ) {
			$reasons[] = 'promotion_expired';
		}

		if ( '' === trim( (string) ( $promotion['content'] ?? '' ) ) ) {
			$reasons[] = 'promotion_content_empty';
		}

		$post_id     = isset( $context['post_id'] ) ? (int) $context['post_id'] : 0;
		$page_scope  = isset( $promotion['page_scope'] ) ? (string) $promotion['page_scope'] : 'all';
		$include_ids = isset( $promotion['include_ids'] ) && is_array( $promotion['include_ids'] )
			? array_map( 'intval', $promotion['include_ids'] )
			: array();
		$exclude_ids = isset( $promotion['exclude_ids'] ) && is_array( $promotion['exclude_ids'] )
			? array_map( 'intval', $promotion['exclude_ids'] )
			: array();
		if ( 'selected' === $page_scope && ! in_array( $post_id, $include_ids, true ) ) {
			$reasons[] = 'page_not_included';
		}
		if ( in_array( $post_id, $exclude_ids, true ) ) {
			$reasons[] = 'page_excluded';
		}

		$expected_location = isset( $context['expected_location'] ) ? (string) $context['expected_location'] : 'block';
		if ( ( $promotion['location'] ?? 'content_after' ) !== $expected_location ) {
			$reasons[] = 'location_mismatch';
		}

		$simulated_device = isset( $context['simulated_device'] ) ? (string) $context['simulated_device'] : '';
		$device           = isset( $promotion['device'] ) ? (string) $promotion['device'] : 'all';
		if (
			in_array( $simulated_device, array( 'desktop', 'mobile' ), true )
			&& 'all' !== $device
			&& $device !== $simulated_device
		) {
			$reasons[] = 'device_mismatch';
		}

		return array(
			'allowed' => array() === $reasons,
			'reasons' => $reasons,
		);
	}
}
