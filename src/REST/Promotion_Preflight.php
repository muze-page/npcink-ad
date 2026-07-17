<?php
/**
 * Publish-time validation for the native Promotion REST controller.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\REST;

use Npcink\Ad\Data\Post_Types;
use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;
use stdClass;
use WP_Error;
use WP_REST_Request;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Rejects structurally invalid published or scheduled Promotions while preserving drafts.
 */
final class Promotion_Preflight {
	/**
	 * Compose publish validation from native storage and the delivery policy.
	 *
	 * @param Repository            $repository Native Promotion storage mapper.
	 * @param Eligibility_Evaluator $evaluator  Shared delivery policy.
	 */
	public function __construct(
		private readonly Repository $repository,
		private readonly Eligibility_Evaluator $evaluator
	) {}

	/**
	 * Register against the protected Core REST post controller.
	 */
	public function register(): void {
		add_filter(
			'rest_pre_insert_' . Post_Types::PROMOTION_POST_TYPE,
			array( $this, 'validate_before_save' ),
			10,
			2
		);
	}

	/**
	 * Validate the complete candidate only when it will publish now or later.
	 *
	 * @param stdClass|WP_Error $prepared_post Prepared Core REST post data.
	 * @param WP_REST_Request   $request       Current Core REST request.
	 * @return stdClass|WP_Error
	 */
	public function validate_before_save( stdClass|WP_Error $prepared_post, WP_REST_Request $request ): stdClass|WP_Error {
		if ( is_wp_error( $prepared_post ) ) {
			return $prepared_post;
		}

		if ( str_contains( $request->get_route(), '/autosaves' ) ) {
			return $prepared_post;
		}

		$promotion_id = isset( $prepared_post->ID ) ? absint( $prepared_post->ID ) : 0;
		$promotion    = 0 < $promotion_id ? $this->repository->find_promotion( $promotion_id ) : null;
		$promotion    = null === $promotion ? $this->defaults() : $promotion;

		if ( isset( $prepared_post->post_status ) ) {
			$promotion['status'] = sanitize_key( (string) $prepared_post->post_status );
		}
		if ( ! in_array( $promotion['status'], array( 'publish', 'future' ), true ) ) {
			return $prepared_post;
		}
		if ( isset( $prepared_post->post_content ) ) {
			$promotion['content'] = (string) $prepared_post->post_content;
		}

		$meta = $request->get_param( 'meta' );
		if ( is_array( $meta ) ) {
			$this->apply_meta( $promotion, $meta );
		}

		$this->recompute_terms_valid( $promotion );

		if ( 'selected' === $promotion['content_scope'] ) {
			$promotion['include_ids'] = $this->repository->filter_public_content_ids( $promotion['include_ids'] );
		}

		$result = $this->evaluator->validate_configuration( $promotion );
		if ( $result['valid'] ) {
			return $prepared_post;
		}

		return new WP_Error(
			'npcink_ad_promotion_not_ready',
			__( 'The promotion cannot be published until its content and delivery settings are complete.', 'npcink-ad' ),
			array(
				'status'  => 400,
				'reasons' => $result['reasons'],
			)
		);
	}

