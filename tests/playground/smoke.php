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

/**
 * Exception used to observe wp_die() responses without ending the CLI smoke.
 */
final class Npcink_Ad_Smoke_Wp_Die_Exception extends RuntimeException {}

$expect_wp_die = static function ( callable $callback ): int {
	$wp_die_handler = static function ( mixed $message, string $title, array $args ): void {
		unset( $title );
		$response = isset( $args['response'] ) ? absint( $args['response'] ) : 0;

		// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Test-only handler preserves wp_die details for assertions.
		throw new Npcink_Ad_Smoke_Wp_Die_Exception( is_string( $message ) ? $message : 'wp_die', $response );
	};
	$wp_die_filter  = static fn (): callable => $wp_die_handler;

	add_filter( 'wp_die_handler', $wp_die_filter );
	try {
		$callback();
	} catch ( Npcink_Ad_Smoke_Wp_Die_Exception $exception ) {
		return $exception->getCode();
	} finally {
		remove_filter( 'wp_die_handler', $wp_die_filter );
	}

	throw new RuntimeException( 'Expected the request to terminate through wp_die().' );
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

$original_timezone_string = get_option( 'timezone_string' );
$original_gmt_offset      = get_option( 'gmt_offset' );
try {
	update_option( 'timezone_string', 'Asia/Shanghai' );
	update_option( 'gmt_offset', 8 );

	$repository         = new Repository();
	$shanghai_timestamp = $repository->datetime_to_timestamp( '2026-01-15 08:00:00' );
	$check(
		gmmktime( 0, 0, 0, 1, 15, 2026 ) === $shanghai_timestamp,
		'The repository did not parse a WordPress-local datetime in the configured site timezone.'
	);

	$boundary_promotion = array(
		'status'      => 'publish',
		'content'     => '<p>Schedule boundary creative</p>',
		'page_scope'  => 'all',
		'include_ids' => array(),
		'exclude_ids' => array(),
		'start_at'    => $shanghai_timestamp,
		'end_at'      => $shanghai_timestamp + HOUR_IN_SECONDS,
	);
	$evaluator          = new Eligibility_Evaluator();
	$at_start           = $evaluator->assess_readiness( $boundary_promotion, $boundary_promotion['start_at'] );
	$before_end         = $evaluator->assess_readiness( $boundary_promotion, $boundary_promotion['end_at'] - 1 );
	$at_end             = $evaluator->assess_readiness( $boundary_promotion, $boundary_promotion['end_at'] );
	$check( $at_start['ready'], 'The shared evaluator did not treat the start boundary as inclusive.' );
	$check( $before_end['ready'], 'The shared evaluator rejected the final second before the end boundary.' );
	$check( ! $at_end['ready'], 'The shared evaluator did not treat the end boundary as exclusive.' );
	$check(
		in_array( 'promotion_expired', $at_end['reasons'], true ),
		'The shared evaluator omitted the expired reason at the end boundary.'
	);
} finally {
	update_option( 'timezone_string', $original_timezone_string );
	update_option( 'gmt_offset', $original_gmt_offset );
}
$check( get_option( 'timezone_string' ) === $original_timezone_string, 'The smoke did not restore the site timezone string.' );
$check( get_option( 'gmt_offset' ) === $original_gmt_offset, 'The smoke did not restore the site GMT offset.' );

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
$subscriber_id = wp_insert_user(
	array(
		'user_login' => 'npcink_ad_smoke_subscriber',
		'user_pass'  => wp_generate_password( 24, true, true ),
		'user_email' => 'npcink-ad-smoke@example.test',
		'role'       => 'subscriber',
	)
);
$check( ! is_wp_error( $subscriber_id ), 'Could not create the low-privilege smoke user.' );
$subscriber_id = absint( $subscriber_id );
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

$preview_action = 'npcink_ad_preview_' . $promotion_id;

wp_set_current_user( $subscriber_id );
$subscriber_preview_nonce = wp_create_nonce( $preview_action );
$_GET                    = array(
	'promotion' => (string) $promotion_id,
	'target'    => (string) $page_a_id,
	'device'    => 'mobile',
	'_wpnonce'  => $subscriber_preview_nonce,
);
$check(
	403 === $expect_wp_die(
		static function (): void {
			Preview_Page::render();
		}
	),
	'A subscriber accessed the authenticated preview page.'
);

wp_set_current_user( 1 );
$wrong_promotion_nonce = wp_create_nonce( 'npcink_ad_preview_' . ( $promotion_id + 1 ) );
$_GET                  = array(
	'promotion' => (string) $promotion_id,
	'target'    => (string) $page_a_id,
	'device'    => 'mobile',
	'_wpnonce'  => $wrong_promotion_nonce,
);
$check(
	403 === $expect_wp_die(
		static function (): void {
			Preview_Page::render();
		}
	),
	'The preview page accepted a nonce bound to another promotion.'
);

$preview_nonce = wp_create_nonce( $preview_action );
$_GET          = array(
	'promotion' => (string) $promotion_id,
	'target'    => (string) $page_a_id,
	'device'    => 'mobile',
	'_wpnonce'  => $preview_nonce,
);
ob_start();
Preview_Page::render();
$preview_page_html = (string) ob_get_clean();
$check( str_contains( $preview_page_html, 'npcink_ad_preview=' . $promotion_id ), 'A manager could not render the bound real-page preview URL.' );
$check( 1 === substr_count( $preview_page_html, 'aria-current="page"' ), 'The preview page did not expose exactly one current device.' );
$check(
	1 === preg_match( '#<a[^>]*aria-current="page"[^>]*>Mobile</a>#', $preview_page_html ),
	'The mobile preview link did not expose its current state programmatically.'
);

wp_set_current_user( $subscriber_id );
$_GET = array(
	'npcink_ad_preview'        => (string) $promotion_id,
	'npcink_ad_preview_device' => 'mobile',
	'npcink_ad_preview_nonce'  => $subscriber_preview_nonce,
);
$subscriber_preview_request = new Preview_Request(
	new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() ),
	new Repository()
);
$check(
	403 === $expect_wp_die(
		static function () use ( $subscriber_preview_request ): void {
			$subscriber_preview_request->activate();
		}
	),
	'A subscriber activated a real-page preview request.'
);

