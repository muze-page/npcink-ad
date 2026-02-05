<?php

namespace MagickAD\REST;

use MagickAD\REST\Controllers\Debug_Controller;
use MagickAD\REST\Controllers\Reports_Controller;
use MagickAD\REST\Controllers\Render_Controller;
use MagickAD\REST\Controllers\Settings_Controller;
use MagickAD\REST\Controllers\System_Settings_Controller;
use MagickAD\REST\Controllers\Template_Categories_Controller;
use MagickAD\REST\Controllers\Template_Preferences_Controller;
use MagickAD\REST\Controllers\Track_Controller;
use MagickAD\Utils\Capabilities;

if (!defined('ABSPATH')) {
    exit;
}

final class Routes {
    public function register(): void {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes(): void {
        register_rest_route('magick-ad/v1', '/save-settings', array(
            'methods' => 'POST',
            'callback' => array(Settings_Controller::class, 'save'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/save-settings', array(
            'methods' => 'GET',
            'callback' => array(Settings_Controller::class, 'get'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/report', array(
            'methods' => 'GET',
            'callback' => array(Reports_Controller::class, 'report'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/report-dim', array(
            'methods' => 'GET',
            'callback' => array(Reports_Controller::class, 'report_dimensions'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/report-failures', array(
            'methods' => 'GET',
            'callback' => array(Reports_Controller::class, 'report_failures'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/report-variants', array(
            'methods' => 'GET',
            'callback' => array(Reports_Controller::class, 'report_variants'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/report-events', array(
            'methods' => 'GET',
            'callback' => array(Reports_Controller::class, 'report_events'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/debug', array(
            'methods' => 'GET',
            'callback' => array(Debug_Controller::class, 'get'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/debug', array(
            'methods' => 'POST',
            'callback' => array(Debug_Controller::class, 'update'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/system-settings', array(
            'methods' => 'GET',
            'callback' => array(System_Settings_Controller::class, 'get'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/system-settings', array(
            'methods' => 'POST',
            'callback' => array(System_Settings_Controller::class, 'update'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/track', array(
            'methods' => 'POST',
            'callback' => array(Track_Controller::class, 'track'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route('magick-ad/v1', '/render-ad', array(
            'methods' => 'POST',
            'callback' => array(Render_Controller::class, 'render'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route('magick-ad/v1', '/render-ads', array(
            'methods' => 'POST',
            'callback' => array(Render_Controller::class, 'render_batch'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route('magick-ad/v1', '/template-categories', array(
            'methods' => 'GET',
            'callback' => array(Template_Categories_Controller::class, 'get'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/template-categories', array(
            'methods' => 'POST',
            'callback' => array(Template_Categories_Controller::class, 'update'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/template-preferences', array(
            'methods' => 'GET',
            'callback' => array(Template_Preferences_Controller::class, 'get'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
        register_rest_route('magick-ad/v1', '/template-preferences', array(
            'methods' => 'POST',
            'callback' => array(Template_Preferences_Controller::class, 'update'),
            'permission_callback' => array(Capabilities::class, 'rest_can_manage'),
        ));
    }
}
