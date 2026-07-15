<?php
/**
 * Eligibility message contract tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Presentation\Eligibility_Messages;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once dirname( __DIR__, 2 ) . '/src/Presentation/Eligibility_Messages.php';

/**
 * Covers presentation text for stable paragraph reason codes.
 */
final class EligibilityMessagesTest extends TestCase {
	/**
	 * Paragraph configuration and content failures remain understandable.
	 */
	public function test_paragraph_reason_codes_have_messages(): void {
		self::assertSame(
			array(
				'Choose a paragraph number from 1 to 20.',
				'The selected paragraph is not available in this content.',
			),
			Eligibility_Messages::messages(
				array( 'promotion_paragraph_invalid', 'content_anchor_missing' )
			)
		);
	}
}
