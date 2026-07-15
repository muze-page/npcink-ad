<?php
/**
 * Promotion REST preflight contract tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use Npcink\Ad\REST\Promotion_Preflight;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/PromotionStatusWordPressStubs.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Post_Types.php';
require_once dirname( __DIR__, 2 ) . '/src/Data/Repository.php';
require_once dirname( __DIR__, 2 ) . '/src/REST/Promotion_Preflight.php';

/**
 * Covers REST candidate metadata before Core persists it.
 */
final class PromotionPreflightTest extends TestCase {
	/**
	 * Invalid non-empty request dates reach the evaluator as invalid schedules.
	 */
	public function test_invalid_request_calendar_date_is_not_an_open_boundary(): void {
		$repository = new Repository();
		$evaluator  = new Eligibility_Evaluator();
		$preflight  = new Promotion_Preflight( $repository, $evaluator );
		$promotion  = array(
			'content'        => '<p>Creative</p>',
			'page_scope'     => 'all',
			'include_ids'    => array(),
			'exclude_ids'    => array(),
			'start_at'       => 0,
			'start_at_valid' => true,
			'end_at'         => 0,
			'end_at_valid'   => true,
		);
		$method     = new ReflectionMethod( $preflight, 'apply_meta' );
		$arguments  = array(
			&$promotion,
			array(
				Post_Types::START_AT_META => '2027-02-30 08:00:00',
				Post_Types::END_AT_META   => '',
			),
		);

		$method->invokeArgs( $preflight, $arguments );
		$result = $evaluator->validate_configuration( $promotion );

		self::assertSame( 0, $promotion['start_at'] );
		self::assertFalse( $promotion['start_at_valid'] );
		self::assertTrue( $promotion['end_at_valid'] );
		self::assertSame( array( 'promotion_schedule_invalid' ), $result['reasons'] );
	}
}
