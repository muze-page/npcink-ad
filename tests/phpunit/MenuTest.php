<?php
/**
 * Native admin menu tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Admin\Menu;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Post_Types.php';
require_once dirname( __DIR__, 2 ) . '/src/Admin/Menu.php';

/**
 * Covers the Plugins-screen shortcut into Promotion management.
 */
final class MenuTest extends TestCase {
	/**
	 * The Settings shortcut leads to the existing Promotion list.
	 */
	public function test_settings_action_link_opens_promotion_management(): void {
		$links = Menu::add_settings_action_link(
			array(
				'deactivate' => '<a href="plugins.php?action=deactivate">Deactivate</a>',
			)
		);

		self::assertSame(
			'<a href="https://example.test/wp-admin/edit.php?post_type=npcink_promotion">Settings</a>',
			$links[0]
		);
		self::assertSame(
			'<a href="plugins.php?action=deactivate">Deactivate</a>',
			$links['deactivate']
		);
	}
}
