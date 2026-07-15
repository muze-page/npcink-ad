<?php
/**
 * Dynamic ad placement block registration.
 *
 * @package MagickAD
 */

namespace MagickAD\Blocks;

use MagickAD\Frontend\Delivery;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the one server-rendered Magick AD block.
 */
final class Blocks {
	private const EDITOR_SCRIPT = 'magick-ad-block-editor';
	private const EDITOR_STYLE  = 'magick-ad-block-editor';

	/**
	 * Store the delivery orchestrator used by the render callback.
	 *
	 * @param Delivery $delivery Placement delivery orchestrator.
	 */
	public function __construct( private readonly Delivery $delivery ) {}

	/**
	 * Register the block, build-produced editor script, and editor styles.
	 */
	public function register(): void {
		$block_dir = MAGICK_AD_PATH . 'assets/blocks/magick-ad-ad';
		if ( ! file_exists( $block_dir . '/block.json' ) ) {
			return;
		}

		$this->register_editor_assets();

		register_block_type(
			$block_dir,
			array(
				'editor_script'   => self::EDITOR_SCRIPT,
				'editor_style'    => self::EDITOR_STYLE,
				'render_callback' => array( $this, 'render' ),
			)
		);
	}

	/**
	 * Render the placement referenced by block attributes.
	 *
	 * The editor controls whether it calls server-side rendering. The server
	 * protects delivery diagnostics with the manage_magick_ads capability.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 */
	public function render( array $attributes ): string {
		$placement_id = isset( $attributes['placementId'] ) ? absint( $attributes['placementId'] ) : 0;
		$reserve       = isset( $attributes['reserveHeight'] ) ? absint( $attributes['reserveHeight'] ) : 0;
		$content = $this->delivery->render_placement( $placement_id, 'block', $reserve );
		if ( '' === $content ) {
			return '';
		}

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes( array( 'class' => 'magick-ad-block' ) ),
			$content
		);
	}

	/**
	 * Register the single generated editor entrypoint and its stylesheet.
	 */
	private function register_editor_assets(): void {
		$asset_file = MAGICK_AD_PATH . 'build/index.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : array();
		$asset      = is_array( $asset ) ? $asset : array();
		$version    = isset( $asset['version'] ) ? (string) $asset['version'] : MAGICK_AD_VERSION;
		$depends    = isset( $asset['dependencies'] ) && is_array( $asset['dependencies'] )
			? $asset['dependencies']
			: array();

		wp_register_script(
			self::EDITOR_SCRIPT,
			MAGICK_AD_URL . 'build/index.js',
			$depends,
			$version,
			true
		);

		wp_register_style(
			self::EDITOR_STYLE,
			MAGICK_AD_URL . 'build/index.css',
			array( 'wp-edit-blocks' ),
			$version
		);
	}
}
