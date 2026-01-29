<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

final class Schema {
    public const OPTION_KEY = 'magick_ad_db_version';

    public static function maybe_upgrade(): void {
        $stored = get_option(self::OPTION_KEY, '0');
        if (version_compare((string) $stored, (string) MAGICK_AD_DB_VERSION, '>=')) {
            return;
        }
        self::install();
    }

    public static function install(): void {
        global $wpdb;

        $table = $wpdb->prefix . 'magick_ad_stats';
        $log_table = $wpdb->prefix . 'magick_ad_stats_log';
        $charset_collate = $wpdb->get_charset_collate();

        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists === $table) {
            $has_impressions = $wpdb->get_var($wpdb->prepare(
                'SHOW COLUMNS FROM ' . $table . ' LIKE %s',
                'impressions'
            ));
            if (!$has_impressions) {
                $wpdb->query("DROP TABLE IF EXISTS {$table}");
            }
        }

        $sql = "CREATE TABLE {$table} (
            date date NOT NULL,
            ad_id varchar(191) NOT NULL,
            impressions bigint(20) unsigned NOT NULL DEFAULT 0,
            clicks bigint(20) unsigned NOT NULL DEFAULT 0,
            PRIMARY KEY  (date, ad_id),
            KEY ad_id (ad_id),
            KEY date (date)
        ) {$charset_collate};";

        $log_sql = "CREATE TABLE {$log_table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            ad_id varchar(191) NOT NULL,
            event_type varchar(20) NOT NULL,
            page_url text NOT NULL,
            user_agent text NOT NULL,
            user_id bigint(20) unsigned NOT NULL DEFAULT 0,
            created_at datetime NOT NULL,
            PRIMARY KEY  (id),
            KEY ad_id_created_at (ad_id, created_at),
            KEY created_at (created_at)
        ) {$charset_collate};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
        dbDelta($log_sql);

        update_option(self::OPTION_KEY, MAGICK_AD_DB_VERSION, false);
    }
}
