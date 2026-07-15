<?php
/**
 * Server-side promotion and management-placeholder rendering.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Frontend;

use Npcink\Ad\Presentation\Eligibility_Messages;

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
		$messages = Eligibility_Messages::messages( $result['reasons'] );
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
		$messages = Eligibility_Messages::messages( $reasons );

		return sprintf(
			'<div class="npcink-ad-placeholder"%1$s><strong>%2$s</strong> %3$s</div>',
			$this->reserve_style( $reserve ),
			esc_html__( 'Npcink Ad:', 'npcink-ad' ),
			esc_html( implode( ' ', $messages ) )
		);
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
