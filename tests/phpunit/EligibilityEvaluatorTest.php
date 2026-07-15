<?php
/**
 * Eligibility evaluator contract tests.
 *
 * @package NpcinkAd
 */

use Npcink\Ad\Domain\Eligibility_Evaluator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Covers the pure server-side eligibility policy.
 */
final class EligibilityEvaluatorTest extends TestCase {
	private const NOW     = 1_800_000_000;
	private const POST_ID = 42;

	/**
	 * Create a valid promotion fixture.
	 *
	 * @return array<string, mixed>
	 */
	private function valid_promotion(): array {
		return array(
			'status'      => 'publish',
			'content'     => '<p>Current creative</p>',
			'location'    => 'block',
			'paragraph_number' => 3,
			'paragraph_number_valid' => true,
			'content_scope' => 'all',
			'include_ids' => array(),
			'exclude_ids' => array(),
			'category_ids' => array(),
			'tag_ids'      => array(),
			'terms_valid'  => true,
			'device'      => 'all',
			'start_at'    => self::NOW - 3600,
			'start_at_valid' => true,
			'end_at'      => self::NOW + 3600,
			'end_at_valid' => true,
		);
	}

	/**
	 * Create a matching request context.
	 *
	 * @return array<string, mixed>
	 */
	private function matching_context(): array {
		return array(
			'now'              => self::NOW,
			'post_id'          => self::POST_ID,
			'expected_location' => 'block',
			'simulated_device'  => null,
			'post_type'         => 'post',
			'category_ids'      => array(),
			'tag_ids'           => array(),
			'content_terms_available' => true,
		);
	}

	/**
	 * Provide configuration validation boundaries.
	 *
	 * @return array<string, array{array<string, mixed>, list<string>}>
	 */
	public static function configuration_cases(): array {
		return array(
			'valid defaults'               => array( array(), array() ),
			'empty content'                => array(
				array( 'content' => " \n\t " ),
				array( 'promotion_content_empty' ),
			),
			'selected scope without IDs'   => array(
				array(
					'content_scope' => 'selected',
					'include_ids' => array(),
				),
				array( 'promotion_targets_empty' ),
			),
			'all selected IDs excluded'    => array(
				array(
					'content_scope' => 'selected',
					'include_ids' => array( 42, 43 ),
					'exclude_ids' => array( 42, 43 ),
				),
				array( 'promotion_targets_empty' ),
			),
			'selected effective ID remains' => array(
				array(
					'content_scope' => 'selected',
					'include_ids' => array( 42, 43 ),
					'exclude_ids' => array( 42 ),
				),
				array(),
			),
			'automatic terms without IDs'   => array(
				array(
					'location'      => 'content_after',
					'content_scope' => 'terms',
				),
				array( 'promotion_targets_empty' ),
			),
			'automatic terms with invalid ID' => array(
				array(
					'location'      => 'content_after',
					'content_scope' => 'terms',
					'category_ids'  => array( 7 ),
					'terms_valid'   => false,
				),
				array( 'promotion_terms_invalid' ),
			),
			'valid terms may currently match no posts' => array(
				array(
					'location'      => 'content_after',
					'content_scope' => 'terms',
					'tag_ids'       => array( 8 ),
					'terms_valid'   => true,
				),
				array(),
			),
			'manual terms ignore hidden invalid values' => array(
				array(
					'location'      => 'block',
					'content_scope' => 'terms',
					'category_ids'  => array( 7 ),
					'terms_valid'   => false,
				),
				array(),
			),
			'equal schedule boundaries'    => array(
				array(
					'start_at' => self::NOW,
					'end_at'   => self::NOW,
				),
				array( 'promotion_schedule_invalid' ),
			),
			'end precedes start'            => array(
				array(
					'start_at' => self::NOW + 60,
					'end_at'   => self::NOW + 59,
				),
				array( 'promotion_schedule_invalid' ),
			),
			'open start boundary'           => array(
				array(
					'start_at' => 0,
					'end_at'   => self::NOW + 60,
				),
				array(),
			),
			'open end boundary'             => array(
				array(
					'start_at' => self::NOW - 60,
					'end_at'   => 0,
				),
				array(),
			),
			'invalid start calendar value'   => array(
				array( 'start_at_valid' => false ),
				array( 'promotion_schedule_invalid' ),
			),
			'invalid end calendar value'     => array(
				array( 'end_at_valid' => false ),
				array( 'promotion_schedule_invalid' ),
			),
			'paragraph minimum'              => array(
				array(
					'location'         => 'content_after_paragraph',
					'paragraph_number' => 1,
				),
				array(),
			),
			'paragraph maximum'              => array(
				array(
					'location'         => 'content_after_paragraph',
					'paragraph_number' => 20,
				),
				array(),
			),
			'paragraph zero'                 => array(
				array(
					'location'               => 'content_after_paragraph',
					'paragraph_number'       => 0,
					'paragraph_number_valid' => false,
				),
				array( 'promotion_paragraph_invalid' ),
			),
			'paragraph above maximum'        => array(
				array(
					'location'               => 'content_after_paragraph',
					'paragraph_number'       => 21,
					'paragraph_number_valid' => false,
				),
				array( 'promotion_paragraph_invalid' ),
			),
			'paragraph raw validity failure' => array(
				array(
					'location'               => 'content_after_paragraph',
					'paragraph_number'       => 3,
					'paragraph_number_valid' => false,
				),
				array( 'promotion_paragraph_invalid' ),
			),
			'paragraph fields ignored elsewhere' => array(
				array(
					'location'               => 'content_after',
					'paragraph_number'       => 21,
					'paragraph_number_valid' => false,
				),
				array(),
			),
		);
	}

