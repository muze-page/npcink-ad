<?php

namespace MagickAD\REST\Controllers;

use WP_REST_Request;

if (!defined('ABSPATH')) {
    exit;
}

final class Debug_Controller {
    private static function is_debug_enabled(): bool {
        return (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG);
    }

    public static function get() {
        if (!self::is_debug_enabled()) {
            return rest_ensure_response(array('enabled' => false));
        }

        $forced = (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG) ? true : false;
        $enabled = (get_option('magick_ad_debug', '0') === '1');
        $log_settings = (get_option('magick_ad_debug_log_settings', '1') === '1');
        $build_probe = (get_option('magick_ad_debug_build_probe', '0') === '1');
        return rest_ensure_response(array(
            'enabled' => $enabled,
            'forced' => $forced,
            'log_settings' => $log_settings,
            'build_probe' => $build_probe,
        ));
    }

    public static function update(WP_REST_Request $request) {
        if (!self::is_debug_enabled()) {
            return rest_ensure_response(array('enabled' => false));
        }

        $forced = (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG) ? true : false;
        $params = $request->get_json_params();
        $enabled = false;
        $log_settings = null;
        $build_probe = null;

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

        if (is_array($params) && array_key_exists('build_probe', $params)) {
            $build_probe = (bool) $params['build_probe'];
        } elseif ($request->has_param('build_probe')) {
            $build_probe = (bool) $request->get_param('build_probe');
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

        if ($build_probe !== null) {
            update_option('magick_ad_debug_build_probe', $build_probe ? '1' : '0');
        } else {
            $build_probe = (get_option('magick_ad_debug_build_probe', '0') === '1');
        }

        return rest_ensure_response(array(
            'enabled' => $enabled,
            'forced' => $forced,
            'log_settings' => $log_settings,
            'build_probe' => $build_probe,
        ));
    }
}
