<?php

namespace MagickAD;

use MagickAD\Admin\Admin;
use MagickAD\Admin\Privacy;
use MagickAD\Admin\Site_Health;
use MagickAD\Blocks\Bindings;
use MagickAD\Blocks\Blocks;
use MagickAD\Blocks\Patterns;
use MagickAD\CLI\Smoke_Command;
use MagickAD\Data\Ads;
use MagickAD\Data\Ads_Migrator;
use MagickAD\Data\Placement_Migrator;
use MagickAD\Data\Schema;
use MagickAD\Data\Slot_Migrator;
use MagickAD\Data\Template_Migrator;
use MagickAD\Frontend\Frontend;
use MagickAD\Frontend\Template_Tags;
use MagickAD\REST\Routes;
use MagickAD\Utils\Debug;
use MagickAD\Utils\Diagnostics_Cron;

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
        add_action('admin_init', array($this, 'maybe_upgrade'));
    }

    public function load_textdomain(): void {
        load_plugin_textdomain('magick-ad', false, dirname(plugin_basename(MAGICK_AD_FILE)) . '/languages');
    }

    public function register(): void {
        (new Bindings())->register();
        (new Blocks())->register();
        (new Patterns())->register();
        (new Routes())->register();
        (new Frontend())->register();
        (new Template_Tags())->register();
        (new Debug())->register();
        (new Diagnostics_Cron())->register();
        Ads::register();

        if (is_admin()) {
            (new Admin())->register();
            (new Privacy())->register();
            (new Site_Health())->register();
        }

        if (defined('WP_CLI') && WP_CLI) {
            (new Smoke_Command())->register();
        }
    }

    public function maybe_upgrade(): void {
        Schema::maybe_upgrade();
        Template_Migrator::maybe_migrate();
        Ads_Migrator::maybe_migrate();
        Slot_Migrator::maybe_migrate();
        Placement_Migrator::maybe_migrate();
    }
}
