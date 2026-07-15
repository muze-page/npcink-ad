<?php
/**
 * Promotion editor advisory-settings tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Admin\Editor;
use Npcink\Ad\Data\Repository;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once __DIR__ . '/EditorWordPressStubs.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Post_Types.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Repository.php';
require_once dirname( __DIR__, 2 ) . '/src/Admin/Editor.php';

/**
 * Covers the minimal server-to-editor overlap rule payload.
 */
final class EditorTest extends TestCase {
	/**
	 * Reset public-content query fixtures.
	 */
	protected function setUp(): void {
		$GLOBALS['npcink_ad_test_get_posts_queries'] = array();
		$GLOBALS['npcink_ad_test_public_ids']        = array( 10, 12, 13, 21, 22, 30, 31, 32 );
	}

	/**
	 * Remove public-content query fixtures.
	 */
	protected function tearDown(): void {
		unset( $GLOBALS['npcink_ad_test_get_posts_queries'], $GLOBALS['npcink_ad_test_public_ids'] );
	}

	/**
	 * Rules omit creative/current data and retain only public standard targets.
	 */
	public function test_overlap_settings_are_minimal_and_filter_public_targets_once(): void {
		$method = new ReflectionMethod( Editor::class, 'editor_overlap_settings' );
		$rules  = $method->invoke(
			null,
			array(
				array(
					'id'          => 7,
					'content'     => '<p>Current secret creative</p>',
					'location'    => 'content_after',
					'page_scope'  => 'all',
					'include_ids' => array( 99 ),
					'exclude_ids' => array( 98 ),
					'device'      => 'all',
				),
				array(
					'id'             => 8,
					'content'        => '<p>Other secret creative</p>',
					'location'       => 'content_before',
					'page_scope'     => 'selected',
					'include_ids'    => array( 10, '11', 12, 15, 10, 0 ),
					'exclude_ids'    => array( 12, 13, 14 ),
					'device'         => 'mobile',
					'start_at'       => 1_800_000_000,
					'start_at_valid' => true,
					'end_at'         => 1_800_003_600,
					'end_at_valid'   => true,
				),
				array(
					'id'               => 9,
					'location'         => 'content_after_paragraph',
					'page_scope'       => 'selected',
					'include_ids'      => array( 20, 21 ),
					'exclude_ids'      => array( 22, 23 ),
					'device'           => 'desktop',
					'paragraph_number' => 0,
				),
			),
			array(
				'id'          => 7,
				'location'    => 'content_after',
				'page_scope'  => 'selected',
				'include_ids' => array( 30, 31, 40 ),
				'exclude_ids' => array( 31, 32, 41 ),
				'device'      => 'all',
			),
			7,
			new Repository()
		);

		self::assertSame(
			array(
				'publicContentIds'              => array( 30, 31, 32 ),
				'publishedAutomaticPromotions' => array(
					array(
						'id'              => 8,
						'location'        => 'content_before',
						'pageScope'       => 'selected',
						'includeIds'      => array( 10, 12 ),
						'excludeIds'      => array( 12 ),
						'device'          => 'mobile',
						'paragraphNumber' => 3,
						'startAt'         => '2027-01-15 08:00:00',
						'endAt'           => '2027-01-15 09:00:00',
						'scheduleValid'   => true,
					),
					array(
						'id'              => 9,
						'location'        => 'content_after_paragraph',
						'pageScope'       => 'selected',
						'includeIds'      => array( 21 ),
						'excludeIds'      => array(),
						'device'          => 'desktop',
						'paragraphNumber' => 0,
						'startAt'         => '',
						'endAt'           => '',
						'scheduleValid'   => true,
					),
				),
			),
			$rules
		);
		self::assertArrayNotHasKey( 'content', $rules['publishedAutomaticPromotions'][0] );
		self::assertCount( 1, $GLOBALS['npcink_ad_test_get_posts_queries'] );
		$queried_ids = $GLOBALS['npcink_ad_test_get_posts_queries'][0]['post__in'];
		sort( $queried_ids );
		self::assertSame( array( 10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 30, 31, 32, 40, 41 ), $queried_ids );
	}
}
