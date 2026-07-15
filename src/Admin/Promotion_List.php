<?php
/**
 * Promotion management-list delivery summary.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Admin;

use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use Npcink\Ad\Domain\Overlap_Detector;
use Npcink\Ad\Presentation\Eligibility_Messages;
use WP_Post;
use WP_Post_Type;
use WP_Query;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Adds rule-oriented columns and status controls to the Promotion list.
 */
final class Promotion_List {
	private const STATUS_COLUMN   = 'npcink_ad_rule_status';
	private const LOCATION_COLUMN = 'npcink_ad_location';
	private const SCOPE_COLUMN    = 'npcink_ad_page_scope';
	private const END_AT_COLUMN   = 'npcink_ad_end_at';
	private const REASONS_COLUMN  = 'npcink_ad_reasons';

	/**
	 * Promotions normalized for management-only public-target checks.
	 *
	 * @var array<int, array<string, mixed>|null>
	 */
	private array $promotions = array();

	/**
	 * Published automatic Promotions used by every current list row.
	 *
	 * @var list<array<string, mixed>>
	 */
	private array $published_automatic_promotions = array();

	/**
	 * Potential overlap IDs keyed by current Promotion ID.
	 *
	 * @var array<int, list<int>>
	 */
	private array $overlapping_ids = array();

	/**
	 * Whether the current list page has been primed as one batch.
	 *
	 * @var bool
	 */
	private bool $cache_primed = false;

	/**
	 * Timestamp shared by every row in one list response.
	 *
	 * @var int|null
	 */
	private ?int $now = null;

	/**
	 * Row actions rendered as standalone forms after the outer list form closes.
	 *
	 * @var array<string, array{post_id: int, operation: string}>
	 */
	private array $status_forms = array();

	/**
	 * Create the list presenter.
	 *
	 * @param Repository            $repository Promotion repository.
	 * @param Eligibility_Evaluator $evaluator       Shared delivery policy.
	 * @param Overlap_Detector      $overlap_detector Pure advisory overlap policy.
	 */
	public function __construct(
		private readonly Repository $repository,
		private readonly Eligibility_Evaluator $evaluator,
		private readonly Overlap_Detector $overlap_detector
	) {
	}

	/**
	 * Register Promotion-list hooks.
	 */
	public function register(): void {
		add_filter(
			'manage_' . Post_Types::PROMOTION_POST_TYPE . '_posts_columns',
			array( $this, 'columns' )
		);
		add_action(
			'manage_' . Post_Types::PROMOTION_POST_TYPE . '_posts_custom_column',
			array( $this, 'render_column' ),
			10,
			2
		);
		add_action( 'admin_footer', array( $this, 'render_status_forms' ) );
		add_filter( 'quick_edit_enabled_for_post_type', array( $this, 'disable_quick_edit' ), 10, 2 );
		add_filter(
			'bulk_actions-edit-' . Post_Types::PROMOTION_POST_TYPE,
			array( $this, 'remove_bulk_edit' )
		);
		add_filter( 'use_block_editor_for_post_type', array( $this, 'force_block_editor' ), PHP_INT_MAX, 2 );
		add_filter( 'use_block_editor_for_post', array( $this, 'force_block_editor_for_post' ), PHP_INT_MAX, 2 );
	}

	/**
	 * Disable the native Quick Edit path for Promotions.
	 *
	 * @param bool   $enabled   Whether Quick Edit is enabled.
	 * @param string $post_type Current post type.
	 */
	public function disable_quick_edit( bool $enabled, string $post_type ): bool {
		return Post_Types::PROMOTION_POST_TYPE === $post_type ? false : $enabled;
	}

	/**
	 * Remove only the native Bulk Edit action from the Promotion list.
	 *
	 * @param array<string, string> $actions Current bulk actions.
	 * @return array<string, string>
	 */
	public function remove_bulk_edit( array $actions ): array {
		unset( $actions['edit'] );

		return $actions;
	}