wp_set_current_user( 1 );
$_GET = array(
	'npcink_ad_preview'        => (string) $promotion_id,
	'npcink_ad_preview_device' => 'mobile',
	'npcink_ad_preview_nonce'  => $wrong_promotion_nonce,
);
$invalid_preview_request = new Preview_Request(
	new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() ),
	new Repository()
);
$check(
	403 === $expect_wp_die(
		static function () use ( $invalid_preview_request ): void {
			$invalid_preview_request->activate();
		}
	),
	'The real-page preview request accepted a nonce bound to another promotion.'
);

$_GET          = array(
	'npcink_ad_preview'        => (string) $promotion_id,
	'npcink_ad_preview_device' => 'mobile',
	'npcink_ad_preview_nonce'  => $preview_nonce,
);

$block_preview_delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );
$block_preview_request  = new Preview_Request( $block_preview_delivery, new Repository() );
$block_preview_request->activate();
$check(
	defined( 'DONOTCACHEPAGE' ) && true === DONOTCACHEPAGE,
	'An authorized real-page preview did not disable full-page caching.'
);
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

wp_set_current_user( 1 );
$check( current_user_can( 'manage_npcink_ads' ), 'The REST write smoke did not run as the current administrator.' );
$write_promotion_via_rest = static function ( ?int $promotion_id, array $params ): WP_REST_Response {
	$route   = '/wp/v2/npcink_promotion' . ( null === $promotion_id ? '' : '/' . $promotion_id );
	$request = new WP_REST_Request( 'POST', $route );
	$request->set_body_params( $params );

	return rest_do_request( $request );
};
$assert_preflight_error  = static function (
	WP_REST_Response $response,
	string $expected_reason,
	string $message
) use ( $check ): void {
	$data    = $response->get_data();
	$reasons = is_array( $data ) && isset( $data['data']['reasons'] ) && is_array( $data['data']['reasons'] )
		? $data['data']['reasons']
		: array();

	$check( 400 === $response->get_status(), $message . ' The REST response was not HTTP 400.' );
	$check(
		is_array( $data ) && 'npcink_ad_promotion_not_ready' === ( $data['code'] ?? '' ),
		$message . ' The REST response omitted the preflight error code.'
	);
	$check( in_array( $expected_reason, $reasons, true ), $message . ' The REST response omitted the expected reason.' );
};

