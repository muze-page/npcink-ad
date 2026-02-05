<?php

namespace MagickAD\Frontend;

use MagickAD\Data\Ads;
use MagickAD\Data\Settings;
use MagickAD\REST\Controllers\Track_Controller;
use MagickAD\Utils\Capabilities;

if (!defined('ABSPATH')) {
    exit;
}

final class Frontend {
    private static bool $loop_before_rendered = false;
    private static bool $loop_after_rendered = false;
    private static ?string $comments_template_original = null;
    private static ?string $preview_ad_id = null;
    private static ?array $preview_ad = null;
    private static bool $preview_force = false;
    private static string $preview_mode = 'shell';
    private static array $preview_evaluation = array(
        'allowed' => false,
        'reasons' => array(),
    );
    private static ?array $matching_cache = null;
    private static ?array $container_index = null;
    private static array $hydrated_ads = array();
    private static bool $content_insert_active = false;
    private static bool $content_insert_used = false;
    private static int $content_insert_index = 0;
    private static ?array $content_insert_map = null;
    private static ?array $behavior_config_cache = null;

    public function register(): void {
        add_action('wp_enqueue_scripts', array(__CLASS__, 'enqueue_assets'));
        add_action('template_redirect', array(__CLASS__, 'handle_preview_request'));
        self::init();
        self::maybe_init_random_cookie();
        add_shortcode('magick_ad', array(__CLASS__, 'shortcode'));
    }

    public static function render_block_ad(array $ad): string {
        return self::render_ad_array($ad, array('position' => 'block'));
    }

    public static function render_ad_array(array $ad, array $args = array()): string {
        if (empty($ad)) {
            return '';
        }
        if (!self::should_display_ad($ad) && empty($args['force'])) {
            return '';
        }
        if (!empty($ad['options']['render_require_consent']) && !self::has_consent()) {
            return '';
        }
        self::enqueue_assets(true);
        $ad = self::apply_render_overrides($ad, $args);
        $position = isset($args['position']) && is_string($args['position'])
            ? $args['position']
            : 'slot';
        return self::build_ad_markup($ad, $position);
    }

    public static function render_ad_by_id(string $ad_id, array $args = array()): string {
        if ($ad_id === '') {
            return '';
        }
        $ad = self::get_ad_by_id($ad_id);
        if (!$ad) {
            return '';
        }
        if (!empty($ad['options']['render_require_consent']) && !self::has_consent()) {
            return '';
        }
        if (!isset($args['slot']) && !isset($args['id'])) {
            $args['id'] = $ad_id;
        }
        $args['force'] = true;
        $ad = self::apply_render_overrides($ad, $args);
        $position = isset($args['position']) && is_string($args['position'])
            ? $args['position']
            : 'slot';
        return self::build_ad_markup($ad, $position);
    }

    public static function render_slot($slot_or_id, array $args = array()): string {
        list($slot, $id) = self::resolve_slot_and_id($slot_or_id, $args);
        if ($slot === '' && $id === '') {
            return '';
        }

        $settings = Settings::get_runtime_settings();
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
        $slots = isset($settings['slots']) && is_array($settings['slots']) ? $settings['slots'] : array();

        $slot_key = $slot !== '' ? sanitize_title($slot) : '';
        $slot_config = $slot_key !== '' ? self::find_slot_config($slots, $slot_key) : null;

        if ($slot_config !== null && self::should_use_slot_client_resolver($slot_key, $args, $slot_config)) {
            $placeholder = self::render_slot_placeholder($slot_key, $args, $ads, $slot_config);
            if ($placeholder !== '') {
                return $placeholder;
            }
        }

        $resolved = self::resolve_ads($slot_or_id, $args);
        if (empty($resolved)) {
            return '';
        }

        $markup = '';
        foreach ($resolved as $ad) {
            $rendered = self::render_ad_array($ad, $args);
            if ($rendered) {
                $markup .= $rendered;
            }
        }
        return $markup;
    }

    public static function shortcode($atts = array()) {
        $atts = shortcode_atts(
            array(
                'id' => '',
                'slot' => '',
                'container' => '',
                'class' => '',
                'position' => 'shortcode',
            ),
            $atts,
            'magick_ad'
        );
        $slot_or_id = $atts['id'] ?: $atts['slot'];
        return self::render_slot($slot_or_id, array(
            'id' => $atts['id'],
            'slot' => $atts['slot'],
            'container' => $atts['container'],
            'class' => $atts['class'],
            'position' => $atts['position'] ?: 'shortcode',
        ));
    }

    private static function init() {
        add_filter('the_content', array(__CLASS__, 'prepare_content_ads'), 8);
        add_filter('the_content', array(__CLASS__, 'inject_content_ads'));
        add_filter('render_block_core/paragraph', array(__CLASS__, 'inject_content_into_paragraph'), 10, 2);
        add_action('wp_head', array(__CLASS__, 'render_head_ads'));
        add_action('wp_footer', array(__CLASS__, 'render_node_ads'), 5);
        add_action('wp_footer', array(__CLASS__, 'render_footer_ads'));
        add_action('wp_footer', array(__CLASS__, 'render_diagnose_panel'), 99);
        add_action('wp_body_open', array(__CLASS__, 'render_body_top_ads'));
        add_action('loop_start', array(__CLASS__, 'render_loop_before_ads'));
        add_action('loop_end', array(__CLASS__, 'render_loop_after_ads'));
        add_action('comment_form_before', array(__CLASS__, 'render_comment_form_before_ads'));
        add_action('comment_form_after', array(__CLASS__, 'render_comment_form_after_ads'));
        add_filter('comments_template', array(__CLASS__, 'filter_comments_template'), 9);
    }

    private static function should_process_content_ads(): bool {
        if (self::is_preview()) {
            return true;
        }
        return !(is_admin() || !is_singular() || !in_the_loop() || !is_main_query());
    }

    private static function reset_content_insert_state(): void {
        self::$content_insert_active = false;
        self::$content_insert_used = false;
        self::$content_insert_index = 0;
        self::$content_insert_map = null;
    }

    public static function prepare_content_ads($content) {
        if (!self::should_process_content_ads()) {
            return $content;
        }

        self::reset_content_insert_state();

        if (!function_exists('has_blocks') || !has_blocks($content)) {
            return $content;
        }

        $ads = self::get_matching_ads_for('content');
        if (empty($ads)) {
            return $content;
        }

        $insert_map = self::build_content_insert_map($ads);
        if (empty($insert_map)) {
            return $content;
        }

        self::$content_insert_map = $insert_map;
        self::$content_insert_active = true;
        self::$content_insert_used = false;
        self::$content_insert_index = 0;

        return $content;
    }

    private static function get_placement(array $options): array {
        $hook = isset($options['placement_hook']) ? (string) $options['placement_hook'] : '';
        $position = isset($options['placement_position']) ? (string) $options['placement_position'] : '';
        $paragraph = isset($options['placement_paragraph']) ? absint($options['placement_paragraph']) : 0;

        if ($hook === 'content' && $position === 'paragraph') {
            if ($paragraph < 1) {
                $paragraph = 2;
            }
        } else {
            $position = $hook === 'content' ? $position : '';
            $paragraph = 0;
        }

        return array(
            'hook' => $hook,
            'position' => $position,
            'paragraph' => $paragraph,
        );
    }

    private static function apply_render_overrides(array $ad, array $args): array {
        $options = isset($ad['options']) && is_array($ad['options']) ? $ad['options'] : array();
        if (!empty($args['container'])) {
            $container = Settings::sanitize_choice(
                $args['container'],
                array('inline', 'popup', 'banner', 'floating', 'interstitial'),
                $options['container_type'] ?? 'inline'
            );
            $options['container_type'] = $container;
        }
        if (!empty($args['creative'])) {
            $creative = Settings::sanitize_choice(
                $args['creative'],
                array('html', 'image', 'video', 'block'),
                $options['creative_type'] ?? 'html'
            );
            $options['creative_type'] = $creative;
        }
        $ad['options'] = $options;

        if (!empty($args['class']) && is_string($args['class'])) {
            $ad['_extra_class'] = $args['class'];
        }
        if (!empty($args['slot']) && is_string($args['slot'])) {
            $ad['_slot'] = $args['slot'];
        } elseif (!empty($args['id']) && is_string($args['id'])) {
            $ad['_slot'] = $args['id'];
        }
        return $ad;
    }

    private static function resolve_ads($slot_or_id, array $args = array()): array {
        list($slot, $id) = self::resolve_slot_and_id($slot_or_id, $args);

        $settings = Settings::get_runtime_settings();
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
        $slots = isset($settings['slots']) && is_array($settings['slots']) ? $settings['slots'] : array();

        if ($id !== '') {
            foreach ($ads as $ad) {
                $ad_id = isset($ad['id']) ? (string) $ad['id'] : '';
                if ($ad_id === $id) {
                    return array($ad);
                }
            }
        }

        if ($slot === '') {
            return array();
        }

        $slot = sanitize_title($slot);
        $slot_config = self::find_slot_config($slots, $slot);
        if (!$slot_config) {
            return array();
        }

        list($slot_candidates, $weight_map) = self::build_slot_candidates($ads, $slot_config);
        $eligible = self::filter_eligible_ads($slot_candidates);
        if (empty($eligible)) {
            return array();
        }

        $top = self::filter_top_priority($eligible);
        $limit = isset($slot_config['limit']) ? max(1, absint($slot_config['limit'])) : 1;
        return self::pick_weighted_ads($top, $weight_map, $limit);
    }

    private static function resolve_slot_and_id($slot_or_id, array $args): array {
        $slot = isset($args['slot']) ? (string) $args['slot'] : '';
        $id = isset($args['id']) ? (string) $args['id'] : '';

        if ($slot === '' && $slot_or_id) {
            $slot = (string) $slot_or_id;
        }
        if ($id === '' && $slot_or_id) {
            $id = (string) $slot_or_id;
        }
        if ($slot !== '') {
            $slot = (string) apply_filters('magick_ad_resolve_slot', $slot, $args);
            if ($slot !== '' && $id === '') {
                $id = $slot;
            }
        }

        return array($slot, $id);
    }

    private static function should_use_slot_client_resolver(string $slot, array $args, array $slot_config): bool {
        if (is_admin() || self::is_preview_request() || self::is_preview()) {
            return false;
        }
        $enabled = (get_option('magick_ad_slot_client_resolver', '1') === '1');
        return (bool) apply_filters('magick_ad_slot_client_resolver_enabled', $enabled, $slot, $slot_config, $args);
    }