	/**
	 * Keep the supported Promotion editor on the validated block-editor path.
	 *
	 * @param bool   $use_block_editor Existing editor decision.
	 * @param string $post_type       Current post type.
	 */
	public function force_block_editor( bool $use_block_editor, string $post_type ): bool {
		return Post_Types::PROMOTION_POST_TYPE === $post_type ? true : $use_block_editor;
	}

	/**
	 * Override Classic Editor's post-level decision for Promotions.
	 *
	 * @param bool    $use_block_editor Existing editor decision.
	 * @param WP_Post $post             Current native post.
	 */
	public function force_block_editor_for_post( bool $use_block_editor, WP_Post $post ): bool {
		return Post_Types::PROMOTION_POST_TYPE === $post->post_type ? true : $use_block_editor;
	}

	/**
	 * Add delivery-rule columns before the native date column.
	 *
	 * @param array<string, string> $columns Existing list columns.
	 * @return array<string, string>
	 */
	public function columns( array $columns ): array {
		$added = array(
			self::STATUS_COLUMN   => __( 'Rule status', 'npcink-ad' ),
			self::LOCATION_COLUMN => __( 'Placement', 'npcink-ad' ),
			self::SCOPE_COLUMN    => __( 'Pages', 'npcink-ad' ),
			self::END_AT_COLUMN   => __( 'Stops', 'npcink-ad' ),
			self::REASONS_COLUMN  => __( 'Why not', 'npcink-ad' ),
		);

		$date = $columns['date'] ?? null;
		unset( $columns['date'] );
		$columns = array_merge( $columns, $added );
		if ( null !== $date ) {
			$columns['date'] = $date;
		}

		return $columns;
	}

	/**
	 * Render one rule column.
	 *
	 * @param string $column_name Column identifier.
	 * @param int    $post_id     Promotion post ID.
	 */
	public function render_column( string $column_name, int $post_id ): void {
		if ( ! in_array( $column_name, $this->column_names(), true ) ) {
			return;
		}

		$promotion = $this->promotion( $post_id );
		if ( null === $promotion ) {
			echo '&mdash;';
			return;
		}

		switch ( $column_name ) {
			case self::STATUS_COLUMN:
				$this->render_status( $promotion );
				break;
			case self::LOCATION_COLUMN:
				echo esc_html( $this->location_label( (string) ( $promotion['location'] ?? '' ) ) );
				$this->render_overlap_hint( $promotion );
				break;
			case self::SCOPE_COLUMN:
				$this->render_scope( $promotion );
				break;
			case self::END_AT_COLUMN:
				echo esc_html( $this->end_at_label( (int) ( $promotion['end_at'] ?? 0 ) ) );
				break;
			case self::REASONS_COLUMN:
				$this->render_reasons( $promotion );
				break;
		}
	}

	/**
	 * Get all custom column names.
	 *
	 * @return list<string>
	 */
	private function column_names(): array {
		return array(
			self::STATUS_COLUMN,
			self::LOCATION_COLUMN,
			self::SCOPE_COLUMN,
			self::END_AT_COLUMN,
			self::REASONS_COLUMN,
		);
	}

	/**
	 * Render a truthful rule-readiness label and its POST-only status action.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 */
	private function render_status( array $promotion ): void {
		echo '<strong>' . esc_html( $this->status_label( $promotion ) ) . '</strong>';
		$this->render_status_action( $promotion );
	}

	/**
	 * Resolve one truthful management status without claiming an impression.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 */
	private function status_label( array $promotion ): string {
		$configuration = $this->evaluator->validate_configuration( $promotion );
		$readiness     = $this->evaluator->assess_readiness( $promotion, $this->now() );
		$status        = (string) ( $promotion['status'] ?? '' );

		if ( ! $configuration['valid'] ) {
			return __( 'Needs completion', 'npcink-ad' );
		}
		if ( 'draft' === $status ) {
			return __( 'Paused', 'npcink-ad' );
		}
		if ( 'future' === $status ) {
			return __( 'Not started', 'npcink-ad' );
		}
		if ( 'publish' !== $status ) {
			return __( 'Not published', 'npcink-ad' );
		}
		if ( in_array( 'promotion_not_started', $readiness['reasons'], true ) ) {
			return __( 'Not started', 'npcink-ad' );
		}
		if ( in_array( 'promotion_expired', $readiness['reasons'], true ) ) {
			return __( 'Ended', 'npcink-ad' );
		}

		return __( 'Rule ready', 'npcink-ad' );
	}

