<?php

namespace MagickAD\Utils;

if (!defined('ABSPATH')) {
    exit;
}

final class Consent {
    public static function has_consent(bool $fallback = false): bool {
        $auto_enabled = (bool) apply_filters('magick_ad_consent_auto_detect_enabled', true);
        $detected = null;
        if ($auto_enabled) {
            $detected = self::detect_from_request();
        }
        if ($detected === null) {
            $detected = (bool) apply_filters('magick_ad_consent_fallback', $fallback);
        }
        static $applying = false;
        if ($applying) {
            return (bool) $detected;
        }
        $applying = true;
        try {
            return (bool) apply_filters('magick_ad_has_consent', $detected);
        } finally {
            $applying = false;
        }
    }

    public static function detect_signal_summary(): array {
        $signals = self::collect_signals();
        return array(
            'detected' => self::detect_from_signals($signals),
            'signals' => $signals,
        );
    }

    private static function detect_from_request(): ?bool {
        $signals = self::collect_signals();
        return self::detect_from_signals($signals);
    }

    private static function collect_signals(): array {
        $signals = array(
            'query' => self::read_query_flag('magick_ad_consent'),
            'wp_statistics' => self::read_wp_consent('statistics'),
            'wp_marketing' => self::read_wp_consent('marketing'),
            'magick_ad' => self::read_cookie('magick_ad_consent'),
            'cookie_notice' => self::read_cookie('cookie_notice_accepted'),
            'cookieyes' => self::read_cookie('cookieyes-consent'),
            'complianz_marketing' => self::read_cookie('cmplz_marketing'),
            'complianz_statistics' => self::read_cookie('cmplz_statistics'),
            'complianz_preferences' => self::read_cookie('cmplz_preferences'),
            'onetrust' => self::read_cookie('OptanonConsent'),
            'cookiebot' => self::read_cookie('CookieConsent'),
            'borlabs' => self::read_cookie('borlabs-cookie'),
            'moove' => self::read_cookie('moove_gdpr_popup'),
        );

        return (array) apply_filters('magick_ad_consent_signals', $signals);
    }

    private static function detect_from_signals(array $signals): ?bool {
        $query = isset($signals['query']) ? self::normalize_flag($signals['query']) : null;
        if ($query !== null) {
            return $query;
        }

        $wp_seen = false;
        foreach (array('wp_statistics', 'wp_marketing') as $key) {
            if (!array_key_exists($key, $signals)) {
                continue;
            }
            $flag = self::normalize_flag($signals[$key]);
            if ($flag === null) {
                continue;
            }
            $wp_seen = true;
            if ($flag === true) {
                return true;
            }
        }
        if ($wp_seen) {
            return false;
        }

        foreach (array('magick_ad', 'cookie_notice', 'moove') as $key) {
            $value = isset($signals[$key]) ? self::normalize_flag($signals[$key]) : null;
            if ($value !== null) {
                return $value;
            }
        }

        $cookieyes = isset($signals['cookieyes']) ? self::parse_cookieyes((string) $signals['cookieyes']) : null;
        if ($cookieyes !== null) {
            return $cookieyes;
        }

        $complianz = self::detect_complianz($signals);
        if ($complianz !== null) {
            return $complianz;
        }

        $onetrust = isset($signals['onetrust']) ? self::parse_optanon((string) $signals['onetrust']) : null;
        if ($onetrust !== null) {
            return $onetrust;
        }

        $cookiebot = isset($signals['cookiebot']) ? self::parse_cookiebot((string) $signals['cookiebot']) : null;
        if ($cookiebot !== null) {
            return $cookiebot;
        }

        $borlabs = isset($signals['borlabs']) ? self::parse_borlabs((string) $signals['borlabs']) : null;
        if ($borlabs !== null) {
            return $borlabs;
        }

        return null;
    }

    private static function detect_complianz(array $signals): ?bool {
        $keys = array('complianz_marketing', 'complianz_statistics', 'complianz_preferences');
        $seen = false;
        foreach ($keys as $key) {
            $value = isset($signals[$key]) ? self::normalize_flag($signals[$key]) : null;
            if ($value === null) {
                continue;
            }
            $seen = true;
            if ($value) {
                return true;
            }
        }
        return $seen ? false : null;
    }

