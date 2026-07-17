<?php
/**
 * Promotion delivery orchestration for blocks, shortcodes, and post content.
 *
 * @package NpcinkAd
 */

namespace Npcink\Ad\Frontend;

use Npcink\Ad\Data\Repository;
use Npcink\Ad\Domain\Eligibility_Evaluator;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Maps WordPress request data into the pure eligibility policy.
 */
final class Delivery {
	private const PARAGRAPH_LOCATION  = 'content_after_paragraph';
	private const AUTOMATIC_LOCATIONS = array( 'content_before', 'content_after', 'content_after_paragraph', 'bar_top', 'bar_bottom' );
	private const BAR_LOCATIONS       = array( 'bar_top', 'bar_bottom' );

	/**
	 * Promotions currently being rendered, used to stop recursive content.
	 *
	 * @var array<int, true>
	 */
	private array $rendering = array();

	/**
	 * Prevent repeated content injection if a theme applies the filter twice.
	 *
	 * @var bool
	 */
	private bool $filtering_content = false;

	/**
	 * Automatic content output already computed for posts in this request.
	 *
	 * @var array<int, array{source: string, output: string}>
	 */
	private array $filtered_content = array();

	/**
	 * Native content type and direct term relationships cached for this request.
	 *
	 * @var array<int, array{post_type: string, terms_loaded: bool, category_ids: list<int>, tag_ids: list<int>, content_terms_available: bool}>
	 */
	private array $content_contexts = array();

	/**
	 * Published automatic domain catalog shared by this delivery request.
	 *
	 * @var array{
	 *     by_id: array<int, array<string, mixed>>,
	 *     location_ids: array{content_before: list<int>, content_after: list<int>, bar_top: list<int>, bar_bottom: list<int>},
	 *     paragraph_ids: array<int, list<int>>
	 * }|null
	 */
	private ?array $automatic_catalog = null;

	/**
	 * Published paragraph Promotion IDs grouped by validated paragraph number.
	 *
	 * @var array<int, list<int>>
	 */
	private array $paragraph_groups = array();

	/**
	 * Whether paragraph groups have been loaded for this request.
	 *
	 * @var bool
	 */
	private bool $paragraph_groups_loaded = false;

	/**
	 * Whether priority-8 preparation saw named block content for a post.
	 *
	 * @var array<int, bool>
	 */
	private array $prepared_block_content = array();

	/**
	 * Paragraph anchor requested by an authorized real-page preview.
	 *
	 * @var array{paragraph_number: int, paragraph_number_valid: bool, post_id: int}|null
	 */
	private ?array $paragraph_preview_context = null;

	/**
	 * Whether normal automatic paragraph preparation is suppressed for preview.
	 *
	 * @var bool
	 */
	private bool $preview_request_active = false;

	/**
	 * Authorized real-page preview context for a manual block.
	 *
	 * @var array{promotion_id: int, device: string, post_id: int}|null
	 */
	private ?array $block_preview_context = null;

	/**
	 * Whether the target promotion block rendered in its real page position.
	 *
	 * @var bool
	 */
	private bool $block_preview_rendered = false;

	/**
	 * Authorized real-page preview context for a page bar.
	 *
	 * @var array{promotion_id: int, location: string, device: string, post_id: int}|null
	 */
	private ?array $page_bar_preview_context = null;

	/**
	 * Whether the selected page-bar hook rendered the forced preview.
	 *
	 * @var bool
	 */
	private bool $page_bar_preview_rendered = false;

	/**
	 * Compose delivery from native storage, the pure policy, and rendering.
	 *
	 * @param Repository              $repository Native WordPress data mapper.
	 * @param Eligibility_Evaluator   $evaluator  Pure delivery policy.
	 * @param Renderer                $renderer   Safe content renderer.
	 * @param Paragraph_Inserter|null $paragraph_inserter Paragraph anchor service.
	 */
	public function __construct(
		private readonly Repository $repository,
		private readonly Eligibility_Evaluator $evaluator,
		private readonly Renderer $renderer,
		?Paragraph_Inserter $paragraph_inserter = null
	) {
		$this->paragraph_inserter = $paragraph_inserter ?? new Paragraph_Inserter();
	}

