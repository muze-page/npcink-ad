<?php
/**
 * Plugin Name: Magick AD
 * Description: Admin UI and settings endpoint for Magick AD.
 * Version: 0.1.0
 * Author: Magick AD
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MAGICK_AD_PLUGIN_URL', plugin_dir_url(__FILE__));
define('MAGICK_AD_PLUGIN_VERSION', '0.1.0');

if (!function_exists('magick_ad_is_debug_enabled')) {
    function magick_ad_is_debug_enabled() {
        static $enabled = null;
        if ($enabled !== null) {
            return $enabled;
        }

        $enabled = false;
        if (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG) {
            $enabled = true;
        } elseif (get_option('magick_ad_debug', '0') === '1') {
            $enabled = true;
        }

        $enabled = (bool) apply_filters('magick_ad_debug_enabled', $enabled);

        return $enabled;
    }
}

if (!function_exists('magick_ad_debug_log')) {
    function magick_ad_debug_log($message) {
        if (!magick_ad_is_debug_enabled()) {
            return;
        }

        error_log($message);
    }
}

if (!function_exists('magick_ad_debug_log_settings_enabled')) {
    function magick_ad_debug_log_settings_enabled() {
        if (!magick_ad_is_debug_enabled()) {
            return false;
        }

        $enabled = (get_option('magick_ad_debug_log_settings', '1') === '1');

        return (bool) apply_filters('magick_ad_debug_log_settings_enabled', $enabled);
    }
}

function magick_ad_register_menu() {
    add_menu_page(
        'Magick AD',
        'Magick AD',
        'manage_options',
        'magick-ad',
        'magick_ad_render_app',
        'dashicons-megaphone',
        60
    );
}
add_action('admin_menu', 'magick_ad_register_menu');

function magick_ad_register_debug_settings() {
    register_setting(
        'magick_ad_debug',
        'magick_ad_debug',
        array(
            'type' => 'string',
            'sanitize_callback' => 'magick_ad_sanitize_debug',
            'default' => '0',
        )
    );

    add_settings_section(
        'magick_ad_debug_section',
        esc_html__('调试设置', 'magick-ad'),
        '__return_false',
        'magick_ad_debug'
    );

    add_settings_field(
        'magick_ad_debug_field',
        esc_html__('启用调试日志', 'magick-ad'),
        'magick_ad_render_debug_field',
        'magick_ad_debug',
        'magick_ad_debug_section'
    );
}
add_action('admin_init', 'magick_ad_register_debug_settings');

function magick_ad_sanitize_debug($value) {
    return !empty($value) ? '1' : '0';
}

function magick_ad_render_debug_field() {
    $value = get_option('magick_ad_debug', '0');
    echo '<label>';
    echo '<input type="checkbox" name="magick_ad_debug" value="1" ' . checked('1', $value, false) . ' />';
    echo ' ' . esc_html__('记录调试日志到 debug.log', 'magick-ad');
    echo '</label>';
}

function magick_ad_render_app() {
    echo '<div class="wrap">';
    echo '<div id="magick-ad-app"></div>';
    echo '<div id="magick-ad-classic-editor-host" style="display:none;">';
    wp_editor(
        '',
        'magick_ad_classic_editor',
        array(
            'textarea_name' => 'magick_ad_classic_editor',
            'editor_height' => 260,
            'media_buttons' => true,
            'teeny' => false,
            'quicktags' => true,
        )
    );
    echo '</div>';
    echo '</div>';
}

function magick_ad_enqueue_admin_assets($hook) {
    if ($hook !== 'toplevel_page_magick-ad') {
        return;
    }

    $asset_path = plugin_dir_path(__FILE__) . 'build/index.asset.php';
    $asset = file_exists($asset_path) ? include $asset_path : array(
        'dependencies' => array('wp-element', 'wp-api-fetch'),
        'version' => MAGICK_AD_PLUGIN_VERSION,
    );
    if (!in_array('wp-editor', $asset['dependencies'], true)) {
        $asset['dependencies'][] = 'wp-editor';
    }

    wp_enqueue_editor();
    wp_enqueue_media();
    wp_enqueue_script('wplink');
    wp_enqueue_style('editor-buttons');

    wp_enqueue_script(
        'magick-ad-app',
        MAGICK_AD_PLUGIN_URL . 'build/index.js',
        $asset['dependencies'],
        $asset['version'],
        true
    );

    wp_enqueue_style(
        'magick-ad-app',
        MAGICK_AD_PLUGIN_URL . 'build/index.css',
        array(),
        $asset['version']
    );

    wp_localize_script(
        'magick-ad-app',
        'MagickAD',
        array(
            'nonce' => wp_create_nonce('wp_rest'),
            'restUrl' => esc_url_raw(rest_url('magick-ad/v1')),
        )
    );
}
add_action('admin_enqueue_scripts', 'magick_ad_enqueue_admin_assets');

function magick_ad_enqueue_frontend_assets() {
    if (is_admin()) {
        return;
    }

    wp_enqueue_style(
        'magick-ad-frontend',
        MAGICK_AD_PLUGIN_URL . 'assets/magick-ad-frontend.css',
        array(),
        MAGICK_AD_PLUGIN_VERSION
    );

    wp_enqueue_script(
        'magick-ad-track',
        MAGICK_AD_PLUGIN_URL . 'assets/magick-ad-track.js',
        array(),
        MAGICK_AD_PLUGIN_VERSION,
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
add_action('wp_enqueue_scripts', 'magick_ad_enqueue_frontend_assets');

function magick_ad_register_rest_routes() {
    register_rest_route('magick-ad/v1', '/save-settings', array(
        'methods' => 'POST',
        'callback' => array('Magick_AD_Engine', 'rest_save_settings'),
        'permission_callback' => 'magick_ad_can_manage',
    ));
    register_rest_route('magick-ad/v1', '/save-settings', array(
        'methods' => 'GET',
        'callback' => array('Magick_AD_Engine', 'rest_get_settings'),
        'permission_callback' => 'magick_ad_can_manage',
    ));
    register_rest_route('magick-ad/v1', '/report', array(
        'methods' => 'GET',
        'callback' => array('Magick_AD_Reports', 'rest_report'),
        'permission_callback' => 'magick_ad_can_manage',
    ));
    register_rest_route('magick-ad/v1', '/debug', array(
        'methods' => 'GET',
        'callback' => array('Magick_AD_Debug_Settings', 'rest_get'),
        'permission_callback' => 'magick_ad_can_manage',
    ));
    register_rest_route('magick-ad/v1', '/debug', array(
        'methods' => 'POST',
        'callback' => array('Magick_AD_Debug_Settings', 'rest_update'),
        'permission_callback' => 'magick_ad_can_manage',
    ));
    register_rest_route('magick-ad/v1', '/track', array(
        'methods' => 'POST',
        'callback' => array('Magick_AD_Frontend', 'rest_track'),
        'permission_callback' => '__return_true',
    ));
}
add_action('rest_api_init', 'magick_ad_register_rest_routes');

function magick_ad_can_manage($request) {
    if (!current_user_can('manage_options')) {
        return new WP_Error('magick_ad_forbidden', 'Forbidden', array('status' => 403));
    }

    $nonce = $request->get_header('X-WP-Nonce');
    if (!$nonce || !wp_verify_nonce($nonce, 'wp_rest')) {
        return new WP_Error('magick_ad_invalid_nonce', 'Invalid nonce', array('status' => 403));
    }

    return true;
}

class Magick_AD_Engine {
    const OPTION_KEY = 'magick_ad_settings';

    public static function init() {
    }

    public static function rest_save_settings(WP_REST_Request $request) {
        $settings = $request->get_json_params();
        if (!is_array($settings)) {
            return new WP_Error('magick_ad_invalid_payload', 'Invalid payload', array('status' => 400));
        }

        $sanitized = self::sanitize_settings($settings);
        $validation = self::validate_settings($sanitized);
        if (is_wp_error($validation)) {
            return $validation;
        }
        update_option(self::OPTION_KEY, $sanitized);

        return rest_ensure_response(array(
            'success' => true,
            'saved' => $sanitized,
        ));
    }

    public static function rest_get_settings() {
        return rest_ensure_response(self::get_settings());
    }

    public static function get_settings() {
        $settings = get_option(self::OPTION_KEY, array('ads' => array()));
        if (!is_array($settings)) {
            $settings = array('ads' => array());
        }
        if (!isset($settings['ads']) || !is_array($settings['ads'])) {
            $settings['ads'] = array();
        }

        return $settings;
    }

    private static function sanitize_settings($settings) {
        $ads = array();
        if (isset($settings['ads']) && is_array($settings['ads'])) {
            foreach ($settings['ads'] as $ad) {
                $ads[] = self::sanitize_ad($ad);
            }
        }

        return array('ads' => $ads);
    }

    private static function validate_settings($settings) {
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            if (empty($options['show_position'])) {
                return new WP_Error(
                    'magick_ad_missing_position',
                    'show_position is required for each ad.',
                    array('status' => 400)
                );
            }
        }

        return true;
    }

    private static function sanitize_ad($ad) {
        $ad = is_array($ad) ? $ad : array();
        $options = isset($ad['options']) && is_array($ad['options']) ? $ad['options'] : array();
        $content = isset($ad['content']) && is_array($ad['content']) ? $ad['content'] : array();
        $image = isset($content['image']) && is_array($content['image']) ? $content['image'] : array();
        $container_style = isset($content['container_style']) && is_array($content['container_style'])
            ? $content['container_style']
            : array();
        $behavior = isset($content['behavior']) && is_array($content['behavior'])
            ? $content['behavior']
            : array();

        $sanitized_options = array(
            'enabled' => isset($options['enabled']) ? (bool) $options['enabled'] : true,
            'ad_type' => self::sanitize_choice(
                isset($options['ad_type']) ? $options['ad_type'] : 'global',
                array('global', 'targeted'),
                'global'
            ),
            'show_page' => self::sanitize_choice(
                isset($options['show_page']) ? $options['show_page'] : 'all',
                array('all', 'home', 'posts', 'pages', 'category', 'tag', 'search', '404', 'author', 'archive'),
                'all'
            ),
            'display_mode' => self::sanitize_choice(
                isset($options['display_mode']) ? $options['display_mode'] : 'show',
                array('show', 'random', 'hide'),
                'show'
            ),
            'show_position' => self::sanitize_choice(
                isset($options['show_position']) ? $options['show_position'] : '',
                array(
                    'top',
                    'content_before',
                    'content_after',
                    'bottom',
                    'post_top',
                    'paragraph_3',
                    'post_bottom',
                    'comments_top',
                    'comment_form_before',
                    'comment_form_after',
                    'comments_bottom',
                    'head',
                    'footer',
                    'content',
                    'popup',
                    'bar',
                ),
                ''
            ),
            'content_type' => self::sanitize_choice(
                isset($options['content_type']) ? $options['content_type'] : 'image',
                array('html', 'image', 'video', 'popup', 'bar'),
                'image'
            ),
            'insert_after' => isset($options['insert_after']) ? absint($options['insert_after']) : 2,
            'device' => self::sanitize_choice(
                isset($options['device']) ? $options['device'] : 'all',
                array('all', 'mobile', 'desktop'),
                'all'
            ),
            'login' => self::sanitize_choice(
                isset($options['login']) ? $options['login'] : 'all',
                array('all', 'logged-in', 'logged-out'),
                'all'
            ),
            'end_date' => self::sanitize_date(isset($options['end_date']) ? $options['end_date'] : ''),
            'target_type' => self::sanitize_choice(
                isset($options['target_type']) ? $options['target_type'] : '',
                array('posts', 'pages', 'category', 'tag', 'author'),
                ''
            ),
            'target_ids' => self::sanitize_ids(isset($options['target_ids']) ? $options['target_ids'] : array()),
        );

        $sanitized_content = array(
            'html' => isset($content['html']) ? wp_kses_post($content['html']) : '',
            'link' => isset($content['link']) ? esc_url_raw($content['link']) : '',
            'link_target' => !empty($content['link_target']),
            'image' => array(
                'id' => isset($image['id']) ? absint($image['id']) : 0,
                'url' => isset($image['url']) ? esc_url_raw($image['url']) : '',
                'alt' => isset($image['alt']) ? sanitize_text_field($image['alt']) : '',
            ),
            'container_style' => array(
                'mode' => self::sanitize_choice(
                    isset($container_style['mode']) ? $container_style['mode'] : 'boxed',
                    array('boxed', 'raw'),
                    'boxed'
                ),
                'max_width' => isset($container_style['max_width']) ? absint($container_style['max_width']) : 100,
                'max_width_unit' => self::sanitize_choice(
                    isset($container_style['max_width_unit']) ? $container_style['max_width_unit'] : '%',
                    array('%', 'px'),
                    '%'
                ),
                'padding_top' => isset($container_style['padding_top']) ? absint($container_style['padding_top']) : 0,
                'padding_right' => isset($container_style['padding_right']) ? absint($container_style['padding_right']) : 0,
                'padding_bottom' => isset($container_style['padding_bottom']) ? absint($container_style['padding_bottom']) : 0,
                'padding_left' => isset($container_style['padding_left']) ? absint($container_style['padding_left']) : 0,
                'background' => self::sanitize_color(isset($container_style['background']) ? $container_style['background'] : 'transparent'),
                'radius' => isset($container_style['radius']) ? absint($container_style['radius']) : 0,
                'shadow' => self::sanitize_choice(
                    isset($container_style['shadow']) ? $container_style['shadow'] : 'none',
                    array('none', 'soft', 'float'),
                    'none'
                ),
                'badge_enabled' => !empty($container_style['badge_enabled']),
                'badge_text' => self::sanitize_choice(
                    isset($container_style['badge_text']) ? $container_style['badge_text'] : '广告',
                    array('广告', '推广'),
                    '广告'
                ),
                'badge_color' => self::sanitize_color(isset($container_style['badge_color']) ? $container_style['badge_color'] : '#1d2327'),
                'layout' => self::sanitize_choice(
                    isset($container_style['layout']) ? $container_style['layout'] : '',
                    array('', 'centered'),
                    ''
                ),
            ),
            'behavior' => array(
                'animation' => self::sanitize_choice(
                    isset($behavior['animation']) ? $behavior['animation'] : 'none',
                    array('none', 'fade', 'slide-up', 'zoom'),
                    'none'
                ),
                'close_button' => !empty($behavior['close_button']),
                'delay' => isset($behavior['delay']) ? absint($behavior['delay']) : 0,
            ),
            'image_settings' => array(
                'watermark' => !empty($content['image_settings']['watermark']),
                'radius' => isset($content['image_settings']['radius']) ? absint($content['image_settings']['radius']) : 0,
                'max_width' => isset($content['image_settings']['max_width']) ? absint($content['image_settings']['max_width']) : 1200,
                'margin_top' => isset($content['image_settings']['margin_top']) ? absint($content['image_settings']['margin_top']) : 0,
                'margin_bottom' => isset($content['image_settings']['margin_bottom']) ? absint($content['image_settings']['margin_bottom']) : 0,
                'margin_left' => isset($content['image_settings']['margin_left']) ? absint($content['image_settings']['margin_left']) : 0,
                'margin_right' => isset($content['image_settings']['margin_right']) ? absint($content['image_settings']['margin_right']) : 0,
            ),
        );

        return array(
            'id' => isset($ad['id']) ? sanitize_text_field($ad['id']) : '',
            'name' => isset($ad['name']) ? sanitize_text_field($ad['name']) : '',
            'options' => $sanitized_options,
            'content' => $sanitized_content,
        );
    }

    private static function sanitize_choice($value, $allowed, $default) {
        $value = is_string($value) ? $value : '';
        return in_array($value, $allowed, true) ? $value : $default;
    }

    private static function sanitize_color($value) {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '' || $value === 'transparent') {
            return 'transparent';
        }
        if (preg_match('/^#([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i', $value)) {
            return $value;
        }
        if (preg_match('/^rgba?\\(([^)]+)\\)$/i', $value)) {
            return $value;
        }
        return 'transparent';
    }

    private static function sanitize_date($value) {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '') {
            return '';
        }
        $timestamp = strtotime($value);
        if ($timestamp === false) {
            return '';
        }
        return date('Y-m-d', $timestamp);
    }

    private static function sanitize_ids($value) {
        if (!is_array($value)) {
            return array();
        }
        $ids = array();
        foreach ($value as $id) {
            $id = absint($id);
            if ($id > 0) {
                $ids[] = $id;
            }
        }
        return array_values(array_unique($ids));
    }

}

class Magick_AD_Frontend {
    private static $loop_before_rendered = false;
    private static $loop_after_rendered = false;
    private static $comments_template_original = null;

    public static function init() {
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

    public static function rest_track(WP_REST_Request $request) {
        $payload = $request->get_json_params();
        if (!is_array($payload) || empty($payload['ad_id']) || empty($payload['event'])) {
            return new WP_Error('magick_ad_invalid_payload', 'Invalid payload', array('status' => 400));
        }

        $event = sanitize_text_field($payload['event']);
        if (!in_array($event, array('impression', 'click'), true)) {
            return new WP_Error('magick_ad_invalid_event', 'Invalid event', array('status' => 400));
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats';
        $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '';
        $page_url = isset($payload['page_url']) ? esc_url_raw($payload['page_url']) : esc_url_raw(home_url($request_uri));

        $data = array(
            'ad_id' => sanitize_text_field($payload['ad_id']),
            'event_type' => $event,
            'page_url' => $page_url,
            'device' => wp_is_mobile() ? 'mobile' : 'desktop',
            'user_id' => get_current_user_id(),
            'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT'])) : '',
            'created_at' => current_time('mysql'),
        );

        $format = array('%s', '%s', '%s', '%s', '%d', '%s', '%s');
        $inserted = $wpdb->insert($table, $data, $format);

        if ($inserted === false) {
            return new WP_Error('magick_ad_db_error', 'DB insert failed', array('status' => 500));
        }

        return rest_ensure_response(array('success' => true));
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
            $position = isset($options['show_position']) ? $options['show_position'] : '';
            if (in_array($position, array('content_before', 'post_top'), true)) {
                $prepend .= self::build_ad_markup($ad, $position);
                continue;
            }
            if (in_array($position, array('content_after', 'post_bottom'), true)) {
                $append .= self::build_ad_markup($ad, $position);
                continue;
            }
            if ($position === 'paragraph_3') {
                $markup = self::build_ad_markup($ad, $position);
                if ($markup) {
                    if (!isset($insert_map[3])) {
                        $insert_map[3] = array();
                    }
                    $insert_map[3][] = $markup;
                }
                continue;
            }
            if ($position !== 'content') {
                continue;
            }

            $insert_after = isset($options['insert_after']) ? absint($options['insert_after']) : 0;
            if ($insert_after < 1) {
                $insert_after = 2;
            }

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
            $position = isset($options['show_position']) ? $options['show_position'] : '';
            if ($position !== 'head') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, $position);
        }

        if ($markup) {
            echo self::wrap_zone_markup($markup, 'head');
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
            $position = isset($options['show_position']) ? $options['show_position'] : '';
            if (!in_array($position, array('footer', 'popup', 'bar', 'bottom'), true)) {
                continue;
            }
            $markup .= self::build_ad_markup($ad, $position);
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
            $position = isset($options['show_position']) ? $options['show_position'] : '';
            if ($position !== 'top') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, $position);
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
            $position = isset($options['show_position']) ? $options['show_position'] : '';
            if ($position !== 'content_before') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, $position);
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
            $position = isset($options['show_position']) ? $options['show_position'] : '';
            if ($position !== 'content_after') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, $position);
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
            $position = isset($options['show_position']) ? $options['show_position'] : '';
            if (in_array($position, array('comments_top', 'comments_bottom'), true)) {
                $needs_wrapper = true;
                break;
            }
        }

        if (!$needs_wrapper) {
            return $template;
        }

        self::$comments_template_original = $template;
        return plugin_dir_path(__FILE__) . 'templates/comments-wrapper.php';
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
            $position = isset($options['show_position']) ? $options['show_position'] : '';
            if ($position !== 'comments_top') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, $position);
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
            $position = isset($options['show_position']) ? $options['show_position'] : '';
            if ($position !== 'comments_bottom') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, $position);
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
            $position = isset($options['show_position']) ? $options['show_position'] : '';
            if ($position !== 'comment_form_before') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, $position);
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
            $position = isset($options['show_position']) ? $options['show_position'] : '';
            if ($position !== 'comment_form_after') {
                continue;
            }
            $markup .= self::build_ad_markup($ad, $position);
        }

        if ($markup) {
            echo self::wrap_zone_markup($markup, 'comment-form-after');
        }
    }

    private static function get_matching_ads() {
        $settings = Magick_AD_Engine::get_settings();
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
            return self::random_display($ad_id);
        }
        return true;
    }

    private static function random_display($ad_id) {
        static $cache = array();
        $time_bucket = (int) floor(current_time('timestamp') / 300);
        $key = ($ad_id ? $ad_id : uniqid('ad_', true)) . '|' . $time_bucket;
        if (isset($cache[$key])) {
            return $cache[$key];
        }

        $seed = '';
        $user_id = get_current_user_id();
        if ($user_id) {
            $seed = 'user:' . $user_id;
        } else {
            if (!isset($_COOKIE['magick_ad_uid']) || !is_string($_COOKIE['magick_ad_uid'])) {
                $uid = wp_generate_uuid4();
                setcookie('magick_ad_uid', $uid, time() + MONTH_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
                $_COOKIE['magick_ad_uid'] = $uid;
            }
            $seed = 'cookie:' . sanitize_text_field(wp_unslash($_COOKIE['magick_ad_uid']));
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
        if ($device === 'desktop') {
            return !wp_is_mobile();
        }

        return true;
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
        $content_type = isset($options['content_type']) ? $options['content_type'] : 'image';
        $html = isset($content['html']) ? $content['html'] : '';
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
        if ($content_type === 'html') {
            if ($html) {
                $mode = isset($container_style['mode']) ? $container_style['mode'] : 'boxed';
                if ($mode === 'raw') {
                    $body = $html;
                } else {
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

                    $body = '<div class="' . esc_attr(implode(' ', $classes)) . '"' . $style_attr . '>' . $badge_markup . $close_markup . '<div class="magick-ad-html-content">' . $html . '</div></div>';
                }
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
        } else {
            return '';
        }

        if (!$body) {
            return '';
        }

        $data_attrs = ' data-ad-id="' . esc_attr(isset($ad['id']) ? $ad['id'] : '') . '" data-ad-position="' . esc_attr($position) . '"';
        if ($content_type === 'html') {
            $delay = isset($behavior['delay']) ? absint($behavior['delay']) : 0;
            $animation = isset($behavior['animation']) ? $behavior['animation'] : 'none';
            if ($delay > 0) {
                $data_attrs .= ' data-ad-delay="' . esc_attr($delay) . '"';
            }
            if ($animation && $animation !== 'none') {
                $data_attrs .= ' data-ad-anim="' . esc_attr($animation) . '"';
            }
        }

        return '<div class="magick-ad-unit magick-ad-unit--' . esc_attr($position) . '"' . $data_attrs . '><div class="magick-ad-unit__inner">' . $body . '</div></div>';
    }

    private static function wrap_zone_markup($markup, $zone) {
        if (!$markup) {
            return '';
        }
        return '<div class="magick-ad-zone magick-ad-zone--' . esc_attr($zone) . '">' . $markup . '</div>';
    }
}

class Magick_AD_Reports {
    public static function rest_report(WP_REST_Request $request) {
        $days = absint($request->get_param('days'));
        if (!in_array($days, array(7, 30), true)) {
            $days = 7;
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats';

        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            return rest_ensure_response(self::build_empty_series($days));
        }

        $start = date('Y-m-d', current_time('timestamp') - ($days - 1) * DAY_IN_SECONDS);
        $sql = $wpdb->prepare(
            "SELECT DATE(created_at) AS date,
                SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) AS views,
                SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS clicks
             FROM {$table}
             WHERE created_at >= %s
             GROUP BY DATE(created_at)
             ORDER BY date ASC",
            $start
        );

        $rows = $wpdb->get_results($sql, ARRAY_A);
        $map = array();
        foreach ($rows as $row) {
            $map[$row['date']] = array(
                'date' => $row['date'],
                'views' => (int) $row['views'],
                'clicks' => (int) $row['clicks'],
            );
        }

        $series = array();
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', current_time('timestamp') - $i * DAY_IN_SECONDS);
            if (isset($map[$date])) {
                $series[] = $map[$date];
            } else {
                $series[] = array(
                    'date' => $date,
                    'views' => 0,
                    'clicks' => 0,
                );
            }
        }

        return rest_ensure_response($series);
    }

    private static function build_empty_series($days) {
        $series = array();
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', current_time('timestamp') - $i * DAY_IN_SECONDS);
            $series[] = array(
                'date' => $date,
                'views' => 0,
                'clicks' => 0,
            );
        }
        return $series;
    }
}

class Magick_AD_Debug_Settings {
    public static function rest_get() {
        $forced = (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG) ? true : false;
        $enabled = (get_option('magick_ad_debug', '0') === '1');
        $log_settings = (get_option('magick_ad_debug_log_settings', '1') === '1');
        return rest_ensure_response(array(
            'enabled' => $enabled,
            'forced' => $forced,
            'log_settings' => $log_settings,
        ));
    }

    public static function rest_update(WP_REST_Request $request) {
        $forced = (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG) ? true : false;
        $params = $request->get_json_params();
        $enabled = false;
        $log_settings = null;

        if (is_array($params) && array_key_exists('enabled', $params)) {
            $enabled = (bool) $params['enabled'];
        } else {
            $enabled = (bool) $request->get_param('enabled');
        }

        if (is_array($params) && array_key_exists('log_settings', $params)) {
            $log_settings = (bool) $params['log_settings'];
        } elseif ($request->has_param('log_settings')) {
            $log_settings = (bool) $request->get_param('log_settings');
        }

        if (!$forced) {
            update_option('magick_ad_debug', $enabled ? '1' : '0');
        } else {
            $enabled = true;
        }

        if ($log_settings !== null) {
            update_option('magick_ad_debug_log_settings', $log_settings ? '1' : '0');
        } else {
            $log_settings = (get_option('magick_ad_debug_log_settings', '1') === '1');
        }

        return rest_ensure_response(array(
            'enabled' => $enabled,
            'forced' => $forced,
            'log_settings' => $log_settings,
        ));
    }
}

Magick_AD_Engine::init();
Magick_AD_Frontend::init();

if (magick_ad_is_debug_enabled()) {
    require_once plugin_dir_path(__FILE__) . 'magick-ad-debug.php';
    Magick_AD_Debug::init();
}
