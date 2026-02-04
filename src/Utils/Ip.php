<?php

namespace MagickAD\Utils;

if (!defined('ABSPATH')) {
    exit;
}

final class Ip {
    public static function normalize_list(mixed $value): array {
        if (is_string($value)) {
            $value = preg_split('/[\s,;]+/', $value);
        }
        if (!is_array($value)) {
            return array();
        }
        $items = array();
        foreach ($value as $item) {
            if (!is_string($item)) {
                continue;
            }
            $item = trim($item);
            if ($item === '') {
                continue;
            }
            $items[] = $item;
        }
        $items = array_values(array_unique($items));
        if (count($items) > 200) {
            $items = array_slice($items, 0, 200);
        }
        return $items;
    }

    public static function is_trusted_proxy(string $remote_addr, array $trusted): bool {
        if (!filter_var($remote_addr, FILTER_VALIDATE_IP)) {
            return false;
        }
        foreach ($trusted as $entry) {
            if (!is_string($entry)) {
                continue;
            }
            $entry = trim($entry);
            if ($entry === '') {
                continue;
            }
            if (strpos($entry, '/') !== false) {
                if (self::cidr_match($remote_addr, $entry)) {
                    return true;
                }
                continue;
            }
            if ($entry === $remote_addr) {
                return true;
            }
        }
        return false;
    }

    public static function extract_client_ip(array $server, array $trusted_proxies = array()): string {
        $remote = '';
        if (!empty($server['REMOTE_ADDR'])) {
            $remote = sanitize_text_field(wp_unslash($server['REMOTE_ADDR']));
        }
        $remote = filter_var($remote, FILTER_VALIDATE_IP) ? $remote : '';

        $trusted = self::normalize_list($trusted_proxies);
        if ($remote !== '' && !empty($trusted) && self::is_trusted_proxy($remote, $trusted)) {
            $candidates = array();
            if (!empty($server['HTTP_CF_CONNECTING_IP'])) {
                $candidates[] = $server['HTTP_CF_CONNECTING_IP'];
            }
            if (!empty($server['HTTP_X_REAL_IP'])) {
                $candidates[] = $server['HTTP_X_REAL_IP'];
            }
            if (!empty($server['HTTP_X_FORWARDED_FOR'])) {
                $candidates = array_merge(
                    $candidates,
                    explode(',', sanitize_text_field(wp_unslash($server['HTTP_X_FORWARDED_FOR'])))
                );
            }

            foreach ($candidates as $candidate) {
                if (!is_string($candidate)) {
                    continue;
                }
                $candidate = trim($candidate);
                if ($candidate === '') {
                    continue;
                }
                if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                    return $candidate;
                }
            }
        }

        return $remote;
    }

    private static function cidr_match(string $ip, string $cidr): bool {
        $parts = explode('/', $cidr, 2);
        if (count($parts) !== 2) {
            return false;
        }
        $subnet = trim($parts[0]);
        $mask = trim($parts[1]);
        if ($subnet === '' || $mask === '' || !is_numeric($mask)) {
            return false;
        }
        $mask = (int) $mask;
        $ip_bin = @inet_pton($ip);
        $subnet_bin = @inet_pton($subnet);
        if ($ip_bin === false || $subnet_bin === false) {
            return false;
        }
        if (strlen($ip_bin) !== strlen($subnet_bin)) {
            return false;
        }
        $total_bits = strlen($ip_bin) * 8;
        if ($mask < 0 || $mask > $total_bits) {
            return false;
        }
        $bytes = intdiv($mask, 8);
        $bits = $mask % 8;
        if ($bytes > 0 && substr($ip_bin, 0, $bytes) !== substr($subnet_bin, 0, $bytes)) {
            return false;
        }
        if ($bits === 0) {
            return true;
        }
        $mask_byte = (0xFF << (8 - $bits)) & 0xFF;
        $ip_byte = ord($ip_bin[$bytes]);
        $subnet_byte = ord($subnet_bin[$bytes]);
        return (($ip_byte & $mask_byte) === ($subnet_byte & $mask_byte));
    }
}
