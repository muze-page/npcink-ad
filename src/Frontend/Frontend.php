<?php

namespace MagickAD\Frontend;

use MagickAD\Data\Settings;
use MagickAD\Utils\Capabilities;

if (!defined('ABSPATH')) {
    exit;
}

final class Frontend {
    private static $loop_before_rendered = false;
    private static $loop_after_rendered = false;
    private static $comments_template_original = null;
    private static $preview_ad_id = null;
    private static $preview_ad = null;
    private static $preview_force = false;
    private static $preview_mode = 'shell';
    private static $preview_evaluation = array(
        'allowed' => false,
        'reasons' => array(),
    );
    private static $matching_cache = null;
    private static $container_index = null;

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
        $ad = self::apply_render_overrides($ad, $args);
        $position = isset($args['position']) && is_string($args['position'])
            ? $args['position']
            : 'slot';
        return self::build_ad_markup($ad, $position);
    }

    public static function render_slot($slot_or_id, array $args = array()): string {
        $ads = self::resolve_ads($slot_or_id, $args);
        if (empty($ads)) {
            return '';
        }

        $markup = '';
        foreach ($ads as $ad) {
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
        add_filter('the_content', array(__CLASS__, 'inject_content_ads'));
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
        $slot = isset($args['slot']) ? (string) $args['slot'] : '';
        $id = isset($args['id']) ? (string) $args['id'] : '';
        if (!$slot && $slot_or_id) {
            $slot = (string) $slot_or_id;
        }
        if (!$id && $slot_or_id) {
            $id = (string) $slot_or_id;
        }
        if ($slot) {
            $slot = (string) apply_filters('magick_ad_resolve_slot', $slot, $args);
            if ($slot && !$id) {
                $id = $slot;
            }
        }

        $settings = Settings::get_settings();
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
        $slots = isset($settings['slots']) && is_array($settings['slots']) ? $settings['slots'] : array();

        foreach ($ads as $ad) {
            $ad_id = isset($ad['id']) ? (string) $ad['id'] : '';
            if ($id && $ad_id === $id) {
                return array($ad);
            }
        }

        if (!$slot) {
            return array();
        }

        $slot = sanitize_title($slot);
        $slot_config = null;
        foreach ($slots as $slot_item) {
            $slot_id = isset($slot_item['id']) ? (string) $slot_item['id'] : '';
            if ($slot_id === $slot) {
                $slot_config = $slot_item;
                break;
            }
        }
        if (
            !$slot_config ||
            empty($slot_config['ad_ids']) ||
            !is_array($slot_config['ad_ids'])
        ) {
            return array();
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

        if (empty($slot_candidates)) {
            return array();
        }

        $eligible = array();
        foreach ($slot_candidates as $candidate) {
            if (self::should_display_ad($candidate)) {
                $eligible[] = $candidate;
            }
        }
        if (empty($eligible)) {
            return array();
        }

        $max_priority = null;
        foreach ($eligible as $candidate) {
            $priority = isset($candidate['options']['priority']) ? absint($candidate['options']['priority']) : 10;
            if ($priority < 1) {
                $priority = 1;
            }
            if ($max_priority === null || $priority > $max_priority) {
                $max_priority = $priority;
            }
        }
        $top = array();
        foreach ($eligible as $candidate) {
            $priority = isset($candidate['options']['priority']) ? absint($candidate['options']['priority']) : 10;
            if ($priority < 1) {
                $priority = 1;
            }
            if ($priority === $max_priority) {
                $top[] = $candidate;
            }
        }

        $limit = isset($slot_config['limit']) ? max(1, absint($slot_config['limit'])) : 1;
        if (count($top) <= 1) {
            return $top;
        }

        $limit = min($limit, count($top));
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
                if ($ad_weight < 1) {
                    $ad_weight = 1;
                }
                $slot_weight = isset($weight_map[$ad_id]) ? $weight_map[$ad_id] : 1;
                if ($slot_weight < 1) {
                    $slot_weight = 1;
                }
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

    public static function enqueue_assets(): void {
        if (is_admin()) {
            return;
        }

        if (self::is_preview_request()) {
            return;
        }

        if (self::is_picker_request()) {
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
                'index' => isset($_GET['magick_ad_node_index']) ? absint($_GET['magick_ad_node_index']) : 1,
            );
            wp_localize_script('magick-ad-node-debug', 'MagickADNodeDebug', $config);
            return;
        }

        $ads = self::get_matching_ads_for('all');
        if (empty($ads)) {
            return;
        }

        wp_enqueue_style(
            'magick-ad-frontend',
            MAGICK_AD_URL . 'assets/magick-ad-frontend.css',
            array(),
            MAGICK_AD_VERSION
        );

        $track_handle = 'magick-ad-track';
        $container_index = self::get_container_index();
        $defer = self::has_deferred_ads($ads, $container_index);
        $diagnostics_enabled = (get_option('magick_ad_stats_diagnostics', '0') === '1');
        $diagnostics_enabled = (bool) apply_filters('magick_ad_stats_diagnostics_enabled', $diagnostics_enabled);
        $has_consent = (bool) apply_filters('magick_ad_has_consent', false);
        $requires_consent = (get_option('magick_ad_tracking_require_consent', '0') === '1');
        $requires_consent = (bool) apply_filters('magick_ad_tracking_require_consent', $requires_consent);
        $track_config = array(
            'restUrl' => esc_url_raw(rest_url('magick-ad/v1/track')),
            'nonce' => is_user_logged_in() ? wp_create_nonce('wp_rest') : '',
            'defer' => $defer,
            'scriptUrl' => esc_url_raw(MAGICK_AD_URL . 'assets/magick-ad-track.js'),
            'containerIndex' => $container_index,
            'collectPageUrl' => $diagnostics_enabled,
            'hasConsent' => $has_consent,
            'requireConsent' => $requires_consent,
        );

        if ($defer) {
            wp_register_script($track_handle, '', array(), MAGICK_AD_VERSION, true);
            wp_enqueue_script($track_handle);
            wp_localize_script($track_handle, 'MagickADTrack', $track_config);
            wp_add_inline_script(
                $track_handle,
                '(function(){var cfg=window.MagickADTrack||{};var loaded=false;var load=function(){if(loaded){return;}loaded=true;window.MagickADTrackLoaded=true;var s=document.createElement("script");s.src=cfg.scriptUrl;s.defer=true;document.head.appendChild(s);cleanup();};var events=["scroll","mousemove","touchstart","keydown","pointerdown"];var onEvent=function(){load();};var cleanup=function(){events.forEach(function(ev){window.removeEventListener(ev,onEvent,{passive:true});});};events.forEach(function(ev){window.addEventListener(ev,onEvent,{passive:true});});if("requestIdleCallback" in window){requestIdleCallback(load,{timeout:1500});}else{setTimeout(load,800);} })();'
            );
        } else {
            wp_enqueue_script(
                $track_handle,
                MAGICK_AD_URL . 'assets/magick-ad-track.js',
                array(),
                MAGICK_AD_VERSION,
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


    public static function inject_content_ads($content) {
        if (!self::is_preview() && (is_admin() || !is_singular() || !in_the_loop() || !is_main_query())) {
            return $content;
        }

        $ads = self::get_matching_ads_for('content');
        if (empty($ads)) {
            return $content;
        }

        $insert_map = array();
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

        if (!empty($insert_map)) {
            $content = self::insert_after_paragraphs($content, $insert_map);
        }

        if ($prepend) {
            $content = self::wrap_zone_markup($prepend, 'content-before') . $content;
        }
        if ($append) {
            $content .= self::wrap_zone_markup($append, 'content-after');
        }

        return $content;
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

        $settings = Settings::get_settings();
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();

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

        foreach ($ads as $ad) {
            if (!self::should_display_ad($ad)) {
                continue;
            }

            $zones['all'][] = $ad;
            self::track_container_index($ad);
            $options = isset($ad['options']) ? $ad['options'] : array();
            $placement = self::get_placement($options);
            $hook = $placement['hook'];

            if ($hook === 'head') {
                $zones['head'][] = $ad;
                continue;
            }
            if ($hook === 'footer') {
                $zones['footer'][] = $ad;
                continue;
            }
            if ($hook === 'body_top') {
                $zones['body_top'][] = $ad;
                continue;
            }
            if ($hook === 'loop_before') {
                $zones['loop_before'][] = $ad;
                continue;
            }
            if ($hook === 'loop_after') {
                $zones['loop_after'][] = $ad;
                continue;
            }
            if ($hook === 'comments_top') {
                $zones['comments'][] = $ad;
                $zones['comments_top'][] = $ad;
                continue;
            }
            if ($hook === 'comments_bottom') {
                $zones['comments'][] = $ad;
                $zones['comments_bottom'][] = $ad;
                continue;
            }
            if ($hook === 'comment_form_before') {
                $zones['comments'][] = $ad;
                $zones['comment_form_before'][] = $ad;
                continue;
            }
            if ($hook === 'comment_form_after') {
                $zones['comments'][] = $ad;
                $zones['comment_form_after'][] = $ad;
                continue;
            }
            if ($hook === 'node') {
                $zones['node'][] = $ad;
                continue;
            }
            if ($hook === 'content') {
                $zones['content'][] = $ad;
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
        return isset($_GET['magick_ad_preview']);
    }

    private static function is_picker_request(): bool {
        return isset($_GET['magick_ad_picker']) && $_GET['magick_ad_picker'] === '1';
    }

    private static function is_node_debug_request(): bool {
        return isset($_GET['magick_ad_node_debug']) && $_GET['magick_ad_node_debug'] === '1';
    }

    private static function is_preview(): bool {
        return !empty(self::$preview_ad_id);
    }

    private static function get_ad_by_id(string $ad_id): ?array {
        $settings = Settings::get_settings();
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
        return isset($_GET['magick_ad_diagnose']);
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

        $settings = Settings::get_settings();
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

        $json = wp_json_encode($report, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!$json) {
            return;
        }

        echo '<div class="magick-ad-diagnose" id="magick-ad-diagnose">';
        echo '<div class="magick-ad-diagnose__header">';
        echo '<strong>Magick AD 投放诊断报告</strong>';
        echo '<div class="magick-ad-diagnose__actions">';
        echo '<button type="button" class="magick-ad-diagnose__btn" data-action="copy">复制报告</button>';
        echo '<button type="button" class="magick-ad-diagnose__btn" data-action="close">关闭</button>';
        echo '</div>';
        echo '</div>';
        echo '<div class="magick-ad-diagnose__body">';
        echo '<pre class="magick-ad-diagnose__content" id="magick-ad-diagnose-content">' . esc_html($json) . '</pre>';
        echo '</div>';
        echo '</div>';
        echo '<script>(function(){var panel=document.getElementById("magick-ad-diagnose");if(!panel){return;}var btnCopy=panel.querySelector("[data-action=\"copy\"]");var btnClose=panel.querySelector("[data-action=\"close\"]");var content=document.getElementById("magick-ad-diagnose-content");var copyText=function(){if(!content){return;}var text=content.textContent||\"\";if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text);}else{var ta=document.createElement(\"textarea\");ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand(\"copy\");}catch(e){}document.body.removeChild(ta);}};if(btnCopy){btnCopy.addEventListener(\"click\",copyText);}if(btnClose){btnClose.addEventListener(\"click\",function(){panel.remove();});}})();</script>';
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
        self::$preview_force = isset($_GET['magick_ad_preview_force']) && $_GET['magick_ad_preview_force'] === '1';
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

        $settings = Settings::get_settings();
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
        $needs_cookie = false;
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            if (($options['display_mode'] ?? '') !== 'random') {
                continue;
            }
            if (($options['random_strategy'] ?? '') === 'cookie') {
                $needs_cookie = true;
                break;
            }
        }
        if (!$needs_cookie) {
            return;
        }

        $uid = wp_generate_uuid4();
        $expires = time() + MONTH_IN_SECONDS;
        $secure = is_ssl();
        if (PHP_VERSION_ID >= 70300) {
            setcookie(
                'magick_ad_uid',
                $uid,
                array(
                    'expires' => $expires,
                    'path' => COOKIEPATH ?: '/',
                    'domain' => COOKIE_DOMAIN ?: '',
                    'secure' => $secure,
                    'httponly' => true,
                    'samesite' => 'Lax',
                )
            );
        } else {
            setcookie('magick_ad_uid', $uid, $expires, COOKIEPATH, COOKIE_DOMAIN, $secure, true);
        }
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

    private static function is_expired($options) {
        $end_date = isset($options['end_date']) ? $options['end_date'] : '';
        if (!$end_date) {
            return false;
        }
        $timestamp = strtotime($end_date . ' 23:59:59');
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
        $content = isset($ad['content']) ? $ad['content'] : array();
        $options = isset($ad['options']) ? $ad['options'] : array();
        $content_type = isset($options['creative_type']) ? $options['creative_type'] : (isset($options['content_type']) ? $options['content_type'] : 'image');
        $container_type = isset($options['container_type']) ? $options['container_type'] : 'inline';
        $html = isset($content['html']) ? $content['html'] : '';
        $blocks = isset($content['blocks']) ? $content['blocks'] : '';
        $link = isset($content['link']) ? $content['link'] : '';
        $link_target = !empty($content['link_target']);
        $cta_text = isset($content['cta_text']) ? (string) $content['cta_text'] : '';
        $custom_html = isset($content['custom_html']) ? (string) $content['custom_html'] : '';
        $custom_css = isset($content['custom_css']) ? (string) $content['custom_css'] : '';
        $image = isset($content['image']) ? $content['image'] : array();
        $container_style = isset($content['container_style']) && is_array($content['container_style'])
            ? $content['container_style']
            : array();
        $behavior = isset($content['behavior']) && is_array($content['behavior'])
            ? $content['behavior']
            : array();
        $image_settings = isset($content['image_settings']) && is_array($content['image_settings'])
            ? $content['image_settings']
            : array();
        $reserve_height = isset($container_style['reserve_height']) ? absint($container_style['reserve_height']) : 0;

        $body = '';
        if ($content_type === 'block') {
            if ($blocks) {
                $body = do_blocks($blocks);
            }
        } elseif ($content_type === 'html') {
            if ($html) {
                $body = $html;
            }
        } elseif ($content_type === 'image') {
            if (!empty($image['url'])) {
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

                $style_attr = $styles ? ' style="' . esc_attr(implode(';', $styles)) . '"' : '';
                $img_tag = '<img loading="lazy" decoding="async" src="' . esc_url($image['url']) . '" alt="' . esc_attr(isset($image['alt']) ? $image['alt'] : '') . '"' . $style_attr . ' />';
                if ($link) {
                    $target = $link_target ? ' target="_blank" rel="noopener noreferrer"' : '';
                    $img_tag = '<a href="' . esc_url($link) . '"' . $target . '>' . $img_tag . '</a>';
                }
                if ($link && $cta_text) {
                    $target = $link_target ? ' target="_blank" rel="noopener noreferrer"' : '';
                    $img_tag .= '<a class="magick-ad-cta" href="' . esc_url($link) . '"' . $target . '>' . esc_html($cta_text) . '</a>';
                }
                $body = $img_tag;
            }
        } elseif ($content_type === 'video') {
            if (!empty($content['video_url'])) {
                $body = '<div class="magick-ad-video"><video controls src="' . esc_url($content['video_url']) . '"></video></div>';
            }
        } else {
            return '';
        }

        if (!$body) {
            return '';
        }

        if ($custom_html) {
            $body .= $custom_html;
        }
        if ($custom_css) {
            $custom_css = preg_replace('/<\/?style[^>]*>/i', '', $custom_css);
            $body = '<style>' . $custom_css . '</style>' . $body;
        }

        $mode = isset($container_style['mode']) ? $container_style['mode'] : 'boxed';
        if ($mode !== 'raw') {
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
            $badge_enabled = !empty($container_style['badge_enabled']);
            $badge_text = isset($container_style['badge_text']) ? $container_style['badge_text'] : '广告';
            $badge_color = isset($container_style['badge_color']) ? $container_style['badge_color'] : '#1d2327';
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

            $style_attr = $styles ? ' style="' . esc_attr(implode(';', $styles)) . '"' : '';
            $badge_markup = '';
            if ($badge_enabled) {
                $badge_markup = '<span class="magick-ad-badge" style="background:' . esc_attr($badge_color) . ';">' . esc_html($badge_text) . '</span>';
            }
            $close_markup = '';
            if (!empty($behavior['close_button'])) {
                $close_markup = '<button type="button" class="magick-ad-close" aria-label="' . esc_attr__('关闭广告', 'magick-ad') . '">×</button>';
            }

            $body = '<div class="' . esc_attr(implode(' ', $classes)) . '"' . $style_attr . '>' . $badge_markup . $close_markup . '<div class="magick-ad-html-content">' . $body . '</div></div>';
        }

        $display_mode = isset($options['display_mode']) ? $options['display_mode'] : 'show';
        $random_strategy = isset($options['random_strategy']) ? $options['random_strategy'] : 'request';
        $ad_id = isset($ad['id']) ? (string) $ad['id'] : '';
        $data_attrs = ' data-ad-id="' . esc_attr($ad_id) . '" data-ad-position="' . esc_attr($position) . '"';
        $data_attrs .= ' data-ad-container="' . esc_attr($container_type) . '"';
        if ($ad_id !== '') {
            $sig_ts = gmdate('Ymd', current_time('timestamp'));
            $sig = hash_hmac('sha256', $ad_id . '|' . $sig_ts, self::get_track_secret());
            $data_attrs .= ' data-ad-sig="' . esc_attr($sig) . '"';
            $data_attrs .= ' data-ad-sig-ts="' . esc_attr($sig_ts) . '"';
        }
        if (!empty($ad['_slot']) && is_string($ad['_slot'])) {
            $data_attrs .= ' data-ad-slot="' . esc_attr($ad['_slot']) . '"';
        }
        $placement_hook = isset($options['placement_hook']) ? $options['placement_hook'] : '';
        if ($placement_hook === 'node') {
            $node_type = isset($options['node_target_type']) ? $options['node_target_type'] : 'id';
            $node_value = isset($options['node_target_value']) ? $options['node_target_value'] : '';
            $node_insert = isset($options['node_insert']) ? $options['node_insert'] : 'append';
            $node_match = isset($options['node_match']) ? $options['node_match'] : 'first';
            $node_index = isset($options['node_index']) ? absint($options['node_index']) : 1;
            $node_fallback = isset($options['node_fallback']) ? $options['node_fallback'] : 'hide';
            $node_compact = !isset($options['node_compact']) ? true : (bool) $options['node_compact'];
            $data_attrs .= ' data-ad-node-type="' . esc_attr($node_type) . '"';
            $data_attrs .= ' data-ad-node-value="' . esc_attr($node_value) . '"';
            $data_attrs .= ' data-ad-node-insert="' . esc_attr($node_insert) . '"';
            $data_attrs .= ' data-ad-node-match="' . esc_attr($node_match) . '"';
            if ($node_index > 0) {
                $data_attrs .= ' data-ad-node-index="' . esc_attr($node_index) . '"';
            }
            $data_attrs .= ' data-ad-node-fallback="' . esc_attr($node_fallback) . '"';
            $data_attrs .= ' data-ad-node-compact="' . ($node_compact ? '1' : '0') . '"';
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
        $container_class = 'magick-ad-container--' . esc_attr($container_type);
        if (in_array($container_type, array('popup', 'interstitial'), true)) {
            $body = '<div class="magick-ad-overlay"></div><div class="magick-ad-popup" role="dialog" aria-modal="true" tabindex="-1">' . $body . '</div>';
        }
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
        $inner_style = '';
        if ($reserve_height > 0) {
            $inner_style = ' style="min-height:' . esc_attr($reserve_height) . 'px"';
        }

        return '<div class="' . esc_attr($unit_class) . '"' . $data_attrs . '><div class="magick-ad-unit__inner"' . $inner_style . '>' . $body . '</div></div>';
    }

    private static function wrap_zone_markup($markup, $zone) {
        if (!$markup) {
            return '';
        }
        return '<div class="magick-ad-zone magick-ad-zone--' . esc_attr($zone) . '">' . $markup . '</div>';
    }

    private static function get_track_secret(): string {
        $secret = get_option('magick_ad_track_secret', '');
        if (!is_string($secret) || $secret === '') {
            $secret = wp_generate_password(32, true, true);
            update_option('magick_ad_track_secret', $secret, false);
        }
        return (string) $secret;
    }
}