	/**
	 * Configuration validation has stable structural reasons.
	 *
	 * @param array $overrides        Promotion fixture overrides.
	 * @param array $expected_reasons Expected reason codes.
	 * @phpstan-param array<string, mixed> $overrides
	 * @phpstan-param list<string> $expected_reasons
	 */
	#[DataProvider( 'configuration_cases' )]
	public function test_validates_configuration( array $overrides, array $expected_reasons ): void {
		$promotion = array_replace( $this->valid_promotion(), $overrides );
		$result    = ( new Eligibility_Evaluator() )->validate_configuration( $promotion );

		self::assertSame( array() === $expected_reasons, $result['valid'] );
		self::assertSame( $expected_reasons, $result['reasons'] );
	}

	/**
	 * Active term scope cannot bypass existence validation by omitting its flag.
	 */
	public function test_active_terms_fail_closed_without_validity_evidence(): void {
		$promotion = array_replace(
			$this->valid_promotion(),
			array(
				'location'      => 'content_after',
				'content_scope' => 'terms',
				'category_ids'  => array( 7 ),
			)
		);
		unset( $promotion['terms_valid'] );

		$result = ( new Eligibility_Evaluator() )->validate_configuration( $promotion );

		self::assertSame( array( 'promotion_terms_invalid' ), $result['reasons'] );
	}

	/**
	 * Provide empty serialized block-content examples.
	 *
	 * @return array<string, array{string}>
	 */
	public static function semantically_empty_content(): array {
		return array(
			'blank'                    => array( " \n\t " ),
			'empty paragraph'          => array( '<p></p>' ),
			'invisible entity'         => array( '<p>&nbsp;&#160;&#x200b;</p>' ),
			'html comment only'        => array( '<!-- note -->' ),
			'media inside comment'     => array( '<!-- <img src="creative.jpg" alt="" /> -->' ),
			'empty core paragraph'     => array( '<!-- wp:paragraph --><p></p><!-- /wp:paragraph -->' ),
			'empty nested group'       => array( '<!-- wp:group --><div class="wp-block-group"><!-- wp:columns --><div class="wp-block-columns"></div><!-- /wp:columns --></div><!-- /wp:group -->' ),
			'empty shortcode block'     => array( '<!-- wp:shortcode --><!-- /wp:shortcode -->' ),
			'script only'              => array( '<script>document.write("Creative")</script>' ),
			'style background only'    => array( '<style>.creative{background-image:url(ad.jpg)}</style>' ),
			'template media only'      => array( '<template><img src="creative.jpg" /></template>' ),
			'empty background URL'     => array( '<div style="background-image:url(\'\')"></div>' ),
		);
	}

