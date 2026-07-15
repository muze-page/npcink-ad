<?php
/**
 * WordPress Playground integration smoke test for a packaged Magick AD build.
 */

require '/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';

$check = static function ( bool $condition, string $message ): void {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
};

$check( is_plugin_active( 'magick-ad/magick-ad.php' ), 'Packaged plugin was not activated.' );
$check( post_type_exists( 'magick_ad' ), 'The magick_ad post type was not registered.' );
$check( post_type_exists( 'magick_ad_placement' ), 'The magick_ad_placement post type was not registered.' );

$ad_meta        = get_registered_meta_keys( 'post', 'magick_ad' );
$placement_meta = get_registered_meta_keys( 'post', 'magick_ad_placement' );
$check( isset( $ad_meta['_magick_ad_end_at'] ), 'The ad expiration meta was not registered.' );
$check( isset( $placement_meta['_magick_ad_ad_id'] ), 'The placement ad meta was not registered.' );
$check( isset( $placement_meta['_magick_ad_location'] ), 'The placement location meta was not registered.' );
$check( isset( $placement_meta['_magick_ad_device'] ), 'The placement device meta was not registered.' );
$check( shortcode_exists( 'magick_ad' ), 'The magick_ad shortcode was not registered.' );
$check(
	WP_Block_Type_Registry::get_instance()->is_registered( 'magick-ad/ad' ),
	'The magick-ad/ad block was not registered.'
);

wp_set_current_user( 1 );

$ad_id = wp_insert_post(
	array(
		'post_type'    => 'magick_ad',
		'post_status'  => 'publish',
		'post_title'   => 'Playground smoke ad',
		'post_content' => '<!-- wp:paragraph --><p>Playground smoke creative</p><!-- /wp:paragraph -->',
	),
	true
);
$check( ! is_wp_error( $ad_id ), 'Could not create the smoke ad.' );

$placement_id = wp_insert_post(
	array(
		'post_type'   => 'magick_ad_placement',
		'post_status' => 'publish',
		'post_title'  => 'Playground smoke placement',
	),
	true
);
$check( ! is_wp_error( $placement_id ), 'Could not create the smoke placement.' );

update_post_meta( $placement_id, '_magick_ad_ad_id', $ad_id );
update_post_meta( $placement_id, '_magick_ad_location', 'shortcode' );
update_post_meta( $placement_id, '_magick_ad_device', 'all' );

wp_set_current_user( 0 );

$shortcode_output = do_shortcode( '[magick_ad placement="' . $placement_id . '"]' );
$check( str_contains( $shortcode_output, 'Playground smoke creative' ), 'The shortcode did not server-render the ad.' );
$check( str_contains( $shortcode_output, 'magick-ad-placement' ), 'The shortcode output wrapper is missing.' );

update_post_meta( $placement_id, '_magick_ad_location', 'block' );
$block_output = do_blocks( '<!-- wp:magick-ad/ad {"placementId":' . $placement_id . '} /-->' );
$check( str_contains( $block_output, 'Playground smoke creative' ), 'The dynamic block did not server-render the ad.' );
$check( str_contains( $block_output, 'wp-block-magick-ad-ad' ), 'The dynamic block wrapper is missing.' );

$rest_server = rest_get_server();
if ( 0 === did_action( 'rest_api_init' ) ) {
	do_action( 'rest_api_init', $rest_server );
}

$collection_response = rest_do_request( new WP_REST_Request( 'GET', '/wp/v2/magick_ad' ) );
$collection_status   = $collection_response->get_status();
$collection_body     = (string) wp_json_encode( $collection_response->get_data() );
$check(
	in_array( $collection_status, array( 401, 403 ), true ),
	'Anonymous REST collection access returned HTTP ' . $collection_status . ' instead of 401/403.'
);
$check(
	! str_contains( $collection_body, 'Playground smoke creative' ),
	'Anonymous REST collection access exposed ad content.'
);

$single_response = rest_do_request(
	new WP_REST_Request( 'GET', '/wp/v2/magick_ad/' . $ad_id )
);
$single_status = $single_response->get_status();
$single_body   = (string) wp_json_encode( $single_response->get_data() );
$check(
	in_array( $single_status, array( 401, 403 ), true ),
	'Anonymous REST single-ad access returned HTTP ' . $single_status . ' instead of 401/403.'
);
$check(
	! str_contains( $single_body, 'Playground smoke creative' ),
	'Anonymous REST single-ad access exposed ad content.'
);

$placement_collection_response = rest_do_request(
	new WP_REST_Request( 'GET', '/wp/v2/magick_ad_placement' )
);
$placement_collection_status = $placement_collection_response->get_status();
$placement_collection_body   = (string) wp_json_encode( $placement_collection_response->get_data() );
$check(
	in_array( $placement_collection_status, array( 401, 403 ), true ),
	'Anonymous REST placement collection access returned HTTP ' . $placement_collection_status . ' instead of 401/403.'
);
$check(
	! str_contains( $placement_collection_body, 'Playground smoke placement' ),
	'Anonymous REST placement collection access exposed placement data.'
);

$placement_single_response = rest_do_request(
	new WP_REST_Request( 'GET', '/wp/v2/magick_ad_placement/' . $placement_id )
);
$placement_single_status = $placement_single_response->get_status();
$placement_single_body   = (string) wp_json_encode( $placement_single_response->get_data() );
$check(
	in_array( $placement_single_status, array( 401, 403 ), true ),
	'Anonymous REST single-placement access returned HTTP ' . $placement_single_status . ' instead of 401/403.'
);
$check(
	! str_contains( $placement_single_body, 'Playground smoke placement' ),
	'Anonymous REST single-placement access exposed placement data.'
);

update_post_meta( $placement_id, '_magick_ad_location', 'shortcode' );
update_post_meta(
	$ad_id,
	'_magick_ad_end_at',
	current_datetime()->modify( '-1 hour' )->format( 'Y-m-d H:i:s' )
);
$expired_output = do_shortcode( '[magick_ad placement="' . $placement_id . '"]' );
$check( '' === $expired_output, 'An expired ad rendered for an anonymous visitor.' );

$result = array(
	'status'    => 'MAGICK_AD_SMOKE_OK',
	'wordpress' => get_bloginfo( 'version' ),
	'php'       => PHP_VERSION,
	'plugin'    => defined( 'MAGICK_AD_VERSION' ) ? MAGICK_AD_VERSION : null,
);
$result_json = wp_json_encode( $result, JSON_PRETTY_PRINT );
$result_dir  = WP_CONTENT_DIR . '/magick-ad-smoke-results';

$check( wp_mkdir_p( $result_dir ), 'Could not create the smoke result directory.' );
$check(
	false !== file_put_contents( $result_dir . '/result.json', $result_json ),
	'Could not persist the smoke result.'
);

echo 'MAGICK_AD_SMOKE_OK ' . $result_json;
