<?php
/**
 * Reproducible Promotion scale benchmark for a disposable WordPress install.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Admin\Editor;
use Npcink\Ad\Admin\Promotion_List;
use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use Npcink\Ad\Domain\Overlap_Detector;

require_once '/wordpress/wp-load.php';

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const NPCINK_AD_SCALE_SAMPLE_COUNT = 5;
const NPCINK_AD_SCALE_LIST_ROWS    = 20;

$result_directory = WP_CONTENT_DIR . '/npcink-ad-performance-results';
if ( ! is_dir( $result_directory ) && ! wp_mkdir_p( $result_directory ) ) {
	throw new RuntimeException( 'Could not create the benchmark result directory.' );
}

$write_harness_failure = static function ( string $message ) use ( $result_directory ): void {
	$failure = wp_json_encode(
		array(
			'status'          => 'NPCINK_AD_SCALE_BENCHMARK_HARNESS_ERROR',
			'measured_at_utc' => gmdate( 'c' ),
			'wordpress'       => get_bloginfo( 'version' ),
			'php'             => PHP_VERSION,
			'error'           => $message,
		),
		JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
	);
	if ( is_string( $failure ) ) {
		file_put_contents( $result_directory . '/result.json', $failure . PHP_EOL );
	}
};

set_exception_handler(
	static function ( Throwable $throwable ) use ( $write_harness_failure ): void {
		$write_harness_failure( get_class( $throwable ) . ': ' . $throwable->getMessage() );
	}
);
register_shutdown_function(
	static function () use ( $write_harness_failure, $result_directory ): void {
		if ( is_file( $result_directory . '/result.json' ) ) {
			return;
		}
		$error = error_get_last();
		$message = is_array( $error ) && isset( $error['message'] )
			? (string) $error['message']
			: 'The benchmark stopped before writing a result.';
		$write_harness_failure( $message );
	}
);

$fail = static function ( string $message ): void {
	// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- Developer-only harness preserves the exact diagnostic.
	throw new RuntimeException( $message );
};

if ( ! post_type_exists( Post_Types::PROMOTION_POST_TYPE ) ) {
	$fail( 'Npcink Ad did not register its Promotion post type.' );
}

wp_set_current_user( 1 );
if ( ! current_user_can( 'manage_npcink_ads' ) ) {
	$fail( 'The benchmark user cannot manage Promotions.' );
}

$page_id = wp_insert_post(
	array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Npcink Ad scale target',
		'post_content' => '<p>Scale target body.</p>',
		'post_author'  => 1,
	),
	true
);
if ( is_wp_error( $page_id ) ) {
	$fail( 'Could not create the public scale target: ' . $page_id->get_error_message() );
}

$category = wp_insert_term( 'Npcink Ad scale category', 'category' );
if ( is_wp_error( $category ) ) {
	$fail( 'Could not create the scale category: ' . $category->get_error_message() );
}
$tag_result = wp_insert_term( 'Npcink Ad scale tag', 'post_tag' );
if ( is_wp_error( $tag_result ) ) {
	$fail( 'Could not create the scale tag: ' . $tag_result->get_error_message() );
}
$category_id = (int) $category['term_id'];
$tag_id      = (int) $tag_result['term_id'];

$draft_id = wp_insert_post(
	array(
		'post_type'    => Post_Types::PROMOTION_POST_TYPE,
		'post_status'  => 'draft',
		'post_title'   => 'Npcink Ad scale editor draft',
		'post_content' => '<!-- wp:paragraph --><p>Scale editor draft.</p><!-- /wp:paragraph -->',
		'post_author'  => 1,
	),
	true
);
if ( is_wp_error( $draft_id ) ) {
	$fail( 'Could not create the scale editor draft: ' . $draft_id->get_error_message() );
}
update_post_meta( $draft_id, Post_Types::LOCATION_META, 'content_before' );
update_post_meta( $draft_id, Post_Types::CONTENT_SCOPE_META, 'selected' );
update_post_meta( $draft_id, Post_Types::INCLUDE_IDS_META, array( $page_id ) );
update_post_meta( $draft_id, Post_Types::EXCLUDE_IDS_META, array() );
update_post_meta( $draft_id, Post_Types::CATEGORY_IDS_META, array() );
update_post_meta( $draft_id, Post_Types::TAG_IDS_META, array() );
update_post_meta( $draft_id, Post_Types::DEVICE_META, 'all' );
update_post_meta( $draft_id, Post_Types::START_AT_META, '' );
update_post_meta( $draft_id, Post_Types::END_AT_META, '' );

$locations = Post_Types::AUTOMATIC_LOCATIONS;
$scopes    = Post_Types::CONTENT_SCOPES;
$devices   = Post_Types::DEVICES;

$insert_promotions = static function (
	int $first,
	int $last
) use (
	$fail,
	$locations,
	$scopes,
	$devices,
	$page_id,
	$category_id,
	$tag_id
): float {
	$started_at = hrtime( true );
	wp_defer_term_counting( true );
	wp_suspend_cache_invalidation( true );
	for ( $index = $first; $index <= $last; ++$index ) {
		$location = $locations[ ( $index - 1 ) % count( $locations ) ];
		$scope    = $scopes[ ( $index - 1 ) % count( $scopes ) ];
		$device   = $devices[ ( $index - 1 ) % count( $devices ) ];
		$post_id  = wp_insert_post(
			array(
				'post_type'    => Post_Types::PROMOTION_POST_TYPE,
				'post_status'  => 'publish',
				'post_title'   => sprintf( 'Scale Promotion %04d', $index ),
				'post_content' => sprintf(
					'<!-- wp:paragraph --><p>Scale creative %04d.</p><!-- /wp:paragraph -->',
					$index
				),
				'post_author'  => 1,
				'menu_order'   => $index,
			),
			true
		);
		if ( is_wp_error( $post_id ) ) {
			wp_suspend_cache_invalidation( false );
			wp_defer_term_counting( false );
			$fail( 'Could not create scale Promotion ' . $index . ': ' . $post_id->get_error_message() );
		}

		update_post_meta( $post_id, Post_Types::LOCATION_META, $location );
		update_post_meta( $post_id, Post_Types::CONTENT_SCOPE_META, $scope );
		update_post_meta( $post_id, Post_Types::INCLUDE_IDS_META, 'selected' === $scope ? array( $page_id ) : array() );
		update_post_meta( $post_id, Post_Types::EXCLUDE_IDS_META, array() );
		update_post_meta( $post_id, Post_Types::CATEGORY_IDS_META, 'terms' === $scope ? array( $category_id ) : array() );
		update_post_meta( $post_id, Post_Types::TAG_IDS_META, 'terms' === $scope ? array( $tag_id ) : array() );
		update_post_meta( $post_id, Post_Types::DEVICE_META, $device );
		update_post_meta( $post_id, Post_Types::START_AT_META, '' );
		update_post_meta( $post_id, Post_Types::END_AT_META, '' );
		update_post_meta(
			$post_id,
			Post_Types::PARAGRAPH_NUMBER_META,
			'content_after_paragraph' === $location ? ( ( $index - 1 ) % 6 ) + 1 : Post_Types::DEFAULT_PARAGRAPH_NUMBER
		);
	}
	wp_suspend_cache_invalidation( false );
	wp_defer_term_counting( false );
	wp_cache_flush();

	return round( ( hrtime( true ) - $started_at ) / 1e6, 3 );
};

$median = static function ( array $values ): float {
	sort( $values, SORT_NUMERIC );
	$count = count( $values );
	$middle = intdiv( $count, 2 );

	return 1 === $count % 2
		? (float) $values[ $middle ]
		: ( (float) $values[ $middle - 1 ] + (float) $values[ $middle ] ) / 2;
};

/**
 * Measure one operation with WordPress object caches cleared between samples.
 *
 * @param callable $operation Produces the retained value to inspect.
 * @param callable $summarize Reduces the retained value to scalar observations.
 * @return array<string, mixed>
 */
