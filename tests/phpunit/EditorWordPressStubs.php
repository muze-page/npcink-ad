<?php
/**
 * Minimal WordPress date stub for Promotion editor unit tests.
 *
 * @package NpcinkAd
 */

if ( ! function_exists( 'wp_date' ) ) {
	/**
	 * Format deterministic UTC test timestamps.
	 *
	 * @param string            $format    PHP date format.
	 * @param int|null          $timestamp Unix timestamp.
	 * @param DateTimeZone|null $timezone  Requested timezone.
	 */
	function wp_date( string $format, ?int $timestamp = null, ?DateTimeZone $timezone = null ): string {
		$date = new DateTimeImmutable( '@' . ( $timestamp ?? time() ) );

		return $date->setTimezone( $timezone ?? new DateTimeZone( 'UTC' ) )->format( $format );
	}
}
