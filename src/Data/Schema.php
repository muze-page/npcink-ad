<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

final class Schema {
    public const OPTION_KEY = 'magick_ad_db_version';
    private const STATS_READY_KEY = 'magick_ad_stats_ready';
    private const LOG_READY_KEY = 'magick_ad_stats_log_ready';
    private const DIM_READY_KEY = 'magick_ad_stats_dim_ready';

    public static function maybe_upgrade(): void {
        $stored = get_option(self::OPTION_KEY, '0');
        if (version_compare((string) $stored, (string) MAGICK_AD_DB_VERSION, '>=') && self::is_schema_ready()) {
            return;
        }
        self::install();
    }

    public static function install(): void {
        global $wpdb;

        $table = $wpdb->prefix . 'magick_ad_stats';
        $log_table = $wpdb->prefix . 'magick_ad_stats_log';
        $dim_table = $wpdb->prefix . 'magick_ad_stats_dim';
        $charset_collate = $wpdb->get_charset_collate();

        if (self::table_exists($table) && !self::table_has_column($table, 'impressions')) {
            $wpdb->query(
                "ALTER TABLE {$table}
                 ADD COLUMN impressions bigint(20) unsigned NOT NULL DEFAULT 0
                 AFTER ad_id"
            );
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

        $dim_sql = "CREATE TABLE {$dim_table} (
            date date NOT NULL,
            ad_id varchar(191) NOT NULL,
            slot varchar(191) NOT NULL DEFAULT '',
            position varchar(191) NOT NULL DEFAULT '',
            container varchar(191) NOT NULL DEFAULT '',
            impressions bigint(20) unsigned NOT NULL DEFAULT 0,
            clicks bigint(20) unsigned NOT NULL DEFAULT 0,
            PRIMARY KEY  (date, ad_id, slot, position, container),
            KEY ad_id (ad_id),
            KEY slot (slot),
            KEY position (position),
            KEY container (container)
        ) {$charset_collate};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
        dbDelta($log_sql);
        dbDelta($dim_sql);

        update_option(self::OPTION_KEY, MAGICK_AD_DB_VERSION, false);
        update_option(self::STATS_READY_KEY, (string) MAGICK_AD_DB_VERSION, false);
        update_option(self::LOG_READY_KEY, (string) MAGICK_AD_DB_VERSION, false);
        update_option(self::DIM_READY_KEY, (string) MAGICK_AD_DB_VERSION, false);
        add_option('magick_ad_slot_client_resolver', '1', '', false);
        add_option('magick_ad_html_sandbox', '0', '', false);
    }

    private static function is_schema_ready(): bool {
        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats';
        if (!self::table_exists($table)) {
            return false;
        }
        if (!self::table_has_column($table, 'impressions')) {
            return false;
        }
        $dim_table = $wpdb->prefix . 'magick_ad_stats_dim';
        if (!self::table_exists($dim_table)) {
            return false;
        }
        $diagnostics_enabled = (get_option('magick_ad_stats_diagnostics', '0') === '1');
        $diagnostics_enabled = (bool) apply_filters('magick_ad_stats_diagnostics_enabled', $diagnostics_enabled);
        if ($diagnostics_enabled) {
            $log_table = $wpdb->prefix . 'magick_ad_stats_log';
            if (!self::table_exists($log_table)) {
                return false;
            }
        }
        return true;
    }

    private static function table_exists(string $table): bool {
        global $wpdb;
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        return $exists === $table;
    }

    private static function table_has_column(string $table, string $column): bool {
        global $wpdb;
        $value = $wpdb->get_var(
            $wpdb->prepare(
                'SHOW COLUMNS FROM ' . $table . ' LIKE %s',
                $column
            )
        );
        return !empty($value);
    }
}