	/**
	 * Render a button linked to a standalone footer POST form.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 */
	private function render_status_action( array $promotion ): void {
		$post_id = (int) ( $promotion['id'] ?? 0 );
		$status  = (string) ( $promotion['status'] ?? '' );
		if ( 1 > $post_id || ! in_array( $status, array( 'publish', 'draft' ), true ) ) {
			return;
		}

		$operation = 'publish' === $status ? 'pause' : 'resume';
		if ( ! $this->can_change_status( $post_id, $operation ) ) {
			return;
		}

		$label = 'pause' === $operation
			? __( 'Pause', 'npcink-ad' )
			: __( 'Resume', 'npcink-ad' );
		$title      = trim( (string) get_the_title( $post_id ) );
		$identifier = '' === $title ? '#' . $post_id : $title;
		$aria_label = $label . ': ' . $identifier;
		$form_id = $this->status_form_id( $post_id, $operation );
		$this->status_forms[ $form_id ] = array(
			'post_id'   => $post_id,
			'operation' => $operation,
		);

		echo '<br /><button type="submit" class="button-link" form="' . esc_attr( $form_id ) . '" aria-label="' . esc_attr( $aria_label ) . '">' . esc_html( $label ) . '</button>';
	}

	/**
	 * Render queued row-action forms outside WordPress's outer posts-filter form.
	 */
	public function render_status_forms(): void {
		if ( array() === $this->status_forms ) {
			return;
		}

		foreach ( $this->status_forms as $form_id => $form ) {
			?>
			<form id="<?php echo esc_attr( $form_id ); ?>" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="<?php echo esc_attr( Promotion_Status_Action::action_name() ); ?>" />
				<input type="hidden" name="promotion_id" value="<?php echo esc_attr( (string) $form['post_id'] ); ?>" />
				<input type="hidden" name="operation" value="<?php echo esc_attr( $form['operation'] ); ?>" />
				<?php wp_nonce_field( Promotion_Status_Action::nonce_action( $form['operation'], $form['post_id'] ) ); ?>
			</form>
			<?php
		}

		$this->status_forms = array();
	}

	/**
	 * Build a unique HTML-safe form ID from allow-listed values.
	 *
	 * @param int    $post_id   Promotion post ID.
	 * @param string $operation Pause or resume.
	 */
	private function status_form_id( int $post_id, string $operation ): string {
		return 'npcink-ad-status-' . $operation . '-' . $post_id;
	}

	/**
	 * Check the post type's edit and publish capabilities.
	 *
	 * @param int    $post_id   Promotion post ID.
	 * @param string $operation Requested operation.
	 */
	private function can_change_status( int $post_id, string $operation ): bool {
		$post_type = get_post_type_object( Post_Types::PROMOTION_POST_TYPE );
		if ( ! $post_type instanceof WP_Post_Type ) {
			return false;
		}

		if ( ! current_user_can( (string) $post_type->cap->edit_post, $post_id ) ) {
			return false;
		}

		return 'resume' !== $operation || current_user_can( (string) $post_type->cap->publish_posts );
	}

	/**
	 * Render the configured page range using management-valid public targets.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 */
	private function render_scope( array $promotion ): void {
		if ( 'selected' !== ( $promotion['page_scope'] ?? 'all' ) ) {
			esc_html_e( 'All posts and pages', 'npcink-ad' );
			$exclude_count = count( $this->post_ids( $promotion['exclude_ids'] ?? array() ) );
			if ( 0 < $exclude_count ) {
				echo '<br /><small>' . esc_html__( 'Configured exclusions:', 'npcink-ad' ) . ' ' . esc_html( (string) $exclude_count ) . '</small>';
			}
			return;
		}

		$include_ids = is_array( $promotion['include_ids'] ?? null ) ? $promotion['include_ids'] : array();
		$exclude_ids = is_array( $promotion['exclude_ids'] ?? null ) ? $promotion['exclude_ids'] : array();
		$count       = count( array_diff( $include_ids, $exclude_ids ) );

		echo esc_html__( 'Selected public posts/pages:', 'npcink-ad' ) . ' ' . esc_html( (string) $count );
	}

