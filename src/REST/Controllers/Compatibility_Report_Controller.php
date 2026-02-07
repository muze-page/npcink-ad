<?php

namespace MagickAD\REST\Controllers;

use WP_REST_Request;
use MagickAD\Admin\Site_Health;
use MagickAD\Data\Schema;
use MagickAD\Utils\Consent;
use MagickAD\Utils\Stats_Queue;
use MagickAD\Utils\Stats_Cron;
use MagickAD\Utils\Stats_Dim_Cron;
use MagickAD\Utils\Diagnostics_Cron;

if (!defined('ABSPATH')) {
    exit;
}

final class Compatibility_Report_Controller {
    public static function get(WP_REST_Request $request) {
        $report = self::build_report();
        $format = sanitize_key((string) $request->get_param('format'));
        if ($format === 'markdown') {
            return rest_ensure_response(array(
                'generated_at' => $report['generated_at'],
                'filename' => 'magick-ad-compatibility-' . gmdate('Ymd-His') . '.md',
                'content' => self::to_markdown($report),
            ));
        }

        return rest_ensure_response($report);
    }

    private static function build_report(): array {
        global $wpdb;

        $site_health = new Site_Health();
        $checks = array(
            'node' => self::summarize_health_test($site_health->test_node_placement()),
            'cron' => self::summarize_health_test($site_health->test_cron_health()),
            'queue' => self::summarize_health_test($site_health->test_stats_queue()),
            'consent' => self::summarize_health_test($site_health->test_consent_hook()),
        );
        $status = self::merge_status(array(
            $checks['node']['status'],
            $checks['cron']['status'],
            $checks['queue']['status'],
            $checks['consent']['status'],
        ));

        $queue = Stats_Queue::get_metrics();
        $table_status = Schema::get_table_status();
        $consent_summary = Consent::detect_signal_summary();
        $now = current_time('timestamp');

        $report = array(
            'generated_at' => $now,
            'generated_at_iso' => gmdate('c', $now),
            'overall_status' => $status,
            'environment' => array(
                'plugin_version' => MAGICK_AD_VERSION,
                'db_version' => MAGICK_AD_DB_VERSION,
                'wordpress_version' => get_bloginfo('version'),
                'php_version' => PHP_VERSION,
                'mysql_version' => method_exists($wpdb, 'db_version') ? (string) $wpdb->db_version() : '',
                'site_url' => site_url('/'),
                'home_url' => home_url('/'),
                'environment_type' => function_exists('wp_get_environment_type')
                    ? wp_get_environment_type()
                    : 'unknown',
                'locale' => get_locale(),
                'timezone' => wp_timezone_string(),
                'object_cache' => wp_using_ext_object_cache(),
                'page_cache_detected' => self::is_page_cache_detected(),
            ),
            'runtime' => array(
                'settings_level' => (string) get_option('magick_ad_settings_level', 'simple'),
                'tracking_enabled' => (get_option('magick_ad_tracking_enabled', '1') === '1'),
                'tracking_strategy' => (string) get_option('magick_ad_tracking_strategy', 'session'),
                'tracking_require_consent' => (get_option('magick_ad_tracking_require_consent', '0') === '1'),
                'tracking_require_signature' => (get_option('magick_ad_track_require_signature', '1') === '1'),
                'stats_write_mode' => (string) get_option('magick_ad_stats_write_mode', 'async'),
                'slot_client_resolver' => (get_option('magick_ad_slot_client_resolver', '1') === '1'),
                'html_sandbox' => (get_option('magick_ad_html_sandbox', '1') === '1'),
            ),
            'tables' => $table_status,
            'queue' => $queue,
            'cron' => array(
                'stats_flush_next' => (int) wp_next_scheduled(Stats_Cron::HOOK),
                'dim_cleanup_next' => (int) wp_next_scheduled(Stats_Dim_Cron::HOOK),
                'diagnostics_cleanup_next' => (int) wp_next_scheduled(Diagnostics_Cron::HOOK),
            ),
            'consent' => array(
                'hook_registered' => has_filter('magick_ad_has_consent'),
                'detected' => $consent_summary['detected'] ?? null,
                'signals' => $consent_summary['signals'] ?? array(),
            ),
            'checks' => $checks,
        );
        $report['risks'] = self::build_risks($report);

        return $report;
    }

    private static function summarize_health_test(array $test): array {
        $status = self::normalize_status($test['status'] ?? '');
        $label = isset($test['label']) ? wp_strip_all_tags((string) $test['label']) : '';
        $description = isset($test['description']) ? wp_strip_all_tags((string) $test['description']) : '';

        return array(
            'status' => $status,
            'summary' => $label,
            'action' => $description,
        );
    }

    private static function normalize_status($status): string {
        $status = is_string($status) ? $status : '';
        if (in_array($status, array('good', 'recommended', 'critical'), true)) {
            return $status;
        }
        return 'recommended';
    }

    private static function merge_status(array $statuses): string {
        if (in_array('critical', $statuses, true)) {
            return 'critical';
        }
        if (in_array('recommended', $statuses, true)) {
            return 'recommended';
        }
        return 'good';
    }

    private static function is_page_cache_detected(): bool {
        if (defined('WP_CACHE') && WP_CACHE) {
            return true;
        }
        if (defined('WPCACHEHOME')) {
            return true;
        }
        return is_readable(WP_CONTENT_DIR . '/advanced-cache.php');
    }

