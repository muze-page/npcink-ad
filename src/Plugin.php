<?php

namespace MagickAD;

use MagickAD\Admin\Admin;
use MagickAD\Data\Template_CPT;
use MagickAD\Frontend\Frontend;
use MagickAD\REST\Routes;
use MagickAD\Utils\Debug;

if (!defined('ABSPATH')) {
    exit;
}

final class Plugin {
    private static $instance = null;

    public static function instance(): self {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {}

    public function init(): void {
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        add_action('init', array($this, 'register'));
    }

    public function load_textdomain(): void {
        load_plugin_textdomain('magick-ad', false, dirname(plugin_basename(MAGICK_AD_FILE)) . '/languages');
    }

    public function register(): void {
        (new Template_CPT())->register();
        (new Routes())->register();
        (new Frontend())->register();
        (new Debug())->register();

        if (is_admin()) {
            (new Admin())->register();
        }
    }
}
