<?php
/**
 * Native Promotion metadata contract tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Data\Post_Types;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Post_Types.php';

/**
 * Covers paragraph location and typed-meta boundaries.
 */
final class PostTypesTest extends TestCase {
	/**
	 * Reset captured metadata registrations.
	 */
	protected function setUp(): void {
		$GLOBALS['npcink_ad_test_registered_post_meta'] = array();
	}

	/**
	 * Paragraph placement is an explicit location without changing the legacy default.
	 */
	public function test_paragraph_location_is_supported_without_changing_the_default(): void {
		self::assertContains( 'content_after_paragraph', Post_Types::LOCATIONS );
		self::assertSame( 'content_after', Post_Types::sanitize_location( 'unsupported' ) );
	}

	/**
	 * Content scope is a destructive five-value replacement for page scope.
	 */
	public function test_content_scope_contract_is_exact_and_defaults_to_all(): void {
		self::assertSame( '_npcink_ad_content_scope', Post_Types::CONTENT_SCOPE_META );
		self::assertSame( array( 'all', 'posts', 'pages', 'terms', 'selected' ), Post_Types::CONTENT_SCOPES );
		self::assertSame( 'all', Post_Types::sanitize_content_scope( '' ) );
		self::assertSame( 'posts', Post_Types::sanitize_content_scope( 'POSTS' ) );
		self::assertSame( 'all', Post_Types::sanitize_content_scope( 'unsupported' ) );
	}

	/**
	 * Scope and taxonomy metadata share the revisioned REST contract.
	 */
	public function test_editorial_scope_meta_is_revisioned_and_typed(): void {
		$method = new ReflectionMethod( Post_Types::class, 'register_meta' );
		$method->invoke( null );

		$scope_args = $GLOBALS['npcink_ad_test_registered_post_meta'][ Post_Types::CONTENT_SCOPE_META ]['args'];
		self::assertSame( 'string', $scope_args['type'] );
		self::assertSame( 'all', $scope_args['default'] );
		self::assertTrue( $scope_args['revisions_enabled'] );
		self::assertSame( Post_Types::CONTENT_SCOPES, $scope_args['show_in_rest']['schema']['enum'] );

		foreach ( array( Post_Types::CATEGORY_IDS_META, Post_Types::TAG_IDS_META ) as $meta_key ) {
			$args   = $GLOBALS['npcink_ad_test_registered_post_meta'][ $meta_key ]['args'];
			$schema = $args['show_in_rest']['schema'];
			self::assertSame( 'array', $args['type'] );
			self::assertSame( array(), $args['default'] );
			self::assertTrue( $args['revisions_enabled'] );
			self::assertSame( Post_Types::MAX_POST_IDS, $schema['maxItems'] );
			self::assertTrue( $schema['uniqueItems'] );
			self::assertSame( array( Post_Types::class, 'sanitize_post_ids' ), $args['sanitize_callback'] );
			self::assertSame( array( Post_Types::class, 'can_manage_meta' ), $args['auth_callback'] );
		}
	}

	/**
	 * Taxonomy lists retain only unique positive IDs within the REST bound.
	 */
	public function test_editorial_term_ids_are_positive_unique_and_bounded(): void {
		$raw_ids = array_merge( array( 0, -1, '2', 2, 'bad' ), range( 3, 70 ) );

		self::assertSame( range( 2, 51 ), Post_Types::sanitize_post_ids( $raw_ids ) );
	}

	/**
	 * Core REST enforces integer shape while publish preflight owns the range.
	 */
	public function test_paragraph_meta_is_integer_revisioned_and_draft_permissive(): void {
		$method = new ReflectionMethod( Post_Types::class, 'register_meta' );
		$method->invoke( null );

		$registration = $GLOBALS['npcink_ad_test_registered_post_meta'][ Post_Types::PARAGRAPH_NUMBER_META ];
		$args         = $registration['args'];
		$schema       = $args['show_in_rest']['schema'];

		self::assertSame( Post_Types::PROMOTION_POST_TYPE, $registration['post_type'] );
		self::assertStringStartsWith( '_', Post_Types::PARAGRAPH_NUMBER_META );
		self::assertSame( 'integer', $args['type'] );
		self::assertTrue( $args['single'] );
		self::assertSame( Post_Types::DEFAULT_PARAGRAPH_NUMBER, $args['default'] );
		self::assertTrue( $args['revisions_enabled'] );
		self::assertSame( array( 'type' => 'integer' ), $schema );
		self::assertSame( array( Post_Types::class, 'sanitize_paragraph_number' ), $args['sanitize_callback'] );
		self::assertSame( array( Post_Types::class, 'can_manage_meta' ), $args['auth_callback'] );
	}

	/**
	 * Provide storage normalization boundaries.
	 *
	 * @return array<string, array{mixed, int}>
	 */
	public static function paragraph_storage_values(): array {
		return array(
			'minimum'                 => array( 1, 1 ),
			'maximum'                 => array( 20, 20 ),
			'lower out of range'       => array( 0, 0 ),
			'upper out of range'       => array( 21, 21 ),
			'negative out of range'    => array( -2, -2 ),
			'integer string normalized' => array( '003', 3 ),
			'non-integer sentinel'      => array( '3.5', 0 ),
		);
	}

	/**
	 * Storage normalization never hides an out-of-range integer as the default.
	 *
	 * @param mixed $raw      Raw metadata input.
	 * @param int   $expected Expected stored representation.
	 */
	#[DataProvider( 'paragraph_storage_values' )]
	public function test_paragraph_storage_sanitizer_preserves_out_of_range_integers( mixed $raw, int $expected ): void {
		self::assertSame( $expected, Post_Types::sanitize_paragraph_number( $raw ) );
	}

	/**
	 * Provide domain validity boundaries.
	 *
	 * @return array<string, array{mixed, array{number: int, valid: bool}}>
	 */
	public static function paragraph_domain_values(): array {
		return array(
			'minimum'            => array(
				1,
				array(
					'number' => 1,
					'valid' => true,
				),
			),
			'default'            => array(
				'3',
				array(
					'number' => 3,
					'valid' => true,
				),
			),
			'maximum'            => array(
				20,
				array(
					'number' => 20,
					'valid' => true,
				),
			),
			'zero retained'       => array(
				0,
				array(
					'number' => 0,
					'valid' => false,
				),
			),
			'twenty one retained' => array(
				21,
				array(
					'number' => 21,
					'valid' => false,
				),
			),
			'empty is invalid'    => array(
				'',
				array(
					'number' => 0,
					'valid' => false,
				),
			),
			'fraction is invalid' => array(
				3.5,
				array(
					'number' => 0,
					'valid' => false,
				),
			),
		);
	}

	/**
	 * Domain parsing separates integer normalization from publish validity.
	 *
	 * @param mixed                           $raw      Raw metadata input.
	 * @param array{number: int, valid: bool} $expected Expected parsed result.
	 */
	#[DataProvider( 'paragraph_domain_values' )]
	public function test_paragraph_domain_parser_preserves_validity_evidence( mixed $raw, array $expected ): void {
		self::assertSame( $expected, Post_Types::parse_paragraph_number( $raw ) );
	}
}
