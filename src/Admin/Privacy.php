<?php

namespace MagickAD\Admin;

if (!defined('ABSPATH')) {
    exit;
}

final class Privacy {
    private const EXPORTER_KEY = 'magick-ad-diagnostics';
    private const ERASER_KEY = 'magick-ad-diagnostics';

    public function register(): void {
        add_action('admin_init', array($this, 'register_policy_content'));
        add_filter('wp_privacy_personal_data_exporters', array($this, 'register_exporter'));
        add_filter('wp_privacy_personal_data_erasers', array($this, 'register_eraser'));
    }

    public function register_policy_content(): void {
        if (!function_exists('wp_add_privacy_policy_content')) {
            return;
        }

        $retention_days = (int) get_option('magick_ad_stats_diagnostics_retention_days', 7);
        $retention_days = max(1, min($retention_days, 90));

        $content = '<p>' . esc_html__(
            'Magick AD 会统计广告展示与点击，用于生成站内投放报表与效果分析。',
            'magick-ad'
        ) . '</p>';

        $content .= '<h2>' . esc_html__('收集的数据', 'magick-ad') . '</h2>';
        $content .= '<ul>';
        $content .= '<li>' . esc_html__('广告展示/点击统计（ad_id、日期、展示数、点击数）。', 'magick-ad') . '</li>';
        $content .= '<li>' . esc_html__('统计维度（slot / position / container），用于分析不同投放位置的效果。', 'magick-ad') . '</li>';
        $content .= '</ul>';

        $content .= '<h2>' . esc_html__('Cookie 与本地存储', 'magick-ad') . '</h2>';
        $content .= '<ul>';
        $content .= '<li>' . esc_html__('magick_ad_uid（Cookie）：用于广告去重、随机/频控策略。有效期约 30 天。', 'magick-ad') . '</li>';
        $content .= '<li>' . esc_html__('magick_ad_session_id（sessionStorage）：用于会话级去重，浏览器关闭即失效。', 'magick-ad') . '</li>';
        $content .= '<li>' . esc_html__('localStorage：用于频控计数或随机策略缓存（仅在获得同意后使用）。', 'magick-ad') . '</li>';
        $content .= '</ul>';

        $content .= '<h2>' . esc_html__('诊断日志（仅诊断模式）', 'magick-ad') . '</h2>';
        $content .= '<ul>';
        $content .= '<li>' . esc_html__('可能记录 page_url、user_agent、user_id（如登录）。', 'magick-ad') . '</li>';
        $content .= '<li>' . sprintf(
            esc_html__('默认保留 %d 天，可在系统设置中调整。', 'magick-ad'),
            $retention_days
        ) . '</li>';
        $content .= '</ul>';

        $content .= '<h2>' . esc_html__('关闭方式', 'magick-ad') . '</h2>';
        $content .= '<ul>';
        $content .= '<li>' . esc_html__('关闭“需要同意”将停止写入 localStorage/sessionStorage。', 'magick-ad') . '</li>';
        $content .= '<li>' . esc_html__('切换统计策略为“session/request”可避免持久 Cookie。', 'magick-ad') . '</li>';
        $content .= '<li>' . esc_html__('关闭诊断模式将不再写入诊断日志。', 'magick-ad') . '</li>';
        $content .= '<li>' . esc_html__('可通过 magick_ad_has_consent 过滤器接入站点的同意管理（CMP）逻辑。', 'magick-ad') . '</li>';
        $content .= '</ul>';

        wp_add_privacy_policy_content(
            __('Magick AD', 'magick-ad'),
            wp_kses_post(wpautop($content))
        );
    }

    public function register_exporter(array $exporters): array {
        $exporters[self::EXPORTER_KEY] = array(
            'exporter_friendly_name' => __('Magick AD 诊断日志', 'magick-ad'),
            'callback' => array($this, 'export_diagnostics'),
        );
        return $exporters;
    }

    public function register_eraser(array $erasers): array {
        $erasers[self::ERASER_KEY] = array(
            'eraser_friendly_name' => __('Magick AD 诊断日志', 'magick-ad'),
            'callback' => array($this, 'erase_diagnostics'),
        );
        return $erasers;
    }

    public function export_diagnostics(string $email_address, int $page): array {
        $user = get_user_by('email', $email_address);
        if (!$user) {
            return array(
                'data' => array(),
                'done' => true,
            );
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats_log';
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            return array(
                'data' => array(),
                'done' => true,
            );
        }

        $page = max(1, $page);
        $limit = 100;
        $offset = ($page - 1) * $limit;

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is a fixed suffix with prefix.
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT id, ad_id, event_type, page_url, user_agent, created_at
                 FROM {$table}
                 WHERE user_id = %d
                 ORDER BY id ASC
                 LIMIT %d OFFSET %d",
                $user->ID,
                $limit,
                $offset
            ),
            ARRAY_A
        );

        $data = array();
        foreach ($rows as $row) {
            $data[] = array(
                'group_id' => 'magick-ad-diagnostics',
                'group_label' => __('Magick AD 诊断日志', 'magick-ad'),
                'item_id' => 'magick-ad-diagnostics-' . absint($row['id']),
                'data' => array(
                    array(
                        'name' => __('广告 ID', 'magick-ad'),
                        'value' => $row['ad_id'] ?? '',
                    ),
                    array(
                        'name' => __('事件类型', 'magick-ad'),
                        'value' => $row['event_type'] ?? '',
                    ),
                    array(
                        'name' => __('页面 URL', 'magick-ad'),
                        'value' => $row['page_url'] ?? '',
                    ),
                    array(
                        'name' => __('User Agent', 'magick-ad'),
                        'value' => $row['user_agent'] ?? '',
                    ),
                    array(
                        'name' => __('时间', 'magick-ad'),
                        'value' => $row['created_at'] ?? '',
                    ),
                ),
            );
        }

        return array(
            'data' => $data,
            'done' => count($rows) < $limit,
        );
    }

    public function erase_diagnostics(string $email_address, int $page): array {
        $user = get_user_by('email', $email_address);
        if (!$user) {
            return array(
                'items_removed' => false,
                'items_retained' => false,
                'messages' => array(),
                'done' => true,
            );
        }

        global $wpdb;
        $table = $wpdb->prefix . 'magick_ad_stats_log';
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            return array(
                'items_removed' => false,
                'items_retained' => false,
                'messages' => array(),
                'done' => true,
            );
        }

        $page = max(1, $page);
        $limit = 100;

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is a fixed suffix with prefix.
        $ids = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT id FROM {$table} WHERE user_id = %d ORDER BY id ASC LIMIT %d",
                $user->ID,
                $limit
            )
        );

        if (empty($ids)) {
            return array(
                'items_removed' => false,
                'items_retained' => false,
                'messages' => array(),
                'done' => true,
            );
        }

        $safe_ids = array_map('absint', $ids);
        $placeholders = implode(',', array_fill(0, count($safe_ids), '%d'));
        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is a fixed suffix with prefix.
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$table} WHERE id IN ({$placeholders})",
                $safe_ids
            )
        );

        return array(
            'items_removed' => true,
            'items_retained' => false,
            'messages' => array(),
            'done' => count($safe_ids) < $limit,
        );
    }
}
