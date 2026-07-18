<?php
/**
 * Plugin Name: Npcink Ad theme page-bar E2E fixture
 * Description: Builds a minimal top-and-bottom page-bar fixture for real theme templates.
 *
 * @package NpcinkAd
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/fixture-lock.php';

/**
 * Build the fixture once in the disposable Playground database.
 *
 * @throws RuntimeException If the page or either Promotion cannot be created.
 */
function npcink_ad_build_theme_bar_e2e_fixture(): void {
	$ready_option = 'npcink_ad_e2e_fixture_ready';

	if ( ! post_type_exists( 'npcink_promotion' ) || get_option( $ready_option ) ) {
		return;
	}

	try {
		if ( ! npcink_ad_claim_e2e_fixture_build( 'npcink-ad-theme-fixture-lock' ) ) {
			return;
		}

		$page_id = wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => 'Npcink Ad selector E2E page',
				'post_name'    => 'npcink-ad-selector-e2e-page',
				'post_content' => '<!-- wp:paragraph --><p>Theme page-bar compatibility fixture.</p><!-- /wp:paragraph --><!-- wp:spacer {"height":"1200px"} --><div style="height:1200px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->',
			),
			true
		);

		if ( is_wp_error( $page_id ) ) {
			throw new RuntimeException( 'Could not create the theme E2E page: ' . $page_id->get_error_message() );
		}

		/**
		 * Create one selected-page bar Promotion.
		 *
		 * @param string $title    Promotion title.
		 * @param string $content  Promotion content.
		 * @param string $location Page-bar location.
		 * @return int Promotion ID.
		 */
		$create_bar = static function ( string $title, string $content, string $location ) use ( $page_id ): int {
			$promotion_id = wp_insert_post(
				array(
					'post_type'    => 'npcink_promotion',
					'post_status'  => 'publish',
					'post_title'   => $title,
					'post_content' => '<!-- wp:paragraph --><p>' . esc_html( $content ) . '</p><!-- /wp:paragraph -->',
				),
				true
			);

			if ( is_wp_error( $promotion_id ) ) {
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Internal fixture evidence, never rendered as HTML.
				throw new RuntimeException( 'Could not create a theme E2E Promotion: ' . $promotion_id->get_error_message() );
			}

			update_post_meta( $promotion_id, '_npcink_ad_location', $location );
			update_post_meta( $promotion_id, '_npcink_ad_content_scope', 'selected' );
			update_post_meta( $promotion_id, '_npcink_ad_include_ids', array( $page_id ) );
			update_post_meta( $promotion_id, '_npcink_ad_exclude_ids', array() );
			update_post_meta( $promotion_id, '_npcink_ad_device', 'all' );

			return $promotion_id;
		};

		$fixture = array(
			'theme' => get_stylesheet(),
			'page'  => array(
				'id'   => $page_id,
				'slug' => 'npcink-ad-selector-e2e-page',
			),
			'bars'  => array(
				'top'    => $create_bar( 'Theme top bar', 'Theme top page bar.', 'bar_top' ),
				'bottom' => $create_bar( 'Theme bottom bar', 'Theme bottom page bar.', 'bar_bottom' ),
			),
		);

		update_option( $ready_option, $fixture, false );
		$result_dir = WP_CONTENT_DIR . '/npcink-ad-editor-e2e-results';
		if ( wp_mkdir_p( $result_dir ) ) {
			file_put_contents(
				$result_dir . '/fixture.json',
				(string) wp_json_encode( $fixture, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES )
			);
		}
	} catch ( Throwable $error ) {
		update_option( 'npcink_ad_e2e_fixture_error', $error->getMessage(), false );
		error_log( 'Npcink Ad theme E2E fixture failed: ' . $error->getMessage() );
	}
}
add_action( 'init', 'npcink_ad_build_theme_bar_e2e_fixture', 100 );

/**
 * Expose the active theme slug as deterministic browser evidence.
 *
 * @param string[] $classes Body classes.
 * @return string[]
 */
function npcink_ad_theme_bar_e2e_body_class( array $classes ): array {
	$classes[] = 'npcink-ad-e2e-theme-' . sanitize_html_class( get_stylesheet() );
	return $classes;
}
add_filter( 'body_class', 'npcink_ad_theme_bar_e2e_body_class' );
