<?php
/**
 * Promotion delivery orchestration for blocks, shortcodes, and post content.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Frontend;

use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Maps WordPress request data into the pure eligibility policy.
 */
final class Delivery {
	/**
	 * Promotions currently being rendered, used to stop recursive content.
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
	 * Automatic content output already computed for posts in this request.
	 *
	 * @var array<int, array{source: string, output: string}>
	 */
	private array $filtered_content = array();

	/**
	 * Authorized real-page preview context for a manual block.
	 *
	 * @var array{promotion_id: int, device: string, post_id: int}|null
	 */
	private ?array $block_preview_context = null;

	/**
	 * Whether the target promotion block rendered in its real page position.
	 *
	 * @var bool
	 */
	private bool $block_preview_rendered = false;

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
		add_shortcode( 'npcink_ad', array( $this, 'shortcode' ) );
		add_filter( 'the_content', array( $this, 'filter_content' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_style' ) );
	}

	/**
	 * Load the tiny device-targeting stylesheet before themes print styles.
	 *
	 * Rendering can happen after wp_head(), especially on WordPress 6.5 where
	 * late-enqueued styles are not hoisted. Enqueuing the 0.1 stylesheet early
	 * keeps desktop/mobile rules deterministic without adding frontend script.
	 */
	public function enqueue_frontend_style(): void {
		wp_enqueue_style( 'npcink-ad-frontend' );
	}

	/**
	 * Make one promotion block render the truthful preview in its real position.
	 *
	 * @param int    $promotion_id Promotion post ID.
	 * @param string $device       Desktop or mobile preview context.
	 * @param int    $post_id      Real page used by the preview.
	 */
	public function enable_block_preview( int $promotion_id, string $device, int $post_id ): void {
		$this->block_preview_context = array(
			'promotion_id' => absint( $promotion_id ),
			'device'       => in_array( $device, array( 'desktop', 'mobile' ), true ) ? $device : 'desktop',
			'post_id'      => absint( $post_id ),
		);
		$this->block_preview_rendered = false;
	}

	/**
	 * Report whether the real page contained the target promotion block.
	 */
	public function has_rendered_block_preview(): bool {
		return $this->block_preview_rendered;
	}

	/**
	 * Render one promotion for a specific delivery method.
	 *
	 * The simulated device is used only by an authorized preview caller. A null
	 * value preserves cache-stable frontend HTML and delegates device visibility
	 * to CSS.
	 *
	 * @param int         $promotion_id    Promotion post ID.
	 * @param string      $expected_location Expected delivery location.
	 * @param int         $reserve         Minimum reserved height.
	 * @param string|null $simulated_device Optional preview device.
	 * @param int|null    $context_post_id Optional page context override.
	 */
	public function render_promotion(
		int $promotion_id,
		string $expected_location = 'block',
		int $reserve = 0,
		?string $simulated_device = null,
		?int $context_post_id = null
	): string {
		$can_diagnose = current_user_can( 'manage_npcink_ads' );
		if ( 1 > $promotion_id ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'promotion_missing' ), $reserve ) : '';
		}

