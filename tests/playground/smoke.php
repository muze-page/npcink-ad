<?php
/**
 * WordPress Playground integration smoke test for a packaged Npcink Ad build.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Admin\Preview_Page;
use Npcink\Ad\Blocks\Blocks;
use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use Npcink\Ad\Frontend\Delivery;
use Npcink\Ad\Frontend\Preview_Request;
use Npcink\Ad\Frontend\Renderer;

require '/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';

$check = static function ( bool $condition, string $message ): void {
	if ( ! $condition ) {
		// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Test failure messages are fixed developer strings.
		throw new RuntimeException( $message );
	}
};

$check( is_plugin_active( 'npcink-ad/npcink-ad.php' ), 'Packaged plugin was not activated.' );
$plugin_data = get_plugin_data( WP_PLUGIN_DIR . '/npcink-ad/npcink-ad.php', false, false );
$check( '/languages' === $plugin_data['DomainPath'], 'The packaged plugin does not declare its languages directory.' );
$check( post_type_exists( 'npcink_promotion' ), 'The npcink_promotion post type was not registered.' );
$check( ! post_type_exists( 'npcink_ad_placement' ), 'The removed npcink_ad_placement post type is still registered.' );
$check( get_role( 'administrator' )->has_cap( 'manage_npcink_ads' ), 'Administrators did not receive the management capability.' );
$check( get_role( 'editor' )->has_cap( 'manage_npcink_ads' ), 'Editors did not receive the management capability.' );

$promotion_meta = get_registered_meta_keys( 'post', 'npcink_promotion' );
$required_meta  = array(
	'_npcink_ad_location',
	'_npcink_ad_page_scope',
	'_npcink_ad_include_ids',
	'_npcink_ad_exclude_ids',
	'_npcink_ad_device',
	'_npcink_ad_start_at',
	'_npcink_ad_end_at',
);
foreach ( $required_meta as $meta_key ) {
	$check( isset( $promotion_meta[ $meta_key ] ), 'Missing registered promotion meta: ' . $meta_key );
}
$check( 'array' === $promotion_meta['_npcink_ad_include_ids']['type'], 'Include IDs meta is not typed as an array.' );
$check( 'array' === $promotion_meta['_npcink_ad_exclude_ids']['type'], 'Exclude IDs meta is not typed as an array.' );
$check( shortcode_exists( 'npcink_ad' ), 'The npcink_ad shortcode was not registered.' );
$check(
	WP_Block_Type_Registry::get_instance()->is_registered( 'npcink-ad/promotion' ),
	'The npcink-ad/promotion block was not registered.'
);
$editor_script = wp_scripts()->registered['npcink-ad-block-editor'] ?? null;
$check( $editor_script instanceof _WP_Dependency, 'The block editor script was not registered.' );
$check( 'npcink-ad' === $editor_script->textdomain, 'The block editor script does not use the npcink-ad text domain.' );
$check(
	WP_PLUGIN_DIR . '/npcink-ad/languages' === $editor_script->translations_path,
	'The block editor script does not use the bundled languages directory.'
);

$force_simplified_chinese = static fn ( mixed $locale ): string => 'zh_CN';
add_filter( 'pre_determine_locale', $force_simplified_chinese, PHP_INT_MAX );
unload_textdomain( 'npcink-ad', true );
$check(
	load_plugin_textdomain( 'npcink-ad', false, 'npcink-ad/languages' ),
	'The bundled Simplified Chinese MO catalog did not load.'
);
$check( '推广' === __( 'Promotions', 'npcink-ad' ), 'The PHP Simplified Chinese translation did not resolve.' );
$check(
	'Npcink Ad 推广' === _x( 'Npcink Ad Promotion', 'block title', 'npcink-ad' ),
	'The translated block metadata title did not resolve.'
);
$script_catalog_path = WP_PLUGIN_DIR . '/npcink-ad/languages/npcink-ad-zh_CN-npcink-ad-block-editor.json';
$script_catalog      = json_decode( (string) file_get_contents( $script_catalog_path ), true );
$check(
	is_array( $script_catalog ) &&
	isset( $script_catalog['locale_data']['messages']['Npcink Ad delivery'][0] ) &&
	'Npcink Ad 投放' === $script_catalog['locale_data']['messages']['Npcink Ad delivery'][0],
	'The block editor Simplified Chinese JSON catalog has an invalid translation.'
);
$script_translations = wp_scripts()->print_translations( 'npcink-ad-block-editor', false );
$check(
	is_string( $script_translations ) && str_contains( $script_translations, 'Npcink Ad delivery' ),
	'The block editor Simplified Chinese JSON catalog did not resolve.'
);
remove_filter( 'pre_determine_locale', $force_simplified_chinese, PHP_INT_MAX );
unload_textdomain( 'npcink-ad', true );
load_plugin_textdomain( 'npcink-ad', false, 'npcink-ad/languages' );

do_action( 'wp_enqueue_scripts' );
$check(
	wp_style_is( 'npcink-ad-frontend', 'enqueued' ),
	'The frontend device stylesheet was not enqueued before content rendering.'
);

wp_set_current_user( 1 );

Preview_Page::register();
global $_registered_pages;
$check(
	isset( $_registered_pages['admin_page_npcink-ad-preview'] ),
	'The hidden preview route was not registered as an accessible admin page.'
);
$check(
	str_contains( Preview_Page::url(), '/wp-admin/admin.php?page=npcink-ad-preview' ),
	'The editor preview URL does not target the registered hidden admin page.'
);

$page_a_id = wp_insert_post(
	array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Promotion target A',
		'post_content' => '<p>Page A body</p>',
	),
	true
);
$check( ! is_wp_error( $page_a_id ), 'Could not create target page A.' );

$page_b_id = wp_insert_post(
	array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Promotion target B',
		'post_content' => '<p>Page B body</p>',
	),
	true
);
$check( ! is_wp_error( $page_b_id ), 'Could not create target page B.' );

$promotion_id = wp_insert_post(
	array(
		'post_type'    => 'npcink_promotion',
		'post_status'  => 'publish',
		'post_title'   => 'Playground smoke promotion',
		'post_content' => '<!-- wp:paragraph --><p>Playground smoke creative</p><!-- /wp:paragraph -->',
	),
	true
);
$check( ! is_wp_error( $promotion_id ), 'Could not create the smoke promotion.' );
$check(
	'content_after' === get_post_meta( $promotion_id, Post_Types::LOCATION_META, true ),
	'A new promotion did not default to after-content delivery.'
);
$default_location_ids = ( new Repository() )->find_published_ids_by_location( 'content_after' );
$check(
	in_array( $promotion_id, $default_location_ids, true ),
	'A promotion using the registered default location was omitted from automatic delivery.'
);

update_post_meta( $promotion_id, Post_Types::LOCATION_META, 'block' );
update_post_meta( $promotion_id, Post_Types::PAGE_SCOPE_META, 'selected' );
update_post_meta( $promotion_id, Post_Types::INCLUDE_IDS_META, array( $page_a_id ) );
update_post_meta( $promotion_id, Post_Types::EXCLUDE_IDS_META, array() );
update_post_meta( $promotion_id, Post_Types::DEVICE_META, 'mobile' );
update_post_meta(
	$promotion_id,
	Post_Types::START_AT_META,
	current_datetime()->modify( '-1 hour' )->format( 'Y-m-d H:i:s' )
);
update_post_meta(
	$promotion_id,
	Post_Types::END_AT_META,
	current_datetime()->modify( '+1 hour' )->format( 'Y-m-d H:i:s' )
);

$candidate_ids = array_merge( array( $page_a_id, $page_a_id, 0, -1, '2.5' ), range( 1000, 1060 ) );
update_post_meta( $promotion_id, Post_Types::INCLUDE_IDS_META, $candidate_ids );
$sanitized_ids = get_post_meta( $promotion_id, Post_Types::INCLUDE_IDS_META, true );
$check( is_array( $sanitized_ids ), 'The include IDs value was not stored as an array.' );
$check( 50 === count( $sanitized_ids ), 'The include IDs value was not bounded to 50 unique IDs.' );
$check( 50 === count( array_unique( $sanitized_ids ) ), 'The include IDs value was not deduplicated.' );
$check( $page_a_id === $sanitized_ids[0], 'The first valid include ID was not preserved.' );
$check( ! in_array( -1, $sanitized_ids, true ), 'A negative include ID was accepted.' );
$check( ! in_array( 0, $sanitized_ids, true ), 'A zero include ID was accepted.' );
update_post_meta( $promotion_id, Post_Types::INCLUDE_IDS_META, array( $page_a_id ) );

$set_main_singular = static function ( int $post_id ): void {
	global $post, $wp_query, $wp_the_query;

	// phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- The smoke intentionally creates a main singular request context.
	$post = get_post( $post_id );
	// phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- The smoke intentionally creates a main singular request context.
	$wp_query                  = new WP_Query();
	$wp_query->post            = $post;
	$wp_query->posts           = array( $post );
	$wp_query->post_count      = 1;
	$wp_query->queried_object  = $post;
	$wp_query->queried_object_id = $post_id;
	$wp_query->is_singular     = true;
	$wp_query->is_page         = true;
	$wp_query->in_the_loop     = true;
	// phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Required for is_main_query() in the integration fixture.
	$wp_the_query = $wp_query;
	setup_postdata( $post );
};

$set_main_singular( $page_a_id );
wp_set_current_user( 0 );

$shortcode_output = do_shortcode( '[npcink_ad promotion="' . $promotion_id . '"]' );
$check( str_contains( $shortcode_output, 'Playground smoke creative' ), 'The shortcode did not server-render the promotion.' );
$check( str_contains( $shortcode_output, 'data-npcink-ad-promotion="' . $promotion_id . '"' ), 'The shortcode does not reference the promotion directly.' );
$check( str_contains( $shortcode_output, 'npcink-ad-device-mobile' ), 'The shortcode omitted the cache-stable mobile CSS class.' );

$block_output = do_blocks( '<!-- wp:npcink-ad/promotion {"promotionId":' . $promotion_id . '} /-->' );
$check( str_contains( $block_output, 'Playground smoke creative' ), 'The dynamic block did not server-render the promotion.' );
$check( str_contains( $block_output, 'wp-block-npcink-ad-promotion' ), 'The dynamic block wrapper is missing.' );

$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );
$normal_mobile_target = $delivery->render_promotion( $promotion_id, 'block', 0, null, $page_a_id );
$preview_mobile       = $delivery->render_promotion( $promotion_id, 'block', 0, 'mobile', $page_a_id );
$preview_desktop      = $delivery->render_promotion( $promotion_id, 'block', 0, 'desktop', $page_a_id );
$wrong_page           = $delivery->render_promotion( $promotion_id, 'block', 0, 'mobile', $page_b_id );
$check( str_contains( $normal_mobile_target, 'Playground smoke creative' ), 'Normal delivery incorrectly server-filtered a mobile promotion.' );
$check( str_contains( $preview_mobile, 'Playground smoke creative' ), 'Matching mobile preview did not render.' );
$check( '' === $preview_desktop, 'Desktop preview rendered a mobile-only promotion.' );
$check( '' === $wrong_page, 'A selected-page promotion rendered on a non-included page.' );

wp_set_current_user( 1 );
update_post_meta( $promotion_id, Post_Types::LOCATION_META, 'content_before' );
wp_set_current_user( 0 );
$set_main_singular( $page_a_id );
$before_delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );
$before_output   = $before_delivery->filter_content( '<p>Page body</p>' );
$check( str_contains( $before_output, 'Playground smoke creative' ), 'Automatic before-content delivery did not render.' );
$check(
	strpos( $before_output, 'Playground smoke creative' ) < strpos( $before_output, 'Page body' ),
	'Automatic before-content delivery rendered in the wrong order.'
);
$before_repeated = $before_delivery->filter_content( $before_output );
$check(
	1 === substr_count( $before_repeated, 'data-npcink-ad-promotion="' . $promotion_id . '"' ),
	'Repeated the_content filtering duplicated an automatic promotion.'
);
$set_main_singular( $page_b_id );
$check( ! str_contains( $before_delivery->filter_content( '<p>Page body</p>' ), 'Playground smoke creative' ), 'Automatic delivery ignored selected-page scope.' );

wp_set_current_user( 1 );
update_post_meta( $promotion_id, Post_Types::LOCATION_META, 'content_after' );
update_post_meta( $promotion_id, Post_Types::PAGE_SCOPE_META, 'all' );
update_post_meta( $promotion_id, Post_Types::EXCLUDE_IDS_META, array( $page_b_id ) );
wp_set_current_user( 0 );
$set_main_singular( $page_a_id );
$after_delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );
$after_output   = $after_delivery->filter_content( '<p>Page body</p>' );
$check( str_contains( $after_output, 'Playground smoke creative' ), 'Automatic after-content delivery did not render.' );
$check(
	strpos( $after_output, 'Playground smoke creative' ) > strpos( $after_output, 'Page body' ),
	'Automatic after-content delivery rendered in the wrong order.'
);
$set_main_singular( $page_b_id );
$check( ! str_contains( $after_delivery->filter_content( '<p>Page body</p>' ), 'Playground smoke creative' ), 'Automatic delivery ignored page exclusion.' );

wp_set_current_user( 1 );
update_post_meta( $promotion_id, Post_Types::LOCATION_META, 'block' );
update_post_meta( $promotion_id, Post_Types::PAGE_SCOPE_META, 'selected' );
update_post_meta( $promotion_id, Post_Types::INCLUDE_IDS_META, array( $page_a_id ) );
update_post_meta( $promotion_id, Post_Types::EXCLUDE_IDS_META, array() );
update_post_meta( $promotion_id, Post_Types::DEVICE_META, 'mobile' );
update_post_meta( $promotion_id, Post_Types::START_AT_META, '' );
update_post_meta( $promotion_id, Post_Types::END_AT_META, '' );
$set_main_singular( $page_a_id );

$preview_nonce = wp_create_nonce( 'npcink_ad_preview_' . $promotion_id );
$_GET          = array(
	'npcink_ad_preview'        => (string) $promotion_id,
	'npcink_ad_preview_device' => 'mobile',
	'npcink_ad_preview_nonce'  => $preview_nonce,
);

$block_preview_delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );
$block_preview_request  = new Preview_Request( $block_preview_delivery, new Repository() );
$block_preview_request->activate();
$positioned_block = ( new Blocks( $block_preview_delivery ) )->render(
	array(
		'promotionId' => $promotion_id,
		'preview'     => true,
	)
);
$positioned_page = $block_preview_request->filter_content( $positioned_block );
$check(
	1 === substr_count( $positioned_page, 'data-npcink-ad-promotion="' . $promotion_id . '"' ),
	'A real-page block preview duplicated the target promotion.'
);
$check( str_contains( $positioned_page, 'npcink-ad-preview-verdict' ), 'The real-position block preview omitted its verdict.' );
$check(
	! str_contains( $positioned_page, 'Manual block preview is shown after the page content.' ),
	'A page containing the target block also rendered the fallback preview.'
);
remove_filter( 'the_content', array( $block_preview_request, 'filter_content' ), 999 );

$fallback_delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );
$fallback_request  = new Preview_Request( $fallback_delivery, new Repository() );
$fallback_request->activate();
$fallback_page = $fallback_request->filter_content( '<p>Page body</p>' );
$check(
	1 === substr_count( $fallback_page, 'data-npcink-ad-promotion="' . $promotion_id . '"' ),
	'A block preview fallback did not render exactly one promotion.'
);
$check(
	str_contains( $fallback_page, 'Manual block preview is shown after the page content.' ),
	'A page without the target block omitted the fallback explanation.'
);
remove_filter( 'the_content', array( $fallback_request, 'filter_content' ), 999 );
$_GET = array();

wp_set_current_user( 1 );
update_post_meta( $promotion_id, Post_Types::PAGE_SCOPE_META, 'selected' );
update_post_meta( $promotion_id, Post_Types::INCLUDE_IDS_META, array( $page_a_id ) );
update_post_meta( $promotion_id, Post_Types::EXCLUDE_IDS_META, array() );
update_post_meta(
	$promotion_id,
	Post_Types::START_AT_META,
	current_datetime()->modify( '+1 hour' )->format( 'Y-m-d H:i:s' )
);
wp_set_current_user( 0 );
$check( '' === do_shortcode( '[npcink_ad promotion="' . $promotion_id . '"]' ), 'A not-started promotion rendered anonymously.' );

wp_set_current_user( 1 );
update_post_meta( $promotion_id, Post_Types::START_AT_META, '' );
update_post_meta(
	$promotion_id,
	Post_Types::END_AT_META,
	current_datetime()->modify( '-1 hour' )->format( 'Y-m-d H:i:s' )
);
wp_set_current_user( 0 );
$check( '' === do_shortcode( '[npcink_ad promotion="' . $promotion_id . '"]' ), 'An expired promotion rendered anonymously.' );

wp_set_current_user( 1 );
update_post_meta( $promotion_id, Post_Types::END_AT_META, '' );
wp_update_post(
	array(
		'ID'          => $promotion_id,
		'post_status' => 'draft',
	)
);
wp_set_current_user( 0 );
$check( '' === do_shortcode( '[npcink_ad promotion="' . $promotion_id . '"]' ), 'A draft promotion rendered anonymously.' );

$rest_server = rest_get_server();
if ( 0 === did_action( 'rest_api_init' ) ) {
	do_action( 'rest_api_init', $rest_server );
}

$collection_response = rest_do_request( new WP_REST_Request( 'GET', '/wp/v2/npcink_promotion' ) );
$collection_status   = $collection_response->get_status();
$collection_body     = (string) wp_json_encode( $collection_response->get_data() );
$check(
	in_array( $collection_status, array( 401, 403 ), true ),
	'Anonymous REST collection access returned HTTP ' . $collection_status . ' instead of 401/403.'
);
$check( ! str_contains( $collection_body, 'Playground smoke creative' ), 'Anonymous REST collection access exposed promotion content.' );

$single_response = rest_do_request( new WP_REST_Request( 'GET', '/wp/v2/npcink_promotion/' . $promotion_id ) );
$single_status   = $single_response->get_status();
$single_body     = (string) wp_json_encode( $single_response->get_data() );
$check(
	in_array( $single_status, array( 401, 403 ), true ),
	'Anonymous REST single-promotion access returned HTTP ' . $single_status . ' instead of 401/403.'
);
$check( ! str_contains( $single_body, 'Playground smoke creative' ), 'Anonymous REST single-promotion access exposed promotion content.' );

$placement_response = rest_do_request( new WP_REST_Request( 'GET', '/wp/v2/npcink_ad_placement' ) );
$check( 404 === $placement_response->get_status(), 'The removed placement REST collection still exists.' );

global $wpdb;
$plugin_options = $wpdb->get_col(
	$wpdb->prepare(
		'SELECT option_name FROM %i WHERE option_name LIKE %s',
		$wpdb->options,
		$wpdb->esc_like( 'npcink_ad_' ) . '%'
	)
);
$check( array() === $plugin_options, 'The single-promotion workflow created plugin options.' );

$plugin_tables = $wpdb->get_col(
	$wpdb->prepare(
		'SHOW TABLES LIKE %s',
		$wpdb->esc_like( $wpdb->prefix . 'npcink_ad' ) . '%'
	)
);
$check( array() === $plugin_tables, 'The single-promotion workflow created custom tables.' );

$placement_records = get_posts(
	array(
		'post_type'      => 'npcink_ad_placement',
		'post_status'    => 'any',
		'posts_per_page' => -1,
		'fields'         => 'ids',
	)
);
$check( array() === $placement_records, 'The single-promotion workflow created placement records.' );

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	define( 'WP_UNINSTALL_PLUGIN', 'npcink-ad/npcink-ad.php' );
}
require WP_PLUGIN_DIR . '/npcink-ad/uninstall.php';
$check( null === get_post( $promotion_id ), 'Explicit uninstall did not delete the promotion.' );
$check( ! get_role( 'administrator' )->has_cap( 'manage_npcink_ads' ), 'Explicit uninstall did not remove the management capability.' );
$check( ! get_role( 'editor' )->has_cap( 'manage_npcink_ads' ), 'Explicit uninstall did not remove the editor capability.' );

$result = array(
	'status'    => 'NPCINK_AD_SMOKE_OK',
	'model'     => 'single-promotion',
	'wordpress' => get_bloginfo( 'version' ),
	'php'       => PHP_VERSION,
	'plugin'    => defined( 'NPCINK_AD_VERSION' ) ? NPCINK_AD_VERSION : null,
);
$result_json = wp_json_encode( $result, JSON_PRETTY_PRINT );
$result_dir  = WP_CONTENT_DIR . '/npcink-ad-smoke-results';

$check( wp_mkdir_p( $result_dir ), 'Could not create the smoke result directory.' );
$check( false !== file_put_contents( $result_dir . '/result.json', $result_json ), 'Could not persist the smoke result.' );

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI smoke protocol emits its generated JSON verbatim.
echo 'NPCINK_AD_SMOKE_OK ' . $result_json;
