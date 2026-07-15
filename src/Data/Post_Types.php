<?php
/**
 * Native content types and their typed metadata.
 *
 * @package MagickAD
 */

namespace MagickAD\Data;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the clean-baseline data model.
 */
final class Post_Types {
	public const AD_POST_TYPE        = 'magick_ad';
	public const PLACEMENT_POST_TYPE = 'magick_ad_placement';

	public const AD_END_AT_META       = '_magick_ad_end_at';
	public const PLACEMENT_AD_META     = '_magick_ad_ad_id';
	public const PLACEMENT_LOCATION    = '_magick_ad_location';
	public const PLACEMENT_DEVICE_META = '_magick_ad_device';

	public const LOCATIONS = array( 'block', 'shortcode', 'content_before', 'content_after' );
	public const DEVICES   = array( 'all', 'desktop', 'mobile' );

	/**
	 * Register both native post types and their metadata.
	 */
	public static function register(): void {
		register_post_type( self::AD_POST_TYPE, self::ad_args() );
		register_post_type( self::PLACEMENT_POST_TYPE, self::placement_args() );

		self::register_meta();
	}

	/**
	 * Build common capabilities for all management operations.
	 *
	 * @return array<string, string>
	 */
	private static function capabilities(): array {
		return array(
			'edit_post'              => 'manage_magick_ads',
			'read_post'              => 'manage_magick_ads',
			'delete_post'            => 'manage_magick_ads',
			'edit_posts'             => 'manage_magick_ads',
			'edit_others_posts'      => 'manage_magick_ads',
			'delete_posts'           => 'manage_magick_ads',
			'publish_posts'          => 'manage_magick_ads',
			'read_private_posts'     => 'manage_magick_ads',
			'delete_private_posts'   => 'manage_magick_ads',
			'delete_published_posts' => 'manage_magick_ads',
			'delete_others_posts'    => 'manage_magick_ads',
			'edit_private_posts'     => 'manage_magick_ads',
			'edit_published_posts'   => 'manage_magick_ads',
			'create_posts'           => 'manage_magick_ads',
		);
	}

	/**
	 * Arguments for the ad post type.
	 *
	 * @return array<string, mixed>
	 */
	private static function ad_args(): array {
		return array(
			'labels'              => array(
				'name'               => __( 'Ads', 'magick-ad' ),
				'singular_name'      => __( 'Ad', 'magick-ad' ),
				'add_new_item'       => __( 'Add New Ad', 'magick-ad' ),
				'edit_item'          => __( 'Edit Ad', 'magick-ad' ),
				'new_item'           => __( 'New Ad', 'magick-ad' ),
				'view_item'          => __( 'View Ad', 'magick-ad' ),
				'search_items'       => __( 'Search Ads', 'magick-ad' ),
				'not_found'          => __( 'No ads found.', 'magick-ad' ),
				'not_found_in_trash' => __( 'No ads found in Trash.', 'magick-ad' ),
				'all_items'          => __( 'Ads', 'magick-ad' ),
			),
			'public'              => false,
			'show_ui'             => true,
			'show_in_menu'        => false,
			'show_in_rest'        => true,
			'publicly_queryable'  => false,
			'exclude_from_search' => true,
			'show_in_nav_menus'   => false,
			'query_var'           => false,
			'rewrite'             => false,
			'supports'            => array( 'title', 'editor', 'author', 'revisions', 'custom-fields' ),
			'capabilities'        => self::capabilities(),
			'map_meta_cap'        => false,
			'menu_icon'           => 'dashicons-megaphone',
		);
	}

	/**
	 * Arguments for the placement post type.
	 *
	 * @return array<string, mixed>
	 */
	private static function placement_args(): array {
		return array(
			'labels'              => array(
				'name'               => __( 'Placements', 'magick-ad' ),
				'singular_name'      => __( 'Placement', 'magick-ad' ),
				'add_new_item'       => __( 'Add New Placement', 'magick-ad' ),
				'edit_item'          => __( 'Edit Placement', 'magick-ad' ),
				'new_item'           => __( 'New Placement', 'magick-ad' ),
				'view_item'          => __( 'View Placement', 'magick-ad' ),
				'search_items'       => __( 'Search Placements', 'magick-ad' ),
				'not_found'          => __( 'No placements found.', 'magick-ad' ),
				'not_found_in_trash' => __( 'No placements found in Trash.', 'magick-ad' ),
				'all_items'          => __( 'Placements', 'magick-ad' ),
			),
			'public'              => false,
			'show_ui'             => true,
			'show_in_menu'        => false,
			'show_in_rest'        => true,
			'publicly_queryable'  => false,
			'exclude_from_search' => true,
			'show_in_nav_menus'   => false,
			'query_var'           => false,
			'rewrite'             => false,
			'supports'            => array( 'title', 'custom-fields' ),
			'capabilities'        => self::capabilities(),
			'map_meta_cap'        => false,
			'menu_icon'           => 'dashicons-location-alt',
		);
	}