$measure = static function ( callable $operation, callable $summarize ) use ( $median ): array {
	global $wpdb;

	$samples = array();
	for ( $sample = 1; $sample <= NPCINK_AD_SCALE_SAMPLE_COUNT; ++$sample ) {
		wp_cache_flush();
		gc_collect_cycles();
		$query_start  = (int) $wpdb->num_queries;
		$memory_start = memory_get_usage( false );
		$time_start   = hrtime( true );
		$value        = $operation();
		$duration_ms  = ( hrtime( true ) - $time_start ) / 1e6;
		$memory_delta = max( 0, memory_get_usage( false ) - $memory_start );
		$observed     = $summarize( $value );
		$samples[]    = array(
			'sample'             => $sample,
			'duration_ms'        => round( $duration_ms, 3 ),
			'queries'            => (int) $wpdb->num_queries - $query_start,
			'memory_delta_bytes' => $memory_delta,
			'observed'           => $observed,
		);
		unset( $value );
	}

	$durations = array_column( $samples, 'duration_ms' );
	$queries   = array_column( $samples, 'queries' );
	$memory    = array_column( $samples, 'memory_delta_bytes' );

	return array(
		'duration_ms_median'   => round( $median( $durations ), 3 ),
		'queries_median'       => $median( $queries ),
		'queries_max'          => max( $queries ),
		'memory_delta_max_bytes' => max( $memory ),
		'observed'             => $samples[0]['observed'],
		'samples'              => $samples,
	);
};

