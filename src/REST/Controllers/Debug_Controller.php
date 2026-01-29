<?php

namespace MagickAD\REST\Controllers;

use WP_REST_Request;

if (!defined('ABSPATH')) {
    exit;
}

final class Debug_Controller {
    public static function get() {
        $forced = (defined('MAGICK_AD_DEBUG') && MAGICK_AD_DEBUG) ? true : false;
        $enabled = (get_option('magick_ad_debug', '0') === '1');
        $log_settings = (get_option('magick_ad_debug_log_settings', '1') === '1');
        return rest_ensure_response(array(
            'enabled' => $enabled,
            'forced' => $forced,
            'log_settings' => $log_settings,
        ));
    }

    public static function update(WP_REST_Request $request) {
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