    private static function render_slot_placeholder(
        string $slot,
        array $args,
        array $ads,
        array $slot_config
    ): string {
        list($candidates, $weight_map, $limit) = self::resolve_slot_candidates($ads, $slot_config);
        if (empty($candidates)) {
            return '';
        }

        $resolver_args = self::build_slot_resolver_args($args, $slot);
        $resolver_position = isset($resolver_args['position']) ? (string) $resolver_args['position'] : '';
        $resolver_container = isset($resolver_args['container']) ? (string) $resolver_args['container'] : '';

        $sig_rev = (int) get_option(Settings::RUNTIME_REV_KEY, 0);
        $sig_ts = \MagickAD\Utils\Tracking_Signature::current_sig_ts();
        $payload_candidates = array();
        foreach ($candidates as $candidate) {
            $ad_id = isset($candidate['id']) ? (string) $candidate['id'] : '';
            if ($ad_id === '') {
                continue;
            }
            if (!self::has_consent() && !empty($candidate['options']['render_require_consent'])) {
                continue;
            }
            $ad_weight = isset($candidate['options']['weight'])
                ? absint($candidate['options']['weight'])
                : 1;
            $ad_weight = max(1, $ad_weight);
            $slot_weight = isset($weight_map[$ad_id]) ? $weight_map[$ad_id] : 1;
            $slot_weight = max(1, absint($slot_weight));
            $weight = $ad_weight * $slot_weight;

            $payload_candidates[] = array(
                'id' => $ad_id,
                'weight' => $weight,
                'sig' => \MagickAD\Utils\Tracking_Signature::build(
                    $ad_id,
                    $sig_ts,
                    $slot,
                    $resolver_position,
                    $resolver_container,
                    (string) $sig_rev
                ),
                'sig_ts' => $sig_ts,
                'sig_rev' => $sig_rev,
            );
        }

        if (empty($payload_candidates)) {
            return '';
        }

        $candidates_json = wp_json_encode($payload_candidates, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $args_json = wp_json_encode($resolver_args, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $attrs = ' data-magick-ad-slot-resolver="1"';
        $attrs .= ' data-magick-ad-slot="' . esc_attr($slot) . '"';
        $attrs .= ' data-magick-ad-limit="' . esc_attr((string) $limit) . '"';
        $placeholder_ratio = self::get_slot_placeholder_ratio($candidates);
        if ($placeholder_ratio !== '') {
            $attrs .= ' style="aspect-ratio:' . esc_attr($placeholder_ratio) . ';"';
        }
        if ($candidates_json) {
            $attrs .= ' data-magick-ad-candidates="' . esc_attr($candidates_json) . '"';
        }
        if ($args_json) {
            $attrs .= ' data-magick-ad-args="' . esc_attr($args_json) . '"';
        }

        self::enqueue_slot_resolver_assets();

        return '<div class="magick-ad-slot-resolver"' . $attrs . '></div>';
    }

    private static function build_slot_resolver_args(array $args, string $slot): array {
        $resolver_args = array(
            'slot' => $slot,
            'position' => 'slot',
        );

        if (!empty($args['position']) && is_string($args['position'])) {
            $resolver_args['position'] = $args['position'];
        }
        if (!empty($args['class']) && is_string($args['class'])) {
            $resolver_args['class'] = $args['class'];
        }
        if (!empty($args['container']) && is_string($args['container'])) {
            $resolver_args['container'] = $args['container'];
        }
        if (!empty($args['creative']) && is_string($args['creative'])) {
            $resolver_args['creative'] = $args['creative'];
        }

        return $resolver_args;
    }

    private static function resolve_slot_candidates(array $ads, array $slot_config): array {
        list($slot_candidates, $weight_map) = self::build_slot_candidates($ads, $slot_config);
        $eligible = self::filter_eligible_ads($slot_candidates);
        if (empty($eligible)) {
            return array(array(), array(), 0);
        }
        $top = self::filter_top_priority($eligible);
        $limit = isset($slot_config['limit']) ? max(1, absint($slot_config['limit'])) : 1;
        return array($top, $weight_map, $limit);
    }

    private static function find_slot_config(array $slots, string $slot): ?array {
        foreach ($slots as $slot_item) {
            $slot_id = isset($slot_item['id']) ? (string) $slot_item['id'] : '';
            if ($slot_id === $slot) {
                return $slot_item;
            }
        }
        return null;
    }

    private static function build_slot_candidates(array $ads, array $slot_config): array {
        if (empty($slot_config['ad_ids']) || !is_array($slot_config['ad_ids'])) {
            return array(array(), array());
        }

        $ads_by_id = array();
        foreach ($ads as $ad) {
            if (isset($ad['id'])) {
                $ads_by_id[(string) $ad['id']] = $ad;
            }
        }

        $slot_candidates = array();
        $weight_map = array();
        $weights = isset($slot_config['weights']) && is_array($slot_config['weights'])
            ? $slot_config['weights']
            : array();

        foreach ($slot_config['ad_ids'] as $index => $ad_id) {
            $ad_id = is_string($ad_id) ? $ad_id : '';
            if ($ad_id === '' || !isset($ads_by_id[$ad_id])) {
                continue;
            }
            $slot_candidates[] = $ads_by_id[$ad_id];
            if (isset($weights[$index])) {
                $weight_map[$ad_id] = max(1, absint($weights[$index]));
            }
        }

        return array($slot_candidates, $weight_map);
    }

    private static function filter_eligible_ads(array $slot_candidates): array {
        $eligible = array();
        foreach ($slot_candidates as $candidate) {
            if (self::should_display_ad($candidate)) {
                $eligible[] = $candidate;
            }
        }
        return $eligible;
    }

    private static function filter_top_priority(array $eligible): array {
        $max_priority = null;
        foreach ($eligible as $candidate) {
            $priority = isset($candidate['options']['priority']) ? absint($candidate['options']['priority']) : 10;
            $priority = max(1, $priority);
            if ($max_priority === null || $priority > $max_priority) {
                $max_priority = $priority;
            }
        }

        $top = array();
        foreach ($eligible as $candidate) {
            $priority = isset($candidate['options']['priority']) ? absint($candidate['options']['priority']) : 10;
            $priority = max(1, $priority);
            if ($priority === $max_priority) {
                $top[] = $candidate;
            }
        }
        return $top;
    }

    private static function pick_weighted_ads(array $top, array $weight_map, int $limit): array {
        if (empty($top)) {
            return array();
        }
        if (count($top) <= 1) {
            return $top;
        }

        $limit = min(max(1, $limit), count($top));
        $pool = array_values($top);
        $selected = array();

        while (count($selected) < $limit && !empty($pool)) {
            $weights = array();
            $sum = 0;
            foreach ($pool as $candidate) {
                $ad_id = isset($candidate['id']) ? (string) $candidate['id'] : '';
                $ad_weight = isset($candidate['options']['weight'])
                    ? absint($candidate['options']['weight'])
                    : 1;
                $ad_weight = max(1, $ad_weight);
                $slot_weight = isset($weight_map[$ad_id]) ? $weight_map[$ad_id] : 1;
                $slot_weight = max(1, $slot_weight);
                $weight = $ad_weight * $slot_weight;
                $weights[] = $weight;
                $sum += $weight;
            }

            $roll = wp_rand(1, max(1, $sum));
            $acc = 0;
            $picked_index = 0;
            foreach ($pool as $index => $candidate) {
                $acc += $weights[$index];
                if ($roll <= $acc) {
                    $picked_index = $index;
                    break;
                }
            }
            $selected[] = $pool[$picked_index];
            array_splice($pool, $picked_index, 1);
        }

        return $selected;
    }

    private static function resolve_ad($slot_or_id, array $args = array()) {
        $ads = self::resolve_ads($slot_or_id, $args);
        return !empty($ads) ? $ads[0] : null;
    }

    private static function get_behavior_config(): array {
        if (self::$behavior_config_cache !== null) {
            return self::$behavior_config_cache;
        }

        $has_consent = (bool) apply_filters('magick_ad_has_consent', false);
        $requires_consent = (get_option('magick_ad_tracking_require_consent', '0') === '1');
        $requires_consent = (bool) apply_filters('magick_ad_tracking_require_consent', $requires_consent);
        $consent_guard_enabled = (get_option('magick_ad_consent_guard_enabled', '0') === '1');
        $consent_guard_enabled = (bool) apply_filters('magick_ad_consent_guard_enabled', $consent_guard_enabled);
        $requires_consent = $consent_guard_enabled ? $requires_consent : false;
        $consent_banner_enabled = $consent_guard_enabled && (get_option('magick_ad_consent_banner_enabled', '1') === '1');
        $consent_banner_text = get_option(
            'magick_ad_consent_banner_text',
            '为了提供更好的体验，我们会使用必要的 Cookie/存储进行频控。'
        );
        $consent_banner_button = get_option('magick_ad_consent_banner_button', '同意');

        $config = array(
            'hasConsent' => $has_consent || !$requires_consent,
            'requireConsent' => $requires_consent,
            'consentGuardEnabled' => $consent_guard_enabled,
            'consentBannerEnabled' => $consent_banner_enabled,
            'consentBannerText' => $consent_banner_text,
            'consentBannerButton' => $consent_banner_button,
            'renderUrl' => esc_url_raw(rest_url('magick-ad/v1/render-ad')),
            'renderBatchUrl' => esc_url_raw(rest_url('magick-ad/v1/render-ads')),
            'observeMutations' => (bool) apply_filters('magick_ad_behavior_observe_mutations', false),
            'credentials' => 'omit',
        );

        self::$behavior_config_cache = $config;
        return $config;
    }

    private static function enqueue_slot_resolver_assets(): void {
        if (wp_script_is('magick-ad-slot-resolver', 'enqueued')) {
            return;
        }
        $slot_resolver_enabled = (get_option('magick_ad_slot_client_resolver', '1') === '1');
        if (!$slot_resolver_enabled) {
            return;
        }

        $resolver_asset = self::get_frontend_script_asset(
            'magick-ad-slot-resolver',
            'assets/magick-ad-slot-resolver.js'
        );
        wp_enqueue_script(
            'magick-ad-slot-resolver',
            $resolver_asset['src'],
            $resolver_asset['dependencies'],
            $resolver_asset['version'],
            true
        );
        wp_script_add_data('magick-ad-slot-resolver', 'strategy', 'defer');
        wp_localize_script(
            'magick-ad-slot-resolver',
            'MagickADBehavior',
            self::get_behavior_config()
        );
    }

    private static function is_tracking_enabled(): bool {
        $strategy = (string) get_option('magick_ad_tracking_strategy', 'session');
        $enabled = (get_option('magick_ad_tracking_enabled', '1') === '1');
        if ($strategy === 'none') {
            $enabled = false;
        }
        return (bool) apply_filters('magick_ad_tracking_enabled', $enabled, $strategy);
    }

    private static function get_frontend_script_asset(string $handle, string $fallback): array {
        $asset_path = MAGICK_AD_PATH . 'build/' . $handle . '.asset.php';
        $script_path = MAGICK_AD_PATH . 'build/' . $handle . '.js';
        if (file_exists($asset_path) && file_exists($script_path)) {
            $asset = require $asset_path;
            return array(
                'src' => MAGICK_AD_URL . 'build/' . $handle . '.js',
                'dependencies' => isset($asset['dependencies']) && is_array($asset['dependencies'])
                    ? $asset['dependencies']
                    : array(),
                'version' => isset($asset['version']) ? (string) $asset['version'] : MAGICK_AD_VERSION,
            );
        }

        return array(
            'src' => MAGICK_AD_URL . $fallback,
            'dependencies' => array(),
            'version' => MAGICK_AD_VERSION,
        );
    }

    public static function enqueue_assets(bool $force = false): void {
        if (is_admin()) {
            return;
        }

        if (self::is_preview_request()) {
            return;
        }

        $diagnose = self::is_diagnose_request() && self::can_view_diagnose();

        if (self::is_picker_request()) {
            if (!self::can_view_picker()) {
                return;
            }
            wp_enqueue_script(
                'magick-ad-picker',
                MAGICK_AD_URL . 'assets/magick-ad-picker.js',
                array(),
                MAGICK_AD_VERSION,
                true
            );
            return;
        }

        if (self::is_node_debug_request()) {
            if (!self::can_view_node_debug()) {
                return;
            }
            wp_enqueue_script(
                'magick-ad-node-debug',
                MAGICK_AD_URL . 'assets/magick-ad-node-debug.js',
                array(),
                MAGICK_AD_VERSION,
                true
            );
            $config = array(
                'type' => isset($_GET['magick_ad_node_type']) ? sanitize_text_field(wp_unslash($_GET['magick_ad_node_type'])) : 'id',
                'value' => isset($_GET['magick_ad_node_value']) ? sanitize_text_field(wp_unslash($_GET['magick_ad_node_value'])) : '',
                'match' => isset($_GET['magick_ad_node_match']) ? sanitize_text_field(wp_unslash($_GET['magick_ad_node_match'])) : 'first',
                'index' => isset($_GET['magick_ad_node_index']) ? absint(wp_unslash($_GET['magick_ad_node_index'])) : 1,
            );
            wp_localize_script('magick-ad-node-debug', 'MagickADNodeDebug', $config);
            return;
        }

        if ($diagnose) {
            if (!wp_style_is('magick-ad-frontend', 'enqueued')) {
                wp_enqueue_style(
                    'magick-ad-frontend',
                    MAGICK_AD_URL . 'assets/magick-ad-frontend.css',
                    array(),
                    MAGICK_AD_VERSION
                );
            }
            if (!wp_script_is('magick-ad-diagnose', 'enqueued')) {
                wp_enqueue_script(
                    'magick-ad-diagnose',
                    MAGICK_AD_URL . 'assets/magick-ad-diagnose.js',
                    array(),
                    MAGICK_AD_VERSION,
                    true
                );
            }
        }

        $ads = self::get_matching_ads_for('all');
        if (empty($ads) && !$force) {
            return;
        }

        if (!wp_style_is('magick-ad-frontend', 'enqueued')) {
            wp_enqueue_style(
                'magick-ad-frontend',
                MAGICK_AD_URL . 'assets/magick-ad-frontend.css',
                array(),
                MAGICK_AD_VERSION
            );
        }

        $track_handle = 'magick-ad-track';
        $container_index = self::get_container_index();
        $defer = self::has_deferred_ads($ads, $container_index);
        $diagnostics_enabled = (get_option('magick_ad_stats_diagnostics', '0') === '1');
        $diagnostics_enabled = (bool) apply_filters('magick_ad_stats_diagnostics_enabled', $diagnostics_enabled);
        $behavior_config = self::get_behavior_config();
        $consent_banner_enabled = !empty($behavior_config['consentBannerEnabled']);
        $needs_behavior = self::needs_behavior_assets($ads, $container_index) || $consent_banner_enabled;
        if ($needs_behavior) {
            $interactivity_asset = self::get_frontend_script_asset(
                'magick-ad-interactivity',
                'assets/magick-ad-interactivity.js'
            );
            $interactivity_deps = $interactivity_asset['dependencies'];
            if (wp_script_is('wp-interactivity', 'registered')) {
                $interactivity_deps[] = 'wp-interactivity';
            }
            $interactivity_deps = array_values(array_unique($interactivity_deps));
            wp_enqueue_script(
                'magick-ad-interactivity',
                $interactivity_asset['src'],
                $interactivity_deps,
                $interactivity_asset['version'],
                true
            );
            wp_script_add_data('magick-ad-interactivity', 'strategy', 'defer');
            wp_localize_script(
                'magick-ad-interactivity',
                'MagickADBehavior',
                $behavior_config
            );
        }

        if (!self::is_tracking_enabled()) {
            return;
        }

        $track_asset = self::get_frontend_script_asset(
            'magick-ad-track',
            'assets/magick-ad-track.js'
        );
        $track_deps = $track_asset['dependencies'];
        $track_config = array(
            'restUrl' => esc_url_raw(rest_url('magick-ad/v1/track')),
            'scriptUrl' => esc_url_raw($track_asset['src']),
            'collectPageUrl' => $diagnostics_enabled,
            'hasConsent' => !empty($behavior_config['hasConsent']),
            'requireConsent' => !empty($behavior_config['requireConsent']),
            'batchSize' => (int) apply_filters('magick_ad_track_batch_size', 10),
            'batchInterval' => (int) apply_filters('magick_ad_track_batch_interval', 2000),
            'observeMutations' => (bool) apply_filters('magick_ad_track_observe_mutations', false),
            'dedupeScope' => (string) apply_filters(
                'magick_ad_track_dedupe_scope',
                get_option('magick_ad_track_dedupe_scope', 'ad')
            ),
            'credentials' => 'omit',
            'allowBeacon' => !is_user_logged_in(),
        );

        if ($defer) {
            wp_register_script($track_handle, '', $track_deps, $track_asset['version'], true);
            wp_enqueue_script($track_handle);
            wp_localize_script($track_handle, 'MagickADTrack', $track_config);
            wp_add_inline_script(
                $track_handle,
                '(function(){var cfg=window.MagickADTrack||{};var loaded=false;var load=function(){if(loaded){return;}loaded=true;window.MagickADTrackLoaded=true;var s=document.createElement("script");s.src=cfg.scriptUrl;s.defer=true;document.head.appendChild(s);cleanup();};var events=["scroll","mousemove","touchstart","keydown","pointerdown"];var onEvent=function(){load();};var cleanup=function(){events.forEach(function(ev){window.removeEventListener(ev,onEvent,{passive:true});});};events.forEach(function(ev){window.addEventListener(ev,onEvent,{passive:true});});if(\"requestIdleCallback\" in window){requestIdleCallback(load,{timeout:1500});}else{setTimeout(load,800);} })();'
            );
        } else {
            wp_enqueue_script(
                $track_handle,
                $track_asset['src'],
                $track_deps,
                $track_asset['version'],
                true
            );
            wp_localize_script($track_handle, 'MagickADTrack', $track_config);
        }
    }

    private static function has_deferred_ads(array $ads, array $index = array()): bool {
        if (!empty($index['has_popup']) || !empty($index['has_delay'])) {
            return true;
        }

        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $container = isset($options['container_type']) ? $options['container_type'] : 'inline';
            $behavior = isset($ad['content']['behavior']) ? $ad['content']['behavior'] : array();
            $delay = isset($behavior['delay']) ? absint($behavior['delay']) : 0;
            if (in_array($container, array('popup', 'interstitial'), true)) {
                return true;
            }
            if ($delay > 0) {
                return true;
            }
        }
        return false;
    }

    private static function needs_behavior_assets(array $ads, array $index = array()): bool {
        if (!empty($index['has_popup']) || !empty($index['has_delay'])) {
            return true;
        }

        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $content = isset($ad['content']) ? $ad['content'] : array();
            $behavior = isset($content['behavior']) ? $content['behavior'] : array();
            $container = isset($options['container_type']) ? $options['container_type'] : 'inline';
            if (in_array($container, array('popup', 'interstitial'), true)) {
                return true;
            }
            if (!empty($behavior['delay'])) {
                return true;
            }
            $frequency_mode = isset($behavior['frequency_mode']) ? (string) $behavior['frequency_mode'] : 'none';
            if ($frequency_mode !== '' && $frequency_mode !== 'none') {
                return true;
            }
            $display_mode = isset($options['display_mode']) ? (string) $options['display_mode'] : 'show';
            $random_strategy = isset($options['random_strategy']) ? (string) $options['random_strategy'] : 'request';
            if ($display_mode === 'random' && $random_strategy === 'session') {
                return true;
            }
            if (!empty($behavior['lock_scroll'])) {
                return true;
            }
            if (array_key_exists('close_on_overlay', $behavior) || array_key_exists('close_on_esc', $behavior)) {
                return true;
            }
            if (!empty($options['placement_hook']) && $options['placement_hook'] === 'node') {
                return true;
            }
            $creative_type = isset($options['creative_type']) ? (string) $options['creative_type'] : '';
            if ($creative_type === 'html') {
                $strategy = isset($content['html_load_strategy']) ? (string) $content['html_load_strategy'] : 'immediate';
                if (in_array($strategy, array('delay', 'viewport'), true)) {
                    return true;
                }
            }
        }

        return false;
    }


    public static function inject_content_ads($content) {
        if (!self::should_process_content_ads()) {
            return $content;
        }

        $ads = self::get_matching_ads_for('content');
        if (empty($ads)) {
            self::reset_content_insert_state();
            return $content;
        }

        $prepend = '';
        $append = '';
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if ($placement['hook'] !== 'content') {
                continue;
            }
            if ($placement['position'] === 'before') {
                $prepend .= self::build_ad_markup($ad, 'content_before');
                continue;
            }
            if ($placement['position'] === 'after') {
                $append .= self::build_ad_markup($ad, 'content_after');
                continue;
            }
        }

        $insert_map = self::$content_insert_active
            ? (self::$content_insert_map ?? array())
            : self::build_content_insert_map($ads);

