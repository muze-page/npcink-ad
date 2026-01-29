<?php

namespace MagickAD\Data;

if (!defined('ABSPATH')) {
    exit;
}

final class Template_Categories {
    public const OPTION_KEY = 'magick_ad_template_categories';

    public static function get(): array {
        $stored = get_option(self::OPTION_KEY, array());
        if (is_array($stored) && !empty($stored)) {
            return self::sanitize($stored);
        }
        return self::default_categories();
    }

    public static function update($categories): array {
        $clean = self::sanitize($categories);
        update_option(self::OPTION_KEY, $clean);
        return $clean;
    }

    public static function sanitize($categories): array {
        $list = is_array($categories) ? $categories : array();
        $clean = array();
        $seen = array();

        foreach ($list as $item) {
            $name = '';
            $color = '';

            if (is_string($item)) {
                $name = sanitize_text_field($item);
            } elseif (is_array($item)) {
                $name = isset($item['name']) ? sanitize_text_field($item['name']) : '';
                $color = isset($item['color']) ? sanitize_hex_color($item['color']) : '';
            }

            if ($name === '') {
                continue;
            }

            if (isset($seen[$name])) {
                continue;
            }

            $seen[$name] = true;
            $clean[] = array(
                'name' => $name,
                'color' => $color ? $color : '#E7E9EE',
            );
        }

        return $clean;
    }

    public static function default_categories(): array {
        return array(
            array('name' => '促销', 'color' => '#FFE4E1'),
            array('name' => '品牌', 'color' => '#E0F2FE'),
            array('name' => '转化', 'color' => '#DCFCE7'),
            array('name' => '内容', 'color' => '#EDE9FE'),
            array('name' => '联盟广告', 'color' => '#FEF3C7'),
            array('name' => '视频', 'color' => '#E0E7FF'),
            array('name' => '通用', 'color' => '#F3F4F6'),
        );
    }
}
