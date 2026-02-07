<?php

namespace MagickAD\Admin;

use MagickAD\Data\Settings;
use MagickAD\Data\Schema;
use MagickAD\Utils\Diagnostics;
use MagickAD\Utils\Diagnostics_Cron;
use MagickAD\Utils\Stats_Accumulator;
use MagickAD\Utils\Stats_Cron;
use MagickAD\Utils\Stats_Dim_Cron;
use MagickAD\Utils\Stats_Queue;
use MagickAD\Utils\Consent;

if (!defined('ABSPATH')) {
    exit;
}

final class Site_Health {
    public function register(): void {
        add_filter('site_status_tests', array($this, 'register_tests'));
        add_filter('debug_information', array($this, 'register_debug_info'));
    }

    public function register_tests(array $tests): array {
        $tests['direct']['magick_ad_object_cache'] = array(
            'label' => __('Magick AD: 持久化对象缓存', 'magick-ad'),
            'test' => array($this, 'test_object_cache'),
        );
        $tests['direct']['magick_ad_consent_hook'] = array(
            'label' => __('Magick AD: 同意钩子接入', 'magick-ad'),
            'test' => array($this, 'test_consent_hook'),
        );
        $tests['direct']['magick_ad_stats_tables'] = array(
            'label' => __('Magick AD: 统计表就绪状态', 'magick-ad'),
            'test' => array($this, 'test_stats_tables'),
        );
        $tests['direct']['magick_ad_node_placement'] = array(
            'label' => __('Magick AD: 节点插入可用性', 'magick-ad'),
            'test' => array($this, 'test_node_placement'),
        );
        $tests['direct']['magick_ad_cron_health'] = array(
            'label' => __('Magick AD: Cron 任务健康度', 'magick-ad'),
            'test' => array($this, 'test_cron_health'),
        );
        $tests['direct']['magick_ad_stats_queue'] = array(
            'label' => __('Magick AD: 统计队列积压', 'magick-ad'),
            'test' => array($this, 'test_stats_queue'),
        );

        return $tests;
    }

    public function test_object_cache(): array {
        $using = wp_using_ext_object_cache();
        $status = $using ? 'good' : 'recommended';
        $label = $using
            ? __('已检测到持久化对象缓存。', 'magick-ad')
            : __('未检测到持久化对象缓存。', 'magick-ad');
        $description = $using
            ? __('Track 接口与广告配置读取将直接受益于持久化缓存。', 'magick-ad')
            : __('建议启用 Redis/Memcached 等持久化对象缓存，以提升 Track 吞吐与前台渲染效率。', 'magick-ad');

        return array(
            'label' => $label,
            'status' => $status,
            'badge' => array(
                'label' => __('Magick AD', 'magick-ad'),
                'color' => 'blue',
            ),
            'description' => '<p>' . esc_html($description) . '</p>',
            'test' => 'magick_ad_object_cache',
        );
    }

    public function test_consent_hook(): array {
        $requires_consent = (get_option('magick_ad_tracking_require_consent', '0') === '1');
        $has_hook = (bool) has_filter('magick_ad_has_consent');
        $signal_summary = Consent::detect_signal_summary();
        $detected = $signal_summary['detected'] ?? null;
        $signals = isset($signal_summary['signals']) && is_array($signal_summary['signals'])
            ? $signal_summary['signals']
            : array();
        $active_signals = 0;
        foreach ($signals as $value) {
            $normalized = is_scalar($value) ? trim((string) $value) : '';
            if ($normalized !== '' && $normalized !== '0' && strtolower($normalized) !== 'false') {
                $active_signals++;
            }
        }

        if (!$requires_consent) {
            $status = 'good';
            $label = __('未启用同意门控。', 'magick-ad');
            $description = __('如需合规控制 Cookie/统计写入，请开启“需要同意”并接入 magick_ad_has_consent。', 'magick-ad');
        } elseif ($detected === true) {
            $status = 'good';
            $label = __('已检测到同意信号。', 'magick-ad');
            $description = __('同意门控已启用，当前请求环境已识别到同意状态。', 'magick-ad');
        } elseif ($has_hook) {
            $status = 'recommended';
            $label = __('已启用同意门控，未检测到明确同意。', 'magick-ad');
            $description = __('已检测到同意钩子，但当前环境尚未识别到同意信号。请在已同意状态下复测。', 'magick-ad');
        } else {
            $status = 'recommended';
            $label = __('已启用同意门控，但未检测到同意钩子。', 'magick-ad');
            $description = __('当前将默认视为未同意，Track 不写入且前端不会使用存储。请接入 magick_ad_has_consent。', 'magick-ad');
        }
        if ($requires_consent && $active_signals > 0) {
            $description .= ' ' . sprintf(
                /* translators: %d: count of detected consent signals. */
                __('当前检测到 %d 个同意信号来源。', 'magick-ad'),
                $active_signals
            );
        }

        return array(
            'label' => $label,
            'status' => $status,
            'badge' => array(
                'label' => __('Magick AD', 'magick-ad'),
                'color' => 'blue',
            ),
            'description' => '<p>' . esc_html($description) . '</p>',
            'test' => 'magick_ad_consent_hook',
        );
    }