	/**
	 * Paragraph anchor preparation and rendered HTML insertion.
	 *
	 * @var Paragraph_Inserter
	 */
	private readonly Paragraph_Inserter $paragraph_inserter;

	/**
	 * Register shortcode and post-content delivery.
	 */
	public function register(): void {
		add_shortcode( 'npcink_ad', array( $this, 'shortcode' ) );
		add_filter( 'the_content', array( $this, 'prepare_content' ), 8 );
		add_filter( 'the_content', array( $this, 'filter_content' ), 10 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_style' ) );
		add_action( 'wp_body_open', array( $this, 'render_top_page_bar' ), 5 );
		add_action( 'wp_footer', array( $this, 'render_bottom_page_bar' ), 5 );
	}

	/**
	 * Load the tiny device-targeting stylesheet before themes print styles.
	 *
	 * Rendering can happen after wp_head(), especially on WordPress 6.5 where
	 * late-enqueued styles are not hoisted. Enqueuing the plugin stylesheet early
	 * keeps desktop/mobile rules deterministic without adding frontend script.
	 */
	public function enqueue_frontend_style(): void {
		wp_enqueue_style( 'npcink-ad-frontend' );
	}

	/**
	 * Emit eligible top bars through WordPress's standard body-open hook.
	 */
	public function render_top_page_bar(): void {
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Renderer and management placeholders return escaped plugin-owned markup.
		echo $this->render_page_bar_location( 'bar_top' );
	}

	/**
	 * Emit eligible bottom bars through WordPress's standard footer hook.
	 */
	public function render_bottom_page_bar(): void {
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Renderer and management placeholders return escaped plugin-owned markup.
		echo $this->render_page_bar_location( 'bar_bottom' );
	}

	/**
	 * Make one promotion block render the truthful preview in its real position.
	 *
	 * @param int    $promotion_id Promotion post ID.
	 * @param string $device       Desktop or mobile preview context.
	 * @param int    $post_id      Real page used by the preview.
	 */
	public function enable_block_preview( int $promotion_id, string $device, int $post_id ): void {
		$this->block_preview_context = array(
			'promotion_id' => absint( $promotion_id ),
			'device'       => in_array( $device, array( 'desktop', 'mobile' ), true ) ? $device : 'desktop',
			'post_id'      => absint( $post_id ),
		);
		$this->block_preview_rendered = false;
	}

	/**
	 * Force one page bar through its real theme hook for an authorized preview.
	 *
	 * @param int    $promotion_id Promotion post ID.
	 * @param string $location     Top or bottom page-bar location.
	 * @param string $device       Desktop or mobile preview context.
	 * @param int    $post_id      Real page used by the preview.
	 */
	public function enable_page_bar_preview( int $promotion_id, string $location, string $device, int $post_id ): void {
		if ( ! in_array( $location, self::BAR_LOCATIONS, true ) ) {
			return;
		}

		$this->page_bar_preview_context = array(
			'promotion_id' => absint( $promotion_id ),
			'location'     => $location,
			'device'       => in_array( $device, array( 'desktop', 'mobile' ), true ) ? $device : 'desktop',
			'post_id'      => absint( $post_id ),
		);
		$this->page_bar_preview_rendered = false;
	}

	/**
	 * Suppress normal automatic markers during any forced preview request.
	 */
	public function enable_preview_request(): void {
		$this->preview_request_active = true;
	}

	/**
	 * Prepare one paragraph anchor for an authorized real-page preview.
	 *
	 * @param int  $paragraph_number       Requested top-level or rendered paragraph.
	 * @param bool $paragraph_number_valid Whether the stored anchor is valid.
	 * @param int  $post_id                Real page used by the preview.
	 */
	public function enable_paragraph_preview( int $paragraph_number, bool $paragraph_number_valid, int $post_id ): void {
		$this->preview_request_active    = true;
		$this->paragraph_preview_context = array(
			'paragraph_number'       => $paragraph_number,
			'paragraph_number_valid' => $paragraph_number_valid && 1 <= $paragraph_number && 20 >= $paragraph_number,
			'post_id'                => absint( $post_id ),
		);
	}

	/**
	 * Report whether the real page contained the target promotion block.
	 */
	public function has_rendered_block_preview(): bool {
		return $this->block_preview_rendered;
	}

	/**
	 * Report whether the selected theme hook rendered the forced page bar.
	 */
	public function has_rendered_page_bar_preview(): bool {
		return $this->page_bar_preview_rendered;
	}

	/**
	 * Insert block paragraph markers before core renders serialized blocks.
	 *
	 * Classic content remains untouched here and is counted only after wpautop
	 * has produced the rendered HTML passed to filter_content().
	 *
	 * @param string $content Original serialized post content.
	 */
	public function prepare_content( string $content ): string {
		$post_id = $this->content_post_id();
		if ( 1 > $post_id ) {
			return $content;
		}

		$paragraph_numbers = $this->preview_request_active ? array() : array_keys( $this->get_paragraph_groups() );
		if ( $this->preview_request_active && null !== $this->paragraph_preview_context ) {
			$paragraph_numbers = $post_id === $this->paragraph_preview_context['post_id']
				&& $this->paragraph_preview_context['paragraph_number_valid']
				? array( $this->paragraph_preview_context['paragraph_number'] )
				: array();
		}
		if ( array() === $paragraph_numbers ) {
			return $content;
		}

		$markers  = $this->paragraph_markers( $post_id, $paragraph_numbers );
		$sentinel = $this->paragraph_sentinel( $post_id );
		$prepared = $this->paragraph_inserter->prepare_block_content( $content, $markers, $sentinel );
		$this->prepared_block_content[ $post_id ] = $this->paragraph_inserter->has_block_sentinel( $prepared, $sentinel );

		return $prepared;
	}

	/**
	 * Render one promotion for a specific delivery method.
	 *
	 * The simulated device is used only by an authorized preview caller. A null
	 * value preserves cache-stable frontend HTML and delegates device visibility
	 * to CSS.
	 *
	 * @param int         $promotion_id    Promotion post ID.
	 * @param string      $expected_location Expected delivery location.
	 * @param int         $reserve         Minimum reserved height.
	 * @param string|null $simulated_device Optional preview device.
	 * @param int|null    $context_post_id Optional page context override.
	 * @param bool|null   $content_anchor_available Whether a requested paragraph anchor exists.
	 */
	public function render_promotion(
		int $promotion_id,
		string $expected_location = 'block',
		int $reserve = 0,
		?string $simulated_device = null,
		?int $context_post_id = null,
		?bool $content_anchor_available = null
	): string {
		$can_diagnose = current_user_can( 'manage_npcink_ads' );
		if ( 1 > $promotion_id ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'promotion_missing' ), $reserve ) : '';
		}

