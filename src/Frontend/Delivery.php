<?php
/**
 * Ad delivery orchestration for blocks, shortcodes, and post content.
 *
 * @package MagickAD
 */

namespace MagickAD\Frontend;

use MagickAD\Data\Repository;
use MagickAD\Domain\Eligibility_Evaluator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Maps WordPress request data into the pure eligibility policy.
 */
final class Delivery {
	/**
	 * Placements currently being rendered, used to stop recursive content.
	 *
	 * @var array<int, true>
	 */
	private array $rendering = array();

	/**
	 * Prevent repeated content injection if a theme applies the filter twice.
	 *
	 * @var bool
	 */
	private bool $filtering_content = false;

	/**
	 * Compose delivery from native storage, the pure policy, and rendering.
	 *
	 * @param Repository            $repository Native WordPress data mapper.
	 * @param Eligibility_Evaluator $evaluator  Pure delivery policy.
	 * @param Renderer              $renderer   Safe content renderer.
	 */
	public function __construct(
		private readonly Repository $repository,
		private readonly Eligibility_Evaluator $evaluator,
		private readonly Renderer $renderer
	) {}

	/**
	 * Register shortcode and post-content delivery.
	 */
	public function register(): void {
		add_shortcode( 'magick_ad', array( $this, 'shortcode' ) );
		add_filter( 'the_content', array( $this, 'filter_content' ) );
	}

	/**
	 * Render a placement for one specific delivery method.
	 *
	 * @param int    $placement_id    Placement post ID.
	 * @param string $expected_location Expected location.
	 * @param int    $reserve          Minimum reserved height.
	 */
	public function render_placement( int $placement_id, string $expected_location, int $reserve = 0 ): string {
		$can_diagnose = current_user_can( 'manage_magick_ads' );
		if ( 1 > $placement_id ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'placement_missing' ), $reserve ) : '';
		}

		if ( isset( $this->rendering[ $placement_id ] ) ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'recursive_placement' ), $reserve ) : '';
		}

		$placement = $this->repository->find_placement( $placement_id );
		if ( null === $placement ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'placement_missing' ), $reserve ) : '';
		}

		if ( ( $placement['location'] ?? '' ) !== $expected_location ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'location_mismatch' ), $reserve ) : '';
		}

		$ad = $this->repository->find_ad( isset( $placement['ad_id'] ) ? (int) $placement['ad_id'] : 0 );
		$result = $this->evaluator->evaluate(
			$placement,
			$ad,
			array(
				'now'       => current_datetime()->getTimestamp(),
				'is_mobile' => wp_is_mobile(),
			)
		);

		if ( ! $result['allowed'] || null === $ad ) {
			return $can_diagnose ? $this->renderer->placeholder( $result['reasons'], $reserve ) : '';
		}

		$this->rendering[ $placement_id ] = true;
		try {
			return $this->renderer->render( $placement, $ad, $reserve );
		} finally {
			unset( $this->rendering[ $placement_id ] );
		}
	}

	/**
	 * Render the placement shortcode.
	 *
	 * @param array<string, mixed>|string $attributes Shortcode attributes.
	 */
	public function shortcode( array|string $attributes = array() ): string {
		$attributes = shortcode_atts(
			array( 'placement' => 0 ),
			is_array( $attributes ) ? $attributes : array(),
			'magick_ad'
		);

		return $this->render_placement( absint( $attributes['placement'] ), 'shortcode' );
	}

	/**
	 * Add enabled before/after placements to singular main-loop content.
	 *
	 * @param string $content Original post content.
	 */
	public function filter_content( string $content ): string {
		if ( $this->filtering_content || is_admin() || is_feed() || ! is_singular() || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}

		$this->filtering_content = true;
		try {
			$before = $this->render_content_location( 'content_before' );
			$after  = $this->render_content_location( 'content_after' );

			return $before . $content . $after;
		} finally {
			$this->filtering_content = false;
		}
	}

	/**
	 * Render all published placements assigned to a content location.
	 *
	 * @param string $location Content location.
	 */
	private function render_content_location( string $location ): string {
		$output = '';
		foreach ( $this->repository->find_published_ids_by_location( $location ) as $placement_id ) {
			$output .= $this->render_placement( $placement_id, $location );
		}

		return $output;
	}
}
