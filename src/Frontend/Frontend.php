<?php

namespace MagickAD\Frontend;

use MagickAD\Data\Settings;

if (!defined('ABSPATH')) {
    exit;
}

final class Frontend {
    private static $loop_before_rendered = false;
    private static $loop_after_rendered = false;
    private static $comments_template_original = null;

    public function register(): void {
        add_action('wp_enqueue_scripts', array(__CLASS__, 'enqueue_assets'));
        self::init();
    }

    private static function init() {
        add_filter('the_content', array(__CLASS__, 'inject_content_ads'));
        add_action('wp_head', array(__CLASS__, 'render_head_ads'));
        add_action('wp_footer', array(__CLASS__, 'render_footer_ads'));
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

    public static function enqueue_assets(): void {
        if (is_admin()) {
            return;
        }

        wp_enqueue_style(
            'magick-ad-frontend',
            MAGICK_AD_URL . 'assets/magick-ad-frontend.css',
            array(),
            MAGICK_AD_VERSION
        );

        wp_enqueue_script(
            'magick-ad-track',
            MAGICK_AD_URL . 'assets/magick-ad-track.js',
            array(),
            MAGICK_AD_VERSION,
            true
        );

        wp_localize_script(
            'magick-ad-track',
            'MagickADTrack',
            array(
                'restUrl' => esc_url_raw(rest_url('magick-ad/v1/track')),
                'nonce' => is_user_logged_in() ? wp_create_nonce('wp_rest') : '',
            )
        );
    }


    public static function inject_content_ads($content) {
        if (is_admin() || !is_singular() || !in_the_loop() || !is_main_query()) {
            return $content;
        }

        $ads = self::get_matching_ads();
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

        $ads = self::get_matching_ads();
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

        $ads = self::get_matching_ads();
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

    public static function render_body_top_ads() {
        if (is_admin()) {
            return;
        }

        $ads = self::get_matching_ads();
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

        $ads = self::get_matching_ads();
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

        $ads = self::get_matching_ads();
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

        $ads = self::get_matching_ads();
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

        $ads = self::get_matching_ads();
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

        $ads = self::get_matching_ads();
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

        $ads = self::get_matching_ads();
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

        $ads = self::get_matching_ads();
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

    private static function get_matching_ads() {
        $settings = Settings::get_settings();
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();

        $matched = array();
        foreach ($ads as $ad) {
            if (!self::should_display_ad($ad)) {
                continue;
            }
            $matched[] = $ad;
        }

        return $matched;
    }

    private static function should_display_ad($ad) {
        $options = isset($ad['options']) ? $ad['options'] : array();
        $ad_type = isset($options['ad_type']) ? $options['ad_type'] : 'global';

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
                if (!isset($_COOKIE['magick_ad_uid']) || !is_string($_COOKIE['magick_ad_uid'])) {
                    $uid = wp_generate_uuid4();
                    setcookie('magick_ad_uid', $uid, time() + MONTH_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
                    $_COOKIE['magick_ad_uid'] = $uid;
                }
                if (isset($_COOKIE['magick_ad_uid']) && is_string($_COOKIE['magick_ad_uid'])) {
                    $seed = 'cookie:' . sanitize_text_field(wp_unslash($_COOKIE['magick_ad_uid']));
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
        if ($device === 'mobile') {
            return wp_is_mobile();
        }
        if ($device === 'tablet') {
            return self::is_tablet_device();
        }
        if ($device === 'desktop') {
            return !wp_is_mobile() && !self::is_tablet_device();
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
        if ($login === 'logged-in') {
            return is_user_logged_in();
        }
        if ($login === 'logged-out') {
            return !is_user_logged_in();
        }

        return true;
    }

    private static function insert_after_paragraphs($content, $insert_map) {
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

    private static function build_ad_markup($ad, $position) {
        $content = isset($ad['content']) ? $ad['content'] : array();
        $options = isset($ad['options']) ? $ad['options'] : array();
        $content_type = isset($options['creative_type']) ? $options['creative_type'] : (isset($options['content_type']) ? $options['content_type'] : 'image');
        $container_type = isset($options['container_type']) ? $options['container_type'] : 'inline';
        $html = isset($content['html']) ? $content['html'] : '';
        $blocks = isset($content['blocks']) ? $content['blocks'] : '';
        $link = isset($content['link']) ? $content['link'] : '';
        $link_target = !empty($content['link_target']);
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
                $img_tag = '<img src="' . esc_url($image['url']) . '" alt="' . esc_attr(isset($image['alt']) ? $image['alt'] : '') . '"' . $style_attr . ' />';
                if ($link) {
                    $target = $link_target ? ' target="_blank" rel="noopener noreferrer"' : '';
                    $img_tag = '<a href="' . esc_url($link) . '"' . $target . '>' . $img_tag . '</a>';
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
        $data_attrs = ' data-ad-id="' . esc_attr(isset($ad['id']) ? $ad['id'] : '') . '" data-ad-position="' . esc_attr($position) . '"';
        $delay = isset($behavior['delay']) ? absint($behavior['delay']) : 0;
        $animation = isset($behavior['animation']) ? $behavior['animation'] : 'none';
        if ($delay > 0) {
            $data_attrs .= ' data-ad-delay="' . esc_attr($delay) . '"';
        }
        if ($animation && $animation !== 'none') {
            $data_attrs .= ' data-ad-anim="' . esc_attr($animation) . '"';
        }
        if ($display_mode === 'random' && $random_strategy === 'session') {
            $data_attrs .= ' data-ad-random="session"';
        }
        $container_class = 'magick-ad-container--' . esc_attr($container_type);
        if (in_array($container_type, array('popup', 'interstitial'), true)) {
            $body = '<div class="magick-ad-overlay"></div><div class="magick-ad-popup">' . $body . '</div>';
        }
        $unit_class = 'magick-ad-unit magick-ad-unit--' . esc_attr($position) . ' ' . $container_class;
        if ($display_mode === 'random' && $random_strategy === 'session') {
            $unit_class .= ' magick-ad-is-hidden';
        }

        return '<div class="' . esc_attr($unit_class) . '"' . $data_attrs . '><div class="magick-ad-unit__inner">' . $body . '</div></div>';
    }

    private static function wrap_zone_markup($markup, $zone) {
        if (!$markup) {
            return '';
        }
        return '<div class="magick-ad-zone magick-ad-zone--' . esc_attr($zone) . '">' . $markup . '</div>';
    }
}
