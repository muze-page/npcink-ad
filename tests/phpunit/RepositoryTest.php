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
require_once __DIR__ . '/PromotionStatusWordPressPost.php';
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
		$GLOBALS['npcink_ad_test_posts'][7] = new WP_Post(
			array(
				'ID'           => 7,
				'post_type'    => Post_Types::PROMOTION_POST_TYPE,
				'post_status'  => 'draft',
				'post_content' => '<p>Creative</p>',
			)
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

	/**
	 * Published automatic Promotions are loaded and mapped in one query.
	 */
	public function test_published_automatic_promotions_are_loaded_as_one_domain_batch(): void {
		$GLOBALS['npcink_ad_test_posts'] = array(
			1 => $this->promotion_post( 1, 'publish' ),
			2 => $this->promotion_post( 2, 'publish' ),
			3 => $this->promotion_post( 3, 'publish' ),
			4 => $this->promotion_post( 4, 'publish' ),
			5 => $this->promotion_post( 5, 'draft' ),
		);
		$GLOBALS['npcink_ad_test_meta']  = array(
			1 => $this->promotion_meta( 'content_before' ),
			2 => $this->promotion_meta( 'content_after' ),
			3 => $this->promotion_meta( '' ),
			4 => $this->promotion_meta( 'block' ),
			5 => $this->promotion_meta( 'content_before' ),
		);

		$promotions = ( new Repository() )->find_published_automatic_promotions();
		$queries    = $GLOBALS['npcink_ad_test_get_posts_queries'];

		self::assertSame( array( 1, 2, 3 ), array_column( $promotions, 'id' ) );
		self::assertSame( array( 'content_before', 'content_after', 'content_after' ), array_column( $promotions, 'location' ) );
		self::assertCount( 1, $queries );
		self::assertSame( Post_Types::PROMOTION_POST_TYPE, $queries[0]['post_type'] );
		self::assertSame( 'publish', $queries[0]['post_status'] );
		self::assertTrue( $queries[0]['update_post_meta_cache'] );
		self::assertSame( 'OR', $queries[0]['meta_query']['relation'] );
	}

	/**
	 * Build one native Promotion fixture.
	 *
	 * @param int    $id     Post ID.
	 * @param string $status Post status.
	 */
	private function promotion_post( int $id, string $status ): WP_Post {
		return new WP_Post(
			array(
				'ID'           => $id,
				'post_type'    => Post_Types::PROMOTION_POST_TYPE,
				'post_status'  => $status,
				'post_content' => '<p>Creative ' . $id . '</p>',
			)
		);
	}

	/**
	 * Build complete typed metadata for one Promotion fixture.
	 *
	 * @param string $location Stored location, or empty for the default.
	 * @return array<string, mixed>
	 */
	private function promotion_meta( string $location ): array {
		return array(
			Post_Types::LOCATION_META    => $location,
			Post_Types::PAGE_SCOPE_META  => 'all',
			Post_Types::INCLUDE_IDS_META => array(),
			Post_Types::EXCLUDE_IDS_META => array(),
			Post_Types::DEVICE_META      => 'all',
			Post_Types::START_AT_META    => '',
			Post_Types::END_AT_META      => '',
		);
	}
}
