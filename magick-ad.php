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

function magick_ad_register_rest_routes() {
    register_rest_route('magick-ad/v1', '/save-settings', array(
        'methods' => 'POST',
        'callback' => 'magick_ad_save_settings',
        'permission_callback' => 'magick_ad_can_manage',
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

function magick_ad_save_settings(WP_REST_Request $request) {
    $settings = $request->get_json_params();
    if (!is_array($settings)) {
        return new WP_Error('magick_ad_invalid_payload', 'Invalid payload', array('status' => 400));
    }

    update_option('magick_ad_settings', $settings);

    return rest_ensure_response(array(
        'success' => true,
        'saved' => $settings,
    ));
}