    public function test_stats_tables(): array {
        $status = Schema::get_table_status();
        $diagnostics_enabled = Diagnostics::is_enabled();

        $issues = array();
        if (!$status['stats']) {
            $issues[] = __('统计主表缺失或结构不完整。', 'magick-ad');
        }
        if (!$status['dim']) {
            $issues[] = __('维度统计表缺失。', 'magick-ad');
        }
        if ($diagnostics_enabled && !$status['log']) {
            $issues[] = __('诊断日志表缺失（诊断已启用）。', 'magick-ad');
        }

        if (!empty($issues)) {
            $label = __('统计表未就绪。', 'magick-ad');
            $status_label = $status['stats'] ? 'recommended' : 'critical';
            $description = implode(' ', $issues);
        } else {
            $label = __('统计表已就绪。', 'magick-ad');
            $status_label = 'good';
            $description = __('统计与维度表已创建，可正常写入。', 'magick-ad');
        }

        return array(
            'label' => $label,
            'status' => $status_label,
            'badge' => array(
                'label' => __('Magick AD', 'magick-ad'),
                'color' => 'blue',
            ),
            'description' => '<p>' . esc_html($description) . '</p>',
            'test' => 'magick_ad_stats_tables',
        );
    }

    public function test_node_placement(): array {
        $metrics = self::collect_node_metrics();

        if ($metrics['count'] <= 0) {
            return array(
                'label' => __('未检测到节点插入广告。', 'magick-ad'),
                'status' => 'good',
                'badge' => array(
                    'label' => __('Magick AD', 'magick-ad'),
                    'color' => 'blue',
                ),
                'description' => '<p>' . esc_html__('当前站点未使用节点插入，不存在目标节点兼容风险。', 'magick-ad') . '</p>',
                'test' => 'magick_ad_node_placement',
            );
        }

        $status = 'good';
        $label = __('节点插入配置可用。', 'magick-ad');
        $description = sprintf(
            /* translators: %d: node ads count. */
            __('已检测到 %d 个节点插入广告。', 'magick-ad'),
            $metrics['count']
        );

        if (!$metrics['interactivity_ready']) {
            $status = 'critical';
            $label = __('节点插入脚本未就绪。', 'magick-ad');
            $description = __('未找到前端交互脚本，节点插入广告无法落位。请确认插件构建产物完整并清理缓存后重试。', 'magick-ad');
        } elseif (!empty($metrics['invalid'])) {
            $status = count($metrics['invalid']) >= $metrics['count'] ? 'critical' : 'recommended';
            $label = __('节点插入存在配置问题。', 'magick-ad');
            $description = __('请检查以下广告的节点目标配置（类型/值/插入策略）：', 'magick-ad')
                . ' '
                . implode('；', $metrics['invalid']);
            $description .= ' ' . __('建议修复后再发布。', 'magick-ad');
        }

        return array(
            'label' => $label,
            'status' => $status,
            'badge' => array(
                'label' => __('Magick AD', 'magick-ad'),
                'color' => 'blue',
            ),
            'description' => '<p>' . esc_html($description) . '</p>',
            'test' => 'magick_ad_node_placement',
        );
    }

