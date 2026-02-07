<?php

namespace MagickAD\Utils;

if (!defined('ABSPATH')) {
    exit;
}

final class Diagnostics {
    private const OPTION_ENABLED = 'magick_ad_stats_diagnostics';
    private const OPTION_EXPIRES = 'magick_ad_stats_diagnostics_expires_at';
    private const AD_DISPLAY_REASON_CATALOG = array(
        'status_unpublished' => array(
            'label' => '未发布/排期中',
            'description' => '广告状态不是 publish。',
        ),
        'option_disabled' => array(
            'label' => '广告已停用',
            'description' => '广告开关已关闭。',
        ),
        'schedule_not_started' => array(
            'label' => '未到开始时间',
            'description' => '当前时间早于开始时间。',
        ),
        'schedule_expired' => array(
            'label' => '已过期',
            'description' => '当前时间晚于结束时间。',
        ),
        'display_mode_hidden' => array(
            'label' => '展示模式=隐藏',
            'description' => '广告被配置为隐藏。',
        ),
        'display_mode_random_miss' => array(
            'label' => '随机模式未命中',
            'description' => '随机展示本次未命中。',
        ),
        'targeting_mismatch' => array(
            'label' => '定向条件不匹配',
            'description' => '目标页面/对象不在命中范围。',
        ),
        'show_page_mismatch' => array(
            'label' => '展示页面不匹配',
            'description' => '当前页面不在展示页面配置中。',
        ),
        'device_mismatch' => array(
            'label' => '设备不匹配',
            'description' => '当前设备不符合投放限制。',
        ),
        'login_mismatch' => array(
            'label' => '登录状态不匹配',
            'description' => '当前登录状态不符合投放限制。',
        ),
        'consent_required' => array(
            'label' => '未获得同意',
            'description' => '该广告要求用户同意后才可展示。',
        ),
        'unknown' => array(
            'label' => '未知原因',
            'description' => '未命中原因未在标准字典中定义。',
        ),
    );

    public static function is_enabled(): bool {
        $enabled = (get_option(self::OPTION_ENABLED, '0') === '1');
        $enabled = (bool) apply_filters('magick_ad_stats_diagnostics_enabled', $enabled);
        $expires_at = (int) get_option(self::OPTION_EXPIRES, 0);
        if ($enabled && $expires_at > 0 && current_time('timestamp') >= $expires_at) {
            update_option(self::OPTION_ENABLED, '0');
            update_option(self::OPTION_EXPIRES, 0);
            $enabled = false;
        }
        return $enabled;
    }

    public static function get_ad_display_reason_catalog(): array {
        return self::AD_DISPLAY_REASON_CATALOG;
    }

    public static function get_ad_display_reason_labels(): array {
        $labels = array();
        foreach (self::AD_DISPLAY_REASON_CATALOG as $code => $item) {
            $labels[$code] = isset($item['label']) ? (string) $item['label'] : $code;
        }
        return $labels;
    }

    public static function normalize_ad_display_reason($reason): string {
        $reason = is_string($reason) ? trim($reason) : '';
        if ($reason !== '' && isset(self::AD_DISPLAY_REASON_CATALOG[$reason])) {
            return $reason;
        }
        return 'unknown';
    }

    public static function get_ad_display_reason_label($reason): string {
        $key = self::normalize_ad_display_reason($reason);
        $labels = self::get_ad_display_reason_labels();
        return isset($labels[$key]) ? $labels[$key] : '未知原因';
    }
}