		if ( isset( $this->rendering[ $promotion_id ] ) ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'recursive_promotion' ), $reserve ) : '';
		}

		if (
			'block' === $expected_location &&
			null !== $this->block_preview_context &&
			$promotion_id === $this->block_preview_context['promotion_id']
		) {
			$preview = $this->render_preview(
				$promotion_id,
				'block',
				$this->block_preview_context['device'],
				$this->block_preview_context['post_id'],
				$reserve
			);
			if ( '' !== $preview ) {
				$this->block_preview_rendered = true;
			}

			return $preview;
		}

		$promotion = $this->repository->find_promotion( $promotion_id );
		if ( null === $promotion ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'promotion_missing' ), $reserve ) : '';
		}

		$post_id = null === $context_post_id ? get_queried_object_id() : absint( $context_post_id );
		$result  = $this->evaluator->evaluate(
			$promotion,
			array(
				'now'              => current_datetime()->getTimestamp(),
				'post_id'          => $post_id,
				'expected_location' => $expected_location,
				'simulated_device'  => $simulated_device,
			)
		);

		if ( ! $result['allowed'] ) {
			return $can_diagnose ? $this->renderer->placeholder( $result['reasons'], $reserve ) : '';
		}

		$this->rendering[ $promotion_id ] = true;
		try {
			return $this->renderer->render( $promotion, $reserve );
		} finally {
			unset( $this->rendering[ $promotion_id ] );
		}
	}

	/**
	 * Force-render a promotion for an authorized real-page or editor preview.
	 *
	 * The eligibility result remains truthful even though blocked creative is
	 * visible to the manager for visual inspection.
	 *
	 * @param int         $promotion_id      Promotion post ID.
	 * @param string      $expected_location Expected delivery location.
	 * @param string|null $simulated_device  Desktop or mobile preview context.
	 * @param int|null    $context_post_id   Preview page ID.
	 * @param int         $reserve           Minimum reserved height.
	 */
	public function render_preview(
		int $promotion_id,
		string $expected_location = 'block',
		?string $simulated_device = null,
		?int $context_post_id = null,
		int $reserve = 0
	): string {
		if ( ! current_user_can( 'manage_npcink_ads' ) ) {
			return '';
		}
		if ( 1 > $promotion_id ) {
			return $this->renderer->placeholder( array( 'promotion_missing' ), $reserve );
		}
		if ( isset( $this->rendering[ $promotion_id ] ) ) {
			return $this->renderer->placeholder( array( 'recursive_promotion' ), $reserve );
		}

		$promotion = $this->repository->find_promotion( $promotion_id );
		if ( null === $promotion ) {
			return $this->renderer->placeholder( array( 'promotion_missing' ), $reserve );
		}

		$post_id = null === $context_post_id ? get_queried_object_id() : absint( $context_post_id );
		$result  = $this->evaluator->evaluate(
			$promotion,
			array(
				'now'               => current_datetime()->getTimestamp(),
				'post_id'           => $post_id,
				'expected_location' => $expected_location,
				'simulated_device'  => $simulated_device,
			)
		);

		$this->rendering[ $promotion_id ] = true;
		try {
			return $this->renderer->render_preview( $promotion, $result, $reserve );
		} finally {
			unset( $this->rendering[ $promotion_id ] );
		}
	}

	/**
	 * Render a promotion shortcode.
	 *
	 * @param array<string, mixed>|string $attributes Shortcode attributes.
	 */
	public function shortcode( array|string $attributes = array() ): string {
		$attributes = shortcode_atts(
			array( 'promotion' => 0 ),
			is_array( $attributes ) ? $attributes : array(),
			'npcink_ad'
		);

		return $this->render_promotion( absint( $attributes['promotion'] ) );
	}

	/**
	 * Add eligible before/after promotions to singular main-loop content.
	 *
	 * @param string $content Original post content.
	 */
	public function filter_content( string $content ): string {
		if ( $this->filtering_content || is_admin() || is_feed() || ! is_singular( array( 'post', 'page' ) ) || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}

		$post_id = get_the_ID();
		if ( 1 > $post_id ) {
			return $content;
		}
		if ( isset( $this->filtered_content[ $post_id ] ) ) {
			$cached = $this->filtered_content[ $post_id ];

			return $content === $cached['source'] ? $cached['output'] : $content;
		}

		$this->filtering_content = true;
		try {
			$before = $this->render_content_location( 'content_before', $post_id );
			$after  = $this->render_content_location( 'content_after', $post_id );
			$output = $before . $content . $after;
			$this->filtered_content[ $post_id ] = array(
				'source' => $content,
				'output' => $output,
			);

			return $output;
		} finally {
			$this->filtering_content = false;
		}
	}

	/**
	 * Render all published promotions assigned to a content location.
	 *
	 * @param string $location Content location.
	 * @param int    $post_id  Current content post ID.
	 */
	private function render_content_location( string $location, int $post_id ): string {
		$output = '';
		foreach ( $this->repository->find_published_ids_by_location( $location ) as $promotion_id ) {
			$output .= $this->render_promotion( $promotion_id, $location, 0, null, $post_id );
		}

		return $output;
	}
}
