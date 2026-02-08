<?php

namespace MagickAD\REST;

use MagickAD\REST\Controllers\Debug_Controller;
use MagickAD\REST\Controllers\Reports_Controller;
use MagickAD\REST\Controllers\Compatibility_Report_Controller;
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
    private const ROUTE_NAMESPACE = 'magick-ad/v1';

    public function register(): void {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes(): void {
        foreach ($this->get_route_definitions() as $route) {
            $this->register_route($route);
        }
        if (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG) {
            foreach ($this->get_debug_route_definitions() as $route) {
                $this->register_route($route);
            }
        }
    }

    private function register_route(array $route): void {
        register_rest_route(self::ROUTE_NAMESPACE, (string) $route['path'], array(
            'methods' => (string) $route['methods'],
            'callback' => $route['callback'],
            'permission_callback' => $route['permission_callback'],
        ));
    }

    private function get_route_definitions(): array {
        $manage = array(Capabilities::class, 'rest_can_manage');

        return array(
            array(
                'path' => '/save-settings',
                'methods' => 'POST',
                'callback' => array(Settings_Controller::class, 'save'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/save-settings',
                'methods' => 'GET',
                'callback' => array(Settings_Controller::class, 'get'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/report',
                'methods' => 'GET',
                'callback' => array(Reports_Controller::class, 'report'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/report-dim',
                'methods' => 'GET',
                'callback' => array(Reports_Controller::class, 'report_dimensions'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/report-failures',
                'methods' => 'GET',
                'callback' => array(Reports_Controller::class, 'report_failures'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/report-variants',
                'methods' => 'GET',
                'callback' => array(Reports_Controller::class, 'report_variants'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/report-events',
                'methods' => 'GET',
                'callback' => array(Reports_Controller::class, 'report_events'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/compatibility-report',
                'methods' => 'GET',
                'callback' => array(Compatibility_Report_Controller::class, 'get'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/system-settings',
                'methods' => 'GET',
                'callback' => array(System_Settings_Controller::class, 'get'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/system-settings',
                'methods' => 'POST',
                'callback' => array(System_Settings_Controller::class, 'update'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/track',
                'methods' => 'POST',
                'callback' => array(Track_Controller::class, 'track'),
                'permission_callback' => '__return_true',
            ),
            array(
                'path' => '/render-ad',
                'methods' => 'POST',
                'callback' => array(Render_Controller::class, 'render'),
                'permission_callback' => '__return_true',
            ),
            array(
                'path' => '/render-ads',
                'methods' => 'POST',
                'callback' => array(Render_Controller::class, 'render_batch'),
                'permission_callback' => '__return_true',
            ),
            array(
                'path' => '/template-categories',
                'methods' => 'GET',
                'callback' => array(Template_Categories_Controller::class, 'get'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/template-categories',
                'methods' => 'POST',
                'callback' => array(Template_Categories_Controller::class, 'update'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/template-preferences',
                'methods' => 'GET',
                'callback' => array(Template_Preferences_Controller::class, 'get'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/template-preferences',
                'methods' => 'POST',
                'callback' => array(Template_Preferences_Controller::class, 'update'),
                'permission_callback' => $manage,
            ),
        );
    }

    private function get_debug_route_definitions(): array {
        $manage = array(Capabilities::class, 'rest_can_manage');

        return array(
            array(
                'path' => '/debug',
                'methods' => 'GET',
                'callback' => array(Debug_Controller::class, 'get'),
                'permission_callback' => $manage,
            ),
            array(
                'path' => '/debug',
                'methods' => 'POST',
                'callback' => array(Debug_Controller::class, 'update'),
                'permission_callback' => $manage,
            ),
        );
    }
}
