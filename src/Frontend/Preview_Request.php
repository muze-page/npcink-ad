<?php
/**
 * Authenticated real-page promotion preview request.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Frontend;

use Npcink\Ad\Data\Repository;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Replaces normal automatic delivery with one forced, truthful preview.
 */
final class Preview_Request {
	/**
	 * Promotion selected by the authorized preview URL.
	 *
	 * @var int
	 */
	private int $promotion_id = 0;

	/**
	 * Device context simulated by the preview canvas.
	 *
	 * @var string
	 */
	private string $device = 'desktop';

	/**
	 * Whether the preview has already been inserted into the main loop.
	 *
	 * @var bool
	 */
	private bool $rendered = false;

	/**
	 * Compose preview handling from the normal delivery and repository services.
	 *
	 * @param Delivery   $delivery   Normal promotion delivery service.
	 * @param Repository $repository Native promotion repository.
	 */
	public function __construct(
		private readonly Delivery $delivery,
		private readonly Repository $repository
	) {}

	/**
	 * Register preview request detection before the template renders.
	 */
	public function register(): void {
		add_action( 'template_redirect', array( $this, 'activate' ), 0 );
	}

	/**
	 * Validate and activate a manager-only preview request.
	 */
	public function activate(): void {
		if ( ! isset( $_GET['npcink_ad_preview'] ) ) {
			return;
		}

		$promotion_id = absint( wp_unslash( $_GET['npcink_ad_preview'] ) );
		$device       = isset( $_GET['npcink_ad_preview_device'] )
			? sanitize_key( wp_unslash( $_GET['npcink_ad_preview_device'] ) )
			: 'desktop';
		$nonce        = isset( $_GET['npcink_ad_preview_nonce'] )
			? sanitize_text_field( wp_unslash( $_GET['npcink_ad_preview_nonce'] ) )
			: '';
		$promotion    = $this->repository->find_promotion( $promotion_id );

		if (
			! current_user_can( 'manage_npcink_ads' ) ||
			! wp_verify_nonce( $nonce, 'npcink_ad_preview_' . $promotion_id ) ||
			null === $promotion
		) {
			wp_die( esc_html__( 'This promotion preview is not available.', 'npcink-ad' ), '', array( 'response' => 403 ) );
		}

		if ( ! is_singular() || 1 > get_queried_object_id() ) {
			wp_die( esc_html__( 'Promotion previews require a public post or page.', 'npcink-ad' ), '', array( 'response' => 400 ) );
		}

		$this->promotion_id = $promotion_id;
		$this->device       = in_array( $device, array( 'desktop', 'mobile' ), true ) ? $device : 'desktop';
		if ( 'block' === ( $promotion['location'] ?? 'content_after' ) ) {
			$this->delivery->enable_block_preview(
				$promotion_id,
				$this->device,
				get_queried_object_id()
			);
		}

		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}
		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow, noarchive', true );

		remove_filter( 'the_content', array( $this->delivery, 'filter_content' ) );
		add_filter( 'the_content', array( $this, 'filter_content' ), 999 );
	}

	/**
	 * Insert the forced preview once into the selected real page.
	 *
	 * @param string $content Processed page content.
	 */
	public function filter_content( string $content ): string {
		if ( $this->rendered || ! in_the_loop() || ! is_main_query() ) {
			return $content;
		}

		$promotion = $this->repository->find_promotion( $this->promotion_id );
		if ( null === $promotion ) {
			return $content;
		}

		$this->rendered = true;

		$location = isset( $promotion['location'] ) ? (string) $promotion['location'] : 'content_after';
		if ( 'block' === $location && $this->delivery->has_rendered_block_preview() ) {
			return $content;
		}

		$preview  = $this->delivery->render_preview(
			$this->promotion_id,
			$location,
			$this->device,
			get_the_ID()
		);
		if ( 'block' === $location ) {
			$preview = sprintf(
				'<div class="npcink-ad-preview-verdict">%s</div>%s',
				esc_html__( 'Manual block preview is shown after the page content. The live position is controlled by where the block is inserted.', 'npcink-ad' ),
				$preview
			);
		}

		return 'content_before' === $location ? $preview . $content : $content . $preview;
	}
}
