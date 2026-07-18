<?php
/**
 * Safe Promotion duplication action.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Admin;

use Npcink\Ad\Data\Post_Types;
use WP_Error;
use WP_Post;
use WP_Post_Type;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Copies one editable Promotion into a new, unscheduled draft.
 */
final class Promotion_Duplicate_Action {
	private const ACTION       = 'npcink_ad_duplicate_promotion';
	private const NOTICE_QUERY = 'npcink_ad_duplicate_notice';

	/**
	 * Promotion metadata whose copy semantics are explicitly accepted.
	 *
	 * Start and end times are intentionally absent from this list.
	 *
	 * @var list<string>
	 */
	private const COPY_META_KEYS = array(
		Post_Types::LOCATION_META,
		Post_Types::CONTENT_SCOPE_META,
		Post_Types::INCLUDE_IDS_META,
		Post_Types::EXCLUDE_IDS_META,
		Post_Types::CATEGORY_IDS_META,
		Post_Types::TAG_IDS_META,
		Post_Types::DEVICE_META,
		Post_Types::PARAGRAPH_NUMBER_META,
	);

	/**
	 * Standalone forms queued while WordPress renders list rows.
	 *
	 * @var array<string, int>
	 */
	private array $forms = array();

	/**
	 * Register the row action, authenticated handler, forms, and notices.
	 */
	public function register(): void {
		add_filter( 'post_row_actions', array( $this, 'add_row_action' ), 10, 2 );
		add_action( 'admin_footer', array( $this, 'render_forms' ) );
		add_action( 'admin_post_' . self::ACTION, array( $this, 'handle' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_editor_notice' ) );
		add_action( 'admin_notices', array( $this, 'render_notice' ) );
	}

	/**
	 * Bind every duplication nonce to its source Promotion.
	 *
	 * @param int $post_id Source Promotion ID.
	 */
	public static function nonce_action( int $post_id ): string {
		return self::ACTION . '_' . $post_id;
	}

	/**
	 * Add a POST-backed native row action for one editable Promotion.
	 *
	 * @param array<string, string> $actions Existing row actions.
	 * @param WP_Post               $post    Current row post.
	 * @return array<string, string>
	 */
	public function add_row_action( array $actions, WP_Post $post ): array {
		if (
			Post_Types::PROMOTION_POST_TYPE !== $post->post_type ||
			1 > $post->ID ||
			! $this->can_duplicate( $post->ID )
		) {
			return $actions;
		}

		$form_id                  = $this->form_id( $post->ID );
		$this->forms[ $form_id ] = $post->ID;
		$title                    = trim( (string) get_the_title( $post->ID ) );
		$identifier               = '' === $title ? '#' . $post->ID : $title;
		$label                    = __( 'Duplicate as draft', 'npcink-ad' );
		$aria_label               = sprintf(
			/* translators: %s: Promotion title or numeric ID. */
			__( 'Duplicate as draft: %s', 'npcink-ad' ),
			$identifier
		);

		$actions['npcink_ad_duplicate'] = '<button type="submit" class="button-link" form="' . esc_attr( $form_id ) . '" aria-label="' . esc_attr( $aria_label ) . '">' . esc_html( $label ) . '</button>';

		return $actions;
	}

	/**
	 * Render queued forms after WordPress's outer list-table form closes.
	 */
	public function render_forms(): void {
		if ( array() === $this->forms ) {
			return;
		}

		foreach ( $this->forms as $form_id => $post_id ) {
			?>
			<form id="<?php echo esc_attr( $form_id ); ?>" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="<?php echo esc_attr( self::ACTION ); ?>" />
				<input type="hidden" name="promotion_id" value="<?php echo esc_attr( (string) $post_id ); ?>" />
				<?php wp_nonce_field( self::nonce_action( $post_id ) ); ?>
			</form>
			<?php
		}

		$this->forms = array();
	}

	/**
	 * Process one authenticated duplication request.
	 */
	public function handle(): void {
		$request_method = isset( $_SERVER['REQUEST_METHOD'] )
			? sanitize_key( wp_unslash( $_SERVER['REQUEST_METHOD'] ) )
			: '';
		if ( 'post' !== $request_method ) {
			wp_die(
				esc_html__( 'Promotion duplication requires a POST request.', 'npcink-ad' ),
				'',
				array( 'response' => 405 )
			);
		}

		$post_id = isset( $_POST['promotion_id'] )
			? absint( wp_unslash( $_POST['promotion_id'] ) )
			: 0;
		if ( 1 > $post_id ) {
			wp_die(
				esc_html__( 'The promotion duplication request is invalid.', 'npcink-ad' ),
				'',
				array( 'response' => 400 )
			);
		}

		check_admin_referer( self::nonce_action( $post_id ) );

		$source = get_post( $post_id );
		if ( ! $source instanceof WP_Post || Post_Types::PROMOTION_POST_TYPE !== $source->post_type ) {
			wp_die(
				esc_html__( 'The requested promotion does not exist.', 'npcink-ad' ),
				'',
				array( 'response' => 404 )
			);
		}

		if ( ! $this->can_duplicate( $post_id ) ) {
			wp_die(
				esc_html__( 'You are not allowed to duplicate this promotion.', 'npcink-ad' ),
				'',
				array( 'response' => 403 )
			);
		}

		$result = $this->duplicate_promotion( $source );
		if ( $result instanceof WP_Error ) {
			$notice = 'npcink_ad_duplicate_cleanup_failed' === $result->get_error_code()
				? 'cleanup_failed'
				: 'duplicate_failed';
			$this->redirect_to_list( $notice );
		}

		$this->redirect_to_editor( $result );
	}

	/**
	 * Render one allow-listed duplication result notice.
	 */
	public function render_notice(): void {
		if ( ! current_user_can( 'manage_npcink_ads' ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- This allow-listed value only selects an inert notice.
		$notice = isset( $_GET[ self::NOTICE_QUERY ] ) ? sanitize_key( wp_unslash( $_GET[ self::NOTICE_QUERY ] ) ) : '';
		if ( 'duplicated' === $notice ) {
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
	 * Surface the success result through the block editor's visible notice UI.
	 */
	public function enqueue_editor_notice(): void {
		if ( ! current_user_can( 'manage_npcink_ads' ) ) {
			return;
		}

		$screen = get_current_screen();
		if ( ! $screen || 'post' !== $screen->base || Post_Types::PROMOTION_POST_TYPE !== $screen->post_type ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- This allow-listed value only selects an inert notice.
		$notice = isset( $_GET[ self::NOTICE_QUERY ] ) ? sanitize_key( wp_unslash( $_GET[ self::NOTICE_QUERY ] ) ) : '';
		if ( 'duplicated' !== $notice ) {
			return;
		}

		$message = $this->notice_message( $notice );
		if ( null === $message ) {
			return;
		}

		$message_json = wp_json_encode( $message['text'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT );
		if ( false === $message_json ) {
			return;
		}

		wp_enqueue_script( 'wp-data' );
		wp_enqueue_script( 'wp-dom-ready' );
		wp_add_inline_script(
			'wp-dom-ready',
			'wp.domReady(function () {'
			. 'var notices = wp.data.dispatch("core/notices");'
			. 'if (notices && typeof notices.createSuccessNotice === "function") {'
			. 'notices.createSuccessNotice(' . $message_json . ', { isDismissible: true });'
			. '}'
			. '});'
		);
	}

	/**
	 * Create the bounded draft after the request security boundary has passed.
	 *
	 * @param WP_Post $source Source Promotion.
	 * @return int|WP_Error New Promotion ID or a bounded failure.
	 */
	private function duplicate_promotion( WP_Post $source ): int|WP_Error {
		$meta        = $this->copyable_meta( $source->ID );
		$new_author  = get_current_user_id();
		$new_title   = $this->duplicate_title( $source->post_title );
		$new_content = $source->post_content;
		$new_id = wp_insert_post(
			array(
				'post_type'    => Post_Types::PROMOTION_POST_TYPE,
				'post_status'  => 'draft',
				'post_author'  => $new_author,
				'post_title'   => wp_slash( $new_title ),
				'post_content' => wp_slash( $new_content ),
			),
			true
		);
		if ( $new_id instanceof WP_Error || 1 > $new_id ) {
			return new WP_Error(
				'npcink_ad_duplicate_insert_failed',
				__( 'The promotion copy could not be created.', 'npcink-ad' )
			);
		}

		$new_post = get_post( $new_id );
		if (
			! $new_post instanceof WP_Post ||
			Post_Types::PROMOTION_POST_TYPE !== $new_post->post_type ||
			'draft' !== $new_post->post_status ||
			$new_author !== (int) $new_post->post_author ||
			$new_title !== $new_post->post_title ||
			$new_content !== $new_post->post_content
		) {
			return $this->failed_copy(
				$new_id,
				'npcink_ad_duplicate_insert_invalid',
				__( 'The promotion copy did not match the safe draft contract.', 'npcink-ad' )
			);
		}

		foreach ( $meta as $meta_key => $meta_value ) {
			update_post_meta( $new_id, $meta_key, $meta_value );
			if ( get_post_meta( $new_id, $meta_key, true ) !== $meta_value ) {
				return $this->failed_copy(
					$new_id,
					'npcink_ad_duplicate_meta_failed',
					__( 'The promotion settings could not be copied.', 'npcink-ad' )
				);
			}
		}

		foreach ( array( Post_Types::START_AT_META, Post_Types::END_AT_META ) as $schedule_key ) {
			delete_post_meta( $new_id, $schedule_key );
			if ( '' !== get_post_meta( $new_id, $schedule_key, true ) ) {
				return $this->failed_copy(
					$new_id,
					'npcink_ad_duplicate_schedule_failed',
					__( 'The promotion schedule could not be reset.', 'npcink-ad' )
				);
			}
		}

		return $new_id;
	}

	/**
	 * Read only metadata with deliberately accepted copy semantics.
	 *
	 * @param int $post_id Source Promotion ID.
	 * @return array<string, mixed>
	 */
	private function copyable_meta( int $post_id ): array {
		$meta = array();
		foreach ( self::COPY_META_KEYS as $meta_key ) {
			if ( metadata_exists( 'post', $post_id, $meta_key ) ) {
				$meta[ $meta_key ] = get_post_meta( $post_id, $meta_key, true );
			}
		}

		return $meta;
	}

	/**
	 * Produce a reviewable title without mutating an empty source title.
	 *
	 * @param string $source_title Source Promotion title.
	 */
	private function duplicate_title( string $source_title ): string {
		if ( '' === trim( $source_title ) ) {
			return __( 'Promotion copy', 'npcink-ad' );
		}

		return sprintf(
			/* translators: %s: source Promotion title. */
			__( '%s — Copy', 'npcink-ad' ),
			$source_title
		);
	}

	/**
	 * Check both the source-edit and target-create capabilities.
	 *
	 * @param int $post_id Source Promotion ID.
	 */
	private function can_duplicate( int $post_id ): bool {
		$post_type = get_post_type_object( Post_Types::PROMOTION_POST_TYPE );
		if ( ! $post_type instanceof WP_Post_Type ) {
			return false;
		}

		return current_user_can( (string) $post_type->cap->edit_post, $post_id )
			&& current_user_can( (string) $post_type->cap->create_posts );
	}

	/**
	 * Return the original failure only after confirming incomplete-copy cleanup.
	 *
	 * @param int    $post_id Incomplete Promotion ID.
	 * @param string $code    Original failure code.
	 * @param string $message Original failure message.
	 */
	private function failed_copy( int $post_id, string $code, string $message ): WP_Error {
		wp_delete_post( $post_id, true );
		if ( null !== get_post( $post_id ) ) {
			return new WP_Error(
				'npcink_ad_duplicate_cleanup_failed',
				__( 'An incomplete promotion copy could not be removed.', 'npcink-ad' )
			);
		}

		return new WP_Error( $code, $message );
	}

	/**
	 * Convert one allow-listed result code to translated notice text.
	 *
	 * @param string $notice Notice code.
	 * @return array{type: string, text: string}|null
	 */
	private function notice_message( string $notice ): ?array {
		$messages = array(
			'duplicated'       => array(
				'type' => 'success',
				'text' => __( 'The promotion was duplicated as an unscheduled draft. Review it before publishing.', 'npcink-ad' ),
			),
			'duplicate_failed' => array(
				'type' => 'error',
				'text' => __( 'The promotion could not be duplicated. No incomplete copy was kept.', 'npcink-ad' ),
			),
			'cleanup_failed'   => array(
				'type' => 'error',
				'text' => __( 'The promotion could not be duplicated, and an incomplete draft may remain. Review the Promotion list.', 'npcink-ad' ),
			),
		);

		return $messages[ $notice ] ?? null;
	}

	/**
	 * Build a unique HTML-safe form ID from the source ID.
	 *
	 * @param int $post_id Source Promotion ID.
	 */
	private function form_id( int $post_id ): string {
		return 'npcink-ad-duplicate-' . $post_id;
	}

	/**
	 * Return a failed copy to the fixed Promotion list.
	 *
	 * @param string $notice Allow-listed notice code.
	 */
	private function redirect_to_list( string $notice ): never {
		$url = add_query_arg(
			array(
				'post_type'         => Post_Types::PROMOTION_POST_TYPE,
				self::NOTICE_QUERY => $notice,
			),
			admin_url( 'edit.php' )
		);
		wp_safe_redirect( $url );
		exit;
	}

	/**
	 * Open the complete new draft in the native editor.
	 *
	 * @param int $post_id New Promotion ID.
	 */
	private function redirect_to_editor( int $post_id ): never {
		$url = add_query_arg(
			array(
				'post'              => $post_id,
				'action'            => 'edit',
				self::NOTICE_QUERY => 'duplicated',
			),
			admin_url( 'post.php' )
		);
		wp_safe_redirect( $url );
		exit;
	}
}