	/**
	 * Render evaluator reasons through the shared presentation mapping.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 */
	private function render_reasons( array $promotion ): void {
		$readiness = $this->evaluator->assess_readiness( $promotion, $this->now() );
		if ( $readiness['ready'] ) {
			echo '&mdash;';
			return;
		}

		$messages = Eligibility_Messages::messages( $readiness['reasons'] );
		foreach ( $messages as $index => $message ) {
			if ( 0 < $index ) {
				echo '<br />';
			}
			echo esc_html( $message );
		}
	}

	/**
	 * Get a human-readable placement label.
	 *
	 * @param string $location Stored location.
	 */
	private function location_label( string $location ): string {
		$labels = array(
			'block'          => __( 'Block', 'npcink-ad' ),
			'content_before' => __( 'Before content', 'npcink-ad' ),
			'content_after'  => __( 'After content', 'npcink-ad' ),
		);

		return $labels[ $location ] ?? __( 'Unknown', 'npcink-ad' );
	}

	/**
	 * Render a non-blocking overlap advisory below an automatic placement.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 */
	private function render_overlap_hint( array $promotion ): void {
		$promotion_id = isset( $promotion['id'] ) ? (int) $promotion['id'] : 0;
		$overlap_count = isset( $this->overlapping_ids[ $promotion_id ] )
			? count( $this->overlapping_ids[ $promotion_id ] )
			: 0;
		if ( 1 > $overlap_count ) {
			return;
		}

		$message = sprintf(
			/* translators: %d: number of published Promotions with intersecting automatic delivery rules. */
			_n(
				'May appear together with %d published promotion.',
				'May appear together with %d published promotions.',
				$overlap_count,
				'npcink-ad'
			),
			$overlap_count
		);

		echo '<br /><small class="npcink-ad-overlap-hint">' . esc_html( $message ) . '</small>';
	}

	/**
	 * Format the stop time in the site's timezone.
	 *
	 * @param int $end_at Stop timestamp.
	 */
	private function end_at_label( int $end_at ): string {
		if ( 1 > $end_at ) {
			return __( 'No end time', 'npcink-ad' );
		}

		$format = (string) get_option( 'date_format' ) . ' ' . (string) get_option( 'time_format' );

		return wp_date( trim( $format ), $end_at, wp_timezone() );
	}

	/**
	 * Get one cached, management-normalized promotion.
	 *
	 * @param int $post_id Promotion post ID.
	 * @return array<string, mixed>|null
	 */
	private function promotion( int $post_id ): ?array {
		$this->prime_list_cache();
		if ( array_key_exists( $post_id, $this->promotions ) ) {
			return $this->promotions[ $post_id ];
		}

		$promotion = $this->repository->find_promotion( $post_id );
		if ( null !== $promotion && 'selected' === ( $promotion['page_scope'] ?? 'all' ) ) {
			$promotion = $this->filter_public_targets( $promotion );
		}
		$this->promotions[ $post_id ] = $promotion;

		return $promotion;
	}