	/**
	 * Register typed post metadata with the core REST API.
	 */
	private static function register_meta(): void {
		register_post_meta(
			self::AD_POST_TYPE,
			self::AD_END_AT_META,
			array(
				'type'              => 'string',
				'single'            => true,
				'default'           => '',
				'revisions_enabled' => true,
				'show_in_rest'      => array(
					'schema' => array(
						'type'    => 'string',
						'pattern' => '^(|[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2})$',
					),
				),
				'sanitize_callback' => array( self::class, 'sanitize_end_at' ),
				'auth_callback'     => array( self::class, 'can_manage_meta' ),
			)
		);

		register_post_meta(
			self::PLACEMENT_POST_TYPE,
			self::PLACEMENT_AD_META,
			array(
				'type'              => 'integer',
				'single'            => true,
				'default'           => 0,
				'show_in_rest'      => array(
					'schema' => array(
						'type'    => 'integer',
						'minimum' => 0,
					),
				),
				'sanitize_callback' => 'absint',
				'auth_callback'     => array( self::class, 'can_manage_meta' ),
			)
		);

		register_post_meta(
			self::PLACEMENT_POST_TYPE,
			self::PLACEMENT_LOCATION,
			array(
				'type'              => 'string',
				'single'            => true,
				'default'           => 'block',
				'show_in_rest'      => array(
					'schema' => array(
						'type' => 'string',
						'enum' => self::LOCATIONS,
					),
				),
				'sanitize_callback' => array( self::class, 'sanitize_location' ),
				'auth_callback'     => array( self::class, 'can_manage_meta' ),
			)
		);

		register_post_meta(
			self::PLACEMENT_POST_TYPE,
			self::PLACEMENT_DEVICE_META,
			array(
				'type'              => 'string',
				'single'            => true,
				'default'           => 'all',
				'show_in_rest'      => array(
					'schema' => array(
						'type' => 'string',
						'enum' => self::DEVICES,
					),
				),
				'sanitize_callback' => array( self::class, 'sanitize_device' ),
				'auth_callback'     => array( self::class, 'can_manage_meta' ),
			)
		);
	}

	/**
	 * Validate an ad expiration time.
	 *
	 * @param mixed $value Raw metadata value.
	 * @return string Empty or a valid WordPress local datetime.
	 */
	public static function sanitize_end_at( mixed $value ): string {
		$value = sanitize_text_field( (string) $value );
		if ( '' === $value ) {
			return '';
		}

		$date   = \DateTimeImmutable::createFromFormat( '!Y-m-d H:i:s', $value );
		$errors = \DateTimeImmutable::getLastErrors();
		if ( false === $date || ( is_array( $errors ) && ( 0 < $errors['warning_count'] || 0 < $errors['error_count'] ) ) ) {
			return '';
		}

		return $date->format( 'Y-m-d H:i:s' ) === $value ? $value : '';
	}

	/**
	 * Sanitize a placement location.
	 *
	 * @param mixed $value Raw metadata value.
	 */
	public static function sanitize_location( mixed $value ): string {
		$value = sanitize_key( (string) $value );

		return in_array( $value, self::LOCATIONS, true ) ? $value : 'block';
	}

	/**
	 * Sanitize a placement device.
	 *
	 * @param mixed $value Raw metadata value.
	 */
	public static function sanitize_device( mixed $value ): string {
		$value = sanitize_key( (string) $value );

		return in_array( $value, self::DEVICES, true ) ? $value : 'all';
	}

	/**
	 * Restrict all metadata access to Magick AD managers.
	 */
	public static function can_manage_meta(): bool {
		return current_user_can( 'manage_magick_ads' );
	}
}
