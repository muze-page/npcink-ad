<?php

namespace MagickAD\Utils;

use MagickAD\Data\Settings;

if (!defined('ABSPATH')) {
    exit;
}

final class Debug {
    private static $logged_settings = false;
    private static $logged_hooks = array();

    public function register(): void {
        if (!Logger::is_debug_enabled()) {
            return;
        }

        add_action('init', array(self::class, 'log_settings'));
        add_action('wp_head', array(self::class, 'log_wp_head'), 1);
        add_filter('the_content', array(self::class, 'log_the_content'), 1);
        add_action('wp_footer', array(self::class, 'log_wp_footer'), 1);
    }

    public static function log_settings(): void {
        if (self::$logged_settings) {
            return;
        }
        self::$logged_settings = true;

        if (!Logger::is_settings_log_enabled()) {
            return;
        }

        $settings = Settings::get_runtime_settings();
        Logger::log('Magick AD Debug: settings=' . print_r($settings, true));
    }

    public static function log_wp_head(): void {
        self::log_once('wp_head', sprintf(
            'Magick AD Debug: wp_head fired. is_admin=%s is_singular=%s is_single=%s is_page=%s is_home=%s is_front_page=%s is_archive=%s is_user_logged_in=%s wp_is_mobile=%s',
            self::bool(is_admin()),
            self::bool(is_singular()),
            self::bool(is_single()),
            self::bool(is_page()),
            self::bool(is_home()),
            self::bool(is_front_page()),
            self::bool(is_archive()),
            self::bool(is_user_logged_in()),
            self::bool(wp_is_mobile())
        ));

        self::log_ad_filter_results();
    }

    public static function log_the_content(string $content): string {
        self::log_once('the_content', sprintf(
            'Magick AD Debug: the_content fired. in_the_loop=%s is_main_query=%s is_singular=%s',
            self::bool(in_the_loop()),
            self::bool(is_main_query()),
            self::bool(is_singular())
        ));

        return $content;
    }

    public static function log_wp_footer(): void {
        self::log_once('wp_footer', 'Magick AD Debug: wp_footer fired.');
    }

    private static function log_ad_filter_results(): void {
        $settings = Settings::get_runtime_settings();
        $ads = isset($settings['ads']) && is_array($settings['ads']) ? $settings['ads'] : array();

        if (empty($ads)) {
            Logger::log('Magick AD Debug: no ads found in settings.');
            return;
        }

        foreach ($ads as $ad) {
            $result = self::evaluate_ad($ad);
            $id = isset($ad['id']) ? $ad['id'] : '(no-id)';
            if ($result['allowed']) {
                Logger::log('Magick AD Debug: ad ' . $id . ' allowed=true');
            } else {
                Logger::log('Magick AD Debug: ad ' . $id . ' allowed=false reasons=' . implode('|', $result['reasons']));
            }
        }
    }

    private static function evaluate_ad(array $ad): array {
        $reasons = array();
        $options = isset($ad['options']) ? $ad['options'] : array();

        if (isset($options['enabled']) && !$options['enabled']) {
            $reasons[] = 'disabled';
        }

        $page = !empty($options['show_page']) ? $options['show_page'] : 'all';

        if ($page === 'posts' && !is_singular('post')) {
            $reasons[] = 'show_page=posts';
        }
        if ($page === 'pages' && !is_page()) {
            $reasons[] = 'show_page=pages';
        }
        if ($page === 'home' && !(is_home() || is_front_page())) {
            $reasons[] = 'show_page=home';
        }
        if ($page === 'archive' && !is_archive()) {
            $reasons[] = 'show_page=archive';
        }

        $device = isset($options['device']) ? $options['device'] : 'all';
        if ($device === 'mobile' && !wp_is_mobile()) {
            $reasons[] = 'device=mobile';
        }
        if ($device === 'desktop' && wp_is_mobile()) {
            $reasons[] = 'device=desktop';
        }

        $login = isset($options['login']) ? $options['login'] : 'all';
        if ($login === 'logged-in' && !is_user_logged_in()) {
            $reasons[] = 'login=logged-in';
        }
        if ($login === 'logged-out' && is_user_logged_in()) {
            $reasons[] = 'login=logged-out';
        }

        return array(
            'allowed' => empty($reasons),
            'reasons' => $reasons,
        );
    }

    private static function log_once(string $key, string $message): void {
        if (isset(self::$logged_hooks[$key])) {
            return;
        }
        self::$logged_hooks[$key] = true;
        Logger::log($message);
    }

    private static function bool(bool $value): string {
        return $value ? 'true' : 'false';
    }
}
