<?php
/**
 * Real-page preview target-boundary tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use Npcink\Ad\Frontend\Delivery;
use Npcink\Ad\Frontend\Preview_Request;
use Npcink\Ad\Frontend\Renderer;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once __DIR__ . '/PromotionStatusWordPressPost.php';
require_once __DIR__ . '/DeliveryWordPressStubs.php';
require_once __DIR__ . '/PreviewRequestWpDieException.php';
require_once __DIR__ . '/PreviewRequestWordPressStubs.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Post_Types.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Repository.php';
require_once dirname( __DIR__, 2 ) . '/src/Presentation/Eligibility_Messages.php';
require_once dirname( __DIR__, 2 ) . '/src/Frontend/Renderer.php';
require_once dirname( __DIR__, 2 ) . '/src/Frontend/Delivery.php';
require_once dirname( __DIR__, 2 ) . '/src/Frontend/Preview_Request.php';

/**
 * Covers the target-type boundary before forced preview filters are installed.
 */
final class PreviewRequestTest extends TestCase {
	private const PROMOTION_ID = 7;
	private const TARGET_ID    = 99;

	/**
	 * Reset preview request and post fixtures.
	 */
	protected function setUp(): void {
		$_GET = array(
			'npcink_ad_preview'       => self::PROMOTION_ID,
			'npcink_ad_preview_nonce' => 'nonce:npcink_ad_preview_' . self::PROMOTION_ID,
		);
		$GLOBALS['npcink_ad_test_posts'] = array(
			self::PROMOTION_ID => new WP_Post(
				array(
					'ID'           => self::PROMOTION_ID,
					'post_type'    => Post_Types::PROMOTION_POST_TYPE,
					'post_status'  => 'draft',
					'post_content' => '<p>Preview creative</p>',
				)
			),
		);
		$GLOBALS['npcink_ad_test_meta'] = array(
			self::PROMOTION_ID => $this->promotion_meta( 'content_after' ),
		);
		$GLOBALS['npcink_ad_test_singular_post_type']  = 'post';
		$GLOBALS['npcink_ad_test_preview_target_id']   = self::TARGET_ID;
		$GLOBALS['npcink_ad_test_preview_target_type'] = 'post';
		$GLOBALS['npcink_ad_test_preview_filters']     = array();
		$GLOBALS['npcink_ad_test_preview_headers']     = array();
		$GLOBALS['npcink_ad_test_preview_nocache']     = false;
	}

	/**
	 * Clear request input after each test.
	 */
	protected function tearDown(): void {
		$_GET = array();
	}

	/**
	 * Automatic placement cannot force-render on a public custom post type.
	 */
	public function test_automatic_preview_rejects_a_custom_post_type_before_installing_filters(): void {
		$GLOBALS['npcink_ad_test_preview_target_type'] = 'product';
		$GLOBALS['npcink_ad_test_singular_post_type']  = 'product';

		try {
			$this->preview_request()->activate();
			self::fail( 'Expected the automatic custom-post-type preview to be rejected.' );
		} catch ( PreviewRequestWpDieException $exception ) {
			self::assertSame( 400, $exception->response );
			self::assertSame( 'Promotion previews require a public post or page.', $exception->getMessage() );
		}

		self::assertSame( array(), $GLOBALS['npcink_ad_test_preview_filters'] );
		self::assertFalse( $GLOBALS['npcink_ad_test_preview_nocache'] );
	}

	/**
	 * Standard post and page targets retain automatic real-page preview.
	 *
	 * @param string $post_type Target post type.
	 */
	#[DataProvider( 'standard_post_types' )]
	public function test_automatic_preview_accepts_standard_posts_and_pages( string $post_type ): void {
		$GLOBALS['npcink_ad_test_preview_target_type'] = $post_type;
		$GLOBALS['npcink_ad_test_singular_post_type']  = $post_type;

		$this->preview_request()->activate();

		self::assertSame(
			array( 'remove:the_content', 'add:the_content:999' ),
			$GLOBALS['npcink_ad_test_preview_filters']
		);
		self::assertTrue( $GLOBALS['npcink_ad_test_preview_nocache'] );
	}

	/**
	 * Provide standard automatic-delivery target types.
	 *
	 * @return array<string, array{string}>
	 */
	public static function standard_post_types(): array {
		return array(
			'post' => array( 'post' ),
			'page' => array( 'page' ),
		);
	}

	/**
	 * A manual block remains an explicit singular-target preview on a CPT.
	 */
	public function test_manual_block_preview_keeps_its_explicit_custom_post_type_path(): void {
		$GLOBALS['npcink_ad_test_meta'][ self::PROMOTION_ID ] = $this->promotion_meta( 'block' );
		$GLOBALS['npcink_ad_test_preview_target_type']        = 'product';
		$GLOBALS['npcink_ad_test_singular_post_type']         = 'product';
		$request = $this->preview_request();

		$request->activate();

		self::assertSame(
			array( 'remove:the_content', 'add:the_content:999' ),
			$GLOBALS['npcink_ad_test_preview_filters']
		);
		self::assertTrue( $GLOBALS['npcink_ad_test_preview_nocache'] );
	}

	/**
	 * Compose the real preview request with production services.
	 */
	private function preview_request(): Preview_Request {
		$repository = new Repository();

		return new Preview_Request(
			new Delivery( $repository, new Eligibility_Evaluator(), new Renderer() ),
			$repository
		);
	}

	/**
	 * Build complete Promotion metadata for one preview fixture.
	 *
	 * @param string $location Stored delivery location.
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