    public function test_cron_health(): array {
        $checks = self::collect_cron_checks();
        $missing_critical = array();
        $missing_optional = array();
        $descriptions = array();

        foreach ($checks as $check) {
            $scheduled = !empty($check['next']);
            $line = $check['label'] . '：' . ($scheduled
                ? self::format_next_run((int) $check['next'])
                : __('未计划', 'magick-ad'));
            $descriptions[] = $line;

            if (!$scheduled && !empty($check['required']) && ($check['severity'] ?? '') === 'critical') {
                $missing_critical[] = $check['label'];
            } elseif (!$scheduled && !empty($check['required'])) {
                $missing_optional[] = $check['label'];
            }
        }

        $status = 'good';
        $label = __('Cron 任务状态正常。', 'magick-ad');
        if (!empty($missing_critical)) {
            $status = 'critical';
            $label = __('关键 Cron 任务缺失。', 'magick-ad');
        } elseif (!empty($missing_optional)) {
            $status = 'recommended';
            $label = __('部分 Cron 任务未计划。', 'magick-ad');
        }

        $description = implode('；', $descriptions);
        if (!empty($missing_critical) || !empty($missing_optional)) {
            $description .= ' ' . __('建议动作：确认 WP-Cron 可执行，访问一次站点首页触发调度，或使用服务器 Crontab 调用 wp-cron.php。', 'magick-ad');
        }

        return array(
            'label' => $label,
            'status' => $status,
            'badge' => array(
                'label' => __('Magick AD', 'magick-ad'),
                'color' => 'blue',
            ),
            'description' => '<p>' . esc_html($description) . '</p>',
            'test' => 'magick_ad_cron_health',
        );
    }

    public function test_stats_queue(): array {
        $metrics = Stats_Queue::get_metrics();
        $fallback_pending = !empty($metrics['fallback_pending']);

        if (empty($metrics['enabled'])) {
            if ($fallback_pending) {
                return array(
                    'label' => __('统计队列回退待回收。', 'magick-ad'),
                    'status' => 'recommended',
                    'badge' => array(
                        'label' => __('Magick AD', 'magick-ad'),
                        'color' => 'blue',
                    ),
                    'description' => '<p>' . esc_html__('当前处于同步写入/缓存累计模式，但历史回退队列仍有待处理数据。请保持 Cron 正常执行直到回收完成。', 'magick-ad') . '</p>',
                    'test' => 'magick_ad_stats_queue',
                );
            }
            return array(
                'label' => __('统计队列未启用。', 'magick-ad'),
                'status' => 'good',
                'badge' => array(
                    'label' => __('Magick AD', 'magick-ad'),
                    'color' => 'blue',
                ),
                'description' => '<p>' . esc_html__('当前使用持久化缓存累计或同步写入。', 'magick-ad') . '</p>',
                'test' => 'magick_ad_stats_queue',
            );
        }

        $total = (int) ($metrics['total'] ?? 0);
        $oldest_age = (int) ($metrics['oldest_age'] ?? 0);
        $limit = (int) ($metrics['alert_limit'] ?? 300);
        $age_limit = (int) ($metrics['alert_age'] ?? 900);

        $status = 'good';
        $label = __('统计队列正常。', 'magick-ad');
        if ($total >= $limit || $oldest_age >= $age_limit) {
            $status = 'recommended';
            $label = __('统计队列出现积压。', 'magick-ad');
        }
        if ($total >= $limit * 2 || $oldest_age >= $age_limit * 2) {
            $status = 'critical';
            $label = __('统计队列严重积压。', 'magick-ad');
        }

        /* translators: 1: queued items, 2: oldest wait time. */
        $format = __('当前队列 %1$d 条，最久等待 %2$s。', 'magick-ad');
        $desc = sprintf($format, $total, self::format_age($oldest_age));
        $desc .= ' ' . __('请确认 Cron 是否正常运行并关注数据库写入性能。', 'magick-ad');

        return array(
            'label' => $label,
            'status' => $status,
            'badge' => array(
                'label' => __('Magick AD', 'magick-ad'),
                'color' => 'blue',
            ),
            'description' => '<p>' . esc_html($desc) . '</p>',
            'test' => 'magick_ad_stats_queue',
        );
    }

