<?php

namespace MagickAD\Admin;

use MagickAD\Data\Schema;
use MagickAD\Utils\Diagnostics;

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

        if (!$requires_consent) {
            $status = 'good';
            $label = __('未启用同意门控。', 'magick-ad');
            $description = __('如需合规控制 Cookie/统计写入，请开启“需要同意”并接入 magick_ad_has_consent。', 'magick-ad');
        } elseif ($has_hook) {
            $status = 'good';
            $label = __('已启用同意门控，且检测到同意钩子。', 'magick-ad');
            $description = __('magick_ad_has_consent 已接入站点同意逻辑。', 'magick-ad');
        } else {
            $status = 'recommended';
            $label = __('已启用同意门控，但未检测到同意钩子。', 'magick-ad');
            $description = __('当前将默认视为未同意，Track 不写入且前端不会使用存储。请接入 magick_ad_has_consent。', 'magick-ad');
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

    public function register_debug_info(array $info): array {
        $table_status = Schema::get_table_status();
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
            ),
        );

        return $info;
    }
}
