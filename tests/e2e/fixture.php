<?php
/**
 * Plugin Name: Npcink Ad editor E2E fixture
 * Description: Builds deterministic editor fixtures inside Playground workers.
 *
 * @package NpcinkAd
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/fixture-lock.php';

/**
 * Build the fixture once in the shared Playground database.
 */
function npcink_ad_build_editor_e2e_fixture(): void {
	$ready_option = 'npcink_ad_e2e_fixture_ready';

	if ( ! post_type_exists( 'npcink_promotion' ) ) {
		return;
	}
	if ( get_option( $ready_option ) ) {
		return;
	}

	try {
		if ( ! npcink_ad_claim_e2e_fixture_build( 'npcink-ad-editor-fixture-lock' ) ) {
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
			throw new RuntimeException( 'Could not create the E2E administrator: ' . $user_id->get_error_message() );
		}

		wp_set_password( $password, $user_id );
		$user = get_user_by( 'id', $user_id );
		if ( false === $user ) {
			throw new RuntimeException( 'Could not load the E2E administrator.' );
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

		/**
		 * Create one published manual Promotion.
		 *
		 * @param string $title Promotion title.
		 * @return int Promotion ID.
		 */
		$create_promotion = static function ( string $title ): int {
			$promotion_id = wp_insert_post(
				array(
					'post_type'    => 'npcink_promotion',
					'post_status'  => 'publish',
					'post_title'   => $title,
					'post_content' => '<p>Editor E2E promotion content.</p>',
				),
				true
			);

			if ( is_wp_error( $promotion_id ) ) {
				throw new RuntimeException( 'Could not create an E2E Promotion: ' . $promotion_id->get_error_message() );
			}

			update_post_meta( $promotion_id, '_npcink_ad_location', 'block' );
			update_post_meta( $promotion_id, '_npcink_ad_content_scope', 'all' );
			update_post_meta( $promotion_id, '_npcink_ad_device', 'all' );

			return $promotion_id;
		};

		global $wpdb;
		$filler_count        = 105;
		$search_target_title = 'Needle Match Z25';
		$now                 = current_time( 'mysql' );
		$now_gmt             = current_time( 'mysql', true );
		$filler_rows         = array();

		for ( $index = 1; $index <= $filler_count; $index++ ) {
			if ( 20 >= $index ) {
				$title = sprintf( 'Needle Match A%02d', $index );
			} elseif ( 25 >= $index ) {
				$title = sprintf( 'Needle Match Z%02d', $index );
			} else {
				$title = sprintf( 'AAA Filler Promotion %03d', $index );
			}
			$filler_rows[] = array(
				$user_id,
				$now,
				$now_gmt,
				'<p>Editor E2E promotion content.</p>',
				$title,
				'publish',
				'closed',
				'closed',
				sanitize_title( $title ),
				$now,
				$now_gmt,
				'npcink_promotion',
			);
		}

		foreach ( array_chunk( $filler_rows, 35 ) as $batch ) {
			$placeholders = array();
			$values       = array();
			foreach ( $batch as $row ) {
				$placeholders[] = '(%d,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)';
				array_push( $values, ...$row );
			}

			$query = $wpdb->prepare(
				"INSERT INTO {$wpdb->posts} (post_author,post_date,post_date_gmt,post_content,post_title,post_status,comment_status,ping_status,post_name,post_modified,post_modified_gmt,post_type) VALUES " . implode( ',', $placeholders ),
				...$values
			);
			if ( false === $query || count( $batch ) !== $wpdb->query( $query ) ) {
				throw new RuntimeException( 'Could not create the filler E2E Promotions.' );
			}
		}

		$search_target_id = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT ID FROM {$wpdb->posts} WHERE post_type = %s AND post_title = %s LIMIT 1",
				'npcink_promotion',
				$search_target_title
			)
		);
		if ( 1 > $search_target_id ) {
			throw new RuntimeException( 'Could not create the searchable E2E Promotion.' );
		}
		update_post_meta( $search_target_id, '_npcink_ad_location', 'block' );
		update_post_meta( $search_target_id, '_npcink_ad_content_scope', 'all' );
		update_post_meta( $search_target_id, '_npcink_ad_device', 'all' );
		wp_cache_flush();

		$selected_target_title = 'ZZZ Selected Promotion';
		$selected_target_id    = $create_promotion( $selected_target_title );
		$page_id               = wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => 'Npcink Ad selector E2E page',
				'post_name'    => 'npcink-ad-selector-e2e-page',
				'post_content' => sprintf(
					'<!-- wp:npcink-ad/promotion {"promotionId":%d,"reserveHeight":80,"preview":false} /-->',
					$selected_target_id
				),
			),
			true
		);

		if ( is_wp_error( $page_id ) ) {
			throw new RuntimeException( 'Could not create the E2E page: ' . $page_id->get_error_message() );
		}

		$automatic_promotion_title   = 'Status Action E2E Promotion';
		$automatic_promotion_content = 'Automatic status E2E promotion.';
		$automatic_promotion_id      = wp_insert_post(
			array(
				'post_type'    => 'npcink_promotion',
				'post_status'  => 'publish',
				'post_title'   => $automatic_promotion_title,
				'post_content' => '<p>' . $automatic_promotion_content . '</p>',
			),
			true
		);

		if ( is_wp_error( $automatic_promotion_id ) ) {
			throw new RuntimeException( 'Could not create the automatic E2E Promotion: ' . $automatic_promotion_id->get_error_message() );
		}

		update_post_meta( $automatic_promotion_id, '_npcink_ad_location', 'content_before' );
		update_post_meta( $automatic_promotion_id, '_npcink_ad_content_scope', 'selected' );
		update_post_meta( $automatic_promotion_id, '_npcink_ad_include_ids', array( $page_id ) );
		update_post_meta( $automatic_promotion_id, '_npcink_ad_exclude_ids', array() );
		update_post_meta( $automatic_promotion_id, '_npcink_ad_device', 'all' );
		update_post_meta( $automatic_promotion_id, '_npcink_ad_start_at', current_datetime()->modify( '-1 day' )->format( 'Y-m-d H:i:s' ) );
		update_post_meta( $automatic_promotion_id, '_npcink_ad_end_at', current_datetime()->modify( '+1 day' )->format( 'Y-m-d H:i:s' ) );

		$scheduled_promotion_title   = 'Scheduled Status E2E Promotion';
		$scheduled_promotion_content = 'Scheduled status E2E promotion.';
		$scheduled_date              = current_datetime()->modify( '+1 day' )->format( 'Y-m-d H:i:s' );
		$scheduled_promotion_id      = wp_insert_post(
			array(
				'post_type'     => 'npcink_promotion',
				'post_status'   => 'future',
				'post_title'    => $scheduled_promotion_title,
				'post_content'  => '<p>' . $scheduled_promotion_content . '</p>',
				'post_date'     => $scheduled_date,
				'post_date_gmt' => get_gmt_from_date( $scheduled_date ),
			),
			true
		);

		if ( is_wp_error( $scheduled_promotion_id ) ) {
			throw new RuntimeException( 'Could not create the scheduled E2E Promotion: ' . $scheduled_promotion_id->get_error_message() );
		}

		update_post_meta( $scheduled_promotion_id, '_npcink_ad_location', 'content_before' );
		update_post_meta( $scheduled_promotion_id, '_npcink_ad_content_scope', 'selected' );
		update_post_meta( $scheduled_promotion_id, '_npcink_ad_include_ids', array( $page_id ) );
		update_post_meta( $scheduled_promotion_id, '_npcink_ad_exclude_ids', array() );
		update_post_meta( $scheduled_promotion_id, '_npcink_ad_device', 'all' );

		$fixture = array(
			'username'   => $username,
			'password'   => $password,
			'page'       => array(
				'id'   => $page_id,
				'slug' => 'npcink-ad-selector-e2e-page',
			),
			'promotions' => array(
				'fillerCount' => $filler_count,
				'selected'    => array(
					'id'    => $selected_target_id,
					'title' => $selected_target_title,
				),
				'searchTarget' => array(
					'id'         => $search_target_id,
					'title'      => $search_target_title,
					'searchTerm' => 'Needle Match',
				),
				'automatic' => array(
					'id'      => $automatic_promotion_id,
					'title'   => $automatic_promotion_title,
					'content' => $automatic_promotion_content,
				),
				'scheduled' => array(
					'id'      => $scheduled_promotion_id,
					'title'   => $scheduled_promotion_title,
					'content' => $scheduled_promotion_content,
				),
			),
		);

		update_option( $ready_option, $fixture, false );
		$result_dir = WP_CONTENT_DIR . '/npcink-ad-editor-e2e-results';
		if ( wp_mkdir_p( $result_dir ) ) {
			file_put_contents(
				$result_dir . '/fixture.json',
				(string) wp_json_encode( $fixture, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES )
			);
		}
	} catch ( Throwable $error ) {
		update_option( 'npcink_ad_e2e_fixture_error', $error->getMessage(), false );
		error_log( 'Npcink Ad editor E2E fixture failed: ' . $error->getMessage() );
	}
}
add_action( 'init', 'npcink_ad_build_editor_e2e_fixture', 100 );