if ( ! function_exists( 'set_current_screen' ) ) {
	require_once ABSPATH . 'wp-admin/includes/class-wp-screen.php';
	require_once ABSPATH . 'wp-admin/includes/screen.php';
}

$GLOBALS['post'] = get_post( $draft_id ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- The disposable harness emulates the editor request global.
set_current_screen( Post_Types::PROMOTION_POST_TYPE );

$measure_scenario = static function ( int $expected_count ) use ( $measure, $draft_id ): array {
	$catalog = $measure(
		static fn (): array => ( new Repository() )->find_published_automatic_catalog(),
		static function ( array $value ): array {
			$indexed_count = array_sum( array_map( 'count', $value['location_ids'] ) )
				+ array_sum( array_map( 'count', $value['paragraph_ids'] ) );

			return array(
				'records'         => count( $value['by_id'] ),
				'indexed_records' => $indexed_count,
			);
		}
	);

	$editor = $measure(
		static function () use ( $draft_id ): string {
			wp_scripts()->remove( 'npcink-ad-promotion-editor' );
			wp_styles()->remove( 'npcink-ad-promotion-editor' );
			$GLOBALS['post'] = get_post( $draft_id ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- The disposable harness emulates the editor request global.
			Editor::enqueue();
			$inline = wp_scripts()->get_data( 'npcink-ad-promotion-editor', 'before' );
			if ( ! is_array( $inline ) || array() === $inline ) {
				throw new RuntimeException( 'The Promotion editor did not emit inline settings.' );
			}

			return (string) end( $inline );
		},
		static function ( string $inline ): array {
			$prefix = 'window.NpcinkAdEditorSettings = ';
			if ( ! str_starts_with( $inline, $prefix ) || ! str_ends_with( $inline, ';' ) ) {
				throw new RuntimeException( 'The Promotion editor emitted an unexpected settings wrapper.' );
			}
			$decoded = json_decode(
				substr( $inline, strlen( $prefix ), -1 ),
				true,
				512,
				JSON_THROW_ON_ERROR
			);
			$rules = $decoded['publishedAutomaticPromotions'] ?? null;
			if ( ! is_array( $rules ) ) {
				throw new RuntimeException( 'The Promotion editor settings omitted overlap rules.' );
			}

			return array(
				'inline_bytes' => strlen( $inline ),
				'rules'        => count( $rules ),
			);
		}
	);

	$list = $measure(
		static function (): array {
			$query = new WP_Query(
				array(
					'post_type'              => Post_Types::PROMOTION_POST_TYPE,
					'post_status'            => array( 'publish', 'draft' ),
					'posts_per_page'         => NPCINK_AD_SCALE_LIST_ROWS,
					'orderby'                => array(
						'date' => 'DESC',
						'ID'   => 'DESC',
					),
					'no_found_rows'          => true,
					'update_post_meta_cache' => true,
					'update_post_term_cache' => false,
				)
			);
			$GLOBALS['wp_query'] = $query; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- The disposable harness emulates the list request global.
			$list = new Promotion_List( new Repository(), new Eligibility_Evaluator(), new Overlap_Detector() );
			ob_start();
			foreach ( $query->posts as $post ) {
				if ( ! $post instanceof WP_Post ) {
					continue;
				}
				foreach ( array( 'npcink_ad_rule_status', 'npcink_ad_location', 'npcink_ad_content_scope', 'npcink_ad_end_at', 'npcink_ad_reasons' ) as $column ) {
					$list->render_column( $column, $post->ID );
				}
			}
			$list->render_status_forms();
			$output = (string) ob_get_clean();
			$GLOBALS['wp_query'] = null; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restore the disposable list request global.

			return array(
				'output' => $output,
				'query'  => $query,
			);
		},
		static fn ( array $value ): array => array(
			'rows'         => count( $value['query']->posts ),
			'output_bytes' => strlen( $value['output'] ),
		)
	);

	return array(
		'expected_published_automatic_promotions' => $expected_count,
		'catalog'                                => $catalog,
		'editor'                                 => $editor,
		'list_20_rows'                           => $list,
	);
};

$fixture_ms_100 = $insert_promotions( 1, 100 );
$scenario_100   = $measure_scenario( 100 );
$fixture_ms_500 = $insert_promotions( 101, 500 );
$scenario_500   = $measure_scenario( 500 );

$budgets = array(
	'catalog_queries_max'            => 8,
	'editor_queries_max'             => 12,
	'list_queries_max'               => 12,
	'query_growth_max'               => 2,
	'editor_inline_bytes_at_500_max' => 1048576,
	'list_output_bytes_max'          => 524288,
	'memory_delta_bytes_max'         => 67108864,
);

$gate = static fn ( string $name, bool $passed, int|float $actual, int|float $limit ): array => array(
	'name'   => $name,
	'passed' => $passed,
	'actual' => $actual,
	'limit'  => $limit,
);

$gates = array(
	$gate( 'catalog_records_100', 100 === $scenario_100['catalog']['observed']['records'], $scenario_100['catalog']['observed']['records'], 100 ),
	$gate( 'catalog_records_500', 500 === $scenario_500['catalog']['observed']['records'], $scenario_500['catalog']['observed']['records'], 500 ),
	$gate( 'catalog_indexed_records_100', 100 === $scenario_100['catalog']['observed']['indexed_records'], $scenario_100['catalog']['observed']['indexed_records'], 100 ),
	$gate( 'catalog_indexed_records_500', 500 === $scenario_500['catalog']['observed']['indexed_records'], $scenario_500['catalog']['observed']['indexed_records'], 500 ),
	$gate( 'editor_rules_100', 100 === $scenario_100['editor']['observed']['rules'], $scenario_100['editor']['observed']['rules'], 100 ),
	$gate( 'editor_rules_500', 500 === $scenario_500['editor']['observed']['rules'], $scenario_500['editor']['observed']['rules'], 500 ),
	$gate( 'list_rows_100', NPCINK_AD_SCALE_LIST_ROWS === $scenario_100['list_20_rows']['observed']['rows'], $scenario_100['list_20_rows']['observed']['rows'], NPCINK_AD_SCALE_LIST_ROWS ),
	$gate( 'list_rows_500', NPCINK_AD_SCALE_LIST_ROWS === $scenario_500['list_20_rows']['observed']['rows'], $scenario_500['list_20_rows']['observed']['rows'], NPCINK_AD_SCALE_LIST_ROWS ),
);

foreach (
	array(
		100 => $scenario_100,
		500 => $scenario_500,
	) as $size => $scenario
) {
	foreach ( array( 'catalog', 'editor', 'list_20_rows' ) as $metric_path ) {
		$budget_key = 'list_20_rows' === $metric_path ? 'list_queries_max' : $metric_path . '_queries_max';
		$gates[] = $gate(
			$metric_path . '_queries_' . $size,
			$scenario[ $metric_path ]['queries_max'] <= $budgets[ $budget_key ],
			$scenario[ $metric_path ]['queries_max'],
			$budgets[ $budget_key ]
		);
		$gates[] = $gate(
			$metric_path . '_memory_' . $size,
			$scenario[ $metric_path ]['memory_delta_max_bytes'] <= $budgets['memory_delta_bytes_max'],
			$scenario[ $metric_path ]['memory_delta_max_bytes'],
			$budgets['memory_delta_bytes_max']
		);
	}
}

foreach ( array( 'catalog', 'editor', 'list_20_rows' ) as $metric_path ) {
	$query_growth = $scenario_500[ $metric_path ]['queries_max'] - $scenario_100[ $metric_path ]['queries_max'];
	$gates[] = $gate(
		$metric_path . '_query_growth_100_to_500',
		$query_growth <= $budgets['query_growth_max'],
		$query_growth,
		$budgets['query_growth_max']
	);
}

$gates[] = $gate(
	'editor_inline_bytes_500',
	$scenario_500['editor']['observed']['inline_bytes'] <= $budgets['editor_inline_bytes_at_500_max'],
	$scenario_500['editor']['observed']['inline_bytes'],
	$budgets['editor_inline_bytes_at_500_max']
);
$gates[] = $gate(
	'list_output_bytes_500',
	$scenario_500['list_20_rows']['observed']['output_bytes'] <= $budgets['list_output_bytes_max'],
	$scenario_500['list_20_rows']['observed']['output_bytes'],
	$budgets['list_output_bytes_max']
);

$passed = ! in_array( false, array_column( $gates, 'passed' ), true );
$ratio  = static fn ( float $large, float $small ): float => 0.0 === $small ? 0.0 : round( $large / $small, 3 );

$result = array(
	'status'              => $passed ? 'NPCINK_AD_SCALE_BENCHMARK_OK' : 'NPCINK_AD_SCALE_BENCHMARK_FAILED',
	'measured_at_utc'     => gmdate( 'c' ),
	'wordpress'           => get_bloginfo( 'version' ),
	'php'                 => PHP_VERSION,
	'samples_per_metric'  => NPCINK_AD_SCALE_SAMPLE_COUNT,
	'fixture'             => array(
		'published_automatic_promotions' => 500,
		'editor_drafts'                  => 1,
		'public_targets'                 => 1,
		'insert_1_to_100_ms'             => $fixture_ms_100,
		'insert_101_to_500_ms'           => $fixture_ms_500,
	),
	'budgets'             => $budgets,
	'scenarios'           => array(
		'100' => $scenario_100,
		'500' => $scenario_500,
	),
	'comparison_500_over_100' => array(
		'catalog_duration_ratio' => $ratio( $scenario_500['catalog']['duration_ms_median'], $scenario_100['catalog']['duration_ms_median'] ),
		'editor_duration_ratio'  => $ratio( $scenario_500['editor']['duration_ms_median'], $scenario_100['editor']['duration_ms_median'] ),
		'list_duration_ratio'    => $ratio( $scenario_500['list_20_rows']['duration_ms_median'], $scenario_100['list_20_rows']['duration_ms_median'] ),
		'editor_inline_bytes_ratio' => $ratio( $scenario_500['editor']['observed']['inline_bytes'], $scenario_100['editor']['observed']['inline_bytes'] ),
	),
	'gates'               => $gates,
);

$encoded = wp_json_encode( $result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES );
if ( ! is_string( $encoded ) || false === file_put_contents( $result_directory . '/result.json', $encoded . PHP_EOL ) ) {
	$fail( 'Could not write the benchmark result.' );
}
