<?php
/**
 * Plugin Name: Npcink Ad first-run E2E fixture
 * Description: Builds a clean first-use session without stored Promotions.
 *
 * @package NpcinkAd
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/fixture-lock.php';

/**
 * Build the clean first-run fixture once in the shared Playground database.
 */
function npcink_ad_build_first_run_e2e_fixture(): void {
	$ready_option = 'npcink_ad_first_run_e2e_fixture_ready';

	if ( ! post_type_exists( 'npcink_promotion' ) ) {
		return;
	}
	if ( get_option( $ready_option ) ) {
		return;
	}

	try {
		if ( ! npcink_ad_claim_e2e_fixture_build( 'npcink-ad-first-run-fixture-lock' ) ) {
			return;
		}

		$username = 'npcink-e2e-admin';
		$password = 'npcink-e2e-password';
		$email    = 'npcink-e2e@example.test';
		$user_id  = username_exists( $username );

		if ( ! is_int( $user_id ) || 1 > $user_id ) {
			$user_id = wp_insert_user(
				array(
					'user_login' => $username,
					'user_pass'  => $password,
					'user_email' => $email,
					'role'       => 'administrator',
				)
			);
		}

		if ( is_wp_error( $user_id ) ) {
			throw new RuntimeException( 'Could not create the first-run E2E administrator: ' . $user_id->get_error_message() );
		}

		wp_set_password( $password, $user_id );
		$user = get_user_by( 'id', $user_id );
		if ( false === $user ) {
			throw new RuntimeException( 'Could not load the first-run E2E administrator.' );
		}
		$user->set_role( 'administrator' );
		update_user_meta( $user_id, 'locale', 'en_US' );
		update_user_meta(
			$user_id,
			'wp_persisted_preferences',
			array(
				'core/edit-post' => array(
					'welcomeGuide' => false,
				),
			)
		);

		$page_id = wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => 'Npcink Ad selector E2E page',
				'post_name'    => 'npcink-ad-selector-e2e-page',
				'post_content' => '<!-- wp:paragraph --><p>Npcink Ad first-run E2E target page.</p><!-- /wp:paragraph -->',
			),
			true
		);

		if ( is_wp_error( $page_id ) ) {
			throw new RuntimeException( 'Could not create the first-run E2E page: ' . $page_id->get_error_message() );
		}

		$filter_category = wp_insert_term(
			'Npcink Ad E2E category',
			'category',
			array( 'slug' => 'npcink-ad-e2e-category' )
		);
		if ( is_wp_error( $filter_category ) ) {
			throw new RuntimeException( 'Could not create the first-run E2E category: ' . $filter_category->get_error_message() );
		}

		$filter_tag = wp_insert_term(
			'Npcink Ad E2E tag',
			'post_tag',
			array( 'slug' => 'npcink-ad-e2e-tag' )
		);
		if ( is_wp_error( $filter_tag ) ) {
			throw new RuntimeException( 'Could not create the first-run E2E tag: ' . $filter_tag->get_error_message() );
		}

		$filtered_post_id = wp_insert_post(
			array(
				'post_type'    => 'post',
				'post_status'  => 'publish',
				'post_title'   => 'Npcink Ad filtered E2E post',
				'post_name'    => 'npcink-ad-filtered-e2e-post',
				'post_content' => '<!-- wp:paragraph --><p>Npcink Ad filtered E2E target post.</p><!-- /wp:paragraph -->',
			),
			true
		);
		if ( is_wp_error( $filtered_post_id ) ) {
			throw new RuntimeException( 'Could not create the first-run filtered E2E post: ' . $filtered_post_id->get_error_message() );
		}

		$category_assignment = wp_set_post_terms(
			$filtered_post_id,
			array( (int) $filter_category['term_id'] ),
			'category',
			false
		);
		$tag_assignment      = wp_set_post_terms(
			$filtered_post_id,
			array( (int) $filter_tag['term_id'] ),
			'post_tag',
			false
		);
		if ( is_wp_error( $category_assignment ) || is_wp_error( $tag_assignment ) ) {
			throw new RuntimeException( 'Could not assign the first-run E2E category and tag.' );
		}

		$counts = wp_count_posts( 'npcink_promotion', 'readable' );
		foreach ( get_object_vars( $counts ) as $count ) {
			if ( 0 < (int) $count ) {
				throw new RuntimeException( 'The first-run E2E fixture unexpectedly contains a Promotion.' );
			}
		}

		update_option(
			$ready_option,
			array(
				'username' => $username,
				'password' => $password,
				'page'     => array(
					'id'   => $page_id,
					'slug' => 'npcink-ad-selector-e2e-page',
				),
				'filteredPost' => array(
					'id'       => $filtered_post_id,
					'slug'     => 'npcink-ad-filtered-e2e-post',
					'category' => (int) $filter_category['term_id'],
					'tag'      => (int) $filter_tag['term_id'],
				),
			),
			false
		);
	} catch ( Throwable $error ) {
		update_option( 'npcink_ad_first_run_e2e_fixture_error', $error->getMessage(), false );
		error_log( 'Npcink Ad first-run E2E fixture failed: ' . $error->getMessage() );
	}
}
add_action( 'init', 'npcink_ad_build_first_run_e2e_fixture', 100 );