$blank_draft_response = $write_promotion_via_rest(
	null,
	array(
		'status'  => 'draft',
		'title'   => 'REST preflight smoke promotion',
		'content' => '',
	)
);
$blank_draft_data     = $blank_draft_response->get_data();
$rest_promotion_id    = is_array( $blank_draft_data ) ? absint( $blank_draft_data['id'] ?? 0 ) : 0;
$check( 201 === $blank_draft_response->get_status(), 'Core REST did not allow an empty Promotion draft to be created.' );
$check( 0 < $rest_promotion_id, 'Core REST did not return the created Promotion draft ID.' );
$check( 'draft' === get_post_status( $rest_promotion_id ), 'The empty REST Promotion was not saved as a draft.' );

$empty_publish_response = $write_promotion_via_rest(
	$rest_promotion_id,
	array(
		'status' => 'publish',
	)
);
$assert_preflight_error(
	$empty_publish_response,
	'promotion_content_empty',
	'Core REST allowed an empty Promotion to publish.'
);
$check( 'draft' === get_post_status( $rest_promotion_id ), 'A rejected empty publish changed the Promotion status.' );

$future_date           = current_datetime()->modify( '+1 day' );
$future_date_gmt       = $future_date->setTimezone( new DateTimeZone( 'UTC' ) );
$empty_future_response = $write_promotion_via_rest(
	$rest_promotion_id,
	array(
		'status'   => 'future',
		'date'     => $future_date->format( 'Y-m-d\TH:i:s' ),
		'date_gmt' => $future_date_gmt->format( 'Y-m-d\TH:i:s' ),
	)
);
$assert_preflight_error(
	$empty_future_response,
	'promotion_content_empty',
	'Core REST allowed an empty Promotion to bypass preflight through future scheduling.'
);
$check( 'draft' === get_post_status( $rest_promotion_id ), 'A rejected future schedule changed the Promotion status.' );

$non_public_target_id = wp_insert_post(
	array(
		'post_type'   => 'page',
		'post_status' => 'draft',
		'post_title'  => 'Non-public REST preflight target',
	),
	true
);
$check( ! is_wp_error( $non_public_target_id ), 'Could not create the non-public REST preflight target.' );
$invalid_targets_response = $write_promotion_via_rest(
	$rest_promotion_id,
	array(
		'status'  => 'publish',
		'content' => '<!-- wp:paragraph --><p>REST preflight creative</p><!-- /wp:paragraph -->',
		'meta'    => array(
			Post_Types::PAGE_SCOPE_META  => 'selected',
			Post_Types::INCLUDE_IDS_META => array( absint( $non_public_target_id ), 999999999 ),
			Post_Types::EXCLUDE_IDS_META => array(),
		),
	)
);
$assert_preflight_error(
	$invalid_targets_response,
	'promotion_targets_empty',
	'Core REST allowed a selected Promotion with no public target to publish.'
);
$check( 'draft' === get_post_status( $rest_promotion_id ), 'A rejected target publish changed the Promotion status.' );

$invalid_schedule_response = $write_promotion_via_rest(
	$rest_promotion_id,
	array(
		'status'  => 'publish',
		'content' => '<!-- wp:paragraph --><p>REST preflight creative</p><!-- /wp:paragraph -->',
		'meta'    => array(
			Post_Types::PAGE_SCOPE_META  => 'all',
			Post_Types::INCLUDE_IDS_META => array(),
			Post_Types::EXCLUDE_IDS_META => array(),
			Post_Types::START_AT_META    => '2026-01-15 09:00:00',
			Post_Types::END_AT_META      => '2026-01-15 09:00:00',
		),
	)
);
$assert_preflight_error(
	$invalid_schedule_response,
	'promotion_schedule_invalid',
	'Core REST allowed a Promotion with an invalid schedule to publish.'
);
$check( 'draft' === get_post_status( $rest_promotion_id ), 'A rejected schedule publish changed the Promotion status.' );