    private static function parse_cookieyes(string $value): ?bool {
        if ($value === '') {
            return null;
        }
        $pairs = self::parse_kv_cookie($value);
        if (empty($pairs)) {
            return null;
        }

        foreach (array('advertisement', 'analytics', 'performance', 'marketing', 'statistics') as $key) {
            if (!isset($pairs[$key])) {
                continue;
            }
            $flag = self::normalize_flag($pairs[$key]);
            if ($flag === true) {
                return true;
            }
        }

        $seen = false;
        foreach (array('advertisement', 'analytics', 'performance', 'marketing', 'statistics') as $key) {
            if (!isset($pairs[$key])) {
                continue;
            }
            $flag = self::normalize_flag($pairs[$key]);
            if ($flag !== null) {
                $seen = true;
            }
        }
        return $seen ? false : null;
    }

    private static function parse_optanon(string $value): ?bool {
        if ($value === '') {
            return null;
        }
        $pairs = self::parse_kv_cookie($value);
        if (!isset($pairs['groups'])) {
            return null;
        }
        $groups = explode(',', (string) $pairs['groups']);
        $seen = false;
        foreach ($groups as $group) {
            $group = trim($group);
            if ($group === '' || !str_contains($group, ':')) {
                continue;
            }
            list($id, $flag) = array_map('trim', explode(':', $group, 2));
            if ($id === 'C0001') {
                continue;
            }
            $normalized = self::normalize_flag($flag);
            if ($normalized === null) {
                continue;
            }
            $seen = true;
            if ($normalized) {
                return true;
            }
        }
        return $seen ? false : null;
    }

    private static function parse_cookiebot(string $value): ?bool {
        if ($value === '') {
            return null;
        }
        $decoded = urldecode($value);
        $payload = json_decode($decoded, true);
        if (!is_array($payload)) {
            $flag = self::normalize_flag($decoded);
            return $flag;
        }
        $seen = false;
        foreach (array('marketing', 'statistics', 'preferences') as $key) {
            if (!array_key_exists($key, $payload)) {
                continue;
            }
            $flag = self::normalize_flag($payload[$key]);
            if ($flag === null) {
                continue;
            }
            $seen = true;
            if ($flag) {
                return true;
            }
        }
        return $seen ? false : null;
    }

    private static function parse_borlabs(string $value): ?bool {
        if ($value === '') {
            return null;
        }
        $decoded = urldecode($value);
        $payload = json_decode($decoded, true);
        if (!is_array($payload)) {
            return null;
        }
        $consents = isset($payload['consents']) && is_array($payload['consents'])
            ? $payload['consents']
            : array();
        if (empty($consents)) {
            return null;
        }
        foreach ($consents as $group => $items) {
            if ($group === 'essential') {
                continue;
            }
            if (is_array($items) && !empty($items)) {
                return true;
            }
        }
        return false;
    }

    private static function parse_kv_cookie(string $value): array {
        $decoded = urldecode($value);
        $pairs = preg_split('/[&;,]+/', $decoded);
        if (!is_array($pairs)) {
            return array();
        }
        $map = array();
        foreach ($pairs as $pair) {
            $pair = trim((string) $pair);
            if ($pair === '' || !str_contains($pair, '=')) {
                continue;
            }
            list($key, $val) = explode('=', $pair, 2);
            $key = sanitize_key($key);
            if ($key === '') {
                continue;
            }
            $map[$key] = sanitize_text_field($val);
        }
        return $map;
    }

    private static function normalize_flag($value): ?bool {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value) || is_float($value)) {
            return ((int) $value) === 1;
        }
        if (!is_string($value)) {
            return null;
        }
        $value = strtolower(trim($value));
        if ($value === '') {
            return null;
        }
        $truthy = array('1', 'true', 'yes', 'y', 'on', 'allow', 'accepted', 'accept');
        $falsy = array('0', 'false', 'no', 'n', 'off', 'deny', 'denied', 'rejected', 'reject');
        if (in_array($value, $truthy, true)) {
            return true;
        }
        if (in_array($value, $falsy, true)) {
            return false;
        }
        return null;
    }

    private static function read_cookie(string $key): string {
        if (!isset($_COOKIE[$key])) {
            return '';
        }
        $raw = wp_unslash((string) $_COOKIE[$key]);
        return sanitize_text_field($raw);
    }

    private static function read_query_flag(string $key): string {
        if (!isset($_GET[$key])) {
            return '';
        }
        return sanitize_text_field(wp_unslash((string) $_GET[$key]));
    }

    private static function read_wp_consent(string $type): string {
        if (!function_exists('wp_has_consent')) {
            return '';
        }
        return wp_has_consent($type) ? '1' : '0';
    }
}