	/**
	 * Structural wrappers and non-rendered source do not satisfy content validation.
	 *
	 * @param string $content Serialized Promotion content.
	 */
	#[DataProvider( 'semantically_empty_content' )]
	public function test_rejects_semantically_empty_content( string $content ): void {
		$promotion            = $this->valid_promotion();
		$promotion['content'] = $content;
		$result               = ( new Eligibility_Evaluator() )->validate_configuration( $promotion );

		self::assertContains( 'promotion_content_empty', $result['reasons'] );
	}

	/**
	 * Provide serialized content that has a visible or dynamic result.
	 *
	 * @return array<string, array{string}>
	 */
	public static function semantically_meaningful_content(): array {
		return array(
			'plain text'              => array( '<p>Current creative</p>' ),
			'image'                   => array( '<figure><img src="creative.jpg" alt="" /></figure>' ),
			'video'                   => array( '<video src="creative.mp4"></video>' ),
			'background URL'          => array( '<div style="background-image:url(creative.jpg)"></div>' ),
			'background gradient'     => array( '<div style="background-image:repeating-linear-gradient(red, blue)"></div>' ),
			'background variable'     => array( '<div style="background-image:var(--creative)"></div>' ),
			'vendor dynamic block'    => array( '<!-- wp:npcink-ad/creative {"id":7} /-->' ),
			'core dynamic block'      => array( '<!-- wp:latest-posts /-->' ),
			'core featured image'     => array( '<!-- wp:post-featured-image /-->' ),
			'shortcode text'          => array( '<!-- wp:shortcode -->[promotion]<!-- /wp:shortcode -->' ),
		);
	}

	/**
	 * Media, CSS images, text and explicit dynamic blocks remain meaningful.
	 *
	 * @param string $content Serialized Promotion content.
	 */
	#[DataProvider( 'semantically_meaningful_content' )]
	public function test_accepts_semantically_meaningful_content( string $content ): void {
		$promotion            = $this->valid_promotion();
		$promotion['content'] = $content;
		$result               = ( new Eligibility_Evaluator() )->validate_configuration( $promotion );

		self::assertNotContains( 'promotion_content_empty', $result['reasons'] );
	}

	/**
	 * Provide readiness lifecycle boundaries.
	 *
	 * @return array<string, array{array<string, mixed>, list<string>}>
	 */
	public static function readiness_cases(): array {
		return array(
			'ready now'                  => array( array(), array() ),
			'draft'                      => array(
				array( 'status' => 'draft' ),
				array( 'promotion_not_published' ),
			),
			'starts now'                 => array(
				array( 'start_at' => self::NOW ),
				array(),
			),
			'starts one second later'    => array(
				array( 'start_at' => self::NOW + 1 ),
				array( 'promotion_not_started' ),
			),
			'ends now'                   => array(
				array( 'end_at' => self::NOW ),
				array( 'promotion_expired' ),
			),
			'ends one second later'      => array(
				array( 'end_at' => self::NOW + 1 ),
				array(),
			),
			'invalid future schedule'    => array(
				array(
					'start_at' => self::NOW + 2,
					'end_at'   => self::NOW + 1,
				),
				array( 'promotion_schedule_invalid' ),
			),
			'invalid expired schedule'   => array(
				array(
					'start_at' => self::NOW - 1,
					'end_at'   => self::NOW - 2,
				),
				array( 'promotion_schedule_invalid' ),
			),
			'configuration before status' => array(
				array(
					'content' => '',
					'status'  => 'draft',
				),
				array( 'promotion_content_empty', 'promotion_not_published' ),
			),
		);
	}

	/**
	 * Readiness reuses configuration reasons before lifecycle reasons.
	 *
	 * @param array $overrides        Promotion fixture overrides.
	 * @param array $expected_reasons Expected reason codes.
	 * @phpstan-param array<string, mixed> $overrides
	 * @phpstan-param list<string> $expected_reasons
	 */
	#[DataProvider( 'readiness_cases' )]
	public function test_assesses_readiness( array $overrides, array $expected_reasons ): void {
		$promotion = array_replace( $this->valid_promotion(), $overrides );
		$result    = ( new Eligibility_Evaluator() )->assess_readiness( $promotion, self::NOW );

		self::assertSame( array() === $expected_reasons, $result['ready'] );
		self::assertSame( $expected_reasons, $result['reasons'] );
	}

