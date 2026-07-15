<?php
/**
 * Authorization boundary for the native core REST controllers.
 *
 * @package MagickAD
 */

namespace MagickAD\REST;

use WP_Error;
use WP_REST_Request;
use WP_REST_Server;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Protects native ad and placement REST resources without custom routes.
 */
final class Core_Rest_Guard {
	/**
	 * Register the authorization boundary before REST callbacks run.
	 */
	public static function register(): void {
		add_filter( 'rest_pre_dispatch', array( self::class, 'authorize' ), 5, 3 );
	}

	/**
	 * Require Magick AD management for all native CPT REST requests.
	 *
	 * @param mixed           $result  Earlier pre-dispatch result.
	 * @param WP_REST_Server  $server  REST server instance.
	 * @param WP_REST_Request $request Current request.
	 * @return mixed|WP_Error
	 */
	public static function authorize( mixed $result, WP_REST_Server $server, WP_REST_Request $request ): mixed {
		unset( $server );

		if ( ! self::is_protected_route( $request->get_route() ) || current_user_can( 'manage_magick_ads' ) ) {
			return $result;
		}

		return new WP_Error(
			'magick_ad_rest_forbidden',
			__( 'You are not allowed to access Magick AD resources.', 'magick-ad' ),
			array( 'status' => rest_authorization_required_code() )
		);
	}

	/**
	 * Determine whether a route belongs to either native plugin post type.
	 *
	 * @param string $route Normalized REST route.
	 */
	public static function is_protected_route( string $route ): bool {
		return 1 === preg_match( '#^/wp/v2/(?:magick_ad|magick_ad_placement)(?:/|$)#', $route );
	}
}
