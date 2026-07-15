<?php
/**
 * PHPUnit bootstrap for pure domain tests.
 *
 * @package MagickAD
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

require_once dirname( __DIR__, 2 ) . '/src/Domain/Eligibility_Evaluator.php';
