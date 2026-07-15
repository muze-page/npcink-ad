<?php
/**
 * Promotion repository contract tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Post_Types.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Repository.php';

/**
 * Covers datetime validity and aggregated public-target lookup.
 */
final class RepositoryTest extends TestCase {
	/**
	 * Reset repository query fixtures.
	 */
	protected function setUp(): void {
		$GLOBALS['npcink_ad_test_posts']             = array();
		$GLOBALS['npcink_ad_test_meta']              = array();
		$GLOBALS['npcink_ad_test_get_posts_queries'] = array();
		unset( $GLOBALS['npcink_ad_test_public_ids'] );
	}

	/**
	 * Empty datetime metadata is an intentional open boundary.
	 */
	public function test_empty_datetime_is_valid_and_open(): void {
		self::assertSame(
			array(
				'timestamp' => 0,
				'valid'     => true,
			),
			( new Repository() )->parse_datetime( '' )
		);
	}

	/**
	 * A real calendar value is parsed in the WordPress timezone.
	 */
	public function test_valid_datetime_preserves_timestamp_and_validity(): void {
		self::assertSame(
			array(
				'timestamp' => 1_800_000_000,
				'valid'     => true,
			),
			( new Repository() )->parse_datetime( '2027-01-15 08:00:00' )
		);
	}

	/**
	 * Non-empty invalid calendar values cannot become open boundaries.
	 */
	public function test_invalid_calendar_datetime_preserves_invalidity(): void {
		self::assertSame(
			array(
				'timestamp' => 0,
				'valid'     => false,
			),
			( new Repository() )->parse_datetime( '2027-02-30 08:00:00' )
		);
	}

	/**
	 * Stored invalid dates retain validity flags in the domain record.
	 */
	public function test_find_promotion_preserves_stored_datetime_validity(): void {
		$GLOBALS['npcink_ad_test_posts'][7] = (object) array(
			'ID'           => 7,
			'post_type'    => Post_Types::PROMOTION_POST_TYPE,
			'post_status'  => 'draft',
			'post_content' => '<p>Creative</p>',
		);
		$GLOBALS['npcink_ad_test_meta'][7]  = array(
			Post_Types::START_AT_META => '2027-02-30 08:00:00',
			Post_Types::END_AT_META   => '',
		);

		$promotion = ( new Repository() )->find_promotion( 7 );

		self::assertIsArray( $promotion );
		self::assertSame( 0, $promotion['start_at'] );
		self::assertFalse( $promotion['start_at_valid'] );
		self::assertSame( 0, $promotion['end_at'] );
		self::assertTrue( $promotion['end_at_valid'] );
	}

	/**
	 * Aggregated IDs are deduplicated and queried in fixed large batches.
	 */
	public function test_public_content_filter_uses_large_bounded_batches(): void {
		$ids = range( 1, 1200 );
		$ids[] = 2;
		$ids[] = '4';
		$GLOBALS['npcink_ad_test_public_ids'] = range( 2, 1200, 2 );

		$result  = ( new Repository() )->filter_public_content_ids( $ids );
		$queries = $GLOBALS['npcink_ad_test_get_posts_queries'];

		self::assertSame( range( 2, 1200, 2 ), $result );
		self::assertCount( 3, $queries );
		self::assertSame( array( 500, 500, 200 ), array_map( static fn ( array $query ): int => count( $query['post__in'] ), $queries ) );
		self::assertSame( 500, $queries[0]['posts_per_page'] );
		self::assertSame( 'post__in', $queries[0]['orderby'] );
	}
}
