<?php
/**
 * Promotion pause and resume action.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Admin;

use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use Npcink\Ad\Presentation\Eligibility_Messages;
use WP_Error;
use WP_Post;
use WP_Post_Type;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles tightly scoped publish/future-to-draft and draft-to-publish transitions.
 */
final class Promotion_Status_Action {
	private const ACTION       = 'npcink_ad_change_promotion_status';
	private const NOTICE_QUERY = 'npcink_ad_notice';
	private const CONFIGURATION_REASONS = array(
		'promotion_content_empty',
		'promotion_video_source_missing',
		'promotion_targets_empty',
		'promotion_terms_invalid',
		'promotion_schedule_invalid',
		'promotion_paragraph_invalid',
	);

	/**
	 * Create the status action.
	 *
	 * @param Repository            $repository Promotion repository.
	 * @param Eligibility_Evaluator $evaluator  Shared delivery policy.
	 */
	public function __construct(
		private readonly Repository $repository,
		private readonly Eligibility_Evaluator $evaluator
	) {
	}

	/**
	 * Register the authenticated action and its notices.
	 */
	public function register(): void {
		add_action( 'admin_post_' . self::ACTION, array( $this, 'handle' ) );
		add_action( 'admin_notices', array( $this, 'render_notice' ) );
	}

	/**
	 * Get the admin-post action name used by the list form.
	 */
	public static function action_name(): string {
		return self::ACTION;
	}

	/**
	 * Bind each nonce to both the operation and Promotion ID.
	 *
	 * @param string $operation Pause or resume.
	 * @param int    $post_id   Promotion post ID.
	 */
	public static function nonce_action( string $operation, int $post_id ): string {
		return self::ACTION . '_' . $operation . '_' . $post_id;
	}

	/**
	 * Process one authenticated pause or resume request.
	 */
	public function handle(): void {
		$request_method = isset( $_SERVER['REQUEST_METHOD'] )
			? sanitize_key( wp_unslash( $_SERVER['REQUEST_METHOD'] ) )
			: '';
		if ( 'post' !== $request_method ) {
			wp_die(
				esc_html__( 'Promotion status changes require a POST request.', 'npcink-ad' ),
				'',
				array( 'response' => 405 )
			);
		}

		$operation = isset( $_POST['operation'] )
			? sanitize_key( wp_unslash( $_POST['operation'] ) )
			: '';
		$post_id   = isset( $_POST['promotion_id'] )
			? absint( wp_unslash( $_POST['promotion_id'] ) )
			: 0;
		if ( 1 > $post_id || ! in_array( $operation, array( 'pause', 'resume' ), true ) ) {
			wp_die(
				esc_html__( 'The promotion status request is invalid.', 'npcink-ad' ),
				'',
				array( 'response' => 400 )
			);
		}

		check_admin_referer( self::nonce_action( $operation, $post_id ) );

		$post = get_post( $post_id );
		if ( ! $post instanceof WP_Post || Post_Types::PROMOTION_POST_TYPE !== $post->post_type ) {
			wp_die(
				esc_html__( 'The requested promotion does not exist.', 'npcink-ad' ),
				'',
				array( 'response' => 404 )
			);
		}

		$post_type = get_post_type_object( Post_Types::PROMOTION_POST_TYPE );
		if ( ! $post_type instanceof WP_Post_Type || ! current_user_can( (string) $post_type->cap->edit_post, $post_id ) ) {
			wp_die(
				esc_html__( 'You are not allowed to change this promotion status.', 'npcink-ad' ),
				'',
				array( 'response' => 403 )
			);
		}
		if ( 'resume' === $operation && ! current_user_can( (string) $post_type->cap->publish_posts ) ) {
			wp_die(
				esc_html__( 'You are not allowed to publish promotions.', 'npcink-ad' ),
				'',
				array( 'response' => 403 )
			);
		}

		$transition = $this->transition_decision( $post->post_status, $operation );
		if ( null !== $transition['notice'] ) {
			$this->redirect_with_notice( $transition['notice'] );
		}

		if ( 'resume' === $operation ) {
			$reason = $this->resume_blocking_reason( $post_id );
			if ( null !== $reason ) {
				$this->redirect_with_notice( $reason );
			}
		}

		$update = array(
			'ID'          => $post_id,
			'post_status' => $transition['target_status'],
		);
		if ( 'resume' === $operation ) {
			$update = $this->resume_update_data(
				$post_id,
				(string) $post->post_date_gmt,
				current_datetime()->getTimestamp(),
				current_time( 'mysql' ),
				current_time( 'mysql', true )
			);
		}

		$result = wp_update_post( $update, true );
		if ( $result instanceof WP_Error || 1 > $result ) {
			$this->redirect_with_notice( 'update_failed' );
		}

		$updated_post = get_post( $post_id );
		if ( ! $this->did_reach_status( $updated_post, $transition['target_status'] ) ) {
			$this->redirect_with_notice( 'update_failed' );
		}

		$this->redirect_with_notice( 'pause' === $operation ? 'paused' : 'resumed' );
	}

