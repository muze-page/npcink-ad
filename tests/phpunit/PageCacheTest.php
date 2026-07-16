<?php
/**
 * WordPress page-cache boundary tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Environment\Page_Cache;
use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 2 ) . '/src/Environment/Page_Cache.php';

/**
 * Covers the deliberately narrow advanced-cache drop-in signal.
 */
final class PageCacheTest extends TestCase {
	/**
	 * A truthy Core-compatible flag and a regular advanced-cache.php file are required.
	 */
	public function test_detection_boundary_requires_true_flag_and_drop_in_file(): void {
		$content_dir = $this->create_content_directory();
		$drop_in     = $content_dir . '/advanced-cache.php';

		try {
			self::assertFalse( Page_Cache::matches_advanced_cache_boundary( true, $content_dir ) );
			self::assertTrue( touch( $drop_in ) );
			self::assertTrue( Page_Cache::matches_advanced_cache_boundary( true, $content_dir ) );
			self::assertTrue( Page_Cache::matches_advanced_cache_boundary( 1, $content_dir ) );
			self::assertTrue( Page_Cache::matches_advanced_cache_boundary( '1', $content_dir ) );
			self::assertFalse( Page_Cache::matches_advanced_cache_boundary( false, $content_dir ) );
			self::assertFalse( Page_Cache::matches_advanced_cache_boundary( 0, $content_dir ) );
			self::assertFalse( Page_Cache::matches_advanced_cache_boundary( '', $content_dir ) );
			self::assertFalse( Page_Cache::matches_advanced_cache_boundary( null, $content_dir ) );
		} finally {
			$this->remove_content_directory( $content_dir );
		}
	}

	/**
	 * A directory with the drop-in name is not mistaken for a PHP drop-in file.
	 */
	public function test_detection_boundary_requires_a_regular_file(): void {
		$content_dir = $this->create_content_directory();
		$drop_in     = $content_dir . '/advanced-cache.php';

		try {
			self::assertTrue( mkdir( $drop_in ) );
			self::assertFalse( Page_Cache::matches_advanced_cache_boundary( true, $content_dir ) );
		} finally {
			$this->remove_content_directory( $content_dir );
		}
	}

	/**
	 * The runtime method reads the real WordPress constants and accepts the pair.
	 */
	#[RunInSeparateProcess]
	#[PreserveGlobalState( false )]
	public function test_runtime_detects_enabled_drop_in_constants(): void {
		$content_dir = $this->create_content_directory();

		try {
			define( 'WP_CACHE', true );
			define( 'WP_CONTENT_DIR', $content_dir );
			self::assertTrue( touch( $content_dir . '/advanced-cache.php' ) );
			self::assertTrue( Page_Cache::has_advanced_cache_drop_in() );
		} finally {
			$this->remove_content_directory( $content_dir );
		}
	}

	/**
	 * The runtime method rejects an existing file when WP_CACHE is not true.
	 */
	#[RunInSeparateProcess]
	#[PreserveGlobalState( false )]
	public function test_runtime_rejects_disabled_drop_in_constants(): void {
		$content_dir = $this->create_content_directory();

		try {
			define( 'WP_CACHE', false );
			define( 'WP_CONTENT_DIR', $content_dir );
			self::assertTrue( touch( $content_dir . '/advanced-cache.php' ) );
			self::assertFalse( Page_Cache::has_advanced_cache_drop_in() );
		} finally {
			$this->remove_content_directory( $content_dir );
		}
	}

	/**
	 * Create an isolated temporary WordPress content directory.
	 */
	private function create_content_directory(): string {
		$placeholder = tempnam( sys_get_temp_dir(), 'npcink-ad-cache-' );
		self::assertNotFalse( $placeholder );
		self::assertTrue( unlink( $placeholder ) );
		self::assertTrue( mkdir( $placeholder ) );

		return $placeholder;
	}

	/**
	 * Remove the temporary cache fixture regardless of assertion outcome.
	 *
	 * @param string $content_dir Temporary WordPress content directory.
	 */
	private function remove_content_directory( string $content_dir ): void {
		$drop_in = $content_dir . '/advanced-cache.php';
		if ( is_file( $drop_in ) ) {
			unlink( $drop_in );
		} elseif ( is_dir( $drop_in ) ) {
			rmdir( $drop_in );
		}
		if ( is_dir( $content_dir ) ) {
			rmdir( $content_dir );
		}
	}
}
