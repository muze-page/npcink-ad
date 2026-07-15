<?php
/**
 * Server-side promotion and management-placeholder rendering.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Frontend;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Renders trusted post content without recursively invoking the_content.
 */
final class Renderer {
	private const FRONTEND_STYLE = 'npcink-ad-frontend';

	/**
	 * Render an eligible promotion.
	 *
	 * @param array<string, mixed> $promotion Promotion data.
	 * @param int                  $reserve   Minimum reserved height in pixels.
	 * @param bool                 $apply_device_rule Whether to apply the stored device class.
	 */
	public function render( array $promotion, int $reserve = 0, bool $apply_device_rule = true ): string {
		$content = isset( $promotion['content'] ) ? (string) $promotion['content'] : '';
		if ( has_blocks( $content ) ) {
			$content = do_blocks( $content );
		} else {
			$content = wpautop( wptexturize( $content ) );
		}
		$content = wp_kses_post( $content );

		$promotion_id = isset( $promotion['id'] ) ? absint( $promotion['id'] ) : 0;
		$device       = $apply_device_rule && isset( $promotion['device'] )
			? sanitize_key( (string) $promotion['device'] )
			: 'all';
		if ( ! in_array( $device, array( 'all', 'desktop', 'mobile' ), true ) ) {
			$device = 'all';
		}

		wp_enqueue_style( self::FRONTEND_STYLE );

		return sprintf(
			'<div class="npcink-ad-promotion npcink-ad-device-%1$s" data-npcink-ad-promotion="%2$d" aria-label="%3$s"%4$s>%5$s</div>',
			esc_attr( $device ),
			$promotion_id,
			esc_attr__( 'Promotion', 'npcink-ad' ),
			$this->reserve_style( $reserve ),
			$content
		);
	}

	/**
	 * Force-render creative with a truthful eligibility verdict for managers.
	 *
	 * @param array<string, mixed>                        $promotion Promotion data.
	 * @param array{allowed: bool, reasons: list<string>} $result    Eligibility result.
	 * @param int                                         $reserve   Minimum reserved height.
	 */
	public function render_preview( array $promotion, array $result, int $reserve = 0 ): string {
		$messages = $this->reason_messages( $result['reasons'] );
		if ( $result['allowed'] ) {
			$verdict = __( 'Eligible: this promotion will display in the selected page and device context.', 'npcink-ad' );
		} else {
			$verdict = sprintf(
				/* translators: %s: one or more promotion eligibility explanations. */
				__( 'Not currently eligible: %s', 'npcink-ad' ),
				implode( ' ', $messages )
			);
		}

		return sprintf(
			'<div class="npcink-ad-preview"><div class="npcink-ad-preview-verdict%1$s"><strong>%2$s</strong></div>%3$s</div>',
			$result['allowed'] ? '' : ' is-blocked',
			esc_html( $verdict ),
			$this->render( $promotion, $reserve, false )
		);
	}

	/**
	 * Render an explicit management-only delivery explanation.
	 *
	 * @param array $reasons Reason codes.
	 * @param int   $reserve Minimum reserved height in pixels.
	 * @phpstan-param list<string> $reasons
	 */
	public function placeholder( array $reasons, int $reserve = 0 ): string {
		$messages = $this->reason_messages( $reasons );

		return sprintf(
			'<div class="npcink-ad-placeholder"%1$s><strong>%2$s</strong> %3$s</div>',
			$this->reserve_style( $reserve ),
			esc_html__( 'Npcink Ad:', 'npcink-ad' ),
			esc_html( implode( ' ', $messages ) )
		);
	}

	/**
	 * Translate stable reason codes without exposing internal identifiers.
	 *
	 * @param array $reasons Reason codes.
	 * @return list<string>
	 * @phpstan-param list<string> $reasons
	 */
	private function reason_messages( array $reasons ): array {
		$labels = array(
			'promotion_missing'       => __( 'Select a promotion.', 'npcink-ad' ),
			'promotion_not_published' => __( 'The promotion is not published.', 'npcink-ad' ),
			'promotion_not_started'   => __( 'The promotion has not started.', 'npcink-ad' ),
			'promotion_expired'       => __( 'The promotion has expired.', 'npcink-ad' ),
			'promotion_content_empty' => __( 'The promotion has no content.', 'npcink-ad' ),
			'page_not_included'       => __( 'This page is not included.', 'npcink-ad' ),
			'page_excluded'           => __( 'This page is excluded.', 'npcink-ad' ),
			'location_mismatch'       => __( 'The promotion location does not match this delivery method.', 'npcink-ad' ),
			'device_mismatch'         => __( 'The promotion does not target the simulated device.', 'npcink-ad' ),
			'recursive_promotion'     => __( 'The promotion recursively includes itself.', 'npcink-ad' ),
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

	/**
	 * Build a safe inline min-height declaration.
	 *
	 * @param int $reserve Requested height.
	 */
	private function reserve_style( int $reserve ): string {
		$reserve = min( 2000, max( 0, $reserve ) );

		return 0 < $reserve ? ' style="min-height:' . esc_attr( (string) $reserve ) . 'px"' : '';
	}
}