	/**
	 * Apply allow-listed request metadata to normalized domain data.
	 *
	 * @param array<string, mixed> $promotion Candidate Promotion data.
	 * @param array<string, mixed> $meta      Core REST meta input.
	 */
	private function apply_meta( array &$promotion, array $meta ): void {
		if ( array_key_exists( Post_Types::LOCATION_META, $meta ) ) {
			$promotion['location'] = Post_Types::sanitize_location( $meta[ Post_Types::LOCATION_META ] );
		}
		if ( array_key_exists( Post_Types::CONTENT_SCOPE_META, $meta ) ) {
			$promotion['content_scope'] = Post_Types::sanitize_content_scope( $meta[ Post_Types::CONTENT_SCOPE_META ] );
		}
		if ( array_key_exists( Post_Types::INCLUDE_IDS_META, $meta ) ) {
			$promotion['include_ids'] = Post_Types::sanitize_post_ids( $meta[ Post_Types::INCLUDE_IDS_META ] );
		}
		if ( array_key_exists( Post_Types::EXCLUDE_IDS_META, $meta ) ) {
			$promotion['exclude_ids'] = Post_Types::sanitize_post_ids( $meta[ Post_Types::EXCLUDE_IDS_META ] );
		}
		if ( array_key_exists( Post_Types::CATEGORY_IDS_META, $meta ) ) {
			$promotion['category_ids'] = Post_Types::sanitize_post_ids( $meta[ Post_Types::CATEGORY_IDS_META ] );
		}
		if ( array_key_exists( Post_Types::TAG_IDS_META, $meta ) ) {
			$promotion['tag_ids'] = Post_Types::sanitize_post_ids( $meta[ Post_Types::TAG_IDS_META ] );
		}
		if ( array_key_exists( Post_Types::DEVICE_META, $meta ) ) {
			$promotion['device'] = Post_Types::sanitize_device( $meta[ Post_Types::DEVICE_META ] );
		}
		if ( array_key_exists( Post_Types::PARAGRAPH_NUMBER_META, $meta ) ) {
			$paragraph_number                    = Post_Types::parse_paragraph_number( $meta[ Post_Types::PARAGRAPH_NUMBER_META ] );
			$promotion['paragraph_number']       = $paragraph_number['number'];
			$promotion['paragraph_number_valid'] = $paragraph_number['valid'];
		}
		if ( array_key_exists( Post_Types::START_AT_META, $meta ) ) {
			$start_at                    = sanitize_text_field( (string) $meta[ Post_Types::START_AT_META ] );
			$parsed_start_at             = $this->repository->parse_datetime( $start_at );
			$promotion['start_at']       = $parsed_start_at['timestamp'];
			$promotion['start_at_valid'] = $parsed_start_at['valid'];
		}
		if ( array_key_exists( Post_Types::END_AT_META, $meta ) ) {
			$end_at                    = sanitize_text_field( (string) $meta[ Post_Types::END_AT_META ] );
			$parsed_end_at             = $this->repository->parse_datetime( $end_at );
			$promotion['end_at']       = $parsed_end_at['timestamp'];
			$promotion['end_at_valid'] = $parsed_end_at['valid'];
		}
	}

	/**
	 * Recompute term-ID validity after all request metadata overrides are applied.
	 *
	 * Hidden term fields are intentionally ignored outside an automatic terms
	 * scope, so stale values cannot block an unrelated publish transition.
	 *
	 * @param array<string, mixed> $promotion Candidate Promotion data.
	 */
	private function recompute_terms_valid( array &$promotion ): void {
		$promotion['terms_valid'] = true;
		if (
			'terms' !== ( $promotion['content_scope'] ?? 'all' )
			|| ! in_array( $promotion['location'] ?? 'content_after', array( 'content_before', 'content_after', 'content_after_paragraph' ), true )
		) {
			return;
		}

		$category_ids = Post_Types::sanitize_post_ids( $promotion['category_ids'] ?? array() );
		$tag_ids      = Post_Types::sanitize_post_ids( $promotion['tag_ids'] ?? array() );
		$promotion['category_ids'] = $category_ids;
		$promotion['tag_ids']      = $tag_ids;
		$promotion['terms_valid']  = $category_ids === $this->repository->filter_existing_term_ids( $category_ids, 'category' )
			&& $tag_ids === $this->repository->filter_existing_term_ids( $tag_ids, 'post_tag' );
	}

	/**
	 * Build the same defaults registered for a new native Promotion.
	 *
	 * @return array<string, mixed>
	 */
	private function defaults(): array {
		return array(
			'id'          => 0,
			'status'      => 'draft',
			'content'     => '',
			'location'    => 'content_after',
			'paragraph_number' => Post_Types::DEFAULT_PARAGRAPH_NUMBER,
			'paragraph_number_valid' => true,
			'content_scope' => 'all',
			'include_ids' => array(),
			'exclude_ids' => array(),
			'category_ids' => array(),
			'tag_ids'      => array(),
			'terms_valid'  => true,
			'device'      => 'all',
			'start_at'    => 0,
			'start_at_valid' => true,
			'end_at'      => 0,
			'end_at_valid' => true,
		);
	}
}
