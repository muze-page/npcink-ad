<?php
/**
 * Determines whether a promotion may render in a request context.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Domain;

/**
 * Pure eligibility policy with no WordPress API calls.
 */
final class Eligibility_Evaluator {
	/**
	 * Validate configuration that is independent of publication time and page context.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 * @return array{valid: bool, reasons: list<string>}
	 */
	public function validate_configuration( array $promotion ): array {
		$reasons = array();
		$content = (string) ( $promotion['content'] ?? '' );

		if ( $this->has_video_without_valid_source( $content ) ) {
			$reasons[] = 'promotion_video_source_missing';
		} elseif ( ! $this->has_meaningful_content( $content ) ) {
			$reasons[] = 'promotion_content_empty';
		}

		$content_scope = $this->normalize_content_scope( $promotion['content_scope'] ?? 'all' );
		$include_ids   = $this->normalize_post_ids( $promotion['include_ids'] ?? array() );
		$exclude_ids   = $this->normalize_post_ids( $promotion['exclude_ids'] ?? array() );
		if ( 'selected' === $content_scope && array() === array_diff( $include_ids, $exclude_ids ) ) {
			$reasons[] = 'promotion_targets_empty';
		}

		$location               = isset( $promotion['location'] ) ? (string) $promotion['location'] : 'content_after';
		if ( 'terms' === $content_scope && $this->is_automatic_location( $location ) ) {
			$category_ids = $this->normalize_post_ids( $promotion['category_ids'] ?? array() );
			$tag_ids      = $this->normalize_post_ids( $promotion['tag_ids'] ?? array() );
			if ( array() === $category_ids && array() === $tag_ids ) {
				$reasons[] = 'promotion_targets_empty';
			} elseif ( ! (bool) ( $promotion['terms_valid'] ?? false ) ) {
				$reasons[] = 'promotion_terms_invalid';
			}
		}

		$paragraph_number       = isset( $promotion['paragraph_number'] ) ? (int) $promotion['paragraph_number'] : 3;
		$paragraph_number_valid = ! array_key_exists( 'paragraph_number_valid', $promotion ) || (bool) $promotion['paragraph_number_valid'];
		if (
			'content_after_paragraph' === $location
			&& ( ! $paragraph_number_valid || 1 > $paragraph_number || 20 < $paragraph_number )
		) {
			$reasons[] = 'promotion_paragraph_invalid';
		}

		$start_at = isset( $promotion['start_at'] ) ? (int) $promotion['start_at'] : 0;
		$end_at   = isset( $promotion['end_at'] ) ? (int) $promotion['end_at'] : 0;
		$start_at_valid = ! array_key_exists( 'start_at_valid', $promotion ) || (bool) $promotion['start_at_valid'];
		$end_at_valid   = ! array_key_exists( 'end_at_valid', $promotion ) || (bool) $promotion['end_at_valid'];
		if ( ! $start_at_valid || ! $end_at_valid || ( 0 < $start_at && 0 < $end_at && $end_at <= $start_at ) ) {
			$reasons[] = 'promotion_schedule_invalid';
		}

		return array(
			'valid'   => array() === $reasons,
			'reasons' => $reasons,
		);
	}

	/**
	 * Determine whether serialized block content has a user-visible result.
	 *
	 * This intentionally mirrors the editor preflight without calling block
	 * parsing or rendering APIs. Empty structural wrappers and comments do not
	 * make a Promotion publishable, while media, background images and explicit
	 * dynamic blocks remain meaningful even when they contain no literal text.
	 *
	 * @param string $content Serialized Promotion content.
	 */
	public function has_meaningful_content( string $content ): bool {
		if ( '' === trim( $content ) ) {
			return false;
		}

		if ( 1 === preg_match( '/<!--\s+wp:(?!core\/)[a-z0-9-]+\/[a-z0-9-]+(?:\s+\{[\s\S]*?\})?\s*\/-->/i', $content ) ) {
			return true;
		}

		$meaningful_core_blocks = 'archives|calendar|categories|latest-comments|latest-posts|loginout|page-list|post-author|post-author-biography|post-comments-form|post-content|post-date|post-excerpt|post-featured-image|post-terms|post-title|query|rss|search|site-logo|site-tagline|site-title|tag-cloud';
		if ( 1 === preg_match( '/<!--\s+wp:(?:' . $meaningful_core_blocks . ')\b/i', $content ) ) {
			return true;
		}

		$renderable_content = $this->strip_non_rendered_source( $content );
		if ( null === $renderable_content ) {
			return false;
		}

		if ( 1 === preg_match( '/<(?:img|picture|video|audio|iframe|object|embed|svg|canvas|input)\b/i', $renderable_content ) ) {
			return true;
		}

		if ( $this->has_meaningful_background_image( $renderable_content ) ) {
			return true;
		}

		$visible_text = preg_replace(
			array(
				'/<[^>]*>/',
				'/&(?:nbsp|ensp|emsp|thinsp|zwnj|zwj);/i',
				'/&#(?:160|819[2-9]|820[0-3]);/i',
				'/&#x(?:a0|200[0-9a-b]);/i',
				'/[\s\x{00a0}\x{2000}-\x{200d}\x{2060}\x{feff}]/u',
			),
			'',
			$renderable_content
		);

		return null !== $visible_text && '' !== $visible_text;
	}

