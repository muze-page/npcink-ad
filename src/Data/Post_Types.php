<?php
/**
 * Native promotion content type and its typed metadata.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Data;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the single-record promotion data model.
 */
final class Post_Types {
	public const PROMOTION_POST_TYPE = 'npcink_promotion';

	public const LOCATION_META         = '_npcink_ad_location';
	public const CONTENT_SCOPE_META    = '_npcink_ad_content_scope';
	public const INCLUDE_IDS_META      = '_npcink_ad_include_ids';
	public const EXCLUDE_IDS_META      = '_npcink_ad_exclude_ids';
	public const CATEGORY_IDS_META     = '_npcink_ad_category_ids';
	public const TAG_IDS_META          = '_npcink_ad_tag_ids';
	public const DEVICE_META           = '_npcink_ad_device';
	public const START_AT_META         = '_npcink_ad_start_at';
	public const END_AT_META           = '_npcink_ad_end_at';
	public const PARAGRAPH_NUMBER_META = '_npcink_ad_paragraph_number';

	public const LOCATIONS                = array( 'block', 'content_before', 'content_after', 'content_after_paragraph' );
	public const CONTENT_SCOPES           = array( 'all', 'posts', 'pages', 'terms', 'selected' );
	public const DEVICES                  = array( 'all', 'desktop', 'mobile' );
	public const MAX_POST_IDS             = 50;
	public const DEFAULT_PARAGRAPH_NUMBER = 3;
	public const MIN_PARAGRAPH_NUMBER     = 1;
	public const MAX_PARAGRAPH_NUMBER     = 20;

	/**
	 * Register the native post type and its metadata.
	 */
	public static function register(): void {
		register_post_type( self::PROMOTION_POST_TYPE, self::promotion_args() );
		self::register_meta();
	}

	/**
	 * Build common capabilities for all management operations.
	 *
	 * @return array<string, string>
	 */
	private static function capabilities(): array {
		return array(
			'edit_post'              => 'manage_npcink_ads',
			'read_post'              => 'manage_npcink_ads',
			'delete_post'            => 'manage_npcink_ads',
			'edit_posts'             => 'manage_npcink_ads',
			'edit_others_posts'      => 'manage_npcink_ads',
			'delete_posts'           => 'manage_npcink_ads',
			'publish_posts'          => 'manage_npcink_ads',
			'read_private_posts'     => 'manage_npcink_ads',
			'delete_private_posts'   => 'manage_npcink_ads',
			'delete_published_posts' => 'manage_npcink_ads',
			'delete_others_posts'    => 'manage_npcink_ads',
			'edit_private_posts'     => 'manage_npcink_ads',
			'edit_published_posts'   => 'manage_npcink_ads',
			'create_posts'           => 'manage_npcink_ads',
		);
	}