		if ( isset( $this->rendering[ $promotion_id ] ) ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'recursive_promotion' ), $reserve ) : '';
		}

		if (
			'block' === $expected_location &&
			null !== $this->block_preview_context &&
			$promotion_id === $this->block_preview_context['promotion_id']
		) {
			$preview = $this->render_preview(
				$promotion_id,
				'block',
				$this->block_preview_context['device'],
				$this->block_preview_context['post_id'],
				$reserve
			);
			if ( '' !== $preview ) {
				$this->block_preview_rendered = true;
			}

			return $preview;
		}

		$promotion = $this->repository->find_promotion( $promotion_id );
		if ( null === $promotion ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'promotion_missing' ), $reserve ) : '';
		}

		return $this->render_mapped_promotion(
			$promotion,
			$promotion_id,
			$expected_location,
			$reserve,
			$simulated_device,
			$context_post_id,
			$content_anchor_available,
			$can_diagnose
		);
	}

	/**
	 * Evaluate and render one already mapped Promotion domain record.
	 *
	 * @param array       $promotion               Promotion domain data.
	 * @param int         $promotion_id            Promotion post ID.
	 * @param string      $expected_location       Expected delivery location.
	 * @param int         $reserve                 Minimum reserved height.
	 * @param string|null $simulated_device        Optional preview device.
	 * @param int|null    $context_post_id         Optional page context override.
	 * @param bool|null   $content_anchor_available Whether a requested paragraph anchor exists.
	 * @param bool        $can_diagnose             Whether diagnostic placeholders are allowed.
	 * @phpstan-param array<string, mixed> $promotion
	 */
	private function render_mapped_promotion(
		array $promotion,
		int $promotion_id,
		string $expected_location,
		int $reserve,
		?string $simulated_device,
		?int $context_post_id,
		?bool $content_anchor_available,
		bool $can_diagnose
	): string {

		$post_id = null === $context_post_id ? get_queried_object_id() : absint( $context_post_id );
		$context = array(
			'now'               => current_datetime()->getTimestamp(),
			'post_id'           => $post_id,
			'expected_location' => $expected_location,
			'simulated_device'  => $simulated_device,
		);
		$context = array_merge( $context, $this->automatic_content_context( $promotion, $expected_location, $post_id ) );
		if ( null !== $content_anchor_available ) {
			$context['content_anchor_available'] = $content_anchor_available;
		}
		$result = $this->evaluator->evaluate( $promotion, $context );

		if ( ! $result['allowed'] ) {
			return $can_diagnose ? $this->renderer->placeholder( $result['reasons'], $reserve ) : '';
		}

		$this->rendering[ $promotion_id ] = true;
		try {
			return $this->renderer->render( $promotion, $reserve );
		} finally {
			unset( $this->rendering[ $promotion_id ] );
		}
	}

	/**
	 * Force-render a promotion for an authorized real-page or editor preview.
	 *
	 * The eligibility result remains truthful even though blocked creative is
	 * visible to the manager for visual inspection.
	 *
	 * @param int         $promotion_id      Promotion post ID.
	 * @param string      $expected_location Expected delivery location.
	 * @param string|null $simulated_device  Desktop or mobile preview context.
	 * @param int|null    $context_post_id   Preview page ID.
	 * @param int         $reserve           Minimum reserved height.
	 * @param bool|null   $content_anchor_available Whether a requested paragraph anchor exists.
	 */
	public function render_preview(
		int $promotion_id,
		string $expected_location = 'block',
		?string $simulated_device = null,
		?int $context_post_id = null,
		int $reserve = 0,
		?bool $content_anchor_available = null
	): string {
		if ( ! current_user_can( 'manage_npcink_ads' ) ) {
			return '';
		}
		if ( 1 > $promotion_id ) {
			return $this->renderer->placeholder( array( 'promotion_missing' ), $reserve );
		}
		if ( isset( $this->rendering[ $promotion_id ] ) ) {
			return $this->renderer->placeholder( array( 'recursive_promotion' ), $reserve );
		}

		$promotion = $this->repository->find_promotion( $promotion_id );
		if ( null === $promotion ) {
			return $this->renderer->placeholder( array( 'promotion_missing' ), $reserve );
		}

		$post_id = null === $context_post_id ? get_queried_object_id() : absint( $context_post_id );
		$context = array(
			'now'               => current_datetime()->getTimestamp(),
			'post_id'           => $post_id,
			'expected_location' => $expected_location,
			'simulated_device'  => $simulated_device,
		);
		$context = array_merge( $context, $this->automatic_content_context( $promotion, $expected_location, $post_id ) );
		if ( null !== $content_anchor_available ) {
			$context['content_anchor_available'] = $content_anchor_available;
		}
		$result = $this->evaluator->evaluate( $promotion, $context );

		$this->rendering[ $promotion_id ] = true;
		try {
			return $this->renderer->render_preview( $promotion, $result, $reserve );
		} finally {
			unset( $this->rendering[ $promotion_id ] );
		}
	}

	/**
	 * Render a promotion shortcode.
	 *
	 * @param array<string, mixed>|string $attributes Shortcode attributes.
	 */
	public function shortcode( array|string $attributes = array() ): string {
		$attributes = shortcode_atts(
			array( 'promotion' => 0 ),
			is_array( $attributes ) ? $attributes : array(),
			'npcink_ad'
		);

		return $this->render_promotion( absint( $attributes['promotion'] ) );
	}

	/**
	 * Insert one authorized paragraph preview at its truthful real-page anchor.
	 *
	 * A missing anchor is the only paragraph path that appends output to the end:
	 * the manager still sees the creative, while the evaluator receives an
	 * explicit unavailable-anchor context and renders content_anchor_missing.
	 *
	 * @param string $content          Rendered page content.
	 * @param int    $promotion_id     Promotion post ID.
	 * @param int    $paragraph_number Requested paragraph number.
	 * @param bool   $paragraph_number_valid Whether the stored anchor is valid.
	 * @param string $device                 Desktop or mobile preview context.
	 * @param int    $post_id                Real page used by the preview.
	 */
	public function insert_paragraph_preview(
		string $content,
		int $promotion_id,
		int $paragraph_number,
		bool $paragraph_number_valid,
		string $device,
		int $post_id
	): string {
		if ( ! $paragraph_number_valid || 1 > $paragraph_number || 20 < $paragraph_number ) {
			return $content . $this->render_preview(
				$promotion_id,
				self::PARAGRAPH_LOCATION,
				$device,
				$post_id
			);
		}

		$markers          = $this->paragraph_markers( $post_id, array( $paragraph_number ) );
		$sentinel         = $this->paragraph_sentinel( $post_id );
		$is_block_content = $this->prepared_block_content[ $post_id ] ?? false;

		if ( $is_block_content ) {
			$anchor_available = in_array(
				$paragraph_number,
				$this->paragraph_inserter->available_block_anchors( $content, $markers ),
				true
			);
			$preview          = $this->render_preview(
				$promotion_id,
				self::PARAGRAPH_LOCATION,
				$device,
				$post_id,
				0,
				$anchor_available
			);
			$filtered         = $this->paragraph_inserter->replace_block_markers(
				$content,
				$markers,
				$anchor_available ? array( $paragraph_number => $preview ) : array(),
				$sentinel
			);

			return $anchor_available ? $filtered : $filtered . $preview;
		}

		$anchor_available = in_array(
			$paragraph_number,
			$this->paragraph_inserter->available_classic_anchors( $content, array( $paragraph_number ) ),
			true
		);
		$preview          = $this->render_preview(
			$promotion_id,
			self::PARAGRAPH_LOCATION,
			$device,
			$post_id,
			0,
			$anchor_available
		);
		if ( ! $anchor_available ) {
			return $content . $preview;
		}

		return $this->paragraph_inserter->insert_after_classic_paragraphs(
			$content,
			array( $paragraph_number => $preview )
		);
	}

	/**
	 * Add eligible before/after promotions to singular main-loop content.
	 *
	 * @param string $content Original post content.
	 */
	public function filter_content( string $content ): string {
		if ( $this->filtering_content ) {
			return $content;
		}

		$post_id = $this->content_post_id();
		if ( 1 > $post_id ) {
			return $content;
		}
		if ( isset( $this->filtered_content[ $post_id ] ) ) {
			$cached = $this->filtered_content[ $post_id ];

			return $content === $cached['source'] ? $cached['output'] : $content;
		}

		$this->filtering_content = true;
		try {
			$before            = $this->render_content_location( 'content_before', $post_id );
			$paragraph_content = $this->insert_paragraph_promotions( $content, $post_id );
			$after             = $this->render_content_location( 'content_after', $post_id );
			$output            = $before . $paragraph_content . $after;
			$this->filtered_content[ $post_id ] = array(
				'source' => $content,
				'output' => $output,
			);

			return $output;
		} finally {
			$this->filtering_content = false;
		}
	}

	/**
	 * Insert all eligible paragraph Promotions at available anchors.
	 *
	 * Missing anchors intentionally produce no normal frontend output.
	 *
	 * @param string $content Rendered page content.
	 * @param int    $post_id Current content post ID.
	 */
	private function insert_paragraph_promotions( string $content, int $post_id ): string {
		$groups = $this->get_paragraph_groups();
		if ( array() === $groups ) {
			return $content;
		}

		$paragraph_numbers = array_keys( $groups );
		$markers          = $this->paragraph_markers( $post_id, $paragraph_numbers );
		$sentinel         = $this->paragraph_sentinel( $post_id );
		$is_block_content = $this->prepared_block_content[ $post_id ] ?? false;
		if ( $is_block_content ) {
			$available    = $this->paragraph_inserter->available_block_anchors( $content, $markers );
			$replacements = $this->render_paragraph_groups( $groups, $available, $post_id );

			return $this->paragraph_inserter->replace_block_markers(
				$content,
				$markers,
				$replacements,
				$sentinel
			);
		}

		$available    = $this->paragraph_inserter->available_classic_anchors( $content, $paragraph_numbers );
		$replacements = $this->render_paragraph_groups( $groups, $available, $post_id );

		return $this->paragraph_inserter->insert_after_classic_paragraphs( $content, $replacements );
	}

	/**
	 * Render only groups whose real content anchor exists.
	 *
	 * @param array $groups            Promotion IDs by paragraph number.
	 * @param array $available_anchors Existing paragraph numbers.
	 * @param int   $post_id           Current content post ID.
	 * @return array<int, string>
	 * @phpstan-param array<int, list<int>> $groups
	 * @phpstan-param list<int> $available_anchors
	 */
	private function render_paragraph_groups( array $groups, array $available_anchors, int $post_id ): array {
		$replacements = array();
		foreach ( $available_anchors as $paragraph_number ) {
			$output = '';
			foreach ( $groups[ $paragraph_number ] ?? array() as $promotion_id ) {
				$output .= $this->render_automatic_promotion(
					$promotion_id,
					self::PARAGRAPH_LOCATION,
					$post_id,
					true
				);
			}
			$replacements[ $paragraph_number ] = $output;
		}

		return $replacements;
	}

	/**
	 * Load and normalize paragraph groups once per request.
	 *
	 * @return array<int, list<int>>
	 */
	private function get_paragraph_groups(): array {
		if ( $this->paragraph_groups_loaded ) {
			return $this->paragraph_groups;
		}

		$this->paragraph_groups_loaded = true;
		$groups                        = $this->automatic_catalog()['paragraph_ids'];
		foreach ( $groups as $paragraph_number => $promotion_ids ) {
			$paragraph_number = (int) $paragraph_number;
			if ( 1 > $paragraph_number || 20 < $paragraph_number ) {
				continue;
			}

			$ids = array_values( array_filter( array_map( 'absint', $promotion_ids ) ) );
			if ( array() !== $ids ) {
				$this->paragraph_groups[ $paragraph_number ] = $ids;
			}
		}
		ksort( $this->paragraph_groups, SORT_NUMERIC );

		return $this->paragraph_groups;
	}

	/**
	 * Build unique internal markers for requested paragraph numbers.
	 *
	 * @param int   $post_id           Current post ID.
	 * @param array $paragraph_numbers Requested paragraph numbers.
	 * @return array<int, string>
	 * @phpstan-param list<int> $paragraph_numbers
	 */
	private function paragraph_markers( int $post_id, array $paragraph_numbers ): array {
		$markers = array();
		foreach ( $paragraph_numbers as $paragraph_number ) {
			$paragraph_number = (int) $paragraph_number;
			if ( 1 <= $paragraph_number && 20 >= $paragraph_number ) {
				$markers[ $paragraph_number ] = sprintf(
					'<!-- npcink-ad-paragraph-anchor-%d-%d-%d -->',
					spl_object_id( $this ),
					$post_id,
					$paragraph_number
				);
			}
		}

		return $markers;
	}

	/**
	 * Build the internal named-block sentinel for one post.
	 *
	 * @param int $post_id Current post ID.
	 */
	private function paragraph_sentinel( int $post_id ): string {
		return sprintf( '<!-- npcink-ad-block-content-%d-%d -->', spl_object_id( $this ), $post_id );
	}

	/**
	 * Return the post ID only for supported singular main-loop content.
	 */
	private function content_post_id(): int {
		if ( is_admin() || is_feed() || ! is_singular( array( 'post', 'page' ) ) || ! in_the_loop() || ! is_main_query() ) {
			return 0;
		}

		return get_the_ID();
	}

	/**
	 * Render all published promotions assigned to a content location.
	 *
	 * @param string $location Content location.
	 * @param int    $post_id  Current content post ID.
	 */
	private function render_content_location( string $location, int $post_id ): string {
		$output = '';
		$catalog = $this->automatic_catalog();
		foreach ( $catalog['location_ids'][ $location ] ?? array() as $promotion_id ) {
			$output .= $this->render_automatic_promotion( $promotion_id, $location, $post_id );
		}

		return $output;
	}

	/**
	 * Render one page-bar location in a standard singular post/page context.
	 *
	 * During any authorized preview request, ordinary bars are suppressed. A
	 * matching bar preview is force-rendered through its actual theme hook.
	 *
	 * @param string $location Top or bottom page-bar location.
	 */
	private function render_page_bar_location( string $location ): string {
		if ( ! in_array( $location, self::BAR_LOCATIONS, true ) ) {
			return '';
		}

		$post_id = $this->page_bar_post_id();
		if ( 1 > $post_id ) {
			return '';
		}

		if ( $this->preview_request_active ) {
			$preview = $this->page_bar_preview_context;
			if (
				null === $preview
				|| $location !== $preview['location']
				|| $post_id !== $preview['post_id']
			) {
				return '';
			}

			$output = $this->render_preview(
				$preview['promotion_id'],
				$location,
				$preview['device'],
				$post_id
			);
			$this->page_bar_preview_rendered = '' !== $output;

			return $output;
		}

		return $this->render_content_location( $location, $post_id );
	}

	/**
	 * Return the current standard singular target for page-bar delivery.
	 */
	private function page_bar_post_id(): int {
		if ( is_admin() || is_feed() || ! is_singular( array( 'post', 'page' ) ) ) {
			return 0;
		}

		return absint( get_queried_object_id() );
	}

	/**
	 * Load one Repository-owned automatic catalog for this delivery request.
	 *
	 * @return array{
	 *     by_id: array<int, array<string, mixed>>,
	 *     location_ids: array{content_before: list<int>, content_after: list<int>, bar_top: list<int>, bar_bottom: list<int>},
	 *     paragraph_ids: array<int, list<int>>
	 * }
	 */
	private function automatic_catalog(): array {
		if ( null === $this->automatic_catalog ) {
			$this->automatic_catalog = $this->repository->find_published_automatic_catalog();
		}

		return $this->automatic_catalog;
	}

	/**
	 * Render an automatic Promotion already mapped in the shared catalog.
	 *
	 * @param int       $promotion_id            Promotion post ID.
	 * @param string    $expected_location       Expected automatic location.
	 * @param int       $post_id                 Current content post ID.
	 * @param bool|null $content_anchor_available Whether a paragraph anchor exists.
	 */
	private function render_automatic_promotion(
		int $promotion_id,
		string $expected_location,
		int $post_id,
		?bool $content_anchor_available = null
	): string {
		$can_diagnose = current_user_can( 'manage_npcink_ads' );
		if ( 1 > $promotion_id ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'promotion_missing' ) ) : '';
		}
		if ( isset( $this->rendering[ $promotion_id ] ) ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'recursive_promotion' ) ) : '';
		}

		$promotion = $this->automatic_catalog()['by_id'][ $promotion_id ] ?? null;
		if ( null === $promotion ) {
			return $can_diagnose ? $this->renderer->placeholder( array( 'promotion_missing' ) ) : '';
		}

		return $this->render_mapped_promotion(
			$promotion,
			$promotion_id,
			$expected_location,
			0,
			null,
			$post_id,
			$content_anchor_available,
			$can_diagnose
		);
	}

	/**
	 * Map the current standard content object into an automatic-scope context.
	 *
	 * Manual block and shortcode delivery intentionally skip this lookup. Direct
	 * category and tag relationships are loaded only for the terms scope, and all
	 * values are cached by post ID so normal rendering and real-page preview share
	 * one request-local source of truth.
	 *
	 * @param array<string, mixed> $promotion        Promotion domain data.
	 * @param string               $expected_location Expected delivery location.
	 * @param int                  $post_id          Current content post ID.
	 * @return array{post_type?: string, category_ids?: list<int>, tag_ids?: list<int>, content_terms_available?: bool}
	 */
	private function automatic_content_context( array $promotion, string $expected_location, int $post_id ): array {
		if ( ! in_array( $expected_location, self::AUTOMATIC_LOCATIONS, true ) || 1 > $post_id ) {
			return array();
		}

		if ( ! isset( $this->content_contexts[ $post_id ] ) ) {
			$post_type = get_post_type( $post_id );
			$this->content_contexts[ $post_id ] = array(
				'post_type'                 => is_string( $post_type ) ? $post_type : '',
				'terms_loaded'              => false,
				'category_ids'              => array(),
				'tag_ids'                   => array(),
				'content_terms_available'   => false,
			);
		}

		$cached = &$this->content_contexts[ $post_id ];
		if ( 'terms' === ( $promotion['content_scope'] ?? 'all' ) && 'post' === $cached['post_type'] && ! $cached['terms_loaded'] ) {
			$cached['terms_loaded'] = true;
			$category_terms         = get_the_terms( $post_id, 'category' );
			$tag_terms              = get_the_terms( $post_id, 'post_tag' );
			if ( $this->term_result_is_available( $category_terms ) && $this->term_result_is_available( $tag_terms ) ) {
				$cached['category_ids']            = $this->normalize_term_ids( false === $category_terms ? array() : $category_terms );
				$cached['tag_ids']                 = $this->normalize_term_ids( false === $tag_terms ? array() : $tag_terms );
				$cached['content_terms_available'] = true;
			}
		}

		return array(
			'post_type'                => $cached['post_type'],
			'category_ids'             => $cached['category_ids'],
			'tag_ids'                  => $cached['tag_ids'],
			'content_terms_available'  => $cached['content_terms_available'],
		);
	}

	/**
	 * Treat false as a valid empty relationship set and errors as unavailable.
	 *
	 * @param mixed $terms Result from get_the_terms().
	 */
	private function term_result_is_available( mixed $terms ): bool {
		if ( false === $terms ) {
			return true;
		}
		if ( ! is_array( $terms ) ) {
			return false;
		}

		foreach ( $terms as $term ) {
			if ( ! is_object( $term ) ) {
				return false;
			}

			$term_id = $term->term_id ?? null;
			if (
				( ! is_int( $term_id ) && ( ! is_string( $term_id ) || 1 !== preg_match( '/^[1-9][0-9]*$/', $term_id ) ) )
				|| 1 > (int) $term_id
			) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Normalize IDs returned by WordPress's cached term relationship API.
	 *
	 * @param array<int, mixed> $terms Assigned term objects.
	 * @return list<int>
	 */
	private function normalize_term_ids( array $terms ): array {
		$normalized = array();
		foreach ( $terms as $term ) {
			$id = is_object( $term ) ? absint( $term->term_id ?? 0 ) : 0;
			if ( 0 < $id ) {
				$normalized[ $id ] = $id;
			}
		}

		return array_values( $normalized );
	}
}
