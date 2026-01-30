<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

final class Roles {
    public static function install(): void {
        add_role(
            'magick_ad_manager',
            __('Magick AD 管理员', 'magick-ad'),
            array(
                'read' => true,
                'manage_magick_ads' => true,
            )
        );

        $admin = get_role('administrator');
        if ($admin && !$admin->has_cap('manage_magick_ads')) {
            $admin->add_cap('manage_magick_ads');
        }
    }

    public static function uninstall(): void {
        remove_role('magick_ad_manager');

        $admin = get_role('administrator');
        if ($admin && $admin->has_cap('manage_magick_ads')) {
            $admin->remove_cap('manage_magick_ads');
        }
    }
}
