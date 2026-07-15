<?php
/**
 * Server-side ad and management-placeholder rendering.
 *
 * @package MagickAD
 */

namespace MagickAD\Frontend;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Renders trusted post content without recursively invoking the_content.
 */
final class Renderer {
	/**
	 * Render an eligible ad.
	 *
	 * @param array<string, mixed> $placement Placement data.
	 * @param array<string, mixed> $ad        Ad data.
	 * @param int                  $reserve   Minimum reserved height in pixels.
	 */
	public function render( array $placement, array $ad, int $reserve = 0 ): string {
		$content = isset( $ad['content'] ) ? (string) $ad['content'] : '';
		if ( has_blocks( $content ) ) {
			$content = do_blocks( $content );
		} else {
			$content = wpautop( wptexturize( $content ) );
		}
		$content = wp_kses_post( $content );

		$placement_id = isset( $placement['id'] ) ? absint( $placement['id'] ) : 0;
		$style         = $this->reserve_style( $reserve );

		return sprintf(
			'<div class="magick-ad-placement" data-magick-ad-placement="%1$d" aria-label="%2$s"%3$s>%4$s</div>',
			$placement_id,
			esc_attr__( 'Advertisement', 'magick-ad' ),
			$style,
			$content
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
		$labels = array(
			'placement_missing'       => __( 'Select a placement.', 'magick-ad' ),
			'placement_not_published' => __( 'The placement is not published.', 'magick-ad' ),
			'location_mismatch'       => __( 'The placement location does not match this delivery method.', 'magick-ad' ),
			'ad_missing'              => __( 'The placement has no valid ad.', 'magick-ad' ),
			'ad_not_published'        => __( 'The assigned ad is not published.', 'magick-ad' ),
			'ad_expired'              => __( 'The assigned ad has expired.', 'magick-ad' ),
			'device_mismatch'         => __( 'The placement does not target this device.', 'magick-ad' ),
			'ad_content_empty'        => __( 'The assigned ad has no content.', 'magick-ad' ),
			'recursive_placement'     => __( 'The placement recursively includes itself.', 'magick-ad' ),
		);
		$messages = array();
		foreach ( $reasons as $reason ) {
			if ( isset( $labels[ $reason ] ) ) {
				$messages[] = $labels[ $reason ];
			}
		}

		if ( array() === $messages ) {
			$messages[] = __( 'This placement is not eligible to render.', 'magick-ad' );
		}

		return sprintf(
			'<div class="magick-ad-placeholder"%1$s><strong>%2$s</strong> %3$s</div>',
			$this->reserve_style( $reserve ),
			esc_html__( 'Magick AD:', 'magick-ad' ),
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
