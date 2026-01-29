<?php

namespace MagickAD\Blocks;

use MagickAD\Frontend\Frontend;

if (!defined('ABSPATH')) {
    exit;
}

final class Bindings {
    public function register(): void {
        if (!function_exists('register_block_bindings_source')) {
            return;
        }

        register_block_bindings_source(
            'magick-ad/dynamic',
            array(
                'label' => __('Magick AD Dynamic', 'magick-ad'),
                'get_value_callback' => array(__CLASS__, 'get_value'),
            )
        );
    }

    public static function get_value(array $args, array $block, array $context) {
        $type = isset($args['type']) ? sanitize_text_field($args['type']) : 'random';
        $pool = isset($args['pool']) && is_array($args['pool']) ? $args['pool'] : array();
        $pool = array_values(array_filter($pool, 'is_scalar'));

        if ($type === 'utm') {
            $param = isset($args['param']) ? sanitize_text_field($args['param']) : 'utm_source';
            $map = isset($args['map']) && is_array($args['map']) ? $args['map'] : array();
            $fallback = isset($args['fallback']) ? $args['fallback'] : '';
            $current = isset($_GET[$param]) ? sanitize_text_field(wp_unslash($_GET[$param])) : '';
            if ($current && isset($map[$current])) {
                return $map[$current];
            }
            return $fallback;
        }

        if ($type === 'pool' && empty($pool) && !empty($args['pool_id'])) {
            $pool = apply_filters(
                'magick_ad_binding_pool',
                array(),
                sanitize_text_field($args['pool_id']),
                $args,
                $block,
                $context
            );
            $pool = is_array($pool) ? array_values(array_filter($pool, 'is_scalar')) : array();
        }

        if (empty($pool)) {
            return null;
        }

        $mode = isset($args['mode']) ? sanitize_text_field($args['mode']) : 'request';
        $interval = isset($args['interval']) ? max(60, absint($args['interval'])) : 300;
        $bucket = (int) floor(current_time('timestamp') / $interval);
        $seed = self::get_seed($mode);
        $hash = md5($seed . '|' . $bucket . '|' . wp_json_encode($pool));
        $index = hexdec(substr($hash, 0, 6)) % count($pool);

        return $pool[$index];
    }

    private static function get_seed(string $mode): string {
        if ($mode === 'user' && is_user_logged_in()) {
            return 'user:' . get_current_user_id();
        }

        if ($mode === 'session' && isset($_COOKIE['magick_ad_uid']) && is_string($_COOKIE['magick_ad_uid'])) {
            return 'session:' . sanitize_text_field(wp_unslash($_COOKIE['magick_ad_uid']));
        }

        if ($mode === 'cookie') {
            if (!isset($_COOKIE['magick_ad_uid']) || !is_string($_COOKIE['magick_ad_uid'])) {
                $uid = wp_generate_uuid4();
                setcookie('magick_ad_uid', $uid, time() + MONTH_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
                $_COOKIE['magick_ad_uid'] = $uid;
            }
            return 'cookie:' . sanitize_text_field(wp_unslash($_COOKIE['magick_ad_uid']));
        }

        return 'request:' . wp_rand(0, 1000000);
    }
}