	/**
	 * Decide a bounded status transition before any resume preflight query.
	 *
	 * @param string $current_status Current WordPress post status.
	 * @param string $operation      Pause or resume.
	 * @return array{target_status: string, notice: string|null}
	 */
	private function transition_decision( string $current_status, string $operation ): array {
		$target_status = 'pause' === $operation ? 'draft' : 'publish';
		if ( $target_status === $current_status ) {
			return array(
				'target_status' => $target_status,
				'notice'        => 'pause' === $operation ? 'already_paused' : 'already_resumed',
			);
		}

		$allowed_statuses = 'pause' === $operation
			? array( 'publish', 'future' )
			: array( 'draft' );
		if ( ! in_array( $current_status, $allowed_statuses, true ) ) {
			return array(
				'target_status' => $target_status,
				'notice'        => 'unsupported_status',
			);
		}

		return array(
			'target_status' => $target_status,
			'notice'        => null,
		);
	}

	/**
	 * Build a resume update that cannot be converted back to a future post.
	 *
	 * WordPress retains the previous publication date when a post is drafted.
	 * Reset both local and GMT dates only when that retained GMT date is still
	 * in the future; historical publication dates remain intact.
	 *
	 * @param int    $post_id       Promotion post ID.
	 * @param string $post_date_gmt Retained GMT publication date.
	 * @param int    $now           Current Unix timestamp.
	 * @param string $current_local Current WordPress-local mysql datetime.
	 * @param string $current_gmt   Current GMT mysql datetime.
	 * @return array{ID: int, post_status: string, post_date?: string, post_date_gmt?: string}
	 */
	private function resume_update_data(
		int $post_id,
		string $post_date_gmt,
		int $now,
		string $current_local,
		string $current_gmt
	): array {
		$update = array(
			'ID'          => $post_id,
			'post_status' => 'publish',
		);
		$publication_timestamp = strtotime( $post_date_gmt . ' GMT' );
		if ( false !== $publication_timestamp && $now < $publication_timestamp ) {
			$update['post_date']     = $current_local;
			$update['post_date_gmt'] = $current_gmt;
		}

		return $update;
	}

	/**
	 * Confirm WordPress reached the requested status after an update call.
	 *
	 * @param mixed  $post          Re-read post value.
	 * @param string $target_status Expected native post status.
	 */
	private function did_reach_status( mixed $post, string $target_status ): bool {
		return $post instanceof WP_Post && $target_status === $post->post_status;
	}