	/**
	 * A published, current promotion is eligible.
	 */
	public function test_allows_a_published_current_promotion(): void {
		$result = ( new Eligibility_Evaluator() )->evaluate(
			$this->valid_promotion(),
			$this->matching_context()
		);

		self::assertSame(
			array(
				'allowed' => true,
				'reasons' => array(),
			),
			$result
		);
	}

	/**
	 * Provide independent status, time, and content failures.
	 *
	 * @return array<string, array{string, mixed, string}>
	 */
	public static function promotion_rule_failures(): array {
		return array(
			'unpublished' => array( 'status', 'draft', 'promotion_not_published' ),
			'not started' => array( 'start_at', self::NOW + 1, 'promotion_not_started' ),
			'expired'     => array( 'end_at', self::NOW, 'promotion_expired' ),
			'empty'       => array( 'content', '   ', 'promotion_content_empty' ),
		);
	}

	/**
	 * Status, time, and content failures have stable reason codes.
	 *
	 * @param string $field  Promotion field to change.
	 * @param mixed  $value  Replacement value.
	 * @param string $reason Expected reason code.
	 */
	#[DataProvider( 'promotion_rule_failures' )]
	public function test_rejects_promotion_rule_failures( string $field, mixed $value, string $reason ): void {
		$promotion           = $this->valid_promotion();
		$promotion[ $field ] = $value;

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $this->matching_context() );

