<?php
/**
 * Focused starter patterns for promotion creative.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Blocks;

use Npcink\Ad\Data\Post_Types;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/**
 * Registers three small core-block patterns instead of a template marketplace.
 */
final class Patterns {
	/**
	 * Register the promotion pattern category and patterns.
	 */
	public static function register(): void {
		register_block_pattern_category(
			'npcink-ad',
			array( 'label' => __( 'Npcink Ad', 'npcink-ad' ) )
		);

		register_block_pattern(
			'npcink-ad/cta-banner',
			array(
				'title'       => __( 'Promotion CTA banner', 'npcink-ad' ),
				'description' => __( 'A clear headline, supporting copy, and call-to-action button.', 'npcink-ad' ),
				'categories'  => array( 'npcink-ad' ),
				'postTypes'   => array( Post_Types::PROMOTION_POST_TYPE ),
				'content'     => '<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|40","right":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40"}},"border":{"radius":"8px"}},"backgroundColor":"contrast","textColor":"base","layout":{"type":"constrained"}} -->
<div class="wp-block-group has-base-color has-contrast-background-color has-text-color has-background" style="border-radius:8px;padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)"><!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">' . esc_html__( 'A useful offer for your readers', 'npcink-ad' ) . '</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>' . esc_html__( 'Explain the benefit in one short sentence.', 'npcink-ad' ) . '</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"backgroundColor":"base","textColor":"contrast"} -->
<div class="wp-block-button"><a class="wp-block-button__link has-contrast-color has-base-background-color has-text-color has-background wp-element-button">' . esc_html__( 'Learn more', 'npcink-ad' ) . '</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->',
			)
		);

		register_block_pattern(
			'npcink-ad/promotion-card',
			array(
				'title'       => __( 'Promotion card', 'npcink-ad' ),
				'description' => __( 'A compact bordered card for an offer, product, or affiliate link.', 'npcink-ad' ),
				'categories'  => array( 'npcink-ad' ),
				'postTypes'   => array( Post_Types::PROMOTION_POST_TYPE ),
				'content'     => '<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","right":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|30"}},"border":{"width":"1px","radius":"8px"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group" style="border-width:1px;border-radius:8px;padding-top:var(--wp--preset--spacing--30);padding-right:var(--wp--preset--spacing--30);padding-bottom:var(--wp--preset--spacing--30);padding-left:var(--wp--preset--spacing--30)"><!-- wp:heading {"level":4} -->
<h4 class="wp-block-heading">' . esc_html__( 'Featured recommendation', 'npcink-ad' ) . '</h4>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>' . esc_html__( 'Describe why this recommendation is relevant to the current page.', 'npcink-ad' ) . '</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">' . esc_html__( 'View offer', 'npcink-ad' ) . '</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->',
			)
		);

		register_block_pattern(
			'npcink-ad/announcement',
			array(
				'title'       => __( 'Compact announcement', 'npcink-ad' ),
				'description' => __( 'A compact site-owned announcement with short copy and a call-to-action button.', 'npcink-ad' ),
				'categories'  => array( 'npcink-ad' ),
				'postTypes'   => array( Post_Types::PROMOTION_POST_TYPE ),
				'content'     => '<!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|20","padding":{"top":"var:preset|spacing|20","right":"var:preset|spacing|30","bottom":"var:preset|spacing|20","left":"var:preset|spacing|30"}},"border":{"width":"1px","radius":"8px"}},"backgroundColor":"base-2","layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between"}} -->
<div class="wp-block-group has-base-2-background-color has-background" style="border-width:1px;border-radius:8px;padding-top:var(--wp--preset--spacing--20);padding-right:var(--wp--preset--spacing--30);padding-bottom:var(--wp--preset--spacing--20);padding-left:var(--wp--preset--spacing--30)"><!-- wp:paragraph -->
<p><strong>' . esc_html__( 'New:', 'npcink-ad' ) . '</strong> ' . esc_html__( 'Share a concise update and add a link to the next step.', 'npcink-ad' ) . '</p>
<!-- /wp:paragraph -->

<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"right"}} -->
<div class="wp-block-buttons"><!-- wp:button {"backgroundColor":"contrast","textColor":"base"} -->
<div class="wp-block-button"><a class="wp-block-button__link has-base-color has-contrast-background-color has-text-color has-background wp-element-button">' . esc_html__( 'Learn more', 'npcink-ad' ) . '</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->',
			)
		);
	}
}
