<?php

namespace MagickAD\Data;

use MagickAD\Utils\Diagnostics;

if (!defined('ABSPATH')) {
    exit;
}

final class Schema {
    public const OPTION_KEY = 'magick_ad_db_version';
    private const STATS_READY_KEY = 'magick_ad_stats_ready';
    private const LOG_READY_KEY = 'magick_ad_stats_log_ready';
    private const DIM_READY_KEY = 'magick_ad_stats_dim_ready';
    private const EVENT_READY_KEY = 'magick_ad_stats_event_ready';

    public static function stats_table(): string {
        return self::table_name('magick_ad_stats');
    }

    public static function log_table(): string {
        return self::table_name('magick_ad_stats_log');
    }

    public static function dim_table(): string {
        return self::table_name('magick_ad_stats_dim');
    }

    public static function variant_table(): string {
        return self::table_name('magick_ad_stats_variant');
    }

    public static function event_table(): string {
        return self::table_name('magick_ad_stats_event');
    }

    public static function maybe_upgrade(): void {
        $stored = get_option(self::OPTION_KEY, '0');
        if (version_compare((string) $stored, (string) MAGICK_AD_DB_VERSION, '>=') && self::is_schema_ready()) {
            return;
        }
        self::install();
    }

    public static function is_ready(): bool {
        return self::is_schema_ready();
    }

    public static function install(): void {
        global $wpdb;

        $table = self::stats_table();
        $log_table = self::log_table();
        $dim_table = self::dim_table();
        $variant_table = self::variant_table();
        $event_table = self::event_table();
        $charset_collate = $wpdb->get_charset_collate();

        if (self::table_exists($table) && !self::table_has_column($table, 'impressions')) {
            // phpcs:disable WordPress.DB.DirectDatabaseQuery.SchemaChange
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Schema change on custom table.
            $wpdb->query(
                $wpdb->prepare(
                    "ALTER TABLE %i
                     ADD COLUMN impressions bigint(20) unsigned NOT NULL DEFAULT 0
                     AFTER ad_id",
                    $table
                )
            );
            // phpcs:enable WordPress.DB.DirectDatabaseQuery.SchemaChange
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
            KEY user_id_created_at (user_id, created_at),
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

        $variant_sql = "CREATE TABLE {$variant_table} (
            date date NOT NULL,
            ad_id varchar(191) NOT NULL,
            variant_id varchar(191) NOT NULL,
            impressions bigint(20) unsigned NOT NULL DEFAULT 0,
            clicks bigint(20) unsigned NOT NULL DEFAULT 0,
            PRIMARY KEY  (date, ad_id, variant_id),
            KEY ad_id (ad_id),
            KEY variant_id (variant_id)
        ) {$charset_collate};";

        $event_sql = "CREATE TABLE {$event_table} (
            date date NOT NULL,
            ad_id varchar(191) NOT NULL,
            event varchar(64) NOT NULL,
            variant_id varchar(191) NOT NULL DEFAULT '',
            count bigint(20) unsigned NOT NULL DEFAULT 0,
            PRIMARY KEY  (date, ad_id, event, variant_id),
            KEY ad_id (ad_id),
            KEY event (event),
            KEY variant_id (variant_id)
        ) {$charset_collate};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- dbDelta handles schema.
        dbDelta($sql);
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- dbDelta handles schema.
        dbDelta($log_sql);
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- dbDelta handles schema.
        dbDelta($dim_sql);
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- dbDelta handles schema.
        dbDelta($variant_sql);
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- dbDelta handles schema.
        dbDelta($event_sql);

        update_option(self::OPTION_KEY, MAGICK_AD_DB_VERSION, false);
        update_option(self::STATS_READY_KEY, (string) MAGICK_AD_DB_VERSION, false);
        update_option(self::LOG_READY_KEY, (string) MAGICK_AD_DB_VERSION, false);
        update_option(self::DIM_READY_KEY, (string) MAGICK_AD_DB_VERSION, false);
        update_option(self::EVENT_READY_KEY, (string) MAGICK_AD_DB_VERSION, false);
        add_option('magick_ad_slot_client_resolver', '1', '', false);
        add_option('magick_ad_html_sandbox', '1', '', false);
        add_option('magick_ad_trusted_proxies', array(), '', false);
        add_option('magick_ad_block_editor_enabled', '0', '', false);
        add_option('magick_ad_track_secret_prev', '', '', false);
        add_option('magick_ad_track_secret_rotated_at', 0, '', false);
        add_option('magick_ad_track_secret_grace_seconds', HOUR_IN_SECONDS, '', false);
        add_option('magick_ad_stats_write_mode', 'async', '', false);
        add_option('magick_ad_rate_limit_fallback', 'off', '', false);
        $site_domain = wp_parse_url(home_url(), PHP_URL_HOST);
        if (is_string($site_domain) && $site_domain !== '') {
            $site_domain = strtolower($site_domain);
            add_option('magick_ad_html_script_allowlist', array($site_domain), '', false);
        } else {
            add_option('magick_ad_html_script_allowlist', array(), '', false);
        }
        add_option('magick_ad_html_script_blocklist', array(), '', false);
    }

    private static function is_schema_ready(): bool {
        global $wpdb;
        $table = self::stats_table();
        if (!self::table_exists($table)) {
            return false;
        }
        if (!self::table_has_column($table, 'impressions')) {
            return false;
        }
        $dim_table = self::dim_table();
        if (!self::table_exists($dim_table)) {
            return false;
        }
        $variant_table = self::variant_table();
        if (!self::table_exists($variant_table)) {
            return false;
        }
        $event_table = self::event_table();
        if (!self::table_exists($event_table)) {
            return false;
        }
        if (Diagnostics::is_enabled()) {
            $log_table = self::log_table();
            if (!self::table_exists($log_table)) {
                return false;
            }
        }
        return true;
    }

    public static function get_table_status(): array {
        $stats_table = self::stats_table();
        $log_table = self::log_table();
        $dim_table = self::dim_table();

        $stats_exists = self::table_exists($stats_table);
        $stats_ready = $stats_exists && self::table_has_column($stats_table, 'impressions');
        $log_exists = self::table_exists($log_table);
        $variant_table = self::variant_table();
        $variant_exists = self::table_exists($variant_table);
        $event_table = self::event_table();
        $event_exists = self::table_exists($event_table);
        $dim_exists = self::table_exists($dim_table);
        $dim_ready = $dim_exists
            && self::table_has_column($dim_table, 'impressions')
            && self::table_has_column($dim_table, 'clicks');

        return array(
            'stats' => $stats_ready,
            'log' => $log_exists,
            'dim' => $dim_ready,
            'variant' => $variant_exists,
            'event' => $event_exists,
        );
    }

    private static function table_exists(string $table): bool {
        global $wpdb;
        static $cache = array();
        if (array_key_exists($table, $cache)) {
            return $cache[$table];
        }
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Read-only schema check.
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        $cache[$table] = ($exists === $table);
        return $cache[$table];
    }

    private static function table_has_column(string $table, string $column): bool {
        global $wpdb;
        static $cache = array();
        $cache_key = $table . '|' . $column;
        if (array_key_exists($cache_key, $cache)) {
            return $cache[$cache_key];
        }
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Read-only schema check.
        $value = $wpdb->get_var(
            $wpdb->prepare(
                'SHOW COLUMNS FROM %i LIKE %s',
                $table,
                $column
            )
        );
        $cache[$cache_key] = !empty($value);
        return $cache[$cache_key];
    }

    private static function table_name(string $table): string {
        global $wpdb;
        return $wpdb->prefix . $table;
    }
}
