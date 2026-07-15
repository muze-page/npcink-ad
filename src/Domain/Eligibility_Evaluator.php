<?php
/**
 * Determines whether a placement may render its assigned ad.
 *
 * @package MagickAD
 */

namespace MagickAD\Domain;

/**
 * Pure eligibility policy with no WordPress API calls.
 */
final class Eligibility_Evaluator {
	/**
	 * Evaluate a placement, its ad, and the current request context.
	 *
	 * @param array{status: string, device: string}                    $placement Placement data.
	 * @param array{status: string, end_at: int, content: string}|null $ad        Ad data, or null.
	 * @param array{now: int, is_mobile: bool}                         $context   Request context.
	 * @return array{allowed: bool, reasons: list<string>}
	 */
	public function evaluate( array $placement, ?array $ad, array $context ): array {
		$reasons = array();

		if ( 'publish' !== ( $placement['status'] ?? '' ) ) {
			$reasons[] = 'placement_not_published';
		}

		if ( null === $ad ) {
			$reasons[] = 'ad_missing';
		} else {
			if ( 'publish' !== ( $ad['status'] ?? '' ) ) {
				$reasons[] = 'ad_not_published';
			}

			$end_at = isset( $ad['end_at'] ) ? (int) $ad['end_at'] : 0;
			$now    = isset( $context['now'] ) ? (int) $context['now'] : 0;
			if ( 0 < $end_at && $now >= $end_at ) {
				$reasons[] = 'ad_expired';
			}

			if ( '' === trim( (string) ( $ad['content'] ?? '' ) ) ) {
				$reasons[] = 'ad_content_empty';
			}
		}

		$device   = isset( $placement['device'] ) ? (string) $placement['device'] : 'all';
		$is_mobile = ! empty( $context['is_mobile'] );
		if ( ( 'mobile' === $device && ! $is_mobile ) || ( 'desktop' === $device && $is_mobile ) ) {
			$reasons[] = 'device_mismatch';
		}

		return array(
			'allowed' => array() === $reasons,
			'reasons' => $reasons,
		);
	}
}