        if (!self::$content_insert_active && !empty($insert_map)) {
            $content = self::insert_after_paragraphs($content, $insert_map);
        }

        if ($prepend) {
            $content = self::wrap_zone_markup($prepend, 'content-before') . $content;
        }
        if ($append) {
            $content .= self::wrap_zone_markup($append, 'content-after');
        }

        self::reset_content_insert_state();

        return $content;
    }

    public static function inject_content_into_paragraph(string $block_content, array $block): string {
        if (!self::$content_insert_active || empty(self::$content_insert_map)) {
            return $block_content;
        }
        self::$content_insert_index += 1;
        if (isset(self::$content_insert_map[self::$content_insert_index])) {
            $block_content .= implode('', self::$content_insert_map[self::$content_insert_index]);
            self::$content_insert_used = true;
        }
        return $block_content;
    }

    private static function build_content_insert_map(array $ads): array {
        $insert_map = array();
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if ($placement['hook'] !== 'content') {
                continue;
            }
            if ($placement['position'] !== 'paragraph') {
                continue;
            }

            $insert_after = $placement['paragraph'] > 0 ? $placement['paragraph'] : 2;

            $markup = self::build_ad_markup($ad, 'content');
            if ($markup) {
                if (!isset($insert_map[$insert_after])) {
                    $insert_map[$insert_after] = array();
                }
                $insert_map[$insert_after][] = $markup;
            }
        }
        return $insert_map;
    }

    public static function render_head_ads() {
        if (is_admin()) {
            return;
        }

        $ads = self::get_matching_ads_for('head');
        if (empty($ads)) {
            return;
        }

        $markup = '';
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if ($placement['hook'] !== 'head') {
                continue;
            }
            $content = isset($ad['content']) ? $ad['content'] : array();
            $creative_type = isset($options['creative_type']) ? $options['creative_type'] : 'image';
            if ($creative_type !== 'html') {
                continue;
            }
            $raw_html = isset($content['html']) ? $content['html'] : '';
            if (!$raw_html) {
                continue;
            }
            $html_mode = isset($options['html_mode']) ? $options['html_mode'] : 'safe';
            if ($html_mode !== 'full' || is_multisite()) {
                $raw_html = wp_kses_post($raw_html);
            }
            $markup .= $raw_html . "\n";
        }

        if ($markup) {
            echo $markup;
        }
    }

    public static function render_footer_ads() {
        if (is_admin()) {
            return;
        }

        $ads = self::get_matching_ads_for('footer');
        if (empty($ads)) {
            return;
        }

        $markup = '';
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if ($placement['hook'] !== 'footer') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, 'footer');
        }

        if ($markup) {
            echo self::wrap_zone_markup($markup, 'footer');
        }
    }

    public static function render_node_ads() {
        if (is_admin()) {
            return;
        }

        $ads = self::get_matching_ads_for('node');
        if (empty($ads)) {
            return;
        }

        $markup = '';
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if ($placement['hook'] !== 'node') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, 'node');
        }

        if ($markup) {
            echo '<div id="magick-ad-stash" class="magick-ad-stash" style="display:none">' . $markup . '</div>';
        }
    }

    public static function render_body_top_ads() {
        if (is_admin()) {
            return;
        }

        $ads = self::get_matching_ads_for('body_top');
        if (empty($ads)) {
            return;
        }

        $markup = '';
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if ($placement['hook'] !== 'body_top') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, 'top');
        }

        if ($markup) {
            echo self::wrap_zone_markup($markup, 'top');
        }
    }

    public static function render_loop_before_ads($query) {
        if (is_admin() || !($query instanceof WP_Query) || !$query->is_main_query()) {
            return;
        }
        if (is_singular() || self::$loop_before_rendered) {
            return;
        }

        $ads = self::get_matching_ads_for('all');
        if (empty($ads)) {
            return;
        }

        $markup = '';
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if (!in_array($placement['hook'], array('loop_before', 'content'), true)) {
                continue;
            }
            if ($placement['hook'] === 'content' && $placement['position'] !== 'before') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, 'content_before');
        }

        if ($markup) {
            self::$loop_before_rendered = true;
            echo self::wrap_zone_markup($markup, 'loop-before');
        }
    }

    public static function render_loop_after_ads($query) {
        if (is_admin() || !($query instanceof WP_Query) || !$query->is_main_query()) {
            return;
        }
        if (is_singular() || self::$loop_after_rendered) {
            return;
        }

        $ads = self::get_matching_ads_for('all');
        if (empty($ads)) {
            return;
        }

        $markup = '';
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if (!in_array($placement['hook'], array('loop_after', 'content'), true)) {
                continue;
            }
            if ($placement['hook'] === 'content' && $placement['position'] !== 'after') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, 'content_after');
        }

        if ($markup) {
            self::$loop_after_rendered = true;
            echo self::wrap_zone_markup($markup, 'loop-after');
        }
    }

    public static function filter_comments_template($template) {
        if (is_admin() || !is_singular()) {
            return $template;
        }

        $ads = self::get_matching_ads_for('comments');
        if (empty($ads)) {
            return $template;
        }

        $needs_wrapper = false;
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if (in_array($placement['hook'], array('comments_top', 'comments_bottom'), true)) {
                $needs_wrapper = true;
                break;
            }
        }

        if (!$needs_wrapper) {
            return $template;
        }

        self::$comments_template_original = $template;
        return MAGICK_AD_PATH . 'templates/comments-wrapper.php';
    }

    public static function get_comments_template_original() {
        return self::$comments_template_original;
    }

    public static function render_comments_top_ads() {
        if (is_admin() || !is_singular()) {
            return;
        }

        $ads = self::get_matching_ads_for('comments_top');
        if (empty($ads)) {
            return;
        }

        $markup = '';
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if ($placement['hook'] !== 'comments_top') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, 'comments_top');
        }

        if ($markup) {
            echo self::wrap_zone_markup($markup, 'comments-top');
        }
    }

    public static function render_comments_bottom_ads() {
        if (is_admin() || !is_singular()) {
            return;
        }

        $ads = self::get_matching_ads_for('comments_bottom');
        if (empty($ads)) {
            return;
        }

        $markup = '';
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if ($placement['hook'] !== 'comments_bottom') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, 'comments_bottom');
        }

        if ($markup) {
            echo self::wrap_zone_markup($markup, 'comments-bottom');
        }
    }

    public static function render_comment_form_before_ads() {
        if (is_admin() || !is_singular()) {
            return;
        }

        $ads = self::get_matching_ads_for('comment_form_before');
        if (empty($ads)) {
            return;
        }

        $markup = '';
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if ($placement['hook'] !== 'comment_form_before') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, 'comment_form_before');
        }

        if ($markup) {
            echo self::wrap_zone_markup($markup, 'comment-form-before');
        }
    }

    public static function render_comment_form_after_ads() {
        if (is_admin() || !is_singular()) {
            return;
        }

        $ads = self::get_matching_ads_for('comment_form_after');
        if (empty($ads)) {
            return;
        }

        $markup = '';
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            if ($placement['hook'] !== 'comment_form_after') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, 'comment_form_after');
        }

        if ($markup) {
            echo self::wrap_zone_markup($markup, 'comment-form-after');
        }
    }

    private static function get_matching_ads_for(string $zone): array {
        if (self::$matching_cache === null) {
            self::$matching_cache = self::build_matching_cache();
        }

        $zone = $zone ?: 'all';
        if (!isset(self::$matching_cache[$zone])) {
            return array();
        }

        return self::$matching_cache[$zone];
    }

    private static function build_matching_cache(): array {
        if (self::is_preview() && self::$preview_mode !== 'page') {
            return array('all' => array());
        }

        $settings = Settings::get_runtime_settings();
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
        $index = isset($settings['index']) && is_array($settings['index']) ? $settings['index'] : array();

        $zones = array(
            'all' => array(),
            'head' => array(),
            'footer' => array(),
            'body_top' => array(),
            'content' => array(),
            'loop_before' => array(),
            'loop_after' => array(),
            'comments' => array(),
            'comments_top' => array(),
            'comments_bottom' => array(),
            'comment_form_before' => array(),
            'comment_form_after' => array(),
            'node' => array(),
        );

        $ads_index = isset($index['ads']) && is_array($index['ads']) ? $index['ads'] : array();
        $placements = isset($index['placements']) && is_array($index['placements']) ? $index['placements'] : array();
        $all_ids = isset($index['all']) && is_array($index['all']) ? $index['all'] : array();

        $use_index = !empty($ads_index) && !empty($all_ids);

        $process_ad = function (array $ad, ?array $placement) use (&$zones): void {
            if (!self::should_display_ad($ad)) {
                return;
            }

            $zones['all'][] = $ad;
            self::track_container_index($ad);

            if ($placement === null) {
                $options = isset($ad['options']) ? $ad['options'] : array();
                $placement = self::get_placement($options);
            }
            $hook = isset($placement['hook']) ? (string) $placement['hook'] : '';

            if ($hook === 'head') {
                $zones['head'][] = $ad;
                return;
            }
            if ($hook === 'footer') {
                $zones['footer'][] = $ad;
                return;
            }
            if ($hook === 'body_top') {
                $zones['body_top'][] = $ad;
                return;
            }
            if ($hook === 'loop_before') {
                $zones['loop_before'][] = $ad;
                return;
            }
            if ($hook === 'loop_after') {
                $zones['loop_after'][] = $ad;
                return;
            }
            if ($hook === 'comments_top') {
                $zones['comments'][] = $ad;
                $zones['comments_top'][] = $ad;
                return;
            }
            if ($hook === 'comments_bottom') {
                $zones['comments'][] = $ad;
                $zones['comments_bottom'][] = $ad;
                return;
            }
            if ($hook === 'comment_form_before') {
                $zones['comments'][] = $ad;
                $zones['comment_form_before'][] = $ad;
                return;
            }
            if ($hook === 'comment_form_after') {
                $zones['comments'][] = $ad;
                $zones['comment_form_after'][] = $ad;
                return;
            }
            if ($hook === 'node') {
                $zones['node'][] = $ad;
                return;
            }
            if ($hook === 'content') {
                $zones['content'][] = $ad;
            }
        };

        if ($use_index) {
            foreach ($all_ids as $ad_id) {
                $position = $ads_index[$ad_id] ?? null;
                if ($position === null || !isset($ads[$position]) || !is_array($ads[$position])) {
                    continue;
                }
                $placement = isset($placements[$ad_id]) && is_array($placements[$ad_id])
                    ? $placements[$ad_id]
                    : null;
                $process_ad($ads[$position], $placement);
            }
        } else {
            foreach ($ads as $ad) {
                if (!is_array($ad)) {
                    continue;
                }
                $process_ad($ad, null);
            }
        }

        return $zones;
    }

    private static function get_container_index(): array {
        if (self::$matching_cache === null) {
            self::$matching_cache = self::build_matching_cache();
        }

        if (self::$container_index === null) {
            self::$container_index = array();
        }

        return self::$container_index;
    }

    private static function track_container_index(array $ad): void {
        if (self::$container_index === null) {
            self::$container_index = array();
        }
        $options = isset($ad['options']) ? $ad['options'] : array();
        $container = isset($options['container_type']) ? $options['container_type'] : 'inline';
        if (!isset(self::$container_index[$container])) {
            self::$container_index[$container] = 0;
        }
        self::$container_index[$container] += 1;
        if (in_array($container, array('popup', 'interstitial'), true)) {
            self::$container_index['has_popup'] = 1;
        }
        if (!empty($ad['content']['behavior']['delay'])) {
            self::$container_index['has_delay'] = 1;
        }
    }

    private static function should_display_ad($ad) {
        $options = isset($ad['options']) ? $ad['options'] : array();
        $ad_type = isset($options['ad_type']) ? $options['ad_type'] : 'global';

        if (isset($ad['status']) && $ad['status'] !== 'publish') {
            return false;
        }

        if (isset($options['enabled']) && !$options['enabled']) {
            return false;
        }

        if (!empty($options['render_require_consent']) && !self::has_consent()) {
            return false;
        }

        if (self::is_before_start($options)) {
            return false;
        }

        if (self::is_expired($options)) {
            return false;
        }

        if (!self::matches_display_mode($ad, $options)) {
            return false;
        }

        if ($ad_type === 'targeted') {
            if (!self::matches_targeting($options)) {
                return false;
            }
        } else {
            if (!self::matches_show_page($options)) {
                return false;
            }
        }

        if (!self::matches_device($options)) {
            return false;
        }

        if (!self::matches_login($options)) {
            return false;
        }

        return true;
    }

    private static function evaluate_ad($ad): array {
        $reasons = array();
        $options = isset($ad['options']) ? $ad['options'] : array();
        $ad_type = isset($options['ad_type']) ? $options['ad_type'] : 'global';

        if (isset($ad['status']) && $ad['status'] !== 'publish') {
            $reasons[] = 'status';
        }

        if (isset($options['enabled']) && !$options['enabled']) {
            $reasons[] = 'disabled';
        }

        if (self::is_before_start($options)) {
            $reasons[] = 'not_started';
        }

        if (self::is_expired($options)) {
            $reasons[] = 'expired';
        }

        $mode = isset($options['display_mode']) ? $options['display_mode'] : 'show';
        if ($mode === 'hide') {
            $reasons[] = 'display_mode=hide';
        }
        if ($mode === 'random' && !self::matches_display_mode($ad, $options)) {
            $reasons[] = 'display_mode=random_hidden';
        }

        if ($ad_type === 'targeted') {
            if (!self::matches_targeting($options)) {
                $reasons[] = 'targeting';
            }
        } else {
            if (!self::matches_show_page($options)) {
                $reasons[] = 'show_page';
            }
        }

        if (!self::matches_device($options)) {
            $reasons[] = 'device';
        }
        if (!self::matches_login($options)) {
            $reasons[] = 'login';
        }

        return array(
            'allowed' => empty($reasons),
            'reasons' => $reasons,
        );
    }

    private static function is_preview_request(): bool {
        $flag = isset($_GET['magick_ad_preview']) ? sanitize_text_field(wp_unslash($_GET['magick_ad_preview'])) : '';
        return $flag !== '';
    }

    private static function is_picker_request(): bool {
        $flag = isset($_GET['magick_ad_picker']) ? sanitize_text_field(wp_unslash($_GET['magick_ad_picker'])) : '';
        return $flag === '1';
    }

    private static function is_node_debug_request(): bool {
        $flag = isset($_GET['magick_ad_node_debug']) ? sanitize_text_field(wp_unslash($_GET['magick_ad_node_debug'])) : '';
        return $flag === '1';
    }

    private static function can_view_picker(): bool {
        if (!Capabilities::current_user_can_manage()) {
            return false;
        }
        $nonce = isset($_GET['magick_ad_picker_nonce'])
            ? sanitize_text_field(wp_unslash($_GET['magick_ad_picker_nonce']))
            : '';
        if (!$nonce) {
            return false;
        }
        return wp_verify_nonce($nonce, 'magick_ad_picker');
    }

    private static function can_view_node_debug(): bool {
        if (!Capabilities::current_user_can_manage()) {
            return false;
        }
        $nonce = isset($_GET['magick_ad_node_debug_nonce'])
            ? sanitize_text_field(wp_unslash($_GET['magick_ad_node_debug_nonce']))
            : '';
        if (!$nonce) {
            return false;
        }
        return wp_verify_nonce($nonce, 'magick_ad_node_debug');
    }

    private static function is_preview(): bool {
        return !empty(self::$preview_ad_id);
    }

    private static function get_ad_by_id(string $ad_id): ?array {
        $settings = Settings::get_runtime_settings();
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
        foreach ($ads as $ad) {
            if (isset($ad['id']) && (string) $ad['id'] === $ad_id) {
                return $ad;
            }
        }
        return null;
    }

    private static function format_preview_reasons(array $reasons): string {
        if (empty($reasons)) {
            return '';
        }
        $map = array(
            'disabled' => '未启用',
            'not_started' => '未到开始时间',
            'expired' => '已过期',
            'status' => '未发布/排期中',
            'display_mode=hide' => '展示模式=隐藏',
            'display_mode=random_hidden' => '随机模式未命中',
            'targeting' => '定向条件不匹配',
            'show_page' => '展示页面不匹配',
            'device' => '设备不匹配',
            'login' => '登录状态不匹配',
        );
        $labels = array();
        foreach ($reasons as $reason) {
            $labels[] = $map[$reason] ?? $reason;
        }
        return implode(' · ', $labels);
    }

    private static function is_diagnose_request(): bool {
        $flag = isset($_GET['magick_ad_diagnose']) ? sanitize_text_field(wp_unslash($_GET['magick_ad_diagnose'])) : '';
        return $flag !== '';
    }

    private static function can_view_diagnose(): bool {
        if (!Capabilities::current_user_can_manage()) {
            return false;
        }
        $nonce = isset($_GET['magick_ad_diagnose_nonce']) ? sanitize_text_field(wp_unslash($_GET['magick_ad_diagnose_nonce'])) : '';
        if (!$nonce) {
            return false;
        }
        return wp_verify_nonce($nonce, 'magick_ad_diagnose');
    }

    private static function get_debug_device_override(): string {
        if (!self::is_diagnose_request() || !self::can_view_diagnose()) {
            return '';
        }
        $device = isset($_GET['magick_ad_debug_device'])
            ? sanitize_text_field(wp_unslash($_GET['magick_ad_debug_device']))
            : '';
        if (!in_array($device, array('mobile', 'tablet', 'desktop'), true)) {
            return '';
        }
        return $device;
    }

    private static function get_debug_login_override(): string {
        if (!self::is_diagnose_request() || !self::can_view_diagnose()) {
            return '';
        }
        $login = isset($_GET['magick_ad_debug_login'])
            ? sanitize_text_field(wp_unslash($_GET['magick_ad_debug_login']))
            : '';
        if (!in_array($login, array('logged-in', 'logged-out'), true)) {
            return '';
        }
        return $login;
    }

    public static function render_diagnose_panel(): void {
        if (!self::is_diagnose_request()) {
            return;
        }
        if (!self::can_view_diagnose()) {
            return;
        }

        $settings = Settings::get_runtime_settings();
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
        $report = array(
            'generated_at' => current_time('mysql'),
            'page' => array(
                'url' => esc_url_raw(home_url(add_query_arg(array()))),
                'is_home' => is_home(),
                'is_front_page' => is_front_page(),
                'is_single' => is_single(),
                'is_page' => is_page(),
                'is_archive' => is_archive(),
                'is_search' => is_search(),
                'is_404' => is_404(),
                'is_author' => is_author(),
                'is_category' => is_category(),
                'is_tag' => is_tag(),
            ),
            'ads' => array(),
            'today_failure_stats' => array(
                'date' => current_time('Y-m-d'),
                'counts' => Track_Controller::get_failure_stats(),
                'labels' => array(
                    'signature_invalid' => '签名无效',
                    'rate_limited' => '请求过快/被限流',
                    'deduped' => '去重命中',
                    'no_consent' => '未同意',
                ),
            ),
        );

        foreach ($ads as $ad) {
            $evaluation = self::evaluate_ad($ad);
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            $report['ads'][] = array(
                'id' => isset($ad['id']) ? $ad['id'] : '',
                'name' => isset($ad['name']) ? $ad['name'] : '',
                'enabled' => !empty($options['enabled']),
                'status' => isset($ad['status']) ? $ad['status'] : '',
                'placement' => $placement,
                'allowed' => $evaluation['allowed'],
                'reasons' => $evaluation['reasons'],
                'reason_text' => self::format_preview_reasons($evaluation['reasons']),
            );
        }

        $json = wp_json_encode(
            $report,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
        );
        if (!$json) {
            return;
        }

        echo '<div class="magick-ad-diagnose" id="magick-ad-diagnose">';
        echo '<div class="magick-ad-diagnose__header">';
        echo '<strong>Magick AD 投放诊断报告</strong>';
        echo '<div class="magick-ad-diagnose__actions">';
        echo '<button type="button" class="magick-ad-diagnose__btn" data-action="toggle">折叠</button>';
        echo '<button type="button" class="magick-ad-diagnose__btn" data-action="copy">复制报告</button>';
        echo '<button type="button" class="magick-ad-diagnose__btn" data-action="close">关闭</button>';
        echo '</div>';
        echo '</div>';
        echo '<div class="magick-ad-diagnose__body">';
        $failure_stats = $report['today_failure_stats'] ?? array();
        $failure_date = isset($failure_stats['date']) ? (string) $failure_stats['date'] : '';
        $failure_counts = isset($failure_stats['counts']) && is_array($failure_stats['counts'])
            ? $failure_stats['counts']
            : array();
        $failure_labels = isset($failure_stats['labels']) && is_array($failure_stats['labels'])
            ? $failure_stats['labels']
            : array();
        echo '<div class="magick-ad-diagnose__section">';
        echo '<div class="magick-ad-diagnose__section-title">今日失败原因统计';
        if ($failure_date !== '') {
            echo '<span class="magick-ad-diagnose__section-date">' . esc_html($failure_date) . '</span>';
        }
        echo '</div>';
        if (empty($failure_labels)) {
            echo '<div class="magick-ad-diagnose__empty">暂无统计</div>';
        } else {
            echo '<div class="magick-ad-diagnose__stats">';
            foreach ($failure_labels as $reason => $label) {
                $count = isset($failure_counts[$reason]) ? (int) $failure_counts[$reason] : 0;
                $active = $count > 0 ? ' is-active' : '';
                echo '<div class="magick-ad-diagnose__stat' . $active . '">';
                echo '<div class="magick-ad-diagnose__stat-label">' . esc_html((string) $label) . '</div>';
                echo '<div class="magick-ad-diagnose__stat-value">' . esc_html((string) $count) . '</div>';
                echo '</div>';
            }
            echo '</div>';
        }
        echo '</div>';
        echo '<pre class="magick-ad-diagnose__content" id="magick-ad-diagnose-content">' . esc_html($json) . '</pre>';
        echo '</div>';
        echo '</div>';
    }

    public static function handle_preview_request(): void {
        if (!self::is_preview_request()) {
            return;
        }

        if (!Capabilities::current_user_can_manage()) {
            return;
        }

        $nonce = isset($_GET['magick_ad_preview_nonce']) ? sanitize_text_field(wp_unslash($_GET['magick_ad_preview_nonce'])) : '';
        if (!$nonce || !wp_verify_nonce($nonce, 'magick_ad_preview')) {
            return;
        }

        $ad_id = isset($_GET['magick_ad_preview_ad']) ? sanitize_text_field(wp_unslash($_GET['magick_ad_preview_ad'])) : '';
        if (!$ad_id) {
            return;
        }

        $ad = self::get_ad_by_id($ad_id);
        if (!$ad) {
            status_header(404);
            exit;
        }

        self::$preview_ad_id = $ad_id;
        self::$preview_ad = $ad;
        $preview_force = isset($_GET['magick_ad_preview_force'])
            ? sanitize_text_field(wp_unslash($_GET['magick_ad_preview_force']))
            : '';
        self::$preview_force = $preview_force === '1';
        self::$preview_evaluation = self::evaluate_ad($ad);
        $mode = isset($_GET['magick_ad_preview_mode'])
            ? sanitize_text_field(wp_unslash($_GET['magick_ad_preview_mode']))
            : 'shell';
        self::$preview_mode = $mode === 'page' ? 'page' : 'shell';

        if (self::$preview_mode === 'page') {
            add_action('wp_enqueue_scripts', array(__CLASS__, 'enqueue_preview_assets'));
            return;
        }

        $preview_content = '<h1>Magick AD 预览页面</h1>'
            . '<p>这是用于预览广告投放效果的真实页面环境。</p>'
            . '<p>你可以在此观察广告的展示位置、容器样式与动画表现。</p>'
            . '<p>切换左上角设备后，预览区域会同步改变视口尺寸。</p>'
            . '<p>若规则未命中，将不会展示广告，并在顶部调试条提示原因。</p>'
            . '<p>下面是示例内容段落，用于模拟文章阅读场景。</p>'
            . '<p>继续向下滚动，查看评论区、评论框等插入位置。</p>';
        $preview_content = apply_filters('the_content', $preview_content);

        show_admin_bar(false);
        nocache_headers();
        status_header(200);

        wp_enqueue_script(
            'magick-ad-preview',
            MAGICK_AD_URL . 'assets/magick-ad-preview.js',
            array(),
            MAGICK_AD_VERSION,
            true
        );

        do_action('wp_enqueue_scripts');

        $ad_name = isset($ad['name']) ? $ad['name'] : '未命名广告';
        $allowed = self::$preview_evaluation['allowed'];
        $reason_text = self::format_preview_reasons(self::$preview_evaluation['reasons']);
        $status_label = $allowed ? '命中' : '未命中';
        $context = array(
            'page' => array(
                'is_home' => is_home(),
                'is_front_page' => is_front_page(),
                'is_single' => is_singular('post'),
                'is_page' => is_page(),
                'is_archive' => is_archive(),
                'is_category' => is_category(),
                'is_tag' => is_tag(),
                'is_search' => is_search(),
                'is_404' => is_404(),
                'is_author' => is_author(),
            ),
            'user' => array(
                'logged_in' => is_user_logged_in(),
            ),
            'device' => array(
                'is_mobile' => wp_is_mobile(),
                'is_tablet' => self::is_tablet_device(),
            ),
        );

        wp_localize_script(
            'magick-ad-preview',
            'MagickADPreview',
            array(
                'context' => $context,
                'ad' => $ad,
                'device' => isset($_GET['magick_ad_preview_device']) ? sanitize_text_field(wp_unslash($_GET['magick_ad_preview_device'])) : '',
            )
        );

        echo '<!doctype html>';
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Core provides safe attributes.
        echo '<html ' . get_language_attributes() . '>';
        echo '<head>';
        echo '<meta charset="' . esc_attr(get_bloginfo('charset')) . '">';
        echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
        wp_head();
        echo '<style>
            body.magick-ad-preview-body{margin:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;}
            .magick-ad-preview-shell{max-width:960px;margin:32px auto;padding:0 20px;}
            .magick-ad-preview-debug{position:sticky;top:0;z-index:9999;padding:12px 20px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;gap:16px;align-items:center;font-size:14px;}
            .magick-ad-preview-debug.is-hit{border-left:4px solid #16a34a;}
            .magick-ad-preview-debug.is-miss{border-left:4px solid #dc2626;}
            .magick-ad-preview-debug__title{font-weight:600;color:#111827;}
            .magick-ad-preview-debug__status{font-weight:600;color:#111827;}
            .magick-ad-preview-debug__reason{color:#6b7280;font-size:12px;}
            .magick-ad-preview-zone{margin:16px 0;min-height:8px;}
            .magick-ad-preview-zone--label{font-size:12px;color:#6b7280;margin-bottom:4px;}
            .magick-ad-preview-comments{margin-top:32px;padding:16px;border-radius:12px;background:#fff;box-shadow:0 10px 20px rgba(0,0,0,0.06);}
            .magick-ad-preview-comment-form{margin-top:24px;padding:16px;border-radius:12px;background:#fff;box-shadow:0 10px 20px rgba(0,0,0,0.06);}
            .magick-ad-preview-comment-form textarea{width:100%;min-height:120px;border:1px solid #d1d5db;border-radius:8px;padding:8px;}
        </style>';
        echo '</head>';
        $body_classes = implode(' ', get_body_class('magick-ad-preview-body'));
        echo '<body class="' . esc_attr($body_classes) . '">';
        do_action('wp_body_open');
        echo '<div class="magick-ad-preview-debug ' . ($allowed ? 'is-hit' : 'is-miss') . '">';
        echo '<div class="magick-ad-preview-debug__title">' . esc_html($ad_name) . '</div>';
        echo '<div class="magick-ad-preview-debug__status">' . esc_html($status_label) . '</div>';
        if (!$allowed && $reason_text) {
            echo '<div class="magick-ad-preview-debug__reason">原因：' . esc_html($reason_text) . '</div>';
        }
        echo '</div>';
        echo '<main class="magick-ad-preview-shell">';
        echo '<div class="magick-ad-preview-zone" data-magick-zone="head"><div class="magick-ad-preview-zone--label">Head 区域（仅脚本/像素）</div></div>';
        echo '<div class="magick-ad-preview-zone" data-magick-zone="body_top"></div>';
        echo '<article class="entry-content" id="magick-ad-preview-content">';
        echo '<div class="magick-ad-preview-zone" data-magick-zone="content_before"></div>';
        echo $preview_content;
        echo '<p data-magick-paragraph="1">示例段落 1：Lorem ipsum dolor sit amet, consectetur adipiscing elit。</p>';
        echo '<p data-magick-paragraph="2">示例段落 2：Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua。</p>';
        echo '<p data-magick-paragraph="3">示例段落 3：Ut enim ad minim veniam, quis nostrud exercitation ullamco。</p>';
        echo '<p data-magick-paragraph="4">示例段落 4：Duis aute irure dolor in reprehenderit in voluptate velit esse。</p>';
        echo '<div class="magick-ad-preview-zone" data-magick-zone="content_after"></div>';
        echo '</article>';
        echo '<div class="magick-ad-preview-zone" data-magick-zone="comments_top"></div>';
        echo '<section class="magick-ad-preview-comments">';
        echo '<h3>评论区</h3>';
        echo '<p>这里是评论内容示例。</p>';
        echo '</section>';
        echo '<div class="magick-ad-preview-zone" data-magick-zone="comments_bottom"></div>';
        echo '<form class="magick-ad-preview-comment-form">';
        echo '<div class="magick-ad-preview-zone" data-magick-zone="comment_form_before"></div>';
        echo '<label>发表评论</label>';
        echo '<textarea placeholder="输入评论内容..."></textarea>';
        echo '<div class="magick-ad-preview-zone" data-magick-zone="comment_form_after"></div>';
        echo '</form>';
        echo '<div class="magick-ad-preview-zone" data-magick-zone="footer"></div>';
        echo '</main>';
        wp_footer();
        echo '</body></html>';
        exit;
    }

    public static function enqueue_preview_assets(): void {
        if (!self::is_preview() || self::$preview_mode !== 'page') {
            return;
        }

        wp_enqueue_script(
            'magick-ad-preview',
            MAGICK_AD_URL . 'assets/magick-ad-preview.js',
            array(),
            MAGICK_AD_VERSION,
            true
        );

        $context = array(
            'page' => array(
                'is_home' => is_home(),
                'is_front_page' => is_front_page(),
                'is_single' => is_singular('post'),
                'is_page' => is_page(),
                'is_archive' => is_archive(),
                'is_category' => is_category(),
                'is_tag' => is_tag(),
                'is_search' => is_search(),
                'is_404' => is_404(),
                'is_author' => is_author(),
            ),
            'user' => array(
                'logged_in' => is_user_logged_in(),
            ),
            'device' => array(
                'is_mobile' => wp_is_mobile(),
                'is_tablet' => self::is_tablet_device(),
            ),
        );

        wp_localize_script(
            'magick-ad-preview',
            'MagickADPreview',
            array(
                'context' => $context,
                'ad' => self::$preview_ad,
                'device' => isset($_GET['magick_ad_preview_device'])
                    ? sanitize_text_field(wp_unslash($_GET['magick_ad_preview_device']))
                    : '',
            )
        );
    }

    private static function matches_display_mode($ad, $options) {
        $mode = isset($options['display_mode']) ? $options['display_mode'] : 'show';
        if ($mode === 'hide') {
            return false;
        }
        if ($mode === 'random') {
            $ad_id = isset($ad['id']) ? $ad['id'] : '';
            $strategy = isset($options['random_strategy']) ? $options['random_strategy'] : 'request';
            if ($strategy === 'cookie' && !self::has_consent()) {
                $strategy = 'request';
            }
            if ($strategy === 'session') {
                return true;
            }
            return self::random_display($ad_id, $strategy);
        }
        return true;
    }

    private static function has_consent(): bool {
        return (bool) apply_filters('magick_ad_has_consent', false);
    }

    private static function maybe_init_random_cookie(): void {
        if (is_admin() || is_user_logged_in()) {
            return;
        }
        if (!self::has_consent()) {
            return;
        }
        if (isset($_COOKIE['magick_ad_uid']) && is_string($_COOKIE['magick_ad_uid'])) {
            return;
        }
        if (headers_sent()) {
            return;
        }

        $settings = Settings::get_runtime_settings();
        $needs_cookie = !empty($settings['needs_random_cookie']);
        if (!$needs_cookie) {
            return;
        }

        $uid = wp_generate_uuid4();
        $expires = time() + MONTH_IN_SECONDS;
        $secure = is_ssl();
        setcookie(
            name: 'magick_ad_uid',
            value: $uid,
            options: array(
                'expires' => $expires,
                'path' => COOKIEPATH ?: '/',
                'domain' => COOKIE_DOMAIN ?: '',
                'secure' => $secure,
                'httponly' => true,
                'samesite' => 'Lax',
            )
        );
        $_COOKIE['magick_ad_uid'] = $uid;
    }

    private static function random_display($ad_id, $strategy = 'request') {
        static $cache = array();
        $time_bucket = (int) floor(current_time('timestamp') / 300);
        $key = ($ad_id ? $ad_id : uniqid('ad_', true)) . '|' . $strategy . '|' . $time_bucket;
        if (isset($cache[$key])) {
            return $cache[$key];
        }

        if ($strategy === 'request') {
            $result = (wp_rand(0, 1) === 1);
            $cache[$key] = $result;
            return $result;
        }

        $seed = '';
        $user_id = get_current_user_id();
        if ($user_id) {
            $seed = 'user:' . $user_id;
        } else {
            if ($strategy === 'cookie') {
                if (isset($_COOKIE['magick_ad_uid']) && is_string($_COOKIE['magick_ad_uid'])) {
                    $seed = 'cookie:' . sanitize_text_field(wp_unslash($_COOKIE['magick_ad_uid']));
                } else {
                    $strategy = 'request';
                }
            }
        }

        if ($seed === '') {
            $seed = 'request:' . wp_rand(0, 1000000);
        }

        $hash = md5($seed . '|' . $key);
        $result = (hexdec(substr($hash, 0, 2)) % 2) === 1;
        $cache[$key] = $result;

        return $result;
    }

    private static function is_before_start($options) {
        $start_date = isset($options['start_date']) ? $options['start_date'] : '';
        if (!$start_date) {
            return false;
        }
        $timestamp = strtotime($start_date);
        if ($timestamp === false) {
            return false;
        }
        return current_time('timestamp') < $timestamp;
    }

    private static function is_expired($options) {
        $end_date = isset($options['end_date']) ? $options['end_date'] : '';
        if (!$end_date) {
            return false;
        }
        $has_time = is_string($end_date) && preg_match('/\\d{2}:\\d{2}/', $end_date);
        $timestamp = strtotime($has_time ? $end_date : ($end_date . ' 23:59:59'));
        if ($timestamp === false) {
            return false;
        }
        return current_time('timestamp') > $timestamp;
    }

    private static function matches_show_page($options) {
        $page = isset($options['show_page']) ? $options['show_page'] : 'all';

        if ($page === 'posts') {
            return is_singular('post');
        }
        if ($page === 'pages') {
            return is_page();
        }
        if ($page === 'home') {
            return is_home() || is_front_page();
        }
        if ($page === 'archive') {
            return is_archive();
        }
        if ($page === 'category') {
            return is_category();
        }
        if ($page === 'tag') {
            return is_tag();
        }
        if ($page === 'search') {
            return is_search();
        }
        if ($page === '404') {
            return is_404();
        }
        if ($page === 'author') {
            return is_author();
        }

        return true;
    }

    private static function matches_targeting($options) {
        $type = isset($options['target_type']) ? $options['target_type'] : '';
        $ids = isset($options['target_ids']) && is_array($options['target_ids'])
            ? array_map('absint', $options['target_ids'])
            : array();
        $ids = array_filter($ids);
        if (!$type || empty($ids)) {
            return false;
        }

        if ($type === 'posts') {
            return is_singular('post') && in_array(get_queried_object_id(), $ids, true);
        }
        if ($type === 'pages') {
            return is_page() && in_array(get_queried_object_id(), $ids, true);
        }
        if ($type === 'category') {
            return is_category() && in_array(get_queried_object_id(), $ids, true);
        }
        if ($type === 'tag') {
            return is_tag() && in_array(get_queried_object_id(), $ids, true);
        }
        if ($type === 'author') {
            return is_author() && in_array(get_queried_object_id(), $ids, true);
        }

        return false;
    }

    private static function matches_device($options) {
        $device = isset($options['device']) ? $options['device'] : 'all';
        $override = self::get_debug_device_override();
        if ($override) {
            if ($device === 'all') {
                return true;
            }
            return $device === $override;
        }
        if ($device === 'mobile') {
            return wp_is_mobile() && !self::is_tablet_device();
        }
        if ($device === 'tablet') {
            return self::is_tablet_device();
        }
        if ($device === 'desktop') {
            return !wp_is_mobile();
        }

        return true;
    }

    private static function is_tablet_device() {
        if (!wp_is_mobile()) {
            return false;
        }
        if (!isset($_SERVER['HTTP_USER_AGENT'])) {
            return false;
        }
        $ua = strtolower(sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT'])));
        return (bool) preg_match('/ipad|tablet|kindle|silk|playbook|nexus 7|nexus 9|nexus 10|sm-t|lenovo tab|xiaomi pad/', $ua);
    }

    private static function matches_login($options) {
        $login = isset($options['login']) ? $options['login'] : 'all';
        $override = self::get_debug_login_override();
        if ($override) {
            if ($login === 'all') {
                return true;
            }
            return $login === $override;
        }
        if ($login === 'logged-in') {
            return is_user_logged_in();
        }
        if ($login === 'logged-out') {
            return !is_user_logged_in();
        }

        return true;
    }

    private static function insert_after_paragraphs($content, $insert_map) {
        if (function_exists('parse_blocks') && function_exists('render_block')) {
            $blocks = parse_blocks($content);
            if (!empty($blocks)) {
                $output = '';
                $paragraph_index = 0;
                foreach ($blocks as $block) {
                    $output .= render_block($block);
                    if (isset($block['blockName']) && $block['blockName'] === 'core/paragraph') {
                        $paragraph_index += 1;
                        if (isset($insert_map[$paragraph_index])) {
                            $output .= implode('', $insert_map[$paragraph_index]);
                        }
                    }
                }
                if (!empty($insert_map['fallback'])) {
                    $output .= implode('', $insert_map['fallback']);
                }
                return $output;
            }
        }

        if (strpos($content, '</p>') === false) {
            $extra = '';
            foreach ($insert_map as $items) {
                $extra .= implode('', $items);
            }
            return $content . $extra;
        }

        $parts = explode('</p>', $content);
        $output = '';
        $total = count($parts);

        foreach ($parts as $index => $part) {
            if ($part === '' && $index === $total - 1) {
                continue;
            }

            $output .= $part . '</p>';

            $paragraph_index = $index + 1;
            if (isset($insert_map[$paragraph_index])) {
                $output .= implode('', $insert_map[$paragraph_index]);
            }
        }

        return $output;
    }

    public static function build_ad_markup($ad, $position) {
        $ad = is_array($ad) ? self::maybe_hydrate_ad($ad) : array();
        $content = self::normalize_content($ad);
        $options = self::normalize_options($ad);
        $content_type = self::resolve_content_type($options);
        $container_type = self::resolve_container_type($options);

        $content = self::apply_content_variant($content, $content_type, $options, $ad);
        $body = self::build_body_by_type($content_type, $content, $options, $ad);
        if ($body === '') {
            return '';
        }
        if ($content_type !== 'html') {
            $body = self::append_custom_markup($body, $content);
        }
        $body = self::wrap_container_markup($body, $content);
        $body = self::wrap_modal_container($body, $container_type);

        $data_attrs = self::build_data_attributes($ad, $options, $content, $position, $container_type);
        $data_attrs .= ' data-wp-interactive="magick-ad"';
        $unit_class = self::build_unit_class($ad, $options, $position, $container_type);
        $inner_style = self::build_inner_style($content, $content_type);

        return '<div class="' . esc_attr($unit_class) . '"' . $data_attrs . '><div class="magick-ad-unit__inner"' . $inner_style . '>' . $body . '</div></div>';
    }

    private static function normalize_content(array $ad): array {
        $content = isset($ad['content']) && is_array($ad['content']) ? $ad['content'] : array();
        if (!isset($content['container_style']) || !is_array($content['container_style'])) {
            $content['container_style'] = array();
        }
        if (!isset($content['behavior']) || !is_array($content['behavior'])) {
            $content['behavior'] = array();
        }
        if (!isset($content['image_settings']) || !is_array($content['image_settings'])) {
            $content['image_settings'] = array();
        }
        return $content;
    }

    private static function apply_content_variant(array $content, string $content_type, array $options, array $ad): array {
        if (empty($content['variants_enabled'])) {
            return $content;
        }
        $variants = isset($content['variants']) && is_array($content['variants'])
            ? $content['variants']
            : array();
        if (empty($variants)) {
            return $content;
        }

        $candidates = array();
        foreach ($variants as $variant) {
            if (!is_array($variant)) {
                continue;
            }
            $weight = isset($variant['weight']) ? absint($variant['weight']) : 1;
            if ($weight < 1) {
                continue;
            }
            $variant_content = isset($variant['content']) && is_array($variant['content'])
                ? $variant['content']
                : array();
            $candidates[] = array(
                'id' => isset($variant['id']) ? (string) $variant['id'] : '',
                'weight' => $weight,
                'content' => $variant_content,
            );
        }

        if (empty($candidates)) {
            return $content;
        }

        $strategy = isset($content['variants_strategy']) && $content['variants_strategy'] === 'session'
            ? 'session'
            : 'request';
        $picked = $strategy === 'session'
            ? self::pick_session_variant($candidates, $ad)
            : self::pick_weighted_variant($candidates);
        if ($picked === null) {
            return $content;
        }

        $keys = match ($content_type) {
            'html' => array('html'),
            'block' => array('blocks'),
            'video' => array('video_url'),
            'image' => array('image', 'link', 'link_target'),
            default => array(),
        };
        if (!empty($keys)) {
            foreach ($keys as $key) {
                if (!array_key_exists($key, $picked['content'])) {
                    continue;
                }
                $value = $picked['content'][$key];
                if ($key === 'link') {
                    $content[$key] = (string) $value;
                    continue;
                }
                if ($key === 'link_target') {
                    $content[$key] = (bool) $value;
                    continue;
                }
                if ($key === 'image') {
                    if (is_array($value)) {
                        $content[$key] = $value;
                    }
                    continue;
                }
                if ($value !== '') {
                    $content[$key] = $value;
                }
            }
        }
        if (!empty($picked['id'])) {
            $content['_variant_id'] = $picked['id'];
        }

        return $content;
    }

    private static function pick_weighted_variant(array $variants): ?array {
        $total = 0;
        foreach ($variants as $variant) {
            $total += isset($variant['weight']) ? absint($variant['weight']) : 0;
        }
        if ($total < 1) {
            return null;
        }
        $target = wp_rand(1, $total);
        $running = 0;
        foreach ($variants as $variant) {
            $running += isset($variant['weight']) ? absint($variant['weight']) : 0;
            if ($running >= $target) {
                return $variant;
            }
        }
        return $variants[0] ?? null;
    }

    private static function pick_session_variant(array $variants, array $ad): ?array {
        $ad_id = isset($ad['id']) ? (string) $ad['id'] : '';
        if ($ad_id === '') {
            return self::pick_weighted_variant($variants);
        }
        $cookie_key = self::build_variant_cookie_key($ad_id);
        $cookie_value = isset($_COOKIE[$cookie_key]) ? sanitize_text_field(wp_unslash($_COOKIE[$cookie_key])) : '';
        if ($cookie_value !== '') {
            foreach ($variants as $variant) {
                if (!empty($variant['id']) && (string) $variant['id'] === $cookie_value) {
                    return $variant;
                }
            }
        }

        $picked = self::pick_weighted_variant($variants);
        if ($picked !== null && !empty($picked['id'])) {
            self::set_variant_cookie($cookie_key, (string) $picked['id']);
        }
        return $picked;
    }

    private static function build_variant_cookie_key(string $ad_id): string {
        $safe = preg_replace('/[^a-zA-Z0-9_]/', '_', $ad_id);
        if (!is_string($safe) || $safe === '') {
            $safe = 'unknown';
        }
        return 'magick_ad_variant_' . $safe;
    }

    private static function set_variant_cookie(string $key, string $value): void {
        if ($key === '' || $value === '') {
            return;
        }
        if (!self::can_set_variant_cookie()) {
            return;
        }
        if (headers_sent()) {
            return;
        }
        $path = defined('COOKIEPATH') && COOKIEPATH ? COOKIEPATH : '/';
        $domain = defined('COOKIE_DOMAIN') ? COOKIE_DOMAIN : '';
        setcookie($key, $value, 0, $path, $domain, is_ssl(), false);
        $_COOKIE[$key] = $value;
    }

    private static function can_set_variant_cookie(): bool {
        $requires = (get_option('magick_ad_tracking_require_consent', '0') === '1');
        $requires = (bool) apply_filters('magick_ad_variant_requires_consent', $requires);
        if (!$requires) {
            return true;
        }
        return (bool) apply_filters('magick_ad_has_consent', false);
    }

    private static function maybe_hydrate_ad(array $ad): array {
        if (empty($ad['_content_lazy'])) {
            return $ad;
        }

        $ad_id = isset($ad['id']) ? (string) $ad['id'] : '';
        if ($ad_id !== '' && isset(self::$hydrated_ads[$ad_id])) {
            return self::merge_hydrated_ad(self::$hydrated_ads[$ad_id], $ad);
        }

        $post_id = isset($ad['post_id']) ? absint($ad['post_id']) : 0;
        if ($post_id < 1) {
            return $ad;
        }

        $full = Ads::get_ad_by_post_id($post_id);
        if (!is_array($full) || empty($full)) {
            return $ad;
        }

        $full = self::merge_hydrated_ad($full, $ad);
        if ($ad_id !== '') {
            self::$hydrated_ads[$ad_id] = $full;
        }

        return $full;
    }

    private static function merge_hydrated_ad(array $full, array $runtime): array {
        $runtime_options = isset($runtime['options']) && is_array($runtime['options']) ? $runtime['options'] : array();
        if (!isset($full['options']) || !is_array($full['options'])) {
            $full['options'] = array();
        }
        if (!empty($runtime_options)) {
            $full['options'] = array_merge($full['options'], $runtime_options);
        }

        foreach ($runtime as $key => $value) {
            if (is_string($key) && str_starts_with($key, '_')) {
                $full[$key] = $value;
            }
        }

        if (isset($full['_content_lazy'])) {
            unset($full['_content_lazy']);
        }

        return $full;
    }

    private static function normalize_options(array $ad): array {
        return isset($ad['options']) && is_array($ad['options']) ? $ad['options'] : array();
    }

    private static function resolve_content_type(array $options): string {
        $type = $options['creative_type'] ?? $options['content_type'] ?? 'image';
        return match ($type) {
            'block', 'html', 'image', 'video' => $type,
            default => 'image',
        };
    }

    private static function resolve_container_type(array $options): string {
        $type = $options['container_type'] ?? 'inline';
        return match ($type) {
            'inline', 'popup', 'banner', 'floating', 'interstitial' => $type,
            default => 'inline',
        };
    }

    private static function build_body_by_type(string $content_type, array $content, array $options, array $ad): string {
        return match ($content_type) {
            'block' => self::build_block_body($content),
            'html' => self::build_html_body($content, $options, $ad),
            'image' => self::build_image_body($content, $options),
            'video' => self::build_video_body($content),
            default => '',
        };
    }

    private static function build_block_body(array $content): string {
        $blocks = isset($content['blocks']) ? (string) $content['blocks'] : '';
        if ($blocks === '') {
            return '';
        }
        $output = do_blocks($blocks);
        $block_settings = isset($content['block_settings']) && is_array($content['block_settings'])
            ? $content['block_settings']
            : array();
        $styles = array();
        $background = isset($block_settings['background']) ? (string) $block_settings['background'] : '';
        $background = self::sanitize_css_inline_value($background);
        $background_gradient = isset($block_settings['background_gradient']) ? (string) $block_settings['background_gradient'] : '';
        $background_gradient = self::sanitize_css_gradient($background_gradient);
        if ($background_gradient !== '') {
            $styles[] = 'background-image:' . esc_attr($background_gradient);
        } elseif ($background !== '' && $background !== 'transparent') {
            $styles[] = 'background:' . esc_attr($background);
        }
        $text_color = isset($block_settings['text_color']) ? (string) $block_settings['text_color'] : '';
        $text_color = self::sanitize_css_inline_value($text_color);
        if ($text_color !== '' && $text_color !== 'transparent') {
            $styles[] = 'color:' . esc_attr($text_color);
        }
        $padding = isset($block_settings['padding']) ? absint($block_settings['padding']) : 0;
        if ($padding > 0) {
            $styles[] = 'padding:' . $padding . 'px';
        }
        $radius = isset($block_settings['radius']) ? absint($block_settings['radius']) : 0;
        if ($radius > 0) {
            $styles[] = 'border-radius:' . $radius . 'px';
        }
        $border_width = isset($block_settings['border_width']) ? absint($block_settings['border_width']) : 0;
        $border_color = isset($block_settings['border_color']) ? (string) $block_settings['border_color'] : '';
        $border_color = self::sanitize_css_inline_value($border_color);
        if ($border_width > 0) {
            $color = $border_color !== '' ? esc_attr($border_color) : '#d0d7e2';
            $styles[] = 'border:' . $border_width . 'px solid ' . $color;
        }
        $shadow = isset($block_settings['shadow']) ? (string) $block_settings['shadow'] : 'none';
        if ($shadow === 'soft') {
            $styles[] = 'box-shadow:0 18px 40px rgba(15, 23, 42, 0.12)';
        } elseif ($shadow === 'float') {
            $styles[] = 'box-shadow:0 30px 60px rgba(15, 23, 42, 0.18)';
        }
        $max_width = isset($block_settings['max_width']) ? absint($block_settings['max_width']) : 0;
        if ($max_width > 0) {
            $styles[] = 'max-width:' . $max_width . 'px';
        }
        $font_size = isset($block_settings['font_size']) ? absint($block_settings['font_size']) : 0;
        if ($font_size > 0) {
            $styles[] = 'font-size:' . $font_size . 'px';
        }
        $font_family = isset($block_settings['font_family']) ? (string) $block_settings['font_family'] : '';
        $font_family = self::sanitize_css_font_family($font_family);
        if ($font_family !== '') {
            $styles[] = 'font-family:' . esc_attr($font_family);
        }
        $background_image = isset($block_settings['background_image']['url'])
            ? (string) $block_settings['background_image']['url']
            : '';
        if ($background_image !== '') {
            $styles[] = 'background-image:url(' . esc_url($background_image) . ')';
            $styles[] = 'background-size:cover';
            $styles[] = 'background-position:center';
        }
        $align = isset($block_settings['align']) ? (string) $block_settings['align'] : '';
        if ($align === 'center' || $max_width > 0) {
            $styles[] = 'margin-left:auto';
            $styles[] = 'margin-right:auto';
        }
        $style_attr = !empty($styles) ? ' style="' . esc_attr(implode(';', $styles)) . '"' : '';

        $layout = isset($block_settings['layout']) ? (string) $block_settings['layout'] : 'content';
        $media = isset($block_settings['media_image']) && is_array($block_settings['media_image'])
            ? $block_settings['media_image']
            : array();
        $media_markup = '';
        $media_id = isset($media['id']) ? absint($media['id']) : 0;
        $media_url = isset($media['url']) ? (string) $media['url'] : '';
        $media_alt = isset($media['alt']) ? (string) $media['alt'] : '';
        if ($media_id > 0) {
            $media_markup = wp_get_attachment_image(
                $media_id,
                'full',
                false,
                array(
                    'class' => 'magick-ad-block__media-img',
                    'loading' => 'lazy',
                    'decoding' => 'async',
                    'alt' => $media_alt,
                )
            );
        } elseif ($media_url !== '') {
            $media_markup = '<img class="magick-ad-block__media-img" src="' . esc_url($media_url) . '" alt="' . esc_attr($media_alt) . '" loading="lazy" decoding="async" />';
        }
        if ($media_markup !== '') {
            $media_markup = '<div class="magick-ad-block__media">' . $media_markup . '</div>';
        }

        $heading = isset($block_settings['heading']) ? (string) $block_settings['heading'] : '';
        $subheading = isset($block_settings['subheading']) ? (string) $block_settings['subheading'] : '';
        $heading_style = array();
        $heading_size = isset($block_settings['heading_size']) ? absint($block_settings['heading_size']) : 0;
        if ($heading_size > 0) {
            $heading_style[] = 'font-size:' . $heading_size . 'px';
        }
        $heading_line = isset($block_settings['heading_line_height']) ? (float) $block_settings['heading_line_height'] : 0;
        if ($heading_line > 0) {
            $heading_style[] = 'line-height:' . $heading_line;
        }
        $heading_weight = isset($block_settings['heading_weight']) ? (string) $block_settings['heading_weight'] : '';
        $heading_weight = self::sanitize_css_font_weight($heading_weight);
        if ($heading_weight !== '') {
            $heading_style[] = 'font-weight:' . esc_attr($heading_weight);
        }
        $subheading_style = array();
        $subheading_size = isset($block_settings['subheading_size']) ? absint($block_settings['subheading_size']) : 0;
        if ($subheading_size > 0) {
            $subheading_style[] = 'font-size:' . $subheading_size . 'px';
        }
        $subheading_line = isset($block_settings['subheading_line_height']) ? (float) $block_settings['subheading_line_height'] : 0;
        if ($subheading_line > 0) {
            $subheading_style[] = 'line-height:' . $subheading_line;
        }
        $subheading_weight = isset($block_settings['subheading_weight']) ? (string) $block_settings['subheading_weight'] : '';
        $subheading_weight = self::sanitize_css_font_weight($subheading_weight);
        if ($subheading_weight !== '') {
            $subheading_style[] = 'font-weight:' . esc_attr($subheading_weight);
        }
        $heading_markup = $heading !== ''
            ? '<div class="magick-ad-block__heading"' . (!empty($heading_style) ? ' style="' . esc_attr(implode(';', $heading_style)) . '"' : '') . '>' . esc_html($heading) . '</div>'
            : '';
        $subheading_markup = $subheading !== ''
            ? '<div class="magick-ad-block__subheading"' . (!empty($subheading_style) ? ' style="' . esc_attr(implode(';', $subheading_style)) . '"' : '') . '>' . esc_html($subheading) . '</div>'
            : '';

        $cta_text = isset($block_settings['cta_text']) ? (string) $block_settings['cta_text'] : '';
        $cta_link = isset($block_settings['cta_link']) ? (string) $block_settings['cta_link'] : '';
        $cta_target = !empty($block_settings['cta_target']);
        $cta_text_color = isset($block_settings['cta_text_color']) ? (string) $block_settings['cta_text_color'] : '';
        $cta_text_color = self::sanitize_css_inline_value($cta_text_color);
        $cta_background = isset($block_settings['cta_background']) ? (string) $block_settings['cta_background'] : '';
        $cta_background = self::sanitize_css_inline_value($cta_background);
        $cta_radius = isset($block_settings['cta_radius']) ? absint($block_settings['cta_radius']) : 0;
        $cta_style = array();
        if ($cta_text_color !== '' && $cta_text_color !== 'transparent') {
            $cta_style[] = 'color:' . esc_attr($cta_text_color);
        }
        if ($cta_background !== '' && $cta_background !== 'transparent') {
            $cta_style[] = 'background:' . esc_attr($cta_background);
        }
        if ($cta_radius > 0) {
            $cta_style[] = 'border-radius:' . $cta_radius . 'px';
        }
        $cta_attrs = $cta_target ? ' target="_blank" rel="noopener noreferrer"' : '';
        $cta_markup = ($cta_text !== '' && $cta_link !== '')
            ? '<a class="magick-ad-block__cta" href="' . esc_url($cta_link) . '"' . $cta_attrs . (!empty($cta_style) ? ' style="' . esc_attr(implode(';', $cta_style)) . '"' : '') . '>' . esc_html($cta_text) . '</a>'
            : '';

        $content_markup = '<div class="magick-ad-block__content">' . $heading_markup . $subheading_markup . $output . $cta_markup . '</div>';

        $layout_class = 'magick-ad-block magick-ad-block--content';
        $inner = $content_markup;
        if ($layout === 'stack' && $media_markup !== '') {
            $layout_class = 'magick-ad-block magick-ad-block--stack';
            $inner = $media_markup . $content_markup;
        } elseif ($layout === 'split' && $media_markup !== '') {
            $layout_class = 'magick-ad-block magick-ad-block--split';
            $inner = $media_markup . $content_markup;
        } elseif ($layout === 'split-reverse' && $media_markup !== '') {
            $layout_class = 'magick-ad-block magick-ad-block--split magick-ad-block--reverse';
            $inner = $content_markup . $media_markup;
        }

        return '<div class="magick-ad-block-content"' . $style_attr . '><div class="' . esc_attr($layout_class) . '">' . $inner . '</div></div>';
    }

    private static function sanitize_css_inline_value(string $value): string {
        $value = trim(wp_strip_all_tags($value));
        if ($value === '') {
            return '';
        }
        $value = preg_replace('/\\s+/', ' ', $value);
        $value = preg_replace('/[;{}<>]/', '', $value);
        $value = preg_replace('/[\\r\\n\\t]/', ' ', $value);
        $value = trim($value);

        return $value;
    }

    private static function sanitize_css_gradient(string $value): string {
        $value = trim(wp_strip_all_tags($value));
        if ($value === '') {
            return '';
        }
        if (preg_match('/[;{}<>\\r\\n]/', $value)) {
            return '';
        }
        if (!preg_match('/^(linear-gradient|radial-gradient)\\((.+)\\)$/i', $value)) {
            return '';
        }

        return $value;
    }

    private static function sanitize_css_font_family(string $value): string {
        $value = trim(wp_strip_all_tags($value));
        if ($value === '') {
            return '';
        }
        if (!preg_match('/^[a-zA-Z0-9\\s,"\'\\-]+$/', $value)) {
            return '';
        }

        return $value;
    }

    private static function sanitize_css_font_weight(string $value): string {
        $value = strtolower(trim(wp_strip_all_tags($value)));
        if ($value === '') {
            return '';
        }
        if (in_array($value, array('normal', 'bold', 'bolder', 'lighter'), true)) {
            return $value;
        }
        if (preg_match('/^[1-9]00$/', $value)) {
            return $value;
        }

        return '';
    }

    private static function build_html_body(array $content, array $options, array $ad): string {
        $html = isset($content['html']) ? (string) $content['html'] : '';
        if ($html === '') {
            return '';
        }

        $runtime_vars = !array_key_exists('html_runtime_vars', $content) ? true : !empty($content['html_runtime_vars']);
        if ($runtime_vars) {
            $tokens = self::build_runtime_tokens($ad);
            $html = self::replace_runtime_tokens($html, $tokens);
            $content['custom_html'] = self::replace_runtime_tokens((string) ($content['custom_html'] ?? ''), $tokens);
            $content['custom_css'] = self::replace_runtime_tokens((string) ($content['custom_css'] ?? ''), $tokens);
            $content['custom_js'] = self::replace_runtime_tokens((string) ($content['custom_js'] ?? ''), $tokens);
        }

        $body = self::append_custom_markup($html, $content);

        $system_allowlist = self::get_html_script_allowlist();
        $system_blocklist = self::get_html_script_blocklist();
        $allowlist = isset($content['html_script_allowlist']) && is_array($content['html_script_allowlist'])
            ? $content['html_script_allowlist']
            : array();
        $blocklist = isset($content['html_script_blocklist']) && is_array($content['html_script_blocklist'])
            ? $content['html_script_blocklist']
            : array();
        $allowlist = self::normalize_domain_list(array_merge($system_allowlist, $allowlist));
        $blocklist = self::normalize_domain_list(array_merge($system_blocklist, $blocklist));
        if (!empty($allowlist) || !empty($blocklist)) {
            $body = self::filter_html_scripts($body, $allowlist, $blocklist);
        }

        if (self::should_sandbox_html($options)) {
            $body = self::build_sandboxed_html($body, $options);
        }

        $strategy = isset($content['html_load_strategy']) ? (string) $content['html_load_strategy'] : 'immediate';
        $delay = isset($content['html_load_delay']) ? absint($content['html_load_delay']) : 0;
        if ($strategy !== 'immediate') {
            $payload = base64_encode($body);
            $attrs = ' data-ad-html="' . esc_attr($payload) . '" data-ad-html-strategy="' . esc_attr($strategy) . '"';
            if ($delay > 0) {
                $attrs .= ' data-ad-html-delay="' . esc_attr((string) $delay) . '"';
            }
            return '<div class="magick-ad-html-lazy"' . $attrs . '></div>';
        }

        return $body;
    }

    private static function should_sandbox_html(array $options): bool {
        $override = isset($options['html_sandbox']) ? (string) $options['html_sandbox'] : '';
        if ($override === 'enable') {
            return true;
        }
        if ($override === 'disable') {
            return false;
        }
        $enabled = (get_option('magick_ad_html_sandbox', '1') === '1');
        $enabled = (bool) apply_filters('magick_ad_html_sandbox_enabled', $enabled, $options);
        if (!$enabled) {
            return false;
        }
        $html_mode = isset($options['html_mode']) ? $options['html_mode'] : 'safe';
        return $html_mode === 'full';
    }

    private static function build_sandboxed_html(string $html, array $options = array()): string {
        $flags = array('allow-scripts');
        $flags = apply_filters('magick_ad_html_sandbox_flags', $flags, $options, $html);
        $flags = array_values(array_filter(array_map('strval', (array) $flags)));
        $flags = array_values(array_unique($flags));

        $legacy = (string) apply_filters('magick_ad_html_sandbox_permissions', '');
        $sandbox = $legacy !== '' ? $legacy : implode(' ', $flags);
        $referrer = (string) apply_filters('magick_ad_html_sandbox_referrerpolicy', 'no-referrer');
        $sandbox_attr = $sandbox !== '' ? ' sandbox="' . esc_attr(trim($sandbox)) . '"' : ' sandbox';
        $referrer_attr = $referrer !== '' ? ' referrerpolicy="' . esc_attr($referrer) . '"' : '';
        $srcdoc = esc_attr($html);

        return '<iframe class="magick-ad-html-sandbox"' . $sandbox_attr . $referrer_attr . ' loading="lazy" srcdoc="' . $srcdoc . '"></iframe>';
    }

    private static function build_runtime_tokens(array $ad): array {
        $ad_id = isset($ad['id']) ? (string) $ad['id'] : '';
        $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '';
        $request_uri = is_string($request_uri) ? $request_uri : '';
        if ($request_uri !== '') {
            $parts = wp_parse_url($request_uri);
            $path = isset($parts['path']) ? $parts['path'] : '';
            $query = isset($parts['query']) ? '?' . $parts['query'] : '';
            $request_uri = sanitize_text_field($path . $query);
        }
        $page_url = $request_uri !== '' ? home_url($request_uri) : home_url('/');
        return array(
            '{site_url}' => home_url('/'),
            '{page_url}' => $page_url,
            '{ad_id}' => $ad_id,
        );
    }

    private static function replace_runtime_tokens(string $value, array $tokens): string {
        if ($value === '' || empty($tokens)) {
            return $value;
        }
        return strtr($value, $tokens);
    }

    private static function filter_html_scripts(string $html, array $allowlist, array $blocklist): string {
        if ($html === '') {
            return '';
        }
        $allowlist = self::normalize_domain_list($allowlist);
        $blocklist = self::normalize_domain_list($blocklist);
        if (empty($allowlist) && empty($blocklist)) {
            return $html;
        }
        return preg_replace_callback(
            '/<script\\b([^>]*)>(.*?)<\\/script>/is',
            function ($match) use ($allowlist, $blocklist) {
                $attrs = $match[1] ?? '';
                if (!preg_match('/\\bsrc\\s*=\\s*([\\\"\\\'])(.*?)\\1/i', $attrs, $src_match)) {
                    return $match[0];
                }
                $src = $src_match[2] ?? '';
                $host = '';
                $parsed = wp_parse_url($src);
                if (is_array($parsed) && !empty($parsed['host'])) {
                    $host = strtolower($parsed['host']);
                }
                if ($host === '') {
                    return $match[0];
                }
                if (self::is_domain_blocked($host, $blocklist)) {
                    return '';
                }
                if (!empty($allowlist) && !self::is_domain_allowed($host, $allowlist)) {
                    return '';
                }
                return $match[0];
            },
            $html
        );
    }

    private static function normalize_domain_list(array $domains): array {
        $list = array();
        foreach ($domains as $domain) {
            if (!is_string($domain)) {
                continue;
            }
            $domain = trim(strtolower($domain));
            if ($domain === '') {
                continue;
            }
            $domain = preg_replace('#^https?://#', '', $domain);
            $domain = preg_replace('#/.*$#', '', $domain);
            if ($domain === '') {
                continue;
            }
            $list[] = $domain;
        }
        return array_values(array_unique($list));
    }

    private static function get_site_domain(): string {
        $host = wp_parse_url(home_url(), PHP_URL_HOST);
        if (!is_string($host) || $host === '') {
            $host = wp_parse_url(site_url(), PHP_URL_HOST);
        }
        return is_string($host) ? strtolower($host) : '';
    }

    private static function get_html_script_allowlist(): array {
        $raw = get_option('magick_ad_html_script_allowlist', null);
        $value = is_array($raw) ? $raw : array();
        $list = self::normalize_domain_list($value);
        if (($raw === null || $raw === false) && empty($list)) {
            $site_domain = self::get_site_domain();
            if ($site_domain !== '') {
                $list[] = $site_domain;
            }
        }
        return $list;
    }

    private static function get_html_script_blocklist(): array {
        $value = get_option('magick_ad_html_script_blocklist', array());
        $value = is_array($value) ? $value : array();
        return self::normalize_domain_list($value);
    }

    private static function is_domain_allowed(string $host, array $allowlist): bool {
        foreach ($allowlist as $entry) {
            if (self::domain_matches($host, $entry)) {
                return true;
            }
        }
        return false;
    }

    private static function is_domain_blocked(string $host, array $blocklist): bool {
        foreach ($blocklist as $entry) {
            if (self::domain_matches($host, $entry)) {
                return true;
            }
        }
        return false;
    }

    private static function domain_matches(string $host, string $pattern): bool {
        if ($pattern === '') {
            return false;
        }
        if (str_starts_with($pattern, '*.')) {
            $suffix = substr($pattern, 1);
            return str_ends_with($host, $suffix);
        }
        return $host === $pattern;
    }

    private static function build_image_body(array $content, array $options = array()): string {
        $image = isset($content['image']) ? $content['image'] : array();
        $image_id = isset($image['id']) ? absint($image['id']) : 0;
        $image_url = isset($image['url']) ? (string) $image['url'] : '';
        if ($image_id < 1 && $image_url === '') {
            return '';
        }
        $image_settings = isset($content['image_settings']) ? $content['image_settings'] : array();
        $styles = array();
        $radius = isset($image_settings['radius']) ? absint($image_settings['radius']) : 0;
        $max_width = isset($image_settings['max_width']) ? absint($image_settings['max_width']) : 0;
        $margin_top = isset($image_settings['margin_top']) ? absint($image_settings['margin_top']) : 0;
        $margin_bottom = isset($image_settings['margin_bottom']) ? absint($image_settings['margin_bottom']) : 0;
        $margin_left = isset($image_settings['margin_left']) ? absint($image_settings['margin_left']) : 0;
        $margin_right = isset($image_settings['margin_right']) ? absint($image_settings['margin_right']) : 0;

        if ($radius) {
            $styles[] = 'border-radius:' . $radius . 'px';
        }
        if ($max_width) {
            $styles[] = 'max-width:' . $max_width . 'px';
            $styles[] = 'width:100%';
        }
        if ($margin_top) {
            $styles[] = 'margin-top:' . $margin_top . 'px';
        }
        if ($margin_bottom) {
            $styles[] = 'margin-bottom:' . $margin_bottom . 'px';
        }
        if ($margin_left) {
            $styles[] = 'margin-left:' . $margin_left . 'px';
        }
        if ($margin_right) {
            $styles[] = 'margin-right:' . $margin_right . 'px';
        }

        $style_string = $styles ? implode(';', $styles) : '';
        $image_alt = isset($image['alt']) ? (string) $image['alt'] : '';

        $img_tag = '';
        if ($image_id > 0) {
            $img_attrs = array(
                'loading' => 'lazy',
                'decoding' => 'async',
            );
            if ($style_string !== '') {
                $img_attrs['style'] = $style_string;
            }
            if ($image_alt !== '') {
                $img_attrs['alt'] = $image_alt;
            }
            $img_tag = wp_get_attachment_image($image_id, 'full', false, $img_attrs);
            if (!is_string($img_tag) || $img_tag === '') {
                $img_tag = '';
            }
        }

        if ($img_tag === '' && $image_url !== '') {
            $dimension_attr = '';
            $width = isset($image['width']) ? absint($image['width']) : 0;
            $height = isset($image['height']) ? absint($image['height']) : 0;
            if ($width > 0 && $height > 0) {
                $dimension_attr = ' width="' . $width . '" height="' . $height . '"';
            } elseif ($image_id > 0) {
                $size = wp_get_attachment_image_src($image_id, 'full');
                if (is_array($size) && isset($size[1], $size[2])) {
                    $width = absint($size[1]);
                    $height = absint($size[2]);
                    if ($width > 0 && $height > 0) {
                        $dimension_attr = ' width="' . $width . '" height="' . $height . '"';
                    }
                }
            }
            $style_attr = $style_string !== '' ? ' style="' . esc_attr($style_string) . '"' : '';
            $img_tag = '<img loading="lazy" decoding="async" src="' . esc_url($image_url) . '" alt="' . esc_attr($image_alt) . '"' . $dimension_attr . $style_attr . ' />';
        }
        if ($img_tag === '') {
            return '';
        }

        $link = isset($content['link']) ? $content['link'] : '';
        $link_target = !empty($content['link_target']);
        $cta_text = isset($content['cta_text']) ? (string) $content['cta_text'] : '';
        $custom_rel = isset($content['link_rel']) ? trim((string) $content['link_rel']) : '';
        $default_rel = (string) apply_filters(
            'magick_ad_link_rel_default',
            'nofollow sponsored',
            $content,
            $options
        );
        $rel = $custom_rel !== '' ? $custom_rel : $default_rel;
        $rel = (string) apply_filters('magick_ad_link_rel', $rel, $content, $options, $link_target);
        $rel_lower = strtolower($rel);
        if ($custom_rel !== '' && ($rel_lower === 'none' || $rel_lower === 'dofollow')) {
            $rel = '';
        }
        $rel_parts = $rel !== '' ? preg_split('/\s+/', $rel, -1, PREG_SPLIT_NO_EMPTY) : array();
        if ($link_target) {
            if (!in_array('noopener', $rel_parts, true)) {
                $rel_parts[] = 'noopener';
            }
            if (!in_array('noreferrer', $rel_parts, true)) {
                $rel_parts[] = 'noreferrer';
            }
        }
        $rel_parts = array_values(array_unique($rel_parts));
        $rel_attr = !empty($rel_parts) ? ' rel="' . esc_attr(implode(' ', $rel_parts)) . '"' : '';
        $target_attr = $link_target ? ' target="_blank"' : '';

        if ($link) {
            $img_tag = '<a href="' . esc_url($link) . '"' . $target_attr . $rel_attr . '>' . $img_tag . '</a>';
        }
        if ($link && $cta_text) {
            $img_tag .= '<a class="magick-ad-cta" href="' . esc_url($link) . '"' . $target_attr . $rel_attr . '>' . esc_html($cta_text) . '</a>';
        }
        return $img_tag;
    }

    private static function build_video_body(array $content): string {
        if (empty($content['video_url'])) {
            return '';
        }
        $settings = isset($content['video_settings']) && is_array($content['video_settings'])
            ? $content['video_settings']
            : array();
        $type = isset($settings['type']) ? (string) $settings['type'] : 'mp4';
        $aspect = isset($settings['aspect_ratio']) ? (string) $settings['aspect_ratio'] : '16:9';
        if ($aspect === 'custom') {
            $custom_ratio = isset($settings['aspect_ratio_custom']) ? (string) $settings['aspect_ratio_custom'] : '';
            if (preg_match('/^\\d{1,3}:\\d{1,3}$/', $custom_ratio)) {
                $aspect = $custom_ratio;
            } else {
                $aspect = '16:9';
            }
        }
        $wrapper_styles = array();
        $wrapper_class = 'magick-ad-video';
        if ($aspect !== '' && $aspect !== 'auto') {
            $wrapper_styles[] = 'aspect-ratio:' . esc_attr(str_replace(':', '/', $aspect));
            $wrapper_class .= ' magick-ad-video--ratio';
        }
        $wrapper_style_attr = !empty($wrapper_styles)
            ? ' style="' . esc_attr(implode(';', $wrapper_styles)) . '"'
            : '';
        $video_url = esc_url($content['video_url']);
        if ($type === 'embed') {
            return '<div class="' . esc_attr($wrapper_class) . '"' . $wrapper_style_attr . '><iframe class="magick-ad-video__media" src="' . $video_url . '" allowfullscreen loading="lazy" referrerpolicy="no-referrer"></iframe></div>';
        }
        $attrs = array();
        $autoplay = !empty($settings['autoplay']);
        $muted = !empty($settings['muted']) || $autoplay;
        if (!empty($settings['controls']) || !array_key_exists('controls', $settings)) {
            $attrs[] = 'controls';
        }
        if ($autoplay) {
            $attrs[] = 'autoplay';
        }
        if ($muted) {
            $attrs[] = 'muted';
        }
        if (!empty($settings['loop'])) {
            $attrs[] = 'loop';
        }
        if (!empty($settings['playsinline']) || !array_key_exists('playsinline', $settings)) {
            $attrs[] = 'playsinline';
        }
        $preload = isset($settings['preload']) ? (string) $settings['preload'] : '';
        if (in_array($preload, array('auto', 'metadata', 'none'), true)) {
            $attrs[] = 'preload="' . esc_attr($preload) . '"';
        }
        $poster_mode = isset($settings['poster_mode']) ? (string) $settings['poster_mode'] : 'manual';
        if ($poster_mode !== 'auto') {
            $poster = isset($settings['poster']['url']) ? esc_url($settings['poster']['url']) : '';
            if ($poster !== '') {
                $attrs[] = 'poster="' . $poster . '"';
            }
        }
        $fallback = isset($settings['fallback_text']) ? esc_html($settings['fallback_text']) : '';
        $attr_string = !empty($attrs) ? ' ' . implode(' ', $attrs) : '';
        $video = '<video class="magick-ad-video__media" src="' . $video_url . '"' . $attr_string . '>' . $fallback . '</video>';
        return '<div class="' . esc_attr($wrapper_class) . '"' . $wrapper_style_attr . '>' . $video . '</div>';
    }

    private static function append_custom_markup(string $body, array $content): string {
        $custom_html = isset($content['custom_html']) ? (string) $content['custom_html'] : '';
        $custom_css = isset($content['custom_css']) ? (string) $content['custom_css'] : '';
        $custom_js = isset($content['custom_js']) ? (string) $content['custom_js'] : '';
        if ($custom_html) {
            $body .= $custom_html;
        }
        if ($custom_css) {
            $custom_css = preg_replace('/<\/?style[^>]*>/i', '', $custom_css);
            $body = '<style>' . $custom_css . '</style>' . $body;
        }
        if ($custom_js) {
            $custom_js = preg_replace('/<\/?script[^>]*>/i', '', $custom_js);
            $body .= '<script>' . $custom_js . '</script>';
        }
        return $body;
    }

    private static function wrap_container_markup(string $body, array $content): string {
        $container_style = isset($content['container_style']) ? $content['container_style'] : array();
        $behavior = isset($content['behavior']) ? $content['behavior'] : array();
        $mode = isset($container_style['mode']) ? $container_style['mode'] : 'boxed';
        if ($mode === 'raw') {
            return $body;
        }

        list($classes, $styles) = self::build_container_classes_and_styles($container_style);
        $style_attr = $styles ? ' style="' . esc_attr(implode(';', $styles)) . '"' : '';
        $badge_markup = self::build_badge_markup($container_style);
        $close_markup = '';
        if (!empty($behavior['close_button'])) {
            $close_markup = '<button type="button" class="magick-ad-close" aria-label="' . esc_attr__('关闭', 'magick-ad') . '" data-wp-on--click="actions.close">×</button>';
        }

        return '<div class="' . esc_attr(implode(' ', $classes)) . '"' . $style_attr . '>' . $badge_markup . $close_markup . '<div class="magick-ad-html-content">' . $body . '</div></div>';
    }

    private static function build_container_classes_and_styles(array $container_style): array {
        $styles = array();
        $classes = array('magick-ad-html-container');
        $max_width = isset($container_style['max_width']) ? absint($container_style['max_width']) : 100;
        $max_width_unit = isset($container_style['max_width_unit']) ? $container_style['max_width_unit'] : '%';
        $padding_top = isset($container_style['padding_top']) ? absint($container_style['padding_top']) : 0;
        $padding_right = isset($container_style['padding_right']) ? absint($container_style['padding_right']) : 0;
        $padding_bottom = isset($container_style['padding_bottom']) ? absint($container_style['padding_bottom']) : 0;
        $padding_left = isset($container_style['padding_left']) ? absint($container_style['padding_left']) : 0;
        $background = isset($container_style['background']) ? $container_style['background'] : 'transparent';
        $radius = isset($container_style['radius']) ? absint($container_style['radius']) : 0;
        $shadow = isset($container_style['shadow']) ? $container_style['shadow'] : 'none';
        $layout = isset($container_style['layout']) ? $container_style['layout'] : '';

        if ($max_width) {
            $styles[] = 'max-width:' . $max_width . $max_width_unit;
            if ($max_width_unit === 'px') {
                $styles[] = 'width:100%';
            }
        }
        if ($padding_top || $padding_right || $padding_bottom || $padding_left) {
            $styles[] = sprintf(
                'padding:%dpx %dpx %dpx %dpx',
                $padding_top,
                $padding_right,
                $padding_bottom,
                $padding_left
            );
        }
        if (!empty($background) && $background !== 'transparent') {
            $styles[] = 'background:' . $background;
        }
        if ($radius) {
            $styles[] = 'border-radius:' . $radius . 'px';
        }
        if ($shadow === 'soft') {
            $classes[] = 'magick-ad-shadow--soft';
        } elseif ($shadow === 'float') {
            $classes[] = 'magick-ad-shadow--float';
        }
        if ($layout === 'centered') {
            $classes[] = 'magick-ad-layout--centered';
            $styles[] = 'margin-left:auto';
            $styles[] = 'margin-right:auto';
        }

        return array($classes, $styles);
    }

    private static function build_badge_markup(array $container_style): string {
        if (empty($container_style['badge_enabled'])) {
            return '';
        }
        $badge_type = isset($container_style['badge_type']) ? $container_style['badge_type'] : 'text';
        if ($badge_type === 'image') {
            $badge_image = isset($container_style['badge_image']) && is_array($container_style['badge_image'])
                ? $container_style['badge_image']
                : array();
            $badge_url = isset($badge_image['url']) ? esc_url($badge_image['url']) : '';
            if ($badge_url !== '') {
                $badge_alt = isset($badge_image['alt']) ? $badge_image['alt'] : '';
                $fallback_text = isset($container_style['badge_text']) ? $container_style['badge_text'] : '广告';
                $badge_alt = $badge_alt !== '' ? $badge_alt : $fallback_text;
                return '<span class="magick-ad-badge is-image"><img src="' . esc_url($badge_url) . '" alt="' . esc_attr($badge_alt) . '" /></span>';
            }
        }
        $badge_text = isset($container_style['badge_text']) ? $container_style['badge_text'] : '广告';
        $badge_color = isset($container_style['badge_color']) ? $container_style['badge_color'] : '#1d2327';
        return '<span class="magick-ad-badge" style="background:' . esc_attr($badge_color) . ';">' . esc_html($badge_text) . '</span>';
    }

    private static function wrap_modal_container(string $body, string $container_type): string {
        if (!in_array($container_type, array('popup', 'interstitial'), true)) {
            return $body;
        }
        $label_id = self::ensure_dialog_label_id($body);
        $label_attr = $label_id !== '' ? ' aria-labelledby="' . esc_attr($label_id) . '"' : '';
        return '<div class="magick-ad-overlay" data-wp-on--click="actions.onOverlayClick"></div><div class="magick-ad-popup" role="dialog" aria-modal="true"' . $label_attr . ' tabindex="-1">' . $body . '</div>';
    }

    private static function ensure_dialog_label_id(string &$body): string {
        if ($body === '') {
            return '';
        }
        $pattern = '/<h([1-6])\b([^>]*)>/i';
        if (!preg_match($pattern, $body, $matches)) {
            return '';
        }
        $attrs = $matches[2] ?? '';
        if (preg_match('/\bid=["\']([^"\']+)["\']/i', $attrs, $id_match)) {
            return (string) $id_match[1];
        }
        $label_id = 'magick-ad-dialog-title-' . wp_generate_uuid4();
        $body = preg_replace_callback(
            $pattern,
            function ($match) use ($label_id) {
                if (isset($match[2]) && preg_match('/\bid=["\']([^"\']+)["\']/i', $match[2])) {
                    return $match[0];
                }
                $attrs = isset($match[2]) ? $match[2] : '';
                $attrs = rtrim($attrs);
                return '<h' . $match[1] . $attrs . ' id="' . esc_attr($label_id) . '">';
            },
            $body,
            1
        );
        return $label_id;
    }

    private static function build_data_attributes(array $ad, array $options, array $content, string $position, string $container_type): string {
        $behavior = isset($content['behavior']) ? $content['behavior'] : array();
        $display_mode = isset($options['display_mode']) ? $options['display_mode'] : 'show';
        $random_strategy = isset($options['random_strategy']) ? $options['random_strategy'] : 'request';
        $ad_id = isset($ad['id']) ? (string) $ad['id'] : '';

        $data_attrs = ' data-ad-id="' . esc_attr($ad_id) . '" data-ad-position="' . esc_attr($position) . '"';
        $data_attrs .= ' data-ad-container="' . esc_attr($container_type) . '"';

        $slot = '';
        if (!empty($ad['_slot']) && is_string($ad['_slot'])) {
            $slot = sanitize_title($ad['_slot']);
            if ($slot !== '') {
                $slot = substr($slot, 0, 64);
                $data_attrs .= ' data-ad-slot="' . esc_attr($slot) . '"';
            }
        }

        if ($ad_id !== '') {
            $sig_rev = (int) get_option(Settings::RUNTIME_REV_KEY, 0);
            $sig_ts = \MagickAD\Utils\Tracking_Signature::current_sig_ts();
            $sig = \MagickAD\Utils\Tracking_Signature::build(
                $ad_id,
                $sig_ts,
                $slot,
                $position,
                $container_type,
                (string) $sig_rev
            );
            $data_attrs .= ' data-ad-sig="' . esc_attr($sig) . '"';
            $data_attrs .= ' data-ad-sig-ts="' . esc_attr($sig_ts) . '"';
            if ($sig_rev > 0) {
                $data_attrs .= ' data-ad-sig-rev="' . esc_attr((string) $sig_rev) . '"';
            }
        }

        $placement_hook = isset($options['placement_hook']) ? $options['placement_hook'] : '';
        if ($placement_hook === 'node') {
            $data_attrs .= self::build_node_data_attributes($options);
        }

        $delay = isset($behavior['delay']) ? absint($behavior['delay']) : 0;
        $animation = isset($behavior['animation']) ? $behavior['animation'] : 'none';
        $close_on_esc = array_key_exists('close_on_esc', $behavior) ? (bool) $behavior['close_on_esc'] : true;
        $close_on_overlay = array_key_exists('close_on_overlay', $behavior) ? (bool) $behavior['close_on_overlay'] : true;
        $lock_scroll = !empty($behavior['lock_scroll']);
        $frequency_mode = isset($behavior['frequency_mode']) ? $behavior['frequency_mode'] : 'none';
        $frequency_limit = isset($behavior['frequency_limit']) ? absint($behavior['frequency_limit']) : 1;

        if ($delay > 0) {
            $data_attrs .= ' data-ad-delay="' . esc_attr($delay) . '"';
        }
        if ($animation && $animation !== 'none') {
            $data_attrs .= ' data-ad-anim="' . esc_attr($animation) . '"';
        }
        if ($display_mode === 'random' && $random_strategy === 'session') {
            $data_attrs .= ' data-ad-random="session"';
        }
        if ($close_on_esc) {
            $data_attrs .= ' data-ad-close-esc="1"';
        }
        if ($close_on_overlay) {
            $data_attrs .= ' data-ad-close-overlay="1"';
        }
        if ($lock_scroll) {
            $data_attrs .= ' data-ad-lock-scroll="1"';
        }
        if ($frequency_mode && $frequency_mode !== 'none') {
            $data_attrs .= ' data-ad-freq-mode="' . esc_attr($frequency_mode) . '"';
            $data_attrs .= ' data-ad-freq-limit="' . esc_attr($frequency_limit) . '"';
        }
        if (!empty($content['_variant_id'])) {
            $data_attrs .= ' data-ad-variant="' . esc_attr((string) $content['_variant_id']) . '"';
        }
        if (!empty($content['variants_enabled']) && !empty($content['variants_strategy']) && $content['variants_strategy'] === 'session') {
            $data_attrs .= ' data-ad-variant-strategy="session"';
        }

        $creative_type = isset($options['creative_type']) ? (string) $options['creative_type'] : '';
        if ($creative_type === 'video') {
            $video_settings = isset($content['video_settings']) && is_array($content['video_settings'])
                ? $content['video_settings']
                : array();
            if (!empty($video_settings['autoplay_first'])) {
                $data_attrs .= ' data-ad-video-autoplay-first="1"';
            }
            if (!empty($video_settings['repeat_muted'])) {
                $data_attrs .= ' data-ad-video-repeat-muted="1"';
            }
            if (isset($video_settings['poster_mode']) && $video_settings['poster_mode'] === 'auto') {
                $data_attrs .= ' data-ad-video-poster-auto="1"';
            }
            if (!empty($video_settings['track_events'])) {
                $data_attrs .= ' data-ad-video-track="1"';
            }
        }
        $data_attrs .= ' data-wp-init="actions.initAd"';

        return $data_attrs;
    }

    private static function build_node_data_attributes(array $options): string {
        $node_type = isset($options['node_target_type']) ? $options['node_target_type'] : 'id';
        $node_value = isset($options['node_target_value']) ? $options['node_target_value'] : '';
        $node_insert = isset($options['node_insert']) ? $options['node_insert'] : 'append';
        $node_match = isset($options['node_match']) ? $options['node_match'] : 'first';
        $node_index = isset($options['node_index']) ? absint($options['node_index']) : 1;
        $node_fallback = isset($options['node_fallback']) ? $options['node_fallback'] : 'hide';
        $node_compact = !isset($options['node_compact']) ? true : (bool) $options['node_compact'];

        $data_attrs = ' data-ad-node-type="' . esc_attr($node_type) . '"';
        $data_attrs .= ' data-ad-node-value="' . esc_attr($node_value) . '"';
        $data_attrs .= ' data-ad-node-insert="' . esc_attr($node_insert) . '"';
        $data_attrs .= ' data-ad-node-match="' . esc_attr($node_match) . '"';
        if ($node_index > 0) {
            $data_attrs .= ' data-ad-node-index="' . esc_attr($node_index) . '"';
        }
        $data_attrs .= ' data-ad-node-fallback="' . esc_attr($node_fallback) . '"';
        $data_attrs .= ' data-ad-node-compact="' . ($node_compact ? '1' : '0') . '"';
        return $data_attrs;
    }

    private static function build_unit_class(array $ad, array $options, string $position, string $container_type): string {
        $display_mode = isset($options['display_mode']) ? $options['display_mode'] : 'show';
        $random_strategy = isset($options['random_strategy']) ? $options['random_strategy'] : 'request';
        $placement_hook = isset($options['placement_hook']) ? $options['placement_hook'] : '';

        $container_class = 'magick-ad-container--' . esc_attr($container_type);
        $unit_class = 'magick-ad-unit magick-ad-unit--' . esc_attr($position) . ' ' . $container_class;
        if ($placement_hook === 'node' && (!isset($options['node_compact']) || $options['node_compact'])) {
            $unit_class .= ' magick-ad-placement--node-compact';
        }
        if ($display_mode === 'random' && $random_strategy === 'session') {
            $unit_class .= ' magick-ad-is-hidden';
        }
        if (!empty($ad['_extra_class']) && is_string($ad['_extra_class'])) {
            $classes = preg_split('/\s+/', trim($ad['_extra_class']));
            $classes = array_filter(array_map('sanitize_html_class', $classes));
            if (!empty($classes)) {
                $unit_class .= ' ' . implode(' ', $classes);
            }
        }
        return $unit_class;
    }

    private static function build_inner_style(array $content, string $content_type): string {
        $container_style = isset($content['container_style']) ? $content['container_style'] : array();
        $reserve_height = isset($container_style['reserve_height']) ? absint($container_style['reserve_height']) : 0;
        $styles = array();
        if ($reserve_height > 0) {
            $styles[] = 'min-height:' . $reserve_height . 'px';
        } else {
            $ratio = '';
            if ($content_type === 'image') {
                $ratio = self::get_image_aspect_ratio($content);
            } elseif ($content_type === 'video') {
                $ratio = self::get_video_aspect_ratio($content);
            } elseif ($content_type === 'html') {
                $ratio = self::get_html_placeholder_ratio($content);
            }
            if ($ratio !== '') {
                $styles[] = 'aspect-ratio:' . esc_attr($ratio);
            }
        }
        if (empty($styles)) {
            return '';
        }
        return ' style="' . esc_attr(implode(';', $styles)) . '"';
    }

    private static function wrap_zone_markup($markup, $zone) {
        if (!$markup) {
            return '';
        }
        return '<div class="magick-ad-zone magick-ad-zone--' . esc_attr($zone) . '">' . $markup . '</div>';
    }

    private static function get_slot_placeholder_ratio(array $candidates): string {
        if (empty($candidates)) {
            return '';
        }
        $ratio = '';
        foreach ($candidates as $candidate) {
            if (!is_array($candidate)) {
                return '';
            }
            $options = isset($candidate['options']) && is_array($candidate['options'])
                ? $candidate['options']
                : array();
            $content = isset($candidate['content']) && is_array($candidate['content'])
                ? $candidate['content']
                : array();
            $creative_type = isset($options['creative_type']) ? (string) $options['creative_type'] : '';
            $candidate_ratio = '';
            if ($creative_type === 'image') {
                $candidate_ratio = self::get_image_aspect_ratio($content);
            } elseif ($creative_type === 'video') {
                $candidate_ratio = self::get_video_aspect_ratio($content);
            } elseif ($creative_type === 'html') {
                $candidate_ratio = self::get_html_placeholder_ratio($content);
            }
            if ($candidate_ratio === '') {
                return '';
            }
            if ($ratio === '') {
                $ratio = $candidate_ratio;
                continue;
            }
            if ($ratio !== $candidate_ratio) {
                return '';
            }
        }
        return $ratio;
    }

    private static function get_image_aspect_ratio(array $content): string {
        $image = isset($content['image']) && is_array($content['image']) ? $content['image'] : array();
        $width = isset($image['width']) ? absint($image['width']) : 0;
        $height = isset($image['height']) ? absint($image['height']) : 0;
        if ($width > 0 && $height > 0) {
            return $width . ' / ' . $height;
        }

        $image_id = isset($image['id']) ? absint($image['id']) : 0;
        if ($image_id > 0) {
            $size = wp_get_attachment_image_src($image_id, 'full');
            if (is_array($size) && isset($size[1], $size[2])) {
                $width = absint($size[1]);
                $height = absint($size[2]);
                if ($width > 0 && $height > 0) {
                    return $width . ' / ' . $height;
                }
            }
        }

        return '';
    }

    private static function get_video_aspect_ratio(array $content): string {
        $settings = isset($content['video_settings']) && is_array($content['video_settings'])
            ? $content['video_settings']
            : array();
        $aspect = isset($settings['aspect_ratio']) ? (string) $settings['aspect_ratio'] : '16:9';
        if ($aspect === 'custom') {
            $custom_ratio = isset($settings['aspect_ratio_custom']) ? (string) $settings['aspect_ratio_custom'] : '';
            if (preg_match('/^\\d{1,3}:\\d{1,3}$/', $custom_ratio)) {
                $aspect = $custom_ratio;
            } else {
                $aspect = '';
            }
        }
        if ($aspect === '' || $aspect === 'auto') {
            return '';
        }
        return str_replace(':', ' / ', $aspect);
    }

    private static function get_html_placeholder_ratio(array $content): string {
        $placeholder = isset($content['html_placeholder_ratio'])
            ? sanitize_text_field((string) $content['html_placeholder_ratio'])
            : '';
        if ($placeholder !== '' && preg_match('/^\\d{1,3}:\\d{1,3}$/', $placeholder)) {
            return str_replace(':', ' / ', $placeholder);
        }
        return '';
    }

}
