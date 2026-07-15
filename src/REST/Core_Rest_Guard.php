<?php
/**
 * Authorization boundary for the native core REST controllers.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\REST;

use WP_Error;
use WP_REST_Request;
use WP_REST_Server;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Protects the native promotion REST resource without custom routes.
 */
final class Core_Rest_Guard {
	/**
	 * Register the authorization boundary before REST callbacks run.
	 */
	public static function register(): void {
		add_filter( 'rest_pre_dispatch', array( self::class, 'authorize' ), 5, 3 );
	}

	/**
	 * Require Npcink Ad management for all native CPT REST requests.
	 *
	 * @param mixed           $result  Earlier pre-dispatch result.
	 * @param WP_REST_Server  $server  REST server instance.
	 * @param WP_REST_Request $request Current request.
	 * @return mixed|WP_Error
	 */
	public static function authorize( mixed $result, WP_REST_Server $server, WP_REST_Request $request ): mixed {
		unset( $server );

		if ( ! self::is_protected_route( $request->get_route() ) || current_user_can( 'manage_npcink_ads' ) ) {
			return $result;
		}

		return new WP_Error(
			'npcink_ad_rest_forbidden',
			__( 'You are not allowed to access Npcink Ad resources.', 'npcink-ad' ),
			array( 'status' => rest_authorization_required_code() )
		);
	}

	/**
	 * Determine whether a route belongs to the native promotion post type.
	 *
	 * @param string $route Normalized REST route.
	 */
	public static function is_protected_route( string $route ): bool {
		return 1 === preg_match( '#^/wp/v2/npcink_promotion(?:/|$)#', $route );
	}
}
