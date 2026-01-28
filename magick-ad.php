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

function magick_ad_render_app() {
    echo '<div class="wrap"><div id="magick-ad-app"></div></div>';
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

        $sanitized_options = array(
            'enabled' => isset($options['enabled']) ? (bool) $options['enabled'] : true,
            'show_page' => self::sanitize_choice(
                isset($options['show_page']) ? $options['show_page'] : 'all',
                array('all', 'posts', 'pages', 'home', 'archive'),
                'all'
            ),
            'show_position' => self::sanitize_choice(
                isset($options['show_position']) ? $options['show_position'] : '',
                array('head', 'footer', 'content', 'popup', 'bar'),
                ''
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
        );

        $sanitized_content = array(
            'html' => isset($content['html']) ? wp_kses_post($content['html']) : '',
            'link' => isset($content['link']) ? esc_url_raw($content['link']) : '',
            'image' => array(
                'id' => isset($image['id']) ? absint($image['id']) : 0,
                'url' => isset($image['url']) ? esc_url_raw($image['url']) : '',
                'alt' => isset($image['alt']) ? sanitize_text_field($image['alt']) : '',
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

}

class Magick_AD_Frontend {
    public static function init() {
        add_filter('the_content', array(__CLASS__, 'inject_content_ads'));
        add_action('wp_head', array(__CLASS__, 'render_head_ads'));
        add_action('wp_footer', array(__CLASS__, 'render_footer_ads'));
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
        foreach ($ads as $ad) {
            $options = isset($ad['options']) ? $ad['options'] : array();
            $position = isset($options['show_position']) ? $options['show_position'] : '';
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

        if (empty($insert_map)) {
            return $content;
        }

        return self::insert_after_paragraphs($content, $insert_map);
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
            $position = isset($options['show_position']) ? $options['show_position'] : '';
            if (!in_array($position, array('footer', 'popup', 'bar'), true)) {
                continue;
            }
            $markup .= self::build_ad_markup($ad, $position);
        }

        if ($markup) {
            echo '<div class="magick-ad-footer-container">' . $markup . '</div>';
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

        if (isset($options['enabled']) && !$options['enabled']) {
            return false;
        }

        if (!self::matches_show_page($options)) {
            return false;
        }

        if (!self::matches_device($options)) {
            return false;
        }

        if (!self::matches_login($options)) {
            return false;
        }

        return true;
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

        return true;
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
        $html = isset($content['html']) ? $content['html'] : '';
        $link = isset($content['link']) ? $content['link'] : '';
        $image = isset($content['image']) ? $content['image'] : array();

        $body = '';
        if ($html) {
            $body = $html;
        } elseif (!empty($image['url'])) {
            $img_tag = '<img src="' . esc_url($image['url']) . '" alt="' . esc_attr(isset($image['alt']) ? $image['alt'] : '') . '" />';
            if ($link) {
                $img_tag = '<a href="' . esc_url($link) . '" target="_blank" rel="noopener noreferrer">' . $img_tag . '</a>';
            }
            $body = $img_tag;
        }

        if (!$body) {
            return '';
        }

        return '<div class="magick-ad magick-ad--' . esc_attr($position) . '" data-ad-id="' . esc_attr(isset($ad['id']) ? $ad['id'] : '') . '">' . $body . '</div>';
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

Magick_AD_Engine::init();
Magick_AD_Frontend::init();

if (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG) {
    require_once plugin_dir_path(__FILE__) . 'magick-ad-debug.php';
    Magick_AD_Debug::init();
}
