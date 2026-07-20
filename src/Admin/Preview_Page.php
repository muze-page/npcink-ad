<?php
/**
 * Real-page promotion preview canvas.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Admin;

use Npcink\Ad\Data\Post_Types;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Hosts an authenticated same-origin page preview at desktop or mobile width.
 */
final class Preview_Page {
	private const PAGE_SLUG = 'npcink-ad-preview';

	/**
	 * Build the hidden preview admin URL.
	 *
	 * @param array<string, int|string> $args Additional query arguments.
	 */
	public static function url( array $args = array() ): string {
		return add_query_arg(
			array_merge(
				array( 'page' => self::PAGE_SLUG ),
				$args
			),
			admin_url( 'admin.php' )
		);
	}

	/**
	 * Register the hidden preview route and its stylesheet.
	 */
	public static function register(): void {
		$hook   = add_submenu_page(
			'',
			__( 'Npcink Ad Preview', 'npcink-ad' ),
			__( 'Preview', 'npcink-ad' ),
			'manage_npcink_ads',
			self::PAGE_SLUG,
			array( self::class, 'render' )
		);

		if ( false !== $hook ) {
			add_action( 'load-' . $hook, array( self::class, 'enqueue_assets' ) );
		}
	}

	/**
	 * Enqueue the isolated preview-canvas stylesheet.
	 */
	public static function enqueue_assets(): void {
		add_filter( 'admin_body_class', array( self::class, 'body_class' ) );
		add_filter( 'admin_title', array( self::class, 'admin_title' ), 10, 2 );

		wp_enqueue_style(
			'npcink-ad-preview-page',
			NPCINK_AD_URL . 'assets/css/admin-preview.css',
			array(),
			NPCINK_AD_VERSION
		);
	}

	/**
	 * Mark the preview screen so its admin chrome can become a focused workspace.
	 *
	 * @param string $classes Existing admin body classes.
	 */
	public static function body_class( string $classes ): string {
		return trim( $classes . ' npcink-ad-preview-workspace' );
	}

	/**
	 * Give the hidden admin page a useful browser-tab title.
	 *
	 * @param string $admin_title Existing complete admin title.
	 * @param string $title       Existing screen title.
	 */
	public static function admin_title( string $admin_title, string $title ): string {
		unset( $admin_title, $title );

		return sprintf(
			/* translators: %s: Site title. */
			__( 'Npcink Ad real-page preview ‹ %s — WordPress', 'npcink-ad' ),
			wp_strip_all_tags( get_bloginfo( 'name' ) )
		);
	}

	/**
	 * Render the authenticated preview canvas.
	 */
	public static function render(): void {
		if ( ! current_user_can( 'manage_npcink_ads' ) ) {
			wp_die( esc_html__( 'You are not allowed to preview promotions.', 'npcink-ad' ), '', array( 'response' => 403 ) );
		}

		$promotion_id = isset( $_GET['promotion'] ) ? absint( wp_unslash( $_GET['promotion'] ) ) : 0;
		$target_id    = isset( $_GET['target'] ) ? absint( wp_unslash( $_GET['target'] ) ) : 0;
		$device       = isset( $_GET['device'] ) ? sanitize_key( wp_unslash( $_GET['device'] ) ) : 'desktop';
		$nonce        = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ) : '';

		if ( ! in_array( $device, array( 'desktop', 'mobile' ), true ) ) {
			$device = 'desktop';
		}

		if (
			Post_Types::PROMOTION_POST_TYPE !== get_post_type( $promotion_id ) ||
			! wp_verify_nonce( $nonce, 'npcink_ad_preview_' . $promotion_id )
		) {
			wp_die( esc_html__( 'The promotion preview link is invalid or has expired.', 'npcink-ad' ), '', array( 'response' => 403 ) );
		}

		$target = get_post( $target_id );
		if ( ! $target || 'publish' !== $target->post_status || ! is_post_publicly_viewable( $target ) ) {
			wp_die( esc_html__( 'Choose a published post or page for the preview.', 'npcink-ad' ), '', array( 'response' => 400 ) );
		}

		$target_url = get_permalink( $target );
		if ( ! is_string( $target_url ) || '' === $target_url ) {
			wp_die( esc_html__( 'The preview page does not have a public URL.', 'npcink-ad' ), '', array( 'response' => 400 ) );
		}

		$preview_url = add_query_arg(
			array(
				'npcink_ad_preview'        => $promotion_id,
				'npcink_ad_preview_device' => $device,
				'npcink_ad_preview_nonce'  => $nonce,
			),
			$target_url
		);

		$base_args = array(
			'promotion' => $promotion_id,
			'target'    => $target_id,
			'_wpnonce'  => $nonce,
		);

		$desktop_url     = self::url( array_merge( $base_args, array( 'device' => 'desktop' ) ) );
		$mobile_url      = self::url( array_merge( $base_args, array( 'device' => 'mobile' ) ) );
		$edit_url        = get_edit_post_link( $promotion_id, 'raw' );
		$desktop_current = 'desktop' === $device ? 'page' : 'false';
		$mobile_current  = 'mobile' === $device ? 'page' : 'false';
		?>
		<div class="wrap npcink-ad-preview-page">
			<div class="npcink-ad-preview-page__toolbar">
				<div class="npcink-ad-preview-page__heading">
					<h1><?php esc_html_e( 'Real-page preview', 'npcink-ad' ); ?></h1>
					<p><?php esc_html_e( 'Uses the live delivery policy, including blocked verdicts. Desktop: 782px and above. Mobile: 781px and below in a representative 390px canvas.', 'npcink-ad' ); ?></p>
				</div>
				<nav class="npcink-ad-preview-page__actions" aria-label="<?php esc_attr_e( 'Preview controls', 'npcink-ad' ); ?>">
					<a class="button <?php echo 'desktop' === $device ? 'button-primary' : ''; ?>" href="<?php echo esc_url( $desktop_url ); ?>" aria-current="<?php echo esc_attr( $desktop_current ); ?>"><?php esc_html_e( 'Desktop', 'npcink-ad' ); ?></a>
					<a class="button <?php echo 'mobile' === $device ? 'button-primary' : ''; ?>" href="<?php echo esc_url( $mobile_url ); ?>" aria-current="<?php echo esc_attr( $mobile_current ); ?>"><?php esc_html_e( 'Mobile', 'npcink-ad' ); ?></a>
					<?php if ( is_string( $edit_url ) && '' !== $edit_url ) : ?>
						<a class="button" href="<?php echo esc_url( $edit_url ); ?>"><?php esc_html_e( 'Back to promotion', 'npcink-ad' ); ?></a>
					<?php endif; ?>
				</nav>
			</div>
			<div class="npcink-ad-preview-page__stage is-<?php echo esc_attr( $device ); ?>">
				<iframe src="<?php echo esc_url( $preview_url ); ?>" title="<?php esc_attr_e( 'Npcink Ad real-page preview', 'npcink-ad' ); ?>"></iframe>
			</div>
		</div>
		<?php
	}
}