$invalid_calendar_response = $write_promotion_via_rest(
	$rest_promotion_id,
	array(
		'status'  => 'publish',
		'content' => '<!-- wp:paragraph --><p>REST preflight creative</p><!-- /wp:paragraph -->',
		'meta'    => array(
			Post_Types::LOCATION_META    => 'block',
			Post_Types::PAGE_SCOPE_META  => 'selected',
			Post_Types::INCLUDE_IDS_META => array( $page_a_id ),
			Post_Types::EXCLUDE_IDS_META => array(),
			Post_Types::DEVICE_META      => 'all',
			Post_Types::START_AT_META    => '2026-02-31 12:00:00',
			Post_Types::END_AT_META      => '2026-03-02 12:00:00',
		),
	)
);
$assert_preflight_error(
	$invalid_calendar_response,
	'promotion_schedule_invalid',
	'Core REST allowed a Promotion with a formatted but impossible calendar date to publish.'
);
$check( 'draft' === get_post_status( $rest_promotion_id ), 'A rejected invalid calendar date changed the Promotion status.' );

$valid_start = current_datetime()->modify( '-1 hour' )->format( 'Y-m-d H:i:s' );
$valid_end   = current_datetime()->modify( '+1 hour' )->format( 'Y-m-d H:i:s' );
$valid_publish_response = $write_promotion_via_rest(
	$rest_promotion_id,
	array(
		'status'  => 'publish',
		'content' => '<!-- wp:paragraph --><p>REST preflight creative</p><!-- /wp:paragraph -->',
		'meta'    => array(
			Post_Types::LOCATION_META    => 'block',
			Post_Types::PAGE_SCOPE_META  => 'selected',
			Post_Types::INCLUDE_IDS_META => array( $page_a_id ),
			Post_Types::EXCLUDE_IDS_META => array(),
			Post_Types::DEVICE_META      => 'all',
			Post_Types::START_AT_META    => $valid_start,
			Post_Types::END_AT_META      => $valid_end,
		),
	)
);
$check( 200 === $valid_publish_response->get_status(), 'Core REST rejected a complete and valid Promotion configuration.' );
$check( 'publish' === get_post_status( $rest_promotion_id ), 'Core REST did not publish the valid Promotion.' );
$check(
	array( $page_a_id ) === get_post_meta( $rest_promotion_id, Post_Types::INCLUDE_IDS_META, true ),
	'Core REST did not persist the valid public target.'
);

wp_delete_post( absint( $non_public_target_id ), true );
wp_delete_post( $rest_promotion_id, true );
$check( null === get_post( $rest_promotion_id ), 'The REST preflight fixture was not removed before later smoke assertions.' );