	/**
	 * Arguments for the promotion post type.
	 *
	 * @return array<string, mixed>
	 */
	private static function promotion_args(): array {
		return array(
			'labels'              => array(
				'name'               => __( 'Promotions', 'npcink-ad' ),
				'singular_name'      => __( 'Promotion', 'npcink-ad' ),
				'add_new_item'       => __( 'Add New Promotion', 'npcink-ad' ),
				'edit_item'          => __( 'Edit Promotion', 'npcink-ad' ),
				'new_item'           => __( 'New Promotion', 'npcink-ad' ),
				'view_item'          => __( 'View Promotion', 'npcink-ad' ),
				'search_items'       => __( 'Search Promotions', 'npcink-ad' ),
				'not_found'          => __( 'No promotions found.', 'npcink-ad' ),
				'not_found_in_trash' => __( 'No promotions found in Trash.', 'npcink-ad' ),
				'all_items'          => __( 'Promotions', 'npcink-ad' ),
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
	 * Register typed promotion metadata with the core REST API.
	 */
	private static function register_meta(): void {
		self::register_enum_meta( self::LOCATION_META, 'content_after', self::LOCATIONS, array( self::class, 'sanitize_location' ) );
		self::register_enum_meta( self::CONTENT_SCOPE_META, 'all', self::CONTENT_SCOPES, array( self::class, 'sanitize_content_scope' ) );
		self::register_id_list_meta( self::INCLUDE_IDS_META );
		self::register_id_list_meta( self::EXCLUDE_IDS_META );
		self::register_id_list_meta( self::CATEGORY_IDS_META );
		self::register_id_list_meta( self::TAG_IDS_META );
		self::register_enum_meta( self::DEVICE_META, 'all', self::DEVICES, array( self::class, 'sanitize_device' ) );
		self::register_datetime_meta( self::START_AT_META );
		self::register_datetime_meta( self::END_AT_META );
		self::register_paragraph_number_meta();
	}

	/**
	 * Register an allow-listed string metadata field.
	 *
	 * @param string   $key      Metadata key.
	 * @param string   $default  Default value.
	 * @param string[] $allowed  Allowed values.
	 * @param callable $sanitize Sanitization callback.
	 */
	private static function register_enum_meta( string $key, string $default, array $allowed, callable $sanitize ): void {
		register_post_meta(
			self::PROMOTION_POST_TYPE,
			$key,
			array(
				'type'              => 'string',
				'single'            => true,
				'default'           => $default,
				'revisions_enabled' => true,
				'show_in_rest'      => array(
					'schema' => array(
						'type' => 'string',
						'enum' => $allowed,
					),
				),
				'sanitize_callback' => $sanitize,
				'auth_callback'     => array( self::class, 'can_manage_meta' ),
			)
		);
	}

	/**
	 * Register one bounded list of positive post IDs.
	 *
	 * @param string $key Metadata key.
	 */
	private static function register_id_list_meta( string $key ): void {
		register_post_meta(
			self::PROMOTION_POST_TYPE,
			$key,
			array(
				'type'              => 'array',
				'single'            => true,
				'default'           => array(),
				'revisions_enabled' => true,
				'show_in_rest'      => array(
					'schema' => array(
						'type'        => 'array',
						'items'       => array(
							'type'    => 'integer',
							'minimum' => 1,
						),
						'maxItems'    => self::MAX_POST_IDS,
						'uniqueItems' => true,
					),
				),
				'sanitize_callback' => array( self::class, 'sanitize_post_ids' ),
				'auth_callback'     => array( self::class, 'can_manage_meta' ),
			)
		);
	}

	/**
	 * Register an optional WordPress-local datetime field.
	 *
	 * @param string $key Metadata key.
	 */
	private static function register_datetime_meta( string $key ): void {
		register_post_meta(
			self::PROMOTION_POST_TYPE,
			$key,
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
				'sanitize_callback' => array( self::class, 'sanitize_datetime' ),
				'auth_callback'     => array( self::class, 'can_manage_meta' ),
			)
		);
	}

	/**
	 * Register the paragraph anchor used by paragraph placement.
	 *
	 * The Core REST schema intentionally enforces only the integer type. Range
	 * validation belongs to publish preflight so drafts can retain incomplete
	 * values for correction instead of losing the original evidence.
	 */
	private static function register_paragraph_number_meta(): void {
		register_post_meta(
			self::PROMOTION_POST_TYPE,
			self::PARAGRAPH_NUMBER_META,
			array(
				'type'              => 'integer',
				'single'            => true,
				'default'           => self::DEFAULT_PARAGRAPH_NUMBER,
				'revisions_enabled' => true,
				'show_in_rest'      => array(
					'schema' => array(
						'type' => 'integer',
					),
				),
				'sanitize_callback' => array( self::class, 'sanitize_paragraph_number' ),
				'auth_callback'     => array( self::class, 'can_manage_meta' ),
			)
		);
	}

	/**
	 * Validate a WordPress-local datetime.
	 *
	 * @param mixed $value Raw metadata value.
	 * @return string Empty or a valid WordPress-local datetime.
	 */
	public static function sanitize_datetime( mixed $value ): string {
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
	 * Sanitize a delivery location.
	 *
	 * @param mixed $value Raw metadata value.
	 */
	public static function sanitize_location( mixed $value ): string {
		$value = sanitize_key( (string) $value );

		return in_array( $value, self::LOCATIONS, true ) ? $value : 'content_after';
	}

	/**
	 * Parse a raw paragraph number without discarding validity evidence.
	 *
	 * @param mixed $value Raw paragraph number.
	 * @return array{number: int, valid: bool}
	 */
	public static function parse_paragraph_number( mixed $value ): array {
		$integer_input = is_int( $value )
			|| ( is_string( $value ) && 1 === preg_match( '/^-?[0-9]+$/', $value ) );
		$number        = self::sanitize_paragraph_number( $value );

		return array(
			'number' => $number,
			'valid'  => $integer_input
				&& self::MIN_PARAGRAPH_NUMBER <= $number
				&& self::MAX_PARAGRAPH_NUMBER >= $number,
		);
	}

	/**
	 * Normalize an integer representation without enforcing publish policy.
	 *
	 * Out-of-range integers are deliberately preserved. Non-integer values use
	 * zero as an invalid sentinel; the REST type schema rejects them before this
	 * callback during supported writes.
	 *
	 * @param mixed $value Raw paragraph number.
	 */
	public static function sanitize_paragraph_number( mixed $value ): int {
		if ( is_int( $value ) ) {
			return $value;
		}
		if ( is_string( $value ) && 1 === preg_match( '/^-?[0-9]+$/', $value ) ) {
			return (int) $value;
		}

		return 0;
	}

	/**
	 * Sanitize a content scope.
	 *
	 * @param mixed $value Raw metadata value.
	 */
	public static function sanitize_content_scope( mixed $value ): string {
		$value = sanitize_key( (string) $value );

		return in_array( $value, self::CONTENT_SCOPES, true ) ? $value : 'all';
	}

	/**
	 * Sanitize a device rule.
	 *
	 * @param mixed $value Raw metadata value.
	 */
	public static function sanitize_device( mixed $value ): string {
		$value = sanitize_key( (string) $value );

		return in_array( $value, self::DEVICES, true ) ? $value : 'all';
	}

	/**
	 * Normalize, deduplicate, and bound a list of positive post IDs.
	 *
	 * @param mixed $value Raw metadata value.
	 * @return list<int>
	 */
	public static function sanitize_post_ids( mixed $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$ids = array();
		foreach ( $value as $raw_id ) {
			if ( ! is_int( $raw_id ) && ( ! is_string( $raw_id ) || 1 !== preg_match( '/^[1-9][0-9]*$/', $raw_id ) ) ) {
				continue;
			}

			$id = filter_var( $raw_id, FILTER_VALIDATE_INT, array( 'options' => array( 'min_range' => 1 ) ) );
			if ( false === $id || isset( $ids[ $id ] ) ) {
				continue;
			}

			$ids[ $id ] = $id;
			if ( self::MAX_POST_IDS === count( $ids ) ) {
				break;
			}
		}

		return array_values( $ids );
	}

	/**
	 * Restrict all metadata access to Npcink Ad managers.
	 */
	public static function can_manage_meta(): bool {
		return current_user_can( 'manage_npcink_ads' );
	}
}
