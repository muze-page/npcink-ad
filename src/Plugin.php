<?php
/**
 * Runtime composition root.
 *
 * @package MagickAD
 */

namespace MagickAD;

use MagickAD\Admin\Menu;
use MagickAD\Admin\Meta_Boxes;
use MagickAD\Blocks\Blocks;
use MagickAD\Data\Post_Types;
use MagickAD\Data\Repository;
use MagickAD\Domain\Eligibility_Evaluator;
use MagickAD\Frontend\Delivery;
use MagickAD\Frontend\Renderer;
use MagickAD\REST\Core_Rest_Guard;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the clean-baseline runtime.
 */
final class Plugin {
	/**
	 * Register runtime hooks.
	 */
	public function init(): void {
		$delivery = new Delivery(
			new Repository(),
			new Eligibility_Evaluator(),
			new Renderer()
		);
		$blocks   = new Blocks( $delivery );

		add_action( 'init', array( Post_Types::class, 'register' ), 5 );
		add_action( 'init', array( $delivery, 'register' ), 10 );
		add_action( 'init', array( $blocks, 'register' ), 20 );
		Core_Rest_Guard::register();
		Lifecycle::register_new_site_hook();

		if ( is_admin() ) {
			add_action( 'admin_menu', array( Menu::class, 'register' ) );
			add_action( 'add_meta_boxes', array( Meta_Boxes::class, 'register' ) );
			add_action( 'save_post', array( Meta_Boxes::class, 'save' ), 10, 2 );
		}
	}
}
