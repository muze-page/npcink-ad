<?php
/**
 * Elect one Playground worker to build the shared E2E fixture.
 *
 * @package NpcinkAd
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Claim fixture ownership through an inserted post and lowest-ID election.
 *
 * Parallel Playground bootstrap can race through the previous add_option()
 * guard. Post IDs remain unique in the shared database, so electing the lowest
 * lock-post ID gives every later worker the same durable owner without
 * weakening the fixture assertions.
 *
 * @param string $lock_slug Fixture-specific lock slug.
 * @return bool True only for the worker elected to build the fixture.
 * @throws RuntimeException If the lock cannot be inserted or resolved.
 */
function npcink_ad_claim_e2e_fixture_build( string $lock_slug ): bool {
	$lock_id = wp_insert_post(
		array(
			'post_type'   => 'npcink_e2e_lock',
			'post_status' => 'private',
			'post_title'  => $lock_slug,
			'post_name'   => $lock_slug,
		),
		true
	);

	if ( is_wp_error( $lock_id ) ) {
		// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Internal fixture evidence, never rendered as HTML.
		throw new RuntimeException( 'Could not create the E2E fixture lock: ' . $lock_id->get_error_message() );
	}

	global $wpdb;
	$owner_id = (int) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT MIN(ID) FROM {$wpdb->posts} WHERE post_type = %s AND post_name = %s",
			'npcink_e2e_lock',
			$lock_slug
		)
	);

	if ( 1 > $owner_id ) {
		throw new RuntimeException( 'Could not resolve the E2E fixture lock owner.' );
	}
	if ( $owner_id !== $lock_id ) {
		wp_delete_post( $lock_id, true );
		return false;
	}

	return true;
}