$future_fixture_date     = current_datetime()->modify( '+2 days' );
$future_fixture_date_gmt = $future_fixture_date->setTimezone( new DateTimeZone( 'UTC' ) );
$future_fixture_start    = $future_fixture_date->modify( '+1 hour' )->format( 'Y-m-d H:i:s' );
$future_fixture_end      = $future_fixture_date->modify( '+1 day' )->format( 'Y-m-d H:i:s' );
$valid_future_response   = $write_promotion_via_rest(
	null,
	array(
		'status'   => 'future',
		'title'    => 'Valid future REST preflight promotion',
		'content'  => '<!-- wp:paragraph --><p>Scheduled REST preflight creative</p><!-- /wp:paragraph -->',
		'date'     => $future_fixture_date->format( 'Y-m-d\TH:i:s' ),
		'date_gmt' => $future_fixture_date_gmt->format( 'Y-m-d\TH:i:s' ),
		'meta'     => array(
			Post_Types::LOCATION_META    => 'block',
			Post_Types::PAGE_SCOPE_META  => 'selected',
			Post_Types::INCLUDE_IDS_META => array( $page_a_id ),
			Post_Types::EXCLUDE_IDS_META => array(),
			Post_Types::DEVICE_META      => 'mobile',
			Post_Types::START_AT_META    => $future_fixture_start,
			Post_Types::END_AT_META      => $future_fixture_end,
		),
	)
);
$valid_future_data       = $valid_future_response->get_data();
$future_promotion_id     = is_array( $valid_future_data ) ? absint( $valid_future_data['id'] ?? 0 ) : 0;
$future_promotion        = get_post( $future_promotion_id );
$check( 201 === $valid_future_response->get_status(), 'Core REST rejected a complete and valid future Promotion.' );
$check( $future_promotion instanceof WP_Post, 'Core REST did not create the valid future Promotion.' );
$check( 'future' === $future_promotion->post_status, 'The valid future Promotion was not scheduled.' );
$check(
	$future_fixture_date->format( 'Y-m-d H:i:s' ) === $future_promotion->post_date,
	'The valid future Promotion did not persist its local schedule date.'
);
$check(
	$future_fixture_date_gmt->format( 'Y-m-d H:i:s' ) === $future_promotion->post_date_gmt,
	'The valid future Promotion did not persist its GMT schedule date.'
);
$check(
	'block' === get_post_meta( $future_promotion_id, Post_Types::LOCATION_META, true ),
	'The valid future Promotion did not persist its location.'
);
$check(
	'selected' === get_post_meta( $future_promotion_id, Post_Types::PAGE_SCOPE_META, true ),
	'The valid future Promotion did not persist its page scope.'
);
$check(
	array( $page_a_id ) === get_post_meta( $future_promotion_id, Post_Types::INCLUDE_IDS_META, true ),
	'The valid future Promotion did not persist its public target.'
);
$check(
	'mobile' === get_post_meta( $future_promotion_id, Post_Types::DEVICE_META, true ),
	'The valid future Promotion did not persist its device rule.'
);
$check(
	get_post_meta( $future_promotion_id, Post_Types::START_AT_META, true ) === $future_fixture_start,
	'The valid future Promotion did not persist its custom start time.'
);
$check(
	get_post_meta( $future_promotion_id, Post_Types::END_AT_META, true ) === $future_fixture_end,
	'The valid future Promotion did not persist its custom end time.'
);
wp_delete_post( $future_promotion_id, true );
$check( null === get_post( $future_promotion_id ), 'The valid future fixture was not removed before later smoke assertions.' );

$admin_collection_request = new WP_REST_Request( 'GET', '/wp/v2/npcink_promotion' );
$admin_collection_request->set_query_params(
	array(
		'context' => 'edit',
		'status'  => 'draft',
		'include' => array( $promotion_id ),
	)
);
$admin_collection_response = rest_do_request( $admin_collection_request );
$admin_collection_body     = (string) wp_json_encode( $admin_collection_response->get_data() );
$check( 200 === $admin_collection_response->get_status(), 'An administrator could not access the protected REST collection.' );
$check( str_contains( $admin_collection_body, 'Playground smoke creative' ), 'The authorized REST collection omitted the promotion.' );

$admin_single_request = new WP_REST_Request( 'GET', '/wp/v2/npcink_promotion/' . $promotion_id );
$admin_single_request->set_param( 'context', 'edit' );
$admin_single_response = rest_do_request( $admin_single_request );
$admin_single_body     = (string) wp_json_encode( $admin_single_response->get_data() );
$check( 200 === $admin_single_response->get_status(), 'An administrator could not access the protected REST promotion.' );
$check( str_contains( $admin_single_body, 'Playground smoke creative' ), 'The authorized REST promotion omitted its creative.' );

wp_set_current_user( $subscriber_id );
$subscriber_collection_response = rest_do_request( new WP_REST_Request( 'GET', '/wp/v2/npcink_promotion' ) );
$subscriber_single_response     = rest_do_request( new WP_REST_Request( 'GET', '/wp/v2/npcink_promotion/' . $promotion_id ) );
$check( 403 === $subscriber_collection_response->get_status(), 'A subscriber accessed the protected REST collection.' );
$check( 403 === $subscriber_single_response->get_status(), 'A subscriber accessed the protected REST promotion.' );

wp_set_current_user( 0 );
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