    private static function collect_node_metrics(): array {
        $runtime = Settings::get_runtime_settings();
        $ads = isset($runtime['ads']) && is_array($runtime['ads']) ? $runtime['ads'] : array();
        $count = 0;
        $invalid = array();

        foreach ($ads as $index => $ad) {
            if (!is_array($ad)) {
                continue;
            }
            $options = isset($ad['options']) && is_array($ad['options']) ? $ad['options'] : array();
            if (($options['placement_hook'] ?? '') !== 'node') {
                continue;
            }

            $count++;
            $ad_id = isset($ad['id']) && is_string($ad['id']) && $ad['id'] !== ''
                ? $ad['id']
                : '#' . (string) ($index + 1);

            $node_type = isset($options['node_target_type']) ? (string) $options['node_target_type'] : '';
            $node_value = isset($options['node_target_value']) ? (string) $options['node_target_value'] : '';
            $insert_mode = isset($options['node_insert']) ? (string) $options['node_insert'] : '';
            $match_mode = isset($options['node_match']) ? (string) $options['node_match'] : '';
            $fallback = isset($options['node_fallback']) ? (string) $options['node_fallback'] : '';

            $is_valid = in_array($node_type, array('id', 'class'), true)
                && preg_match('/^[A-Za-z_][A-Za-z0-9_-]*$/', $node_value)
                && in_array($insert_mode, array('append', 'prepend', 'before', 'after'), true)
                && in_array($match_mode, array('first', 'nth', 'all'), true)
                && in_array($fallback, array('hide', 'footer'), true);

            if (!$is_valid) {
                $invalid[] = $ad_id;
            }
        }

        $interactivity_ready = file_exists(MAGICK_AD_PATH . 'build/magick-ad-interactivity.js')
            || file_exists(MAGICK_AD_PATH . 'assets/magick-ad-interactivity.js');

        return array(
            'count' => $count,
            'invalid' => $invalid,
            'interactivity_ready' => $interactivity_ready,
        );
    }

    private static function collect_cron_checks(): array {
        $stats_required = Stats_Accumulator::enabled() || Stats_Queue::enabled() || Stats_Queue::has_pending();
        $diagnostics_required = Diagnostics::is_enabled();
        $dim_retention_days = (int) get_option('magick_ad_stats_dim_retention_days', 30);
        $dim_required = $dim_retention_days > 0;

        return array(
            array(
                'label' => __('统计落库刷新', 'magick-ad'),
                'hook' => Stats_Cron::HOOK,
                'required' => $stats_required,
                'severity' => 'critical',
                'next' => (int) wp_next_scheduled(Stats_Cron::HOOK),
            ),
            array(
                'label' => __('维度清理', 'magick-ad'),
                'hook' => Stats_Dim_Cron::HOOK,
                'required' => $dim_required,
                'severity' => 'recommended',
                'next' => (int) wp_next_scheduled(Stats_Dim_Cron::HOOK),
            ),
            array(
                'label' => __('诊断日志清理', 'magick-ad'),
                'hook' => Diagnostics_Cron::HOOK,
                'required' => $diagnostics_required,
                'severity' => 'recommended',
                'next' => (int) wp_next_scheduled(Diagnostics_Cron::HOOK),
            ),
        );
    }

    private static function format_next_run(int $timestamp): string {
        if ($timestamp <= 0) {
            return __('未计划', 'magick-ad');
        }
        $now = current_time('timestamp');
        if ($timestamp <= $now) {
            return wp_date('Y-m-d H:i:s', $timestamp);
        }
        return sprintf(
            /* translators: 1: datetime string, 2: relative time */
            __('%1$s（约 %2$s 后）', 'magick-ad'),
            wp_date('Y-m-d H:i:s', $timestamp),
            human_time_diff($now, $timestamp)
        );
    }

