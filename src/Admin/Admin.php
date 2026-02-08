<?php

namespace MagickAD\Admin;

if (!defined('ABSPATH')) {
    exit;
}

final class Admin {
    use Admin_App_Trait;
    use Admin_Debug_Trait;

    private const MENU_SLUG = 'magick-ad';
    private const MENU_ICON = 'dashicons-megaphone';
    private const MENU_POSITION = 60;
    private const SETTINGS_LEVEL_OPTION = 'magick_ad_settings_level';
    private const DEBUG_DEVICES = array('auto', 'mobile', 'tablet', 'desktop');
    private const DEBUG_LOGIN_STATES = array('auto', 'logged-in', 'logged-out');

    public function register(): void {
        add_action('admin_menu', array($this, 'register_menu'));
        if ($this->is_debug_enabled()) {
            add_action('admin_init', array($this, 'register_debug_settings'));
        }
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
    }

}