		self::assertFalse( $result['allowed'] );
		self::assertSame( array( $reason ), $result['reasons'] );
	}

	/**
	 * A promotion starts exactly at its start timestamp.
	 */
	public function test_start_time_is_inclusive(): void {
		$promotion             = $this->valid_promotion();
		$promotion['start_at'] = self::NOW;

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $this->matching_context() );

		self::assertTrue( $result['allowed'] );
	}

	/**
	 * Selected scope requires the current content in the include list.
	 */
	public function test_selected_content_scope_requires_included_content(): void {
		$promotion                = $this->valid_promotion();
		$promotion['content_scope'] = 'selected';
		$promotion['include_ids'] = array( self::POST_ID + 1 );

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $this->matching_context() );

		self::assertSame( array( 'content_not_included' ), $result['reasons'] );
	}

	/**
	 * Selected scope allows explicitly included content.
	 */
	public function test_selected_content_scope_allows_included_content(): void {
		$promotion                = $this->valid_promotion();
		$promotion['content_scope'] = 'selected';
		$promotion['include_ids'] = array( self::POST_ID );

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $this->matching_context() );

		self::assertTrue( $result['allowed'] );
	}

	/**
	 * Provide automatic content-type and direct-term scope boundaries.
	 *
	 * @return array<string, array{string, string, list<int>, list<int>, list<int>, list<int>, bool, list<string>}>
	 */
	public static function automatic_content_scopes(): array {
		return array(
			'all post'                    => array( 'all', 'post', array(), array(), array(), array(), true, array() ),
			'all page'                    => array( 'all', 'page', array(), array(), array(), array(), true, array() ),
			'all custom type'             => array( 'all', 'product', array(), array(), array(), array(), true, array( 'content_type_mismatch' ) ),
			'posts post'                  => array( 'posts', 'post', array(), array(), array(), array(), true, array() ),
			'posts page'                  => array( 'posts', 'page', array(), array(), array(), array(), true, array( 'content_type_mismatch' ) ),
			'pages page'                  => array( 'pages', 'page', array(), array(), array(), array(), true, array() ),
			'pages post'                  => array( 'pages', 'post', array(), array(), array(), array(), true, array( 'content_type_mismatch' ) ),
			'terms category match'        => array( 'terms', 'post', array( 7 ), array(), array( 7 ), array(), true, array() ),
			'terms tag match'             => array( 'terms', 'post', array(), array( 8 ), array(), array( 8 ), true, array() ),
			'terms no match'              => array( 'terms', 'post', array( 7 ), array( 8 ), array( 9 ), array( 10 ), true, array( 'post_terms_mismatch' ) ),
			'term IDs remain taxonomy scoped' => array( 'terms', 'post', array( 7 ), array(), array(), array( 7 ), true, array( 'post_terms_mismatch' ) ),
			'terms unavailable'           => array( 'terms', 'post', array( 7 ), array(), array(), array(), false, array( 'content_terms_unavailable' ) ),
			'terms reject pages by type'  => array( 'terms', 'page', array( 7 ), array(), array(), array(), false, array( 'content_type_mismatch' ) ),
		);
	}

	/**
	 * Automatic delivery applies the five frozen content-scope modes.
	 *
	 * @param string $scope            Content scope.
	 * @param string $post_type        Current post type.
	 * @param array  $selected_cats    Selected category IDs.
	 * @param array  $selected_tags    Selected tag IDs.
	 * @param array  $current_cats     Current category IDs.
	 * @param array  $current_tags     Current tag IDs.
	 * @param bool   $terms_available  Whether relationships were readable.
	 * @param array  $expected_reasons Expected reason codes.
	 * @phpstan-param list<int> $selected_cats
	 * @phpstan-param list<int> $selected_tags
	 * @phpstan-param list<int> $current_cats
	 * @phpstan-param list<int> $current_tags
	 * @phpstan-param list<string> $expected_reasons
	 */
	#[DataProvider( 'automatic_content_scopes' )]
	public function test_applies_automatic_content_scopes(
		string $scope,
		string $post_type,
		array $selected_cats,
		array $selected_tags,
		array $current_cats,
		array $current_tags,
		bool $terms_available,
		array $expected_reasons
	): void {
		$promotion = array_replace(
			$this->valid_promotion(),
			array(
				'location'      => 'content_after',
				'content_scope' => $scope,
				'category_ids'  => $selected_cats,
				'tag_ids'       => $selected_tags,
			)
		);
		$context = array_replace(
			$this->matching_context(),
			array(
				'expected_location'       => 'content_after',
				'post_type'               => $post_type,
				'category_ids'            => $current_cats,
				'tag_ids'                 => $current_tags,
				'content_terms_available' => $terms_available,
			)
		);

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $context );

		self::assertSame( array() === $expected_reasons, $result['allowed'] );
		self::assertSame( $expected_reasons, $result['reasons'] );
	}

	/**
	 * Manual block and shortcode delivery treat advanced scopes as all content.
	 */
	public function test_manual_delivery_ignores_posts_pages_and_terms_scopes(): void {
		$context = array_replace(
			$this->matching_context(),
			array(
				'post_type'               => 'product',
				'content_terms_available' => false,
			)
		);

		foreach ( array( 'posts', 'pages', 'terms' ) as $scope ) {
			$promotion = array_replace(
				$this->valid_promotion(),
				array(
					'content_scope' => $scope,
					'terms_valid'   => false,
				)
			);
			self::assertTrue( ( new Eligibility_Evaluator() )->evaluate( $promotion, $context )['allowed'], $scope );
		}
	}

	/**
	 * Automatic selected scope remains an explicit standard-content ID list.
	 */
	public function test_automatic_selected_scope_requires_explicit_standard_content(): void {
		$promotion = array_replace(
			$this->valid_promotion(),
			array(
				'location'      => 'content_after',
				'content_scope' => 'selected',
				'include_ids'   => array( self::POST_ID ),
			)
		);
		$context                      = $this->matching_context();
		$context['expected_location'] = 'content_after';

		self::assertTrue( ( new Eligibility_Evaluator() )->evaluate( $promotion, $context )['allowed'] );

		$context['post_type'] = 'product';
		self::assertSame(
			array( 'content_type_mismatch' ),
			( new Eligibility_Evaluator() )->evaluate( $promotion, $context )['reasons']
		);
	}

	/**
	 * Exclusion takes precedence over every manual content scope.
	 *
	 * @param string $scope            Content scope.
	 * @param array  $expected_reasons Expected reason codes.
	 * @phpstan-param list<string> $expected_reasons
	 */
	#[DataProvider( 'content_scopes' )]
	public function test_excluded_content_is_always_rejected( string $scope, array $expected_reasons ): void {
		$promotion                = $this->valid_promotion();
		$promotion['content_scope'] = $scope;
		$promotion['include_ids'] = array( self::POST_ID );
		$promotion['exclude_ids'] = array( self::POST_ID );

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $this->matching_context() );

		self::assertSame( $expected_reasons, $result['reasons'] );
	}

	/**
	 * Provide supported manual content scopes.
	 *
	 * @return array<string, array{string, list<string>}>
	 */
	public static function content_scopes(): array {
		return array(
			'all'      => array( 'all', array( 'content_excluded' ) ),
			'posts'    => array( 'posts', array( 'content_excluded' ) ),
			'pages'    => array( 'pages', array( 'content_excluded' ) ),
			'terms'    => array( 'terms', array( 'content_excluded' ) ),
			'selected' => array( 'selected', array( 'promotion_targets_empty', 'content_excluded' ) ),
		);
	}

	/**
	 * Full evaluation appends context reasons after reused readiness reasons.
	 */
	public function test_evaluation_reuses_readiness_before_context_reasons(): void {
		$promotion = array_replace(
			$this->valid_promotion(),
			array(
				'content'     => '',
				'status'      => 'draft',
				'content_scope' => 'selected',
				'include_ids' => array(),
				'device'      => 'mobile',
			)
		);
		$context                      = $this->matching_context();
		$context['expected_location'] = 'content_after';
		$context['simulated_device']  = 'desktop';

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $context );

		self::assertSame(
			array(
				'promotion_content_empty',
				'promotion_targets_empty',
				'promotion_not_published',
				'content_not_included',
				'location_mismatch',
				'device_mismatch',
			),
			$result['reasons']
		);
	}

	/**
	 * Delivery locations must match.
	 */
	public function test_rejects_a_location_mismatch(): void {
		$context                      = $this->matching_context();
		$context['expected_location'] = 'content_after';

		$result = ( new Eligibility_Evaluator() )->evaluate( $this->valid_promotion(), $context );

		self::assertSame( array( 'location_mismatch' ), $result['reasons'] );
	}

	/**
	 * Paragraph delivery reports when the requested anchor is absent in content.
	 */
	public function test_rejects_a_missing_paragraph_content_anchor(): void {
		$promotion                              = $this->valid_promotion();
		$promotion['location']                  = 'content_after_paragraph';
		$context                                = $this->matching_context();
		$context['expected_location']           = 'content_after_paragraph';
		$context['content_anchor_available']    = false;

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $context );

		self::assertSame( array( 'content_anchor_missing' ), $result['reasons'] );
	}

	/**
	 * Anchor availability is optional and applies only to paragraph placement.
	 */
	public function test_anchor_context_does_not_affect_other_locations_or_non_false_values(): void {
		$evaluator = new Eligibility_Evaluator();
		$context   = $this->matching_context();
		$context['content_anchor_available'] = false;

		self::assertTrue( $evaluator->evaluate( $this->valid_promotion(), $context )['allowed'] );

		$promotion                    = $this->valid_promotion();
		$promotion['location']        = 'content_after_paragraph';
		$context['expected_location'] = 'content_after_paragraph';
		$context['content_anchor_available'] = true;
		self::assertTrue( $evaluator->evaluate( $promotion, $context )['allowed'] );

		$context['content_anchor_available'] = null;
		self::assertTrue( $evaluator->evaluate( $promotion, $context )['allowed'] );
		unset( $context['content_anchor_available'] );
		self::assertTrue( $evaluator->evaluate( $promotion, $context )['allowed'] );
	}

	/**
	 * Preview device simulation rejects a mismatched targeted device.
	 */
	public function test_preview_rejects_a_device_mismatch(): void {
		$promotion                      = $this->valid_promotion();
		$promotion['device']            = 'mobile';
		$context                        = $this->matching_context();
		$context['simulated_device']    = 'desktop';

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $context );

		self::assertSame( array( 'device_mismatch' ), $result['reasons'] );
	}

	/**
	 * Matching preview simulation allows the targeted device.
	 */
	public function test_preview_allows_a_matching_device(): void {
		$promotion                   = $this->valid_promotion();
		$promotion['device']         = 'mobile';
		$context                     = $this->matching_context();
		$context['simulated_device'] = 'mobile';

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $context );

		self::assertTrue( $result['allowed'] );
	}

	/**
	 * Normal delivery never server-splits HTML by device.
	 */
	public function test_normal_delivery_ignores_device_targeting(): void {
		$promotion           = $this->valid_promotion();
		$promotion['device'] = 'mobile';

		$result = ( new Eligibility_Evaluator() )->evaluate( $promotion, $this->matching_context() );

		self::assertTrue( $result['allowed'] );
		self::assertSame( array(), $result['reasons'] );
	}
}