    public function register_debug_info(array $info): array {
        $table_status = Schema::get_table_status();
        $queue_metrics = Stats_Queue::get_metrics();
        $node_metrics = self::collect_node_metrics();
        $cron_checks = self::collect_cron_checks();
        $consent_summary = Consent::detect_signal_summary();

        $cron_map = array();
        foreach ($cron_checks as $check) {
            $hook = isset($check['hook']) ? (string) $check['hook'] : '';
            if ($hook === '') {
                continue;
            }
            $cron_map[$hook] = (int) ($check['next'] ?? 0);
        }
        $info['magick_ad'] = array(
            'label' => __('Magick AD', 'magick-ad'),
            'fields' => array(
                'version' => array(
                    'label' => __('插件版本', 'magick-ad'),
                    'value' => MAGICK_AD_VERSION,
                ),
                'db_version' => array(
                    'label' => __('数据库版本', 'magick-ad'),
                    'value' => MAGICK_AD_DB_VERSION,
                ),
                'tracking_strategy' => array(
                    'label' => __('统计策略', 'magick-ad'),
                    'value' => (string) get_option('magick_ad_tracking_strategy', 'session'),
                ),
                'tracking_require_signature' => array(
                    'label' => __('强制签名校验', 'magick-ad'),
                    'value' => (get_option('magick_ad_track_require_signature', '1') === '1') ? 'yes' : 'no',
                ),
                'tracking_require_consent' => array(
                    'label' => __('需要同意后统计', 'magick-ad'),
                    'value' => (get_option('magick_ad_tracking_require_consent', '0') === '1') ? 'yes' : 'no',
                ),
                'consent_hook_registered' => array(
                    'label' => __('同意钩子已注册', 'magick-ad'),
                    'value' => has_filter('magick_ad_has_consent') ? 'yes' : 'no',
                ),
                'consent_detected_in_request' => array(
                    'label' => __('当前请求检测到同意', 'magick-ad'),
                    'value' => (($consent_summary['detected'] ?? null) === true)
                        ? 'yes'
                        : ((($consent_summary['detected'] ?? null) === false) ? 'no' : 'unknown'),
                ),
                'slot_client_resolver' => array(
                    'label' => __('缓存友好 Slot 轮播', 'magick-ad'),
                    'value' => (get_option('magick_ad_slot_client_resolver', '1') === '1') ? 'yes' : 'no',
                ),
                'html_sandbox' => array(
                    'label' => __('Full HTML 沙箱', 'magick-ad'),
                    'value' => (get_option('magick_ad_html_sandbox', '1') === '1') ? 'yes' : 'no',
                ),
                'stats_table' => array(
                    'label' => __('统计主表', 'magick-ad'),
                    'value' => $table_status['stats'] ? 'ready' : 'missing',
                ),
                'dim_table' => array(
                    'label' => __('维度统计表', 'magick-ad'),
                    'value' => $table_status['dim'] ? 'ready' : 'missing',
                ),
                'log_table' => array(
                    'label' => __('诊断日志表', 'magick-ad'),
                    'value' => $table_status['log'] ? 'ready' : 'missing',
                ),
                'object_cache' => array(
                    'label' => __('持久化对象缓存', 'magick-ad'),
                    'value' => wp_using_ext_object_cache() ? 'yes' : 'no',
                ),
                'stats_queue_enabled' => array(
                    'label' => __('统计队列启用', 'magick-ad'),
                    'value' => !empty($queue_metrics['enabled']) ? 'yes' : 'no',
                ),
                'stats_queue_fallback_pending' => array(
                    'label' => __('统计回退队列待回收', 'magick-ad'),
                    'value' => !empty($queue_metrics['fallback_pending']) ? 'yes' : 'no',
                ),
                'stats_queue_total' => array(
                    'label' => __('统计队列长度', 'magick-ad'),
                    'value' => (string) ($queue_metrics['total'] ?? 0),
                ),
                'stats_queue_oldest' => array(
                    'label' => __('统计队列最久等待', 'magick-ad'),
                    'value' => self::format_age((int) ($queue_metrics['oldest_age'] ?? 0)),
                ),
                'node_ads_count' => array(
                    'label' => __('节点插入广告数量', 'magick-ad'),
                    'value' => (string) ($node_metrics['count'] ?? 0),
                ),
                'node_ads_invalid' => array(
                    'label' => __('节点配置异常数量', 'magick-ad'),
                    'value' => (string) count($node_metrics['invalid'] ?? array()),
                ),
                'node_interactivity_ready' => array(
                    'label' => __('节点插入脚本就绪', 'magick-ad'),
                    'value' => !empty($node_metrics['interactivity_ready']) ? 'yes' : 'no',
                ),
                'cron_stats_flush_next' => array(
                    'label' => __('统计刷新任务下次执行', 'magick-ad'),
                    'value' => self::format_next_run((int) ($cron_map[Stats_Cron::HOOK] ?? 0)),
                ),
                'cron_dim_cleanup_next' => array(
                    'label' => __('维度清理任务下次执行', 'magick-ad'),
                    'value' => self::format_next_run((int) ($cron_map[Stats_Dim_Cron::HOOK] ?? 0)),
                ),
                'cron_log_cleanup_next' => array(
                    'label' => __('诊断清理任务下次执行', 'magick-ad'),
                    'value' => self::format_next_run((int) ($cron_map[Diagnostics_Cron::HOOK] ?? 0)),
                ),
            ),
        );

        return $info;
    }

    private static function format_age(int $seconds): string {
        if ($seconds <= 0) {
            return '0 秒';
        }
        if ($seconds < 60) {
            return $seconds . ' 秒';
        }
        if ($seconds < 3600) {
            return (string) ceil($seconds / 60) . ' 分钟';
        }
        if ($seconds < 86400) {
            $hours = $seconds / 3600;
            return ($hours == (int) $hours ? (string) (int) $hours : number_format($hours, 1)) . ' 小时';
        }
        $days = $seconds / 86400;
        return ($days == (int) $days ? (string) (int) $days : number_format($days, 1)) . ' 天';
    }
}
