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
			'promotion_video_source_missing' => __( 'A video in the promotion has no usable source.', 'npcink-ad' ),
			'promotion_targets_empty'    => __( 'Select at least one valid delivery target that is not excluded.', 'npcink-ad' ),
			'promotion_terms_invalid'    => __( 'One or more selected categories or tags are unavailable or could not be validated.', 'npcink-ad' ),
			'promotion_paragraph_invalid' => __( 'Choose a paragraph number from 1 to 20.', 'npcink-ad' ),
			'promotion_schedule_invalid' => __( 'The promotion end time must be later than its start time.', 'npcink-ad' ),
			'content_not_included'       => __( 'This content is not explicitly included.', 'npcink-ad' ),
			'content_excluded'           => __( 'This content is excluded.', 'npcink-ad' ),
			'content_type_mismatch'      => __( 'This content type is not included.', 'npcink-ad' ),
			'post_terms_mismatch'        => __( 'This post does not match the selected categories or tags.', 'npcink-ad' ),
			'content_terms_unavailable'  => __( 'This post\'s categories or tags could not be read.', 'npcink-ad' ),
			'location_mismatch'          => __( 'The promotion location does not match this delivery method.', 'npcink-ad' ),
			'content_anchor_missing'     => __( 'The selected paragraph is not available in this content.', 'npcink-ad' ),
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
