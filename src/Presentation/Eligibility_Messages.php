<?php
/**
 * Human-readable promotion eligibility messages.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Presentation;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Translates stable eligibility reason codes without exposing identifiers.
 */
final class Eligibility_Messages {
	/**
	 * Translate eligibility reason codes.
	 *
	 * Unknown codes are ignored. A generic explanation is returned when no
	 * recognized reasons remain.
	 *
	 * @param array $reasons Reason codes.
	 * @return list<string>
	 * @phpstan-param list<string> $reasons
	 */
	public static function messages( array $reasons ): array {
		$labels = array(
			'promotion_missing'          => __( 'Select a promotion.', 'npcink-ad' ),
			'promotion_not_published'    => __( 'The promotion is not published.', 'npcink-ad' ),
			'promotion_not_started'      => __( 'The promotion has not started.', 'npcink-ad' ),
			'promotion_expired'          => __( 'The promotion has expired.', 'npcink-ad' ),
			'promotion_content_empty'    => __( 'The promotion has no content.', 'npcink-ad' ),
			'promotion_targets_empty'    => __( 'Select at least one target page that is not excluded.', 'npcink-ad' ),
			'promotion_schedule_invalid' => __( 'The promotion end time must be later than its start time.', 'npcink-ad' ),
			'page_not_included'          => __( 'This page is not included.', 'npcink-ad' ),
			'page_excluded'              => __( 'This page is excluded.', 'npcink-ad' ),
			'location_mismatch'          => __( 'The promotion location does not match this delivery method.', 'npcink-ad' ),
			'device_mismatch'            => __( 'The promotion does not target the simulated device.', 'npcink-ad' ),
			'recursive_promotion'        => __( 'The promotion recursively includes itself.', 'npcink-ad' ),
		);
		$messages = array();
		foreach ( $reasons as $reason ) {
			if ( isset( $labels[ $reason ] ) ) {
				$messages[] = $labels[ $reason ];
			}
		}

		if ( array() === $messages ) {
			$messages[] = __( 'This promotion is not eligible to render.', 'npcink-ad' );
		}

		return $messages;
	}
}