	/**
	 * Remove source that browsers do not render as Promotion content.
	 *
	 * @param string $content Serialized Promotion content.
	 */
	private function strip_non_rendered_source( string $content ): ?string {
		return preg_replace(
			array(
				'/<(?:script|style|template)\b[^>]*>[\s\S]*?<\/(?:script|style|template)>/i',
				'/<!--[\s\S]*?-->/',
			),
			'',
			$content
		);
	}

	/**
	 * Check whether every rendered video and core Video block has a usable source.
	 *
	 * @param string $content Serialized Promotion content.
	 */
	private function has_video_without_valid_source( string $content ): bool {
		if ( $this->has_core_video_without_markup( $content ) ) {
			return true;
		}

		$renderable_content = $this->strip_non_rendered_source( $content );

		return null !== $renderable_content && $this->has_raw_video_without_valid_source( $renderable_content );
	}

	/**
	 * Detect an empty, self-closing, or structurally incomplete core Video block.
	 *
	 * Raw video source validity is checked separately after comments are removed.
	 *
	 * @param string $content Serialized Promotion content.
	 */
	private function has_core_video_without_markup( string $content ): bool {
		$opening_count = preg_match_all(
			'/<!--\s+wp:(?:core\/)?video(?=\s|\/-->|-->)[\s\S]*?-->/i',
			$content,
			$openings,
			PREG_OFFSET_CAPTURE
		);
		if ( false === $opening_count || 0 === $opening_count ) {
			return false;
		}

		foreach ( $openings[0] as $opening_match ) {
			$opening        = (string) $opening_match[0];
			$opening_offset = (int) $opening_match[1];
			if ( 1 === preg_match( '/\/\s*-->$/', $opening ) ) {
				return true;
			}

			$body_offset = $opening_offset + strlen( $opening );
			$closed       = preg_match(
				'/<!--\s+\/wp:(?:core\/)?video\s*-->/i',
				$content,
				$closing_match,
				PREG_OFFSET_CAPTURE,
				$body_offset
			);
			if ( 1 !== $closed ) {
				return true;
			}

			$body_length     = (int) $closing_match[0][1] - $body_offset;
			$block_body      = substr( $content, $body_offset, $body_length );
			$renderable_body = $this->strip_non_rendered_source( $block_body );
			if ( null === $renderable_body || 1 !== preg_match( '/<video(?=[\s\/>])/i', $renderable_body ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check each rendered video element for its own valid src attribute.
	 *
	 * @param string $content Renderable Promotion markup.
	 */
	private function has_raw_video_without_valid_source( string $content ): bool {
		$video_count = preg_match_all(
			'/<video(?=[\s\/>])((?:"[^"]*"|\'[^\']*\'|[^\'">])*)>/i',
			$content,
			$videos,
			PREG_SET_ORDER
		);
		if ( false === $video_count || 0 === $video_count ) {
			return false;
		}

		foreach ( $videos as $video ) {
			if ( ! $this->attributes_have_valid_source( (string) $video[1] ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Extract and validate an HTML media src attribute.
	 *
	 * @param string $attributes Opening-tag attributes.
	 */
	private function attributes_have_valid_source( string $attributes ): bool {
		$matched = preg_match(
			'/(?:(?:"[^"]*"|\'[^\']*\')(*SKIP)(*F))|(?:^|\s)src\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s"\'<>`=]+))/i',
			$attributes,
			$source_match,
			PREG_UNMATCHED_AS_NULL
		);
		if ( 1 !== $matched ) {
			return false;
		}

		$source = (string) ( $source_match[1] ?? $source_match[2] ?? $source_match[3] ?? '' );
		$source = $this->decode_url_character_references( $source );
		if (
			'' === $source
			|| 1 === preg_match( '/[\x00-\x20\x7f]/', $source )
			|| str_contains( $source, "\xef\xbf\xbd" )
			|| str_contains( $source, '\\' )
			|| 1 === preg_match( '/%(?![0-9a-f]{2})/i', $source )
		) {
			return false;
		}

		if ( 1 === preg_match( '~^/(?!/).+~', $source ) ) {
			return true;
		}

		$matched = preg_match(
			'~^https?://([a-z0-9.-]+)(?::([0-9]{1,5}))?(?:[/?#][^\\\\]*)?$~iD',
			$source,
			$url_match
		);
		if ( 1 !== $matched ) {
			return false;
		}

		$hostname = (string) $url_match[1];
		if ( 253 < strlen( $hostname ) ) {
			return false;
		}
		foreach ( explode( '.', $hostname ) as $label ) {
			if ( 1 !== preg_match( '/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/iD', $label ) ) {
				return false;
			}
		}

		if ( 1 === preg_match( '/^[0-9.]+$/', $hostname ) ) {
			$octets = explode( '.', $hostname );
			if ( 4 !== count( $octets ) ) {
				return false;
			}
			foreach ( $octets as $octet ) {
				if ( 255 < (int) $octet ) {
					return false;
				}
			}
		}

		$port = isset( $url_match[2] ) ? (int) $url_match[2] : 1;

		return 0 < $port && 65535 >= $port;
	}

	/**
	 * Decode URL character references that can conceal an ASCII scheme.
	 *
	 * PHP intentionally leaves numeric references for some control characters
	 * untouched, while browsers and Core KSES decode them before protocol
	 * checks. Decode the ASCII range explicitly so eligibility cannot approve a
	 * source that the Renderer later strips.
	 *
	 * @param string $source Raw media source attribute.
	 */
	private function decode_url_character_references( string $source ): string {
		$decoded = html_entity_decode( $source, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		$decoded = preg_replace_callback(
			'/&#(?:x([0-9a-f]+)|([0-9]+));?/i',
			static function ( array $matches ): string {
				$codepoint = '' !== ( $matches[1] ?? '' )
					? hexdec( (string) $matches[1] )
					: (int) ( $matches[2] ?? 0 );

				return 0 <= $codepoint && 0x7f >= $codepoint
					? chr( $codepoint )
					: (string) $matches[0];
			},
			$decoded
		);

		return null === $decoded ? '' : $decoded;
	}

	/**
	 * Detect CSS background images that produce visible output.
	 *
	 * @param string $content Serialized Promotion content.
	 */
	private function has_meaningful_background_image( string $content ): bool {
		if ( preg_match_all( '/\bbackground-image\s*:\s*url\(([^)]*)\)/i', $content, $matches ) ) {
			foreach ( $matches[1] as $raw_url ) {
				$url = trim( trim( (string) $raw_url ), "\"'" );
				if ( '' !== $url ) {
					return true;
				}
			}
		}

		$functions = '(?:repeating-)?(?:linear|radial|conic)-gradient|(?:-webkit-)?image-set|cross-fade|element|image|var';

		return 1 === preg_match( '/\bbackground-image\s*:\s*(?:' . $functions . ')\s*\(/i', $content );
	}

	/**
	 * Assess whether a promotion is structurally and temporally ready to deliver.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 * @param int                  $now       Current timestamp.
	 * @return array{ready: bool, reasons: list<string>}
	 */
	public function assess_readiness( array $promotion, int $now ): array {
		$configuration = $this->validate_configuration( $promotion );
		$reasons       = $configuration['reasons'];

		if ( 'publish' !== ( $promotion['status'] ?? '' ) ) {
			$reasons[] = 'promotion_not_published';
		}

		if ( ! in_array( 'promotion_schedule_invalid', $configuration['reasons'], true ) ) {
			$start_at = isset( $promotion['start_at'] ) ? (int) $promotion['start_at'] : 0;
			$end_at   = isset( $promotion['end_at'] ) ? (int) $promotion['end_at'] : 0;
			if ( 0 < $start_at && $now < $start_at ) {
				$reasons[] = 'promotion_not_started';
			}
			if ( 0 < $end_at && $now >= $end_at ) {
				$reasons[] = 'promotion_expired';
			}
		}

		return array(
			'ready'   => array() === $reasons,
			'reasons' => $reasons,
		);
	}

	/**
	 * Evaluate one promotion and the current request context.
	 *
	 * A null simulated_device means normal delivery. In that mode the server
	 * emits cache-stable HTML and CSS performs device visibility targeting.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 * @param array<string, mixed> $context   Request context.
	 * @return array{allowed: bool, reasons: list<string>}
	 */
	public function evaluate( array $promotion, array $context ): array {
		$now       = isset( $context['now'] ) ? (int) $context['now'] : 0;
		$readiness = $this->assess_readiness( $promotion, $now );
		$reasons   = $readiness['reasons'];

		$post_id       = isset( $context['post_id'] ) ? (int) $context['post_id'] : 0;
		$content_scope = $this->normalize_content_scope( $promotion['content_scope'] ?? 'all' );
		$include_ids   = $this->normalize_post_ids( $promotion['include_ids'] ?? array() );
		$exclude_ids   = $this->normalize_post_ids( $promotion['exclude_ids'] ?? array() );
		if ( 'selected' === $content_scope && ! in_array( $post_id, $include_ids, true ) ) {
			$reasons[] = 'content_not_included';
		}
		if ( in_array( $post_id, $exclude_ids, true ) ) {
			$reasons[] = 'content_excluded';
		}

		$expected_location = isset( $context['expected_location'] ) ? (string) $context['expected_location'] : 'block';
		if ( $this->is_automatic_location( $expected_location ) ) {
			$post_type = isset( $context['post_type'] ) ? (string) $context['post_type'] : '';
			if ( ! $this->content_type_matches( $content_scope, $post_type ) ) {
				$reasons[] = 'content_type_mismatch';
			} elseif ( 'terms' === $content_scope ) {
				if ( ! (bool) ( $context['content_terms_available'] ?? false ) ) {
					$reasons[] = 'content_terms_unavailable';
				} elseif ( ! $this->post_terms_match( $promotion, $context ) ) {
					$reasons[] = 'post_terms_mismatch';
				}
			}
		}

		if ( ( $promotion['location'] ?? 'content_after' ) !== $expected_location ) {
			$reasons[] = 'location_mismatch';
		}
		if (
			'content_after_paragraph' === ( $promotion['location'] ?? 'content_after' )
			&& array_key_exists( 'content_anchor_available', $context )
			&& false === $context['content_anchor_available']
		) {
			$reasons[] = 'content_anchor_missing';
		}

		$simulated_device = isset( $context['simulated_device'] ) ? (string) $context['simulated_device'] : '';
		$device           = isset( $promotion['device'] ) ? (string) $promotion['device'] : 'all';
		if (
			in_array( $simulated_device, array( 'desktop', 'mobile' ), true )
			&& 'all' !== $device
			&& $device !== $simulated_device
		) {
			$reasons[] = 'device_mismatch';
		}

		return array(
			'allowed' => array() === $reasons,
			'reasons' => $reasons,
		);
	}

	/**
	 * Normalize post IDs for deterministic configuration and context checks.
	 *
	 * @param mixed $value Raw post ID list.
	 * @return list<int>
	 */
	private function normalize_post_ids( mixed $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$ids = array();
		foreach ( $value as $raw_id ) {
			$id = (int) $raw_id;
			if ( 0 < $id ) {
				$ids[ $id ] = $id;
			}
		}

		return array_values( $ids );
	}

	/**
	 * Normalize a content-scope value without a WordPress dependency.
	 *
	 * @param mixed $value Raw content scope.
	 */
	private function normalize_content_scope( mixed $value ): string {
		$value = (string) $value;

		return in_array( $value, array( 'all', 'posts', 'pages', 'terms', 'selected' ), true ) ? $value : 'all';
	}

	/**
	 * Check whether one delivery location is injected automatically.
	 *
	 * @param string $location Delivery location.
	 */
	private function is_automatic_location( string $location ): bool {
		return in_array( $location, array( 'content_before', 'content_after', 'content_after_paragraph' ), true );
	}

	/**
	 * Match an automatic content scope against the current native post type.
	 *
	 * Manual block and shortcode delivery never call this method. Selected
	 * automatic targets remain limited to the standard public content types.
	 *
	 * @param string $content_scope Normalized content scope.
	 * @param string $post_type     Current post type.
	 */
	private function content_type_matches( string $content_scope, string $post_type ): bool {
		return match ( $content_scope ) {
			'posts', 'terms' => 'post' === $post_type,
			'pages'          => 'page' === $post_type,
			default          => in_array( $post_type, array( 'post', 'page' ), true ),
		};
	}

	/**
	 * Match any directly assigned category or tag.
	 *
	 * @param array<string, mixed> $promotion Promotion domain data.
	 * @param array<string, mixed> $context   Request context.
	 */
	private function post_terms_match( array $promotion, array $context ): bool {
		$selected_categories = $this->normalize_post_ids( $promotion['category_ids'] ?? array() );
		$selected_tags       = $this->normalize_post_ids( $promotion['tag_ids'] ?? array() );
		$current_categories  = $this->normalize_post_ids( $context['category_ids'] ?? array() );
		$current_tags        = $this->normalize_post_ids( $context['tag_ids'] ?? array() );

		return array() !== array_intersect( $selected_categories, $current_categories )
			|| array() !== array_intersect( $selected_tags, $current_tags );
	}
}