	/**
	 * Render an allow-listed result notice on the Promotion list.
	 */
	public function render_notice(): void {
		if ( ! current_user_can( 'manage_npcink_ads' ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- This allow-listed value only selects an inert notice.
		$notice = isset( $_GET[ self::NOTICE_QUERY ] ) ? sanitize_key( wp_unslash( $_GET[ self::NOTICE_QUERY ] ) ) : '';
		if ( '' === $notice ) {
			return;
		}

		$message = $this->notice_message( $notice );
		if ( null === $message ) {
			return;
		}
		?>
		<div class="notice notice-<?php echo esc_attr( $message['type'] ); ?> is-dismissible"><p><?php echo esc_html( $message['text'] ); ?></p></div>
		<?php
	}

	/**
	 * Validate a would-be published Promotion with public selected targets.
	 *
	 * @param int $post_id Promotion post ID.
	 * @return string|null First allow-listed reason, or null when valid.
	 */
	private function resume_blocking_reason( int $post_id ): ?string {
		$promotion = $this->repository->find_promotion( $post_id );
		if ( null === $promotion ) {
			return 'update_failed';
		}

		$promotion['status'] = 'publish';
		if ( 'selected' === ( $promotion['content_scope'] ?? 'all' ) ) {
			$include_ids = $this->post_ids( $promotion['include_ids'] ?? array() );
			$exclude_ids = $this->post_ids( $promotion['exclude_ids'] ?? array() );
			$promotion['include_ids'] = $this->repository->filter_public_content_ids( $include_ids );
			$include_lookup           = array_fill_keys( $promotion['include_ids'], true );
			$promotion['exclude_ids'] = array_values(
				array_filter(
					$exclude_ids,
					static fn ( int $id ): bool => isset( $include_lookup[ $id ] )
				)
			);
		}

		$validation = $this->evaluator->validate_configuration( $promotion );
		if ( $validation['valid'] ) {
			return null;
		}

		foreach ( $validation['reasons'] as $reason ) {
			if ( in_array( $reason, self::CONFIGURATION_REASONS, true ) ) {
				return $reason;
			}
		}

		return 'update_failed';
	}

	/**
	 * Normalize an unknown ID list for the repository boundary.
	 *
	 * @param mixed $value Candidate ID list.
	 * @return list<int>
	 */
	private function post_ids( mixed $value ): array {
		return Post_Types::sanitize_post_ids( $value );
	}

	/**
	 * Convert one allow-listed result code to translated notice text.
	 *
	 * @param string $notice Notice code.
	 * @return array{type: string, text: string}|null
	 */
	private function notice_message( string $notice ): ?array {
		$messages = array(
			'paused'             => array(
				'type' => 'success',
				'text' => __( 'The promotion is paused.', 'npcink-ad' ),
			),
			'resumed'            => array(
				'type' => 'success',
				'text' => __( 'The promotion was published. Delivery still depends on its schedule and content rules.', 'npcink-ad' ),
			),
			'already_paused'     => array(
				'type' => 'info',
				'text' => __( 'The promotion was already paused.', 'npcink-ad' ),
			),
			'already_resumed'    => array(
				'type' => 'info',
				'text' => __( 'The promotion was already published.', 'npcink-ad' ),
			),
			'unsupported_status' => array(
				'type' => 'warning',
				'text' => __( 'Only published or scheduled promotions can be paused, and only draft promotions can be resumed.', 'npcink-ad' ),
			),
			'update_failed'      => array(
				'type' => 'error',
				'text' => __( 'The promotion status could not be changed.', 'npcink-ad' ),
			),
		);

		if ( isset( $messages[ $notice ] ) ) {
			return $messages[ $notice ];
		}

		if ( ! in_array( $notice, self::CONFIGURATION_REASONS, true ) ) {
			return null;
		}

		$reason = Eligibility_Messages::messages( array( $notice ) )[0];

		return array(
			'type' => 'error',
			'text' => __( 'The promotion was not resumed:', 'npcink-ad' ) . ' ' . $reason,
		);
	}

	/**
	 * Redirect to the same-site admin list with an allow-listed notice code.
	 *
	 * @param string $notice Notice code.
	 */
	private function redirect_with_notice( string $notice ): never {
		$url = add_query_arg( self::NOTICE_QUERY, $notice, $this->requested_redirect_url() );
		wp_safe_redirect( $url );
		exit;
	}

	/**
	 * Accept only same-host wp-admin referers; otherwise use the Promotion list.
	 */
	private function requested_redirect_url(): string {
		$fallback = add_query_arg(
			'post_type',
			Post_Types::PROMOTION_POST_TYPE,
			admin_url( 'edit.php' )
		);
		// The handler verifies its operation-and-ID nonce before this method runs.
		// phpcs:disable WordPress.Security.NonceVerification.Missing
		$referer = isset( $_POST['_wp_http_referer'] )
			? esc_url_raw( wp_unslash( $_POST['_wp_http_referer'] ) )
			: '';
		// phpcs:enable WordPress.Security.NonceVerification.Missing
		if ( '' === $referer ) {
			return $fallback;
		}

		$candidate   = wp_validate_redirect( $referer, $fallback );
		$admin_parts = wp_parse_url( admin_url() );
		$url_parts   = wp_parse_url( $candidate );
		if ( ! is_array( $admin_parts ) || ! is_array( $url_parts ) ) {
			return $fallback;
		}

		$admin_host = strtolower( (string) ( $admin_parts['host'] ?? '' ) );
		$url_host   = strtolower( (string) ( $url_parts['host'] ?? '' ) );
		if ( '' !== $url_host && $admin_host !== $url_host ) {
			return $fallback;
		}

		$admin_path = (string) ( $admin_parts['path'] ?? '/' );
		$url_path   = (string) ( $url_parts['path'] ?? '' );
		if ( '' === $url_path || ! str_starts_with( $url_path, $admin_path ) ) {
			return $fallback;
		}

		return $candidate;
	}
}
