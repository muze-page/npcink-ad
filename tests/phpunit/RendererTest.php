<?php
/**
 * Promotion renderer media-safety tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Frontend\Renderer;
use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/RendererWordPressStubs.php';
require_once dirname( __DIR__, 2 ) . '/src/Frontend/Renderer.php';

/**
 * Covers native video rendering without introducing a second media engine.
 */
#[RunTestsInSeparateProcesses]
#[PreserveGlobalState( false )]
final class RendererTest extends TestCase {
	/**
	 * Reset isolated WordPress call records.
	 */
	protected function setUp(): void {
		$GLOBALS['npcink_ad_renderer_test_do_blocks'] = array();
		$GLOBALS['npcink_ad_renderer_test_kses']      = array();
		$GLOBALS['npcink_ad_renderer_test_styles']    = array();
	}

	/**
	 * A core/video block keeps WordPress-native media attributes after rendering.
	 */
	public function test_core_video_keeps_safe_native_media_attributes(): void {
		$content = '<!-- wp:video {"id":17} -->'
			. '<figure class="wp-block-video">'
			. '<video src="https://example.test/uploads/promotion.mp4" poster="/uploads/poster.jpg" controls muted loop playsinline preload="metadata" width="1280" height="720"></video>'
			. '<figcaption>Product demonstration</figcaption>'
			. '</figure><!-- /wp:video -->';

		$output = ( new Renderer() )->render(
			array(
				'id'      => 41,
				'content' => $content,
				'device'  => 'all',
			)
		);

		self::assertCount( 1, $GLOBALS['npcink_ad_renderer_test_do_blocks'] );
		self::assertCount( 1, $GLOBALS['npcink_ad_renderer_test_kses'] );
		self::assertStringContainsString( '<figure class="wp-block-video">', $output );
		self::assertStringContainsString( 'src="https://example.test/uploads/promotion.mp4"', $output );
		self::assertStringContainsString( 'poster="/uploads/poster.jpg"', $output );
		self::assertMatchesRegularExpression( '/<video\b[^>]*\bcontrols\b/', $output );
		self::assertMatchesRegularExpression( '/<video\b[^>]*\bmuted\b/', $output );
		self::assertMatchesRegularExpression( '/<video\b[^>]*\bloop\b/', $output );
		self::assertMatchesRegularExpression( '/<video\b[^>]*\bplaysinline\b/', $output );
		self::assertStringContainsString( 'preload="metadata"', $output );
		self::assertStringContainsString( '<figcaption>Product demonstration</figcaption>', $output );
		self::assertSame( array( 'npcink-ad-frontend' ), $GLOBALS['npcink_ad_renderer_test_styles'] );
	}

	/**
	 * Native video still passes through post-context KSES before output.
	 */
	public function test_native_video_filters_executable_markup_and_urls(): void {
		$content = '<video src="javascript:alert(1)" poster="data:text/html,bad" onplay="alert(2)">'
			. '<script>alert(3)</script>'
			. '</video><iframe src="https://example.test/tracker"></iframe>';

		$output = ( new Renderer() )->render(
			array(
				'id'      => 42,
				'content' => $content,
				'device'  => 'all',
			)
		);

		self::assertSame( array(), $GLOBALS['npcink_ad_renderer_test_do_blocks'] );
		self::assertCount( 1, $GLOBALS['npcink_ad_renderer_test_kses'] );
		self::assertStringContainsString( '<video', $output );
		self::assertStringNotContainsString( 'javascript:', $output );
		self::assertStringNotContainsString( 'data:text/html', $output );
		self::assertStringNotContainsString( 'onplay=', $output );
		self::assertStringNotContainsString( ' controls', $output );
		self::assertStringNotContainsString( ' autoplay', $output );
		self::assertStringNotContainsString( '<script', $output );
		self::assertStringNotContainsString( '<iframe', $output );
	}
}