    private static function build_risks(array $report): array {
        $risks = array();
        $tables = isset($report['tables']) && is_array($report['tables']) ? $report['tables'] : array();
        $queue = isset($report['queue']) && is_array($report['queue']) ? $report['queue'] : array();
        $runtime = isset($report['runtime']) && is_array($report['runtime']) ? $report['runtime'] : array();
        $environment = isset($report['environment']) && is_array($report['environment']) ? $report['environment'] : array();

        if (empty($tables['stats'])) {
            $risks[] = array(
                'level' => 'critical',
                'key' => 'stats_table_missing',
                'title' => '统计主表未就绪',
                'action' => '重新激活插件或执行数据库升级流程，确认 wp_magick_ad_stats 可写。',
            );
        }

        $queue_total = (int) ($queue['total'] ?? 0);
        $queue_oldest_age = (int) ($queue['oldest_age'] ?? 0);
        $queue_limit = (int) ($queue['alert_limit'] ?? 300);
        $queue_age_limit = (int) ($queue['alert_age'] ?? 900);
        if (
            $queue_total >= max(1, $queue_limit * 2)
            || $queue_oldest_age >= max(60, $queue_age_limit * 2)
        ) {
            $risks[] = array(
                'level' => 'critical',
                'key' => 'queue_backlog_critical',
                'title' => '统计队列严重积压',
                'action' => '优先检查 WP-Cron 触发与数据库负载，必要时临时切换同步写入并扩容数据库。',
            );
        } elseif (
            $queue_total >= max(1, $queue_limit)
            || $queue_oldest_age >= max(60, $queue_age_limit)
        ) {
            $risks[] = array(
                'level' => 'recommended',
                'key' => 'queue_backlog',
                'title' => '统计队列出现积压',
                'action' => '检查 Cron 计划任务与写库慢查询，确认队列可持续回收。',
            );
        }

        if (!empty($queue['fallback_pending']) && empty($queue['enabled'])) {
            $risks[] = array(
                'level' => 'recommended',
                'key' => 'fallback_queue_pending',
                'title' => '回退队列待回收',
                'action' => '当前为降级保护状态，保持站点流量与 Cron 正常，等待回退队列自动落库。',
            );
        }

        if (!empty($runtime['tracking_require_consent']) && empty($report['consent']['hook_registered'])) {
            $risks[] = array(
                'level' => 'recommended',
                'key' => 'consent_hook_missing',
                'title' => '同意门控开启但未接入钩子',
                'action' => '接入 magick_ad_has_consent 或启用自动同意信号映射，避免统计长期被阻断。',
            );
        }

        if (empty($runtime['tracking_require_signature'])) {
            $risks[] = array(
                'level' => 'critical',
                'key' => 'signature_disabled',
                'title' => '签名校验已关闭',
                'action' => '建议开启 track 签名校验并轮换密钥，避免伪造上报。',
            );
        }

        if (!empty($environment['page_cache_detected']) && empty($runtime['slot_client_resolver'])) {
            $risks[] = array(
                'level' => 'recommended',
                'key' => 'cache_without_resolver',
                'title' => '全页缓存下未启用客户端轮播',
                'action' => '启用缓存友好 Slot 轮播，避免缓存页面造成随机策略失真。',
            );
        }

        if (empty($risks)) {
            $risks[] = array(
                'level' => 'good',
                'key' => 'no_high_risk',
                'title' => '当前未发现高风险项',
                'action' => '建议保留当前配置并持续观察队列与诊断日志。',
            );
        }

        return $risks;
    }

    private static function to_markdown(array $report): string {
        $lines = array();
        $lines[] = '# Magick AD Compatibility Report';
        $lines[] = '';
        $lines[] = '- Generated At: ' . ($report['generated_at_iso'] ?? gmdate('c'));
        $lines[] = '- Overall Status: ' . ($report['overall_status'] ?? 'unknown');
        $lines[] = '';
        $lines[] = '## Environment';
        foreach (($report['environment'] ?? array()) as $key => $value) {
            $lines[] = '- ' . $key . ': ' . self::format_markdown_value($value);
        }
        $lines[] = '';
        $lines[] = '## Runtime';
        foreach (($report['runtime'] ?? array()) as $key => $value) {
            $lines[] = '- ' . $key . ': ' . self::format_markdown_value($value);
        }
        $lines[] = '';
        $lines[] = '## Health Checks';
        foreach (($report['checks'] ?? array()) as $key => $check) {
            $status = $check['status'] ?? 'unknown';
            $summary = $check['summary'] ?? '';
            $action = $check['action'] ?? '';
            $lines[] = '- ' . $key . ': [' . $status . '] ' . $summary;
            if ($action !== '') {
                $lines[] = '  - action: ' . $action;
            }
        }
        $lines[] = '';
        $lines[] = '## Risk Items';
        foreach (($report['risks'] ?? array()) as $risk) {
            $lines[] = '- [' . ($risk['level'] ?? 'unknown') . '] ' . ($risk['title'] ?? '');
            if (!empty($risk['action'])) {
                $lines[] = '  - action: ' . $risk['action'];
            }
        }

        return implode("\n", $lines) . "\n";
    }

    private static function format_markdown_value($value): string {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_scalar($value)) {
            return (string) $value;
        }
        return wp_json_encode($value);
    }
}