	/**
	 * Prime every row from the main edit query and filter selected targets once.
	 */
	private function prime_list_cache(): void {
		if ( $this->cache_primed ) {
			return;
		}
		$this->cache_primed = true;

		$query = $GLOBALS['wp_query'] ?? null;
		if ( ! $query instanceof WP_Query ) {
			return;
		}

		$selected_ids = array();
		$has_automatic_promotion = false;
		foreach ( $query->posts as $post ) {
			if ( ! $post instanceof WP_Post || Post_Types::PROMOTION_POST_TYPE !== $post->post_type ) {
				continue;
			}

			$promotion                  = $this->repository->find_promotion( $post->ID );
			$this->promotions[ $post->ID ] = $promotion;
			if ( null === $promotion ) {
				continue;
			}
			$has_automatic_promotion = $has_automatic_promotion || in_array(
				$promotion['location'] ?? '',
				array( 'content_before', 'content_after' ),
				true
			);

			if ( 'selected' === ( $promotion['page_scope'] ?? 'all' ) ) {
				$selected_ids = array_merge( $selected_ids, $this->post_ids( $promotion['include_ids'] ?? array() ) );
			}
		}

		if ( $has_automatic_promotion ) {
			$this->published_automatic_promotions = $this->repository->find_published_automatic_promotions();
			foreach ( $this->published_automatic_promotions as $promotion ) {
				if ( 'selected' === ( $promotion['page_scope'] ?? 'all' ) ) {
					$selected_ids = array_merge( $selected_ids, $this->post_ids( $promotion['include_ids'] ?? array() ) );
				}
			}
		}

		$public_lookup = $this->public_content_lookup( $selected_ids );
		foreach ( $this->promotions as $post_id => $promotion ) {
			if ( null === $promotion || 'selected' !== ( $promotion['page_scope'] ?? 'all' ) ) {
				continue;
			}
			$this->promotions[ $post_id ] = $this->apply_public_lookup( $promotion, $public_lookup );
		}
		foreach ( $this->published_automatic_promotions as $index => $promotion ) {
			if ( 'selected' === ( $promotion['page_scope'] ?? 'all' ) ) {
				$this->published_automatic_promotions[ $index ] = $this->apply_public_lookup( $promotion, $public_lookup );
			}
		}

		foreach ( $this->promotions as $post_id => $promotion ) {
			if ( null !== $promotion ) {
				$this->overlapping_ids[ $post_id ] = $this->overlap_detector->find_overlapping_ids(
					$promotion,
					$this->published_automatic_promotions
				);
			}
		}
	}

	/**
	 * Filter one fallback row's selected targets in one repository query.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 * @return array<string, mixed>
	 */
	private function filter_public_targets( array $promotion ): array {
		$ids           = $this->post_ids( $promotion['include_ids'] ?? array() );
		$public_lookup = $this->public_content_lookup( $ids );

		return $this->apply_public_lookup( $promotion, $public_lookup );
	}

	/**
	 * Build one public-content lookup for aggregated include IDs.
	 *
	 * @param array $ids Candidate IDs from one or more Promotion rows.
	 * @return array<int, bool>
	 * @phpstan-param list<int> $ids
	 */
	private function public_content_lookup( array $ids ): array {
		$ids    = array_values( array_unique( $ids ) );
		$lookup = array();
		foreach ( $this->repository->filter_public_content_ids( $ids ) as $public_id ) {
			$lookup[ $public_id ] = true;
		}

		return $lookup;
	}

	/**
	 * Apply a public-ID lookup to one promotion copy.
	 *
	 * @param array<string, mixed> $promotion    Promotion domain data.
	 * @param array<int, bool>     $public_lookup Public content lookup.
	 * @return array<string, mixed>
	 */
	private function apply_public_lookup( array $promotion, array $public_lookup ): array {
		$include_ids = array_values(
			array_filter(
				$this->post_ids( $promotion['include_ids'] ?? array() ),
				static fn ( int $id ): bool => isset( $public_lookup[ $id ] )
			)
		);
		$include_lookup           = array_fill_keys( $include_ids, true );
		$promotion['include_ids'] = $include_ids;
		$promotion['exclude_ids'] = array_values(
			array_filter(
				$this->post_ids( $promotion['exclude_ids'] ?? array() ),
				static fn ( int $id ): bool => isset( $include_lookup[ $id ] )
			)
		);

		return $promotion;
	}

	/**
	 * Normalize an unknown ID list without copying eligibility rules.
	 *
	 * @param mixed $value Candidate ID list.
	 * @return list<int>
	 */
	private function post_ids( mixed $value ): array {
		return Post_Types::sanitize_post_ids( $value );
	}

	/**
	 * Get one response-wide timestamp.
	 */
	private function now(): int {
		if ( null === $this->now ) {
			$this->now = current_datetime()->getTimestamp();
		}

		return $this->now;
	}
}
