<?php

namespace MagickAD\CLI;

use MagickAD\Data\Schema;
use MagickAD\Data\Settings;
use MagickAD\Utils\Stats_Accumulator;
use MagickAD\Utils\Stats_Queue;
use MagickAD\Utils\Tracking_Signature;
use WP_CLI;

if (!defined('ABSPATH')) {
    exit;
}

final class Magick_Command {
    public function register(): void {
        if (!class_exists('WP_CLI')) {
            return;
        }

        WP_CLI::add_command('magick-ad runtime rebuild', array($this, 'runtime_rebuild'));
        WP_CLI::add_command('magick-ad stats flush', array($this, 'stats_flush'));
        WP_CLI::add_command('magick-ad secret rotate', array($this, 'secret_rotate'));
        WP_CLI::add_command('magick-ad diagnose export', array($this, 'diagnose_export'));
    }

    /**
     * Rebuild runtime cache.
     *
     * ## OPTIONS
     *
     * [--quiet]
     * : Suppress output.
     */
    public function runtime_rebuild(array $args, array $assoc_args): void {
        Settings::refresh_runtime_cache();
        $rev = (int) get_option(Settings::RUNTIME_REV_KEY, 0);
        if (!empty($assoc_args['quiet'])) {
            return;
        }
        WP_CLI::success("Runtime cache rebuilt (rev {$rev}).");
    }

    /**
     * Flush stats accumulator cache.
     *
     * ## OPTIONS
     *
     * [--quiet]
     * : Suppress output.
     */
    public function stats_flush(array $args, array $assoc_args): void {
        Stats_Accumulator::flush();
        Stats_Queue::flush();
        if (!empty($assoc_args['quiet'])) {
            return;
        }
        WP_CLI::success('Stats cache flushed.');
    }

    /**
     * Rotate tracking signature secret.
     *
     * ## OPTIONS
     *
     * [--quiet]
     * : Suppress output.
     */
    public function secret_rotate(array $args, array $assoc_args): void {
        Tracking_Signature::rotate_secret();
        if (!empty($assoc_args['quiet'])) {
            return;
        }
        $rotated_at = (int) get_option('magick_ad_track_secret_rotated_at', 0);
        $label = $rotated_at ? date_i18n('Y-m-d H:i:s', $rotated_at) : 'unknown';
        WP_CLI::success("Tracking secret rotated at {$label}.");
    }

    /**
     * Export diagnostics logs.
     *
     * ## OPTIONS
     *
     * [--format=<format>]
     * : Output format. Options: json, csv. Default: json.
     *
     * [--limit=<limit>]
     * : Number of rows to export. Default: 500. Use 0 for no limit.
     *
     * [--offset=<offset>]
     * : Offset rows. Default: 0.
     *
     * [--file=<path>]
     * : Write output to a file instead of stdout.
     */
    public function diagnose_export(array $args, array $assoc_args): void {
        global $wpdb;

        $format = isset($assoc_args['format']) ? (string) $assoc_args['format'] : 'json';
        $limit = isset($assoc_args['limit']) ? (int) $assoc_args['limit'] : 500;
        $offset = isset($assoc_args['offset']) ? (int) $assoc_args['offset'] : 0;
        $file = isset($assoc_args['file']) ? (string) $assoc_args['file'] : '';

        $table = Schema::log_table();
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Read-only schema check.
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            WP_CLI::error('Diagnostics log table not found.');
        }

        if ($limit > 0) {
            $safe_offset = max(0, $offset);
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table export.
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT id, ad_id, event_type, page_url, user_agent, user_id, created_at
                     FROM %i
                     ORDER BY id DESC
                     LIMIT %d OFFSET %d",
                    $table,
                    $limit,
                    $safe_offset
                ),
                ARRAY_A
            );
        } else {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table export.
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT id, ad_id, event_type, page_url, user_agent, user_id, created_at
                     FROM %i
                     ORDER BY id DESC",
                    $table
                ),
                ARRAY_A
            );
        }

        if (!is_array($rows)) {
            WP_CLI::error('Failed to read diagnostics logs.');
        }

        if ($format === 'csv') {
            $output = $this->format_csv($rows);
        } else {
            $output = wp_json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }

        if ($file !== '') {
            $written = file_put_contents($file, $output);
            if ($written === false) {
                WP_CLI::error('Failed to write export file.');
            }
            WP_CLI::success("Diagnostics exported to {$file}.");
            return;
        }

        WP_CLI::line($output);
    }

    private function format_csv(array $rows): string {
        if (empty($rows)) {
            return '';
        }
        $lines = array();
        $lines[] = $this->format_csv_row(array_keys($rows[0]));
        foreach ($rows as $row) {
            $lines[] = $this->format_csv_row($row);
        }

        return implode("\n", $lines);
    }

    private function format_csv_row(array $row): string {
        $escaped = array();
        foreach ($row as $value) {
            $escaped[] = $this->escape_csv_field($value);
        }
        return implode(',', $escaped);
    }

    private function escape_csv_field(mixed $value): string {
        $string = (string) $value;
        $string = str_replace('"', '""', $string);
        if (preg_match('/[",\\r\\n]/', $string)) {
            $string = '"' . $string . '"';
        }
        return $string;
    }
}
