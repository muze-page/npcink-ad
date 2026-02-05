<?php
/**
 * Plugin Name: Magick AD
 * Description: Admin UI and settings endpoint for Magick AD.
 * Version: 0.1.0
 * Requires at least: 6.5
 * Tested up to: 6.9
 * Requires PHP: 8.1
 * Author: Magick AD
 * Text Domain: magick-ad
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

if (!defined('ABSPATH')) {
    exit;
}

if (version_compare(PHP_VERSION, '8.1', '<')) {
    if (is_admin()) {
        add_action('admin_notices', function () {
            if (!current_user_can('activate_plugins')) {
                return;
            }
            /* translators: 1: required PHP version, 2: current PHP version */
            $format = __('Magick AD 需要 PHP %1$s 或更高版本。当前版本：%2$s。插件已停用。', 'magick-ad');
            $message = sprintf($format, '8.1', PHP_VERSION);
            echo '<div class="notice notice-error"><p>' . esc_html($message) . '</p></div>';
        });
    }

    if (is_admin() && function_exists('deactivate_plugins')) {
        deactivate_plugins(plugin_basename(__FILE__));
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Deactivation redirect flag.
        if (isset($_GET['activate'])) {
            unset($_GET['activate']);
        }
    }
    return;
}

global $wp_version;
$wp_version = is_string($wp_version) ? $wp_version : get_bloginfo('version');
if (version_compare($wp_version, '6.5', '<')) {
    if (is_admin()) {
        add_action('admin_notices', function () use ($wp_version) {
            if (!current_user_can('activate_plugins')) {
                return;
            }
            /* translators: 1: required WordPress version, 2: current WordPress version */
            $format = __('Magick AD 需要 WordPress %1$s 或更高版本。当前版本：%2$s。插件已停用。', 'magick-ad');
            $message = sprintf($format, '6.5', $wp_version);
            echo '<div class="notice notice-error"><p>' . esc_html($message) . '</p></div>';
        });
    }

    if (is_admin() && function_exists('deactivate_plugins')) {
        deactivate_plugins(plugin_basename(__FILE__));
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Deactivation redirect flag.
        if (isset($_GET['activate'])) {
            unset($_GET['activate']);
        }
    }
    return;
}

define('MAGICK_AD_FILE', __FILE__);
define('MAGICK_AD_PATH', plugin_dir_path(__FILE__));
define('MAGICK_AD_URL', plugin_dir_url(__FILE__));
define('MAGICK_AD_VERSION', '0.1.0');
define('MAGICK_AD_DB_VERSION', '4');

spl_autoload_register(function ($class) {
    $prefix = 'MagickAD\\';
    if (strpos($class, $prefix) !== 0) {
        return;
    }

    $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
    $path = MAGICK_AD_PATH . 'src/' . $relative . '.php';

    if (file_exists($path)) {
        require $path;
    }
});

\MagickAD\Plugin::instance()->init();

add_filter('magick_ad_has_consent', function ($has_consent) {
    if ($has_consent) {
        return true;
    }

    // Prefer WordPress consent API when available.
    if (function_exists('wp_has_consent')) {
        if (wp_has_consent('statistics') || wp_has_consent('marketing')) {
            return true;
        }
    }

    // Fallback to a simple CMP cookie flag.
    $cookie_raw = isset($_COOKIE['magick_ad_consent'])
        ? sanitize_text_field(wp_unslash($_COOKIE['magick_ad_consent']))
        : '';
    if ($cookie_raw !== '') {
        $value = strtolower(trim($cookie_raw));
        return in_array($value, array('1', 'true', 'yes', 'y'), true);
    }

    return false;
});

register_activation_hook(MAGICK_AD_FILE, array('MagickAD\\Data\\Schema', 'install'));
register_activation_hook(MAGICK_AD_FILE, array('MagickAD\\Data\\Roles', 'install'));
