<?php
/**
 * Plugin Name: Magick AD
 * Description: Admin UI and settings endpoint for Magick AD.
 * Version: 0.1.0
 * Author: Magick AD
 * Text Domain: magick-ad
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MAGICK_AD_FILE', __FILE__);
define('MAGICK_AD_PATH', plugin_dir_path(__FILE__));
define('MAGICK_AD_URL', plugin_dir_url(__FILE__));
define('MAGICK_AD_VERSION', '0.1.0');
define('MAGICK_AD_DB_VERSION', '3');

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

register_activation_hook(MAGICK_AD_FILE, array('MagickAD\\Data\\Schema', 'install'));
register_activation_hook(MAGICK_AD_FILE, array('MagickAD\\Data\\Roles', 'install'));
