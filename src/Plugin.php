<?php
/**
 * Runtime composition root.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad;

use Npcink\Ad\Admin\Editor;
use Npcink\Ad\Admin\Menu;
use Npcink\Ad\Admin\Preview_Page;
use Npcink\Ad\Admin\Promotion_Duplicate_Action;
use Npcink\Ad\Admin\Promotion_List;
use Npcink\Ad\Admin\Promotion_Status_Action;
use Npcink\Ad\Blocks\Blocks;
use Npcink\Ad\Blocks\Patterns;
use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use Npcink\Ad\Domain\Overlap_Detector;
use Npcink\Ad\Frontend\Delivery;
use Npcink\Ad\Frontend\Paragraph_Inserter;
use Npcink\Ad\Frontend\Preview_Request;
use Npcink\Ad\Frontend\Renderer;
use Npcink\Ad\REST\Core_Rest_Guard;
use Npcink\Ad\REST\Promotion_Preflight;

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
		$repository = new Repository();
		$evaluator  = new Eligibility_Evaluator();
		$paragraph_inserter = new Paragraph_Inserter();
		$delivery   = new Delivery(
			$repository,
			$evaluator,
			new Renderer(),
			$paragraph_inserter
		);
		$blocks    = new Blocks( $delivery );
		$preview   = new Preview_Request( $delivery, $repository );
		$preflight = new Promotion_Preflight( $repository, $evaluator );

		add_action( 'init', array( Post_Types::class, 'register' ), 5 );
		add_action( 'init', array( $delivery, 'register' ), 10 );
		add_action( 'init', array( Patterns::class, 'register' ), 15 );
		add_action( 'init', array( $blocks, 'register' ), 20 );
		$preview->register();
		$preflight->register();
		Core_Rest_Guard::register();
		Lifecycle::register_new_site_hook();

		if ( is_admin() ) {
			$promotion_list             = new Promotion_List( $repository, $evaluator, new Overlap_Detector() );
			$promotion_action           = new Promotion_Status_Action( $repository, $evaluator );
			$promotion_duplicate_action = new Promotion_Duplicate_Action();

			add_action( 'admin_menu', array( Menu::class, 'register' ) );
			add_action( 'admin_menu', array( Preview_Page::class, 'register' ), 20 );
			add_action( 'enqueue_block_editor_assets', array( Editor::class, 'enqueue' ) );
			$promotion_list->register();
			$promotion_action->register();
			$promotion_duplicate_action->register();
		}
	}
}
