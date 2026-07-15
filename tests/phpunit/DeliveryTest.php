<?php
/**
 * Automatic Promotion delivery scope tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use Npcink\Ad\Frontend\Delivery;
use Npcink\Ad\Frontend\Renderer;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once __DIR__ . '/DeliveryWordPressStubs.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Post_Types.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Repository.php';
require_once dirname( __DIR__, 2 ) . '/src/Presentation/Eligibility_Messages.php';
require_once dirname( __DIR__, 2 ) . '/src/Frontend/Renderer.php';
require_once dirname( __DIR__, 2 ) . '/src/Frontend/Delivery.php';

/**
 * Covers the request-level guard around automatic content placement.
 */
final class DeliveryTest extends TestCase {
	/**
	 * Reset request fixtures.
	 */
	protected function setUp(): void {
		$GLOBALS['npcink_ad_test_singular_post_type'] = '';
		$GLOBALS['npcink_ad_test_singular_arguments'] = array();
	}

	/**
	 * Automatic placement does not extend to arbitrary singular post types.
	 */
	public function test_automatic_content_placement_is_limited_to_posts_and_pages(): void {
		$GLOBALS['npcink_ad_test_singular_post_type'] = 'product';
		$delivery = new Delivery( new Repository(), new Eligibility_Evaluator(), new Renderer() );
		$content  = '<p>Product body</p>';

		self::assertSame( $content, $delivery->filter_content( $content ) );
		self::assertSame(
			array( array( 'post', 'page' ) ),
			$GLOBALS['npcink_ad_test_singular_arguments']
		);
	}
}
