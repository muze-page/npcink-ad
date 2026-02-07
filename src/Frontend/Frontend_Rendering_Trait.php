<?php

namespace MagickAD\Frontend;

use MagickAD\Data\Settings;

if (!defined('ABSPATH')) {
    exit;
}

trait Frontend_Rendering_Trait {
    private static function normalize_options(array $ad): array {
        return isset($ad['options']) && is_array($ad['options']) ? $ad['options'] : array();
    }

    private static function resolve_content_type(array $options): string {
        $type = $options['creative_type'] ?? $options['content_type'] ?? 'image';
        return match ($type) {
            'block', 'html', 'image', 'video' => $type,
            default => 'image',
        };
    }

    private static function resolve_container_type(array $options): string {
        $type = $options['container_type'] ?? 'inline';
        return match ($type) {
            'inline', 'popup', 'banner', 'floating', 'interstitial' => $type,
            default => 'inline',
        };
    }

    private static function resolve_usage_type(array $options): string {
        $type = $options['usage_type'] ?? 'ad';
        return match ($type) {
            'ad', 'promo', 'decorative' => $type,
            default => 'ad',
        };
    }

    private static function build_body_by_type(string $content_type, array $content, array $options, array $ad): string {
        return match ($content_type) {
            'block' => self::build_block_body($content),
            'html' => self::build_html_body($content, $options, $ad),
            'image' => self::build_image_body($content, $options),
            'video' => self::build_video_body($content),
            default => '',
        };
    }

    private static function build_block_body(array $content): string {
        $blocks = isset($content['blocks']) ? (string) $content['blocks'] : '';
        if ($blocks === '') {
            return '';
        }
        $output = do_blocks($blocks);
        $block_settings = isset($content['block_settings']) && is_array($content['block_settings'])
            ? $content['block_settings']
            : array();
        $styles = array();
        $background = isset($block_settings['background']) ? (string) $block_settings['background'] : '';
        $background = self::sanitize_css_inline_value($background);
        $background_gradient = isset($block_settings['background_gradient']) ? (string) $block_settings['background_gradient'] : '';
        $background_gradient = self::sanitize_css_gradient($background_gradient);
        if ($background_gradient !== '') {
            $styles[] = 'background-image:' . esc_attr($background_gradient);
        } elseif ($background !== '' && $background !== 'transparent') {
            $styles[] = 'background:' . esc_attr($background);
        }
        $text_color = isset($block_settings['text_color']) ? (string) $block_settings['text_color'] : '';
        $text_color = self::sanitize_css_inline_value($text_color);
        if ($text_color !== '' && $text_color !== 'transparent') {
            $styles[] = 'color:' . esc_attr($text_color);
        }
        $padding = isset($block_settings['padding']) ? absint($block_settings['padding']) : 0;
        if ($padding > 0) {
            $styles[] = 'padding:' . $padding . 'px';
        }
        $radius = isset($block_settings['radius']) ? absint($block_settings['radius']) : 0;
        if ($radius > 0) {
            $styles[] = 'border-radius:' . $radius . 'px';
        }
        $border_width = isset($block_settings['border_width']) ? absint($block_settings['border_width']) : 0;
        $border_color = isset($block_settings['border_color']) ? (string) $block_settings['border_color'] : '';
        $border_color = self::sanitize_css_inline_value($border_color);
        if ($border_width > 0) {
            $color = $border_color !== '' ? esc_attr($border_color) : '#d0d7e2';
            $styles[] = 'border:' . $border_width . 'px solid ' . $color;
        }
        $shadow = isset($block_settings['shadow']) ? (string) $block_settings['shadow'] : 'none';
        if ($shadow === 'soft') {
            $styles[] = 'box-shadow:0 18px 40px rgba(15, 23, 42, 0.12)';
        } elseif ($shadow === 'float') {
            $styles[] = 'box-shadow:0 30px 60px rgba(15, 23, 42, 0.18)';
        }
        $max_width = isset($block_settings['max_width']) ? absint($block_settings['max_width']) : 0;
        if ($max_width > 0) {
            $styles[] = 'max-width:' . $max_width . 'px';
        }
        $font_size = isset($block_settings['font_size']) ? absint($block_settings['font_size']) : 0;
        if ($font_size > 0) {
            $styles[] = 'font-size:' . $font_size . 'px';
        }
        $font_family = isset($block_settings['font_family']) ? (string) $block_settings['font_family'] : '';
        $font_family = self::sanitize_css_font_family($font_family);
        if ($font_family !== '') {
            $styles[] = 'font-family:' . esc_attr($font_family);
        }
        $background_image = isset($block_settings['background_image']['url'])
            ? (string) $block_settings['background_image']['url']
            : '';
        if ($background_image !== '') {
            $styles[] = 'background-image:url(' . esc_url($background_image) . ')';
            $styles[] = 'background-size:cover';
            $styles[] = 'background-position:center';
        }
        $align = isset($block_settings['align']) ? (string) $block_settings['align'] : '';
        if ($align === 'center' || $max_width > 0) {
            $styles[] = 'margin-left:auto';
            $styles[] = 'margin-right:auto';
        }
        $style_attr = !empty($styles) ? ' style="' . esc_attr(implode(';', $styles)) . '"' : '';

        $layout = isset($block_settings['layout']) ? (string) $block_settings['layout'] : 'content';
        $media = isset($block_settings['media_image']) && is_array($block_settings['media_image'])
            ? $block_settings['media_image']
            : array();
        $media_markup = '';
        $media_id = isset($media['id']) ? absint($media['id']) : 0;
        $media_url = isset($media['url']) ? (string) $media['url'] : '';
        $media_alt = isset($media['alt']) ? (string) $media['alt'] : '';
        if ($media_id > 0) {
            $media_markup = wp_get_attachment_image(
                $media_id,
                'full',
                false,
                array(
                    'class' => 'magick-ad-block__media-img',
                    'loading' => 'lazy',
                    'decoding' => 'async',
                    'alt' => $media_alt,
                )
            );
        } elseif ($media_url !== '') {
            $media_markup = '<img class="magick-ad-block__media-img" src="' . esc_url($media_url) . '" alt="' . esc_attr($media_alt) . '" loading="lazy" decoding="async" />';
        }
        if ($media_markup !== '') {
            $media_markup = '<div class="magick-ad-block__media">' . $media_markup . '</div>';
        }

        $heading = isset($block_settings['heading']) ? (string) $block_settings['heading'] : '';
        $subheading = isset($block_settings['subheading']) ? (string) $block_settings['subheading'] : '';
        $heading_style = array();
        $heading_size = isset($block_settings['heading_size']) ? absint($block_settings['heading_size']) : 0;
        if ($heading_size > 0) {
            $heading_style[] = 'font-size:' . $heading_size . 'px';
        }
        $heading_line = isset($block_settings['heading_line_height']) ? (float) $block_settings['heading_line_height'] : 0;
        if ($heading_line > 0) {
            $heading_style[] = 'line-height:' . $heading_line;
        }
        $heading_weight = isset($block_settings['heading_weight']) ? (string) $block_settings['heading_weight'] : '';
        $heading_weight = self::sanitize_css_font_weight($heading_weight);
        if ($heading_weight !== '') {
            $heading_style[] = 'font-weight:' . esc_attr($heading_weight);
        }
        $subheading_style = array();
        $subheading_size = isset($block_settings['subheading_size']) ? absint($block_settings['subheading_size']) : 0;
        if ($subheading_size > 0) {
            $subheading_style[] = 'font-size:' . $subheading_size . 'px';
        }
        $subheading_line = isset($block_settings['subheading_line_height']) ? (float) $block_settings['subheading_line_height'] : 0;
        if ($subheading_line > 0) {
            $subheading_style[] = 'line-height:' . $subheading_line;
        }
        $subheading_weight = isset($block_settings['subheading_weight']) ? (string) $block_settings['subheading_weight'] : '';
        $subheading_weight = self::sanitize_css_font_weight($subheading_weight);
        if ($subheading_weight !== '') {
            $subheading_style[] = 'font-weight:' . esc_attr($subheading_weight);
        }
        $heading_markup = $heading !== ''
            ? '<div class="magick-ad-block__heading"' . (!empty($heading_style) ? ' style="' . esc_attr(implode(';', $heading_style)) . '"' : '') . '>' . esc_html($heading) . '</div>'
            : '';
        $subheading_markup = $subheading !== ''
            ? '<div class="magick-ad-block__subheading"' . (!empty($subheading_style) ? ' style="' . esc_attr(implode(';', $subheading_style)) . '"' : '') . '>' . esc_html($subheading) . '</div>'
            : '';

        $cta_text = isset($block_settings['cta_text']) ? (string) $block_settings['cta_text'] : '';
        $cta_link = isset($block_settings['cta_link']) ? (string) $block_settings['cta_link'] : '';
        $cta_target = !empty($block_settings['cta_target']);
        $cta_text_color = isset($block_settings['cta_text_color']) ? (string) $block_settings['cta_text_color'] : '';
        $cta_text_color = self::sanitize_css_inline_value($cta_text_color);
        $cta_background = isset($block_settings['cta_background']) ? (string) $block_settings['cta_background'] : '';
        $cta_background = self::sanitize_css_inline_value($cta_background);
        $cta_radius = isset($block_settings['cta_radius']) ? absint($block_settings['cta_radius']) : 0;
        $cta_style = array();
        if ($cta_text_color !== '' && $cta_text_color !== 'transparent') {
            $cta_style[] = 'color:' . esc_attr($cta_text_color);
        }
        if ($cta_background !== '' && $cta_background !== 'transparent') {
            $cta_style[] = 'background:' . esc_attr($cta_background);
        }
        if ($cta_radius > 0) {
            $cta_style[] = 'border-radius:' . $cta_radius . 'px';
        }
        $cta_attrs = $cta_target ? ' target="_blank" rel="noopener noreferrer"' : '';
        $cta_markup = ($cta_text !== '' && $cta_link !== '')
            ? '<a class="magick-ad-block__cta" href="' . esc_url($cta_link) . '"' . $cta_attrs . (!empty($cta_style) ? ' style="' . esc_attr(implode(';', $cta_style)) . '"' : '') . '>' . esc_html($cta_text) . '</a>'
            : '';

        $content_markup = '<div class="magick-ad-block__content">' . $heading_markup . $subheading_markup . $output . $cta_markup . '</div>';

        $layout_class = 'magick-ad-block magick-ad-block--content';
        $inner = $content_markup;
        if ($layout === 'stack' && $media_markup !== '') {
            $layout_class = 'magick-ad-block magick-ad-block--stack';
            $inner = $media_markup . $content_markup;
        } elseif ($layout === 'split' && $media_markup !== '') {
            $layout_class = 'magick-ad-block magick-ad-block--split';
            $inner = $media_markup . $content_markup;
        } elseif ($layout === 'split-reverse' && $media_markup !== '') {
            $layout_class = 'magick-ad-block magick-ad-block--split magick-ad-block--reverse';
            $inner = $content_markup . $media_markup;
        }

        return '<div class="magick-ad-block-content"' . $style_attr . '><div class="' . esc_attr($layout_class) . '">' . $inner . '</div></div>';
    }

    private static function sanitize_css_inline_value(string $value): string {
        $value = trim(wp_strip_all_tags($value));
        if ($value === '') {
            return '';
        }
        $value = preg_replace('/\\s+/', ' ', $value);
        $value = preg_replace('/[;{}<>]/', '', $value);
        $value = preg_replace('/[\\r\\n\\t]/', ' ', $value);
        $value = trim($value);

        return $value;
    }

    private static function sanitize_css_gradient(string $value): string {
        $value = trim(wp_strip_all_tags($value));
        if ($value === '') {
            return '';
        }
        if (preg_match('/[;{}<>\\r\\n]/', $value)) {
            return '';
        }
        if (!preg_match('/^(linear-gradient|radial-gradient)\\((.+)\\)$/i', $value)) {
            return '';
        }

        return $value;
    }

    private static function sanitize_css_font_family(string $value): string {
        $value = trim(wp_strip_all_tags($value));
        if ($value === '') {
            return '';
        }
        if (!preg_match('/^[a-zA-Z0-9\\s,"\'\\-]+$/', $value)) {
            return '';
        }

        return $value;
    }

    private static function sanitize_css_font_weight(string $value): string {
        $value = strtolower(trim(wp_strip_all_tags($value)));
        if ($value === '') {
            return '';
        }
        if (in_array($value, array('normal', 'bold', 'bolder', 'lighter'), true)) {
            return $value;
        }
        if (preg_match('/^[1-9]00$/', $value)) {
            return $value;
        }

        return '';
    }

    private static function build_html_body(array $content, array $options, array $ad): string {
        $html = isset($content['html']) ? (string) $content['html'] : '';
        if ($html === '') {
            return '';
        }

        $runtime_vars = !array_key_exists('html_runtime_vars', $content) ? true : !empty($content['html_runtime_vars']);
        if ($runtime_vars) {
            $tokens = self::build_runtime_tokens($ad);
            $html = self::replace_runtime_tokens($html, $tokens);
            $content['custom_html'] = self::replace_runtime_tokens((string) ($content['custom_html'] ?? ''), $tokens);
            $content['custom_css'] = self::replace_runtime_tokens((string) ($content['custom_css'] ?? ''), $tokens);
            $content['custom_js'] = self::replace_runtime_tokens((string) ($content['custom_js'] ?? ''), $tokens);
        }

        $body = self::append_custom_markup($html, $content);

        $system_allowlist = self::get_html_script_allowlist();
        $system_blocklist = self::get_html_script_blocklist();
        $allowlist = isset($content['html_script_allowlist']) && is_array($content['html_script_allowlist'])
            ? $content['html_script_allowlist']
            : array();
        $blocklist = isset($content['html_script_blocklist']) && is_array($content['html_script_blocklist'])
            ? $content['html_script_blocklist']
            : array();
        $allowlist = self::normalize_domain_list(array_merge($system_allowlist, $allowlist));
        $blocklist = self::normalize_domain_list(array_merge($system_blocklist, $blocklist));
        if (!empty($allowlist) || !empty($blocklist)) {
            $body = self::filter_html_scripts($body, $allowlist, $blocklist);
        }

        if (self::should_sandbox_html($options)) {
            $body = self::build_sandboxed_html($body, $options);
        }

        $strategy = isset($content['html_load_strategy']) ? (string) $content['html_load_strategy'] : 'immediate';
        $delay = isset($content['html_load_delay']) ? absint($content['html_load_delay']) : 0;
        if ($strategy !== 'immediate') {
            $payload = base64_encode($body);
            $attrs = ' data-ad-html="' . esc_attr($payload) . '" data-ad-html-strategy="' . esc_attr($strategy) . '"';
            if ($delay > 0) {
                $attrs .= ' data-ad-html-delay="' . esc_attr((string) $delay) . '"';
            }
            return '<div class="magick-ad-html-lazy"' . $attrs . '></div>';
        }

        return $body;
    }

    private static function should_sandbox_html(array $options): bool {
        $override = isset($options['html_sandbox']) ? (string) $options['html_sandbox'] : '';
        if ($override === 'enable') {
            return true;
        }
        if ($override === 'disable') {
            return false;
        }
        $enabled = (get_option('magick_ad_html_sandbox', '1') === '1');
        $enabled = (bool) apply_filters('magick_ad_html_sandbox_enabled', $enabled, $options);
        if (!$enabled) {
            return false;
        }
        $html_mode = isset($options['html_mode']) ? $options['html_mode'] : 'safe';
        return $html_mode === 'full';
    }

    private static function build_sandboxed_html(string $html, array $options = array()): string {
        $flags = array('allow-scripts');
        $flags = apply_filters('magick_ad_html_sandbox_flags', $flags, $options, $html);
        $flags = array_values(array_filter(array_map('strval', (array) $flags)));
        $flags = array_values(array_unique($flags));

        $legacy = (string) apply_filters('magick_ad_html_sandbox_permissions', '');
        $sandbox = $legacy !== '' ? $legacy : implode(' ', $flags);
        $referrer = (string) apply_filters('magick_ad_html_sandbox_referrerpolicy', 'no-referrer');
        $sandbox_attr = $sandbox !== '' ? ' sandbox="' . esc_attr(trim($sandbox)) . '"' : ' sandbox';
        $referrer_attr = $referrer !== '' ? ' referrerpolicy="' . esc_attr($referrer) . '"' : '';
        $srcdoc = esc_attr($html);

        return '<iframe class="magick-ad-html-sandbox"' . $sandbox_attr . $referrer_attr . ' loading="lazy" srcdoc="' . $srcdoc . '"></iframe>';
    }

    private static function build_runtime_tokens(array $ad): array {
        $ad_id = isset($ad['id']) ? (string) $ad['id'] : '';
        $request_uri = isset($_SERVER['REQUEST_URI'])
            ? sanitize_text_field(wp_unslash($_SERVER['REQUEST_URI']))
            : '';
        if ($request_uri !== '') {
            $parts = wp_parse_url($request_uri);
            $path = isset($parts['path']) ? $parts['path'] : '';
            $query = isset($parts['query']) ? '?' . $parts['query'] : '';
            $request_uri = sanitize_text_field($path . $query);
        }
        $page_url = $request_uri !== '' ? home_url($request_uri) : home_url('/');
        return array(
            '{site_url}' => home_url('/'),
            '{page_url}' => $page_url,
            '{ad_id}' => $ad_id,
        );
    }

    private static function replace_runtime_tokens(string $value, array $tokens): string {
        if ($value === '' || empty($tokens)) {
            return $value;
        }
        return strtr($value, $tokens);
    }

    private static function filter_html_scripts(string $html, array $allowlist, array $blocklist): string {
        if ($html === '') {
            return '';
        }
        $allowlist = self::normalize_domain_list($allowlist);
        $blocklist = self::normalize_domain_list($blocklist);
        if (empty($allowlist) && empty($blocklist)) {
            return $html;
        }
        return preg_replace_callback(
            '/<script\\b([^>]*)>(.*?)<\\/script>/is',
            function ($match) use ($allowlist, $blocklist) {
                $attrs = $match[1] ?? '';
                if (!preg_match('/\\bsrc\\s*=\\s*([\\\"\\\'])(.*?)\\1/i', $attrs, $src_match)) {
                    return $match[0];
                }
                $src = $src_match[2] ?? '';
                $host = '';
                $parsed = wp_parse_url($src);
                if (is_array($parsed) && !empty($parsed['host'])) {
                    $host = strtolower($parsed['host']);
                }
                if ($host === '') {
                    return $match[0];
                }
                if (self::is_domain_blocked($host, $blocklist)) {
                    return '';
                }
                if (!empty($allowlist) && !self::is_domain_allowed($host, $allowlist)) {
                    return '';
                }
                return $match[0];
            },
            $html
        );
    }

    private static function normalize_domain_list(array $domains): array {
        $list = array();
        foreach ($domains as $domain) {
            if (!is_string($domain)) {
                continue;
            }
            $domain = trim(strtolower($domain));
            if ($domain === '') {
                continue;
            }
            $domain = preg_replace('#^https?://#', '', $domain);
            $domain = preg_replace('#/.*$#', '', $domain);
            if ($domain === '') {
                continue;
            }
            $list[] = $domain;
        }
        return array_values(array_unique($list));
    }

    private static function get_site_domain(): string {
        $host = wp_parse_url(home_url(), PHP_URL_HOST);
        if (!is_string($host) || $host === '') {
            $host = wp_parse_url(site_url(), PHP_URL_HOST);
        }
        return is_string($host) ? strtolower($host) : '';
    }

    private static function get_html_script_allowlist(): array {
        $raw = get_option('magick_ad_html_script_allowlist', null);
        $value = is_array($raw) ? $raw : array();
        $list = self::normalize_domain_list($value);
        if (($raw === null || $raw === false) && empty($list)) {
            $site_domain = self::get_site_domain();
            if ($site_domain !== '') {
                $list[] = $site_domain;
            }
        }
        return $list;
    }

    private static function get_html_script_blocklist(): array {
        $value = get_option('magick_ad_html_script_blocklist', array());
        $value = is_array($value) ? $value : array();
        return self::normalize_domain_list($value);
    }

    private static function is_domain_allowed(string $host, array $allowlist): bool {
        foreach ($allowlist as $entry) {
            if (self::domain_matches($host, $entry)) {
                return true;
            }
        }
        return false;
    }

    private static function is_domain_blocked(string $host, array $blocklist): bool {
        foreach ($blocklist as $entry) {
            if (self::domain_matches($host, $entry)) {
                return true;
            }
        }
        return false;
    }

    private static function domain_matches(string $host, string $pattern): bool {
        if ($pattern === '') {
            return false;
        }
        if (str_starts_with($pattern, '*.')) {
            $suffix = substr($pattern, 1);
            return str_ends_with($host, $suffix);
        }
        return $host === $pattern;
    }

    private static function build_image_body(array $content, array $options = array()): string {
        $image = isset($content['image']) ? $content['image'] : array();
        $image_id = isset($image['id']) ? absint($image['id']) : 0;
        $image_url = isset($image['url']) ? (string) $image['url'] : '';
        if ($image_id < 1 && $image_url === '') {
            return '';
        }
        $image_settings = isset($content['image_settings']) ? $content['image_settings'] : array();
        $styles = array();
        $radius = isset($image_settings['radius']) ? absint($image_settings['radius']) : 0;
        $max_width = isset($image_settings['max_width']) ? absint($image_settings['max_width']) : 0;
        $margin_top = isset($image_settings['margin_top']) ? absint($image_settings['margin_top']) : 0;
        $margin_bottom = isset($image_settings['margin_bottom']) ? absint($image_settings['margin_bottom']) : 0;
        $margin_left = isset($image_settings['margin_left']) ? absint($image_settings['margin_left']) : 0;
        $margin_right = isset($image_settings['margin_right']) ? absint($image_settings['margin_right']) : 0;

        if ($radius) {
            $styles[] = 'border-radius:' . $radius . 'px';
        }
        if ($max_width) {
            $styles[] = 'max-width:' . $max_width . 'px';
            $styles[] = 'width:100%';
        }
        if ($margin_top) {
            $styles[] = 'margin-top:' . $margin_top . 'px';
        }
        if ($margin_bottom) {
            $styles[] = 'margin-bottom:' . $margin_bottom . 'px';
        }
        if ($margin_left) {
            $styles[] = 'margin-left:' . $margin_left . 'px';
        }
        if ($margin_right) {
            $styles[] = 'margin-right:' . $margin_right . 'px';
        }

        $style_string = $styles ? implode(';', $styles) : '';
        $image_alt = isset($image['alt']) ? (string) $image['alt'] : '';

        $img_tag = '';
        if ($image_id > 0) {
            $img_attrs = array(
                'loading' => 'lazy',
                'decoding' => 'async',
            );
            if ($style_string !== '') {
                $img_attrs['style'] = $style_string;
            }
            if ($image_alt !== '') {
                $img_attrs['alt'] = $image_alt;
            }
            $img_tag = wp_get_attachment_image($image_id, 'full', false, $img_attrs);
            if (!is_string($img_tag) || $img_tag === '') {
                $img_tag = '';
            }
        }

        if ($img_tag === '' && $image_url !== '') {
            $dimension_attr = '';
            $width = isset($image['width']) ? absint($image['width']) : 0;
            $height = isset($image['height']) ? absint($image['height']) : 0;
            if ($width > 0 && $height > 0) {
                $dimension_attr = ' width="' . $width . '" height="' . $height . '"';
            } elseif ($image_id > 0) {
                $size = wp_get_attachment_image_src($image_id, 'full');
                if (is_array($size) && isset($size[1], $size[2])) {
                    $width = absint($size[1]);
                    $height = absint($size[2]);
                    if ($width > 0 && $height > 0) {
                        $dimension_attr = ' width="' . $width . '" height="' . $height . '"';
                    }
                }
            }
            $style_attr = $style_string !== '' ? ' style="' . esc_attr($style_string) . '"' : '';
            $img_tag = '<img loading="lazy" decoding="async" src="' . esc_url($image_url) . '" alt="' . esc_attr($image_alt) . '"' . $dimension_attr . $style_attr . ' />';
        }
        if ($img_tag === '') {
            return '';
        }

        $link = isset($content['link']) ? $content['link'] : '';
        $link_target = !empty($content['link_target']);
        $cta_text = isset($content['cta_text']) ? (string) $content['cta_text'] : '';
        $custom_rel = isset($content['link_rel']) ? trim((string) $content['link_rel']) : '';
        $default_rel = (string) apply_filters(
            'magick_ad_link_rel_default',
            'nofollow sponsored',
            $content,
            $options
        );
        $rel = $custom_rel !== '' ? $custom_rel : $default_rel;
        $rel = (string) apply_filters('magick_ad_link_rel', $rel, $content, $options, $link_target);
        $rel_lower = strtolower($rel);
        if ($custom_rel !== '' && ($rel_lower === 'none' || $rel_lower === 'dofollow')) {
            $rel = '';
        }
        $rel_parts = $rel !== '' ? preg_split('/\s+/', $rel, -1, PREG_SPLIT_NO_EMPTY) : array();
        if ($link_target) {
            if (!in_array('noopener', $rel_parts, true)) {
                $rel_parts[] = 'noopener';
            }
            if (!in_array('noreferrer', $rel_parts, true)) {
                $rel_parts[] = 'noreferrer';
            }
        }
        $rel_parts = array_values(array_unique($rel_parts));
        $rel_attr = !empty($rel_parts) ? ' rel="' . esc_attr(implode(' ', $rel_parts)) . '"' : '';
        $target_attr = $link_target ? ' target="_blank"' : '';

        if ($link) {
            $img_tag = '<a href="' . esc_url($link) . '"' . $target_attr . $rel_attr . '>' . $img_tag . '</a>';
        }
        if ($link && $cta_text) {
            $img_tag .= '<a class="magick-ad-cta" href="' . esc_url($link) . '"' . $target_attr . $rel_attr . '>' . esc_html($cta_text) . '</a>';
        }
        return $img_tag;
    }

    private static function build_video_body(array $content): string {
        if (empty($content['video_url'])) {
            return '';
        }
        $settings = isset($content['video_settings']) && is_array($content['video_settings'])
            ? $content['video_settings']
            : array();
        $type = isset($settings['type']) ? (string) $settings['type'] : 'mp4';
        $aspect = isset($settings['aspect_ratio']) ? (string) $settings['aspect_ratio'] : '16:9';
        if ($aspect === 'custom') {
            $custom_ratio = isset($settings['aspect_ratio_custom']) ? (string) $settings['aspect_ratio_custom'] : '';
            if (preg_match('/^\\d{1,3}:\\d{1,3}$/', $custom_ratio)) {
                $aspect = $custom_ratio;
            } else {
                $aspect = '16:9';
            }
        }
        $wrapper_styles = array();
        $wrapper_class = 'magick-ad-video';
        if ($aspect !== '' && $aspect !== 'auto') {
            $wrapper_styles[] = 'aspect-ratio:' . esc_attr(str_replace(':', '/', $aspect));
            $wrapper_class .= ' magick-ad-video--ratio';
        }
        $wrapper_style_attr = !empty($wrapper_styles)
            ? ' style="' . esc_attr(implode(';', $wrapper_styles)) . '"'
            : '';
        $video_url = esc_url($content['video_url']);
        if ($type === 'embed') {
            return '<div class="' . esc_attr($wrapper_class) . '"' . $wrapper_style_attr . '><iframe class="magick-ad-video__media" src="' . $video_url . '" allowfullscreen loading="lazy" referrerpolicy="no-referrer"></iframe></div>';
        }
        $attrs = array();
        $autoplay = !empty($settings['autoplay']);
        $muted = !empty($settings['muted']) || $autoplay;
        if (!empty($settings['controls']) || !array_key_exists('controls', $settings)) {
            $attrs[] = 'controls';
        }
        if ($autoplay) {
            $attrs[] = 'autoplay';
        }
        if ($muted) {
            $attrs[] = 'muted';
        }
        if (!empty($settings['loop'])) {
            $attrs[] = 'loop';
        }
        if (!empty($settings['playsinline']) || !array_key_exists('playsinline', $settings)) {
            $attrs[] = 'playsinline';
        }
        $preload = isset($settings['preload']) ? (string) $settings['preload'] : '';
        if (in_array($preload, array('auto', 'metadata', 'none'), true)) {
            $attrs[] = 'preload="' . esc_attr($preload) . '"';
        }
        $poster_mode = isset($settings['poster_mode']) ? (string) $settings['poster_mode'] : 'manual';
        if ($poster_mode !== 'auto') {
            $poster = isset($settings['poster']['url']) ? esc_url($settings['poster']['url']) : '';
            if ($poster !== '') {
                $attrs[] = 'poster="' . $poster . '"';
            }
        }
        $fallback = isset($settings['fallback_text']) ? esc_html($settings['fallback_text']) : '';
        $attr_string = !empty($attrs) ? ' ' . implode(' ', $attrs) : '';
        $video = '<video class="magick-ad-video__media" src="' . $video_url . '"' . $attr_string . '>' . $fallback . '</video>';
        return '<div class="' . esc_attr($wrapper_class) . '"' . $wrapper_style_attr . '>' . $video . '</div>';
    }

    private static function append_custom_markup(string $body, array $content): string {
        $custom_html = isset($content['custom_html']) ? (string) $content['custom_html'] : '';
        $custom_css = isset($content['custom_css']) ? (string) $content['custom_css'] : '';
        $custom_js = isset($content['custom_js']) ? (string) $content['custom_js'] : '';
        if ($custom_html) {
            $body .= $custom_html;
        }
        if ($custom_css) {
            $custom_css = preg_replace('/<\/?style[^>]*>/i', '', $custom_css);
            $body = '<style>' . $custom_css . '</style>' . $body;
        }
        if ($custom_js) {
            $custom_js = preg_replace('/<\/?script[^>]*>/i', '', $custom_js);
            $body .= '<script>' . $custom_js . '</script>';
        }
        return $body;
    }

    private static function wrap_container_markup(string $body, array $content): string {
        $container_style = isset($content['container_style']) ? $content['container_style'] : array();
        $behavior = isset($content['behavior']) ? $content['behavior'] : array();
        $mode = isset($container_style['mode']) ? $container_style['mode'] : 'boxed';
        if ($mode === 'raw') {
            return $body;
        }

        list($classes, $styles) = self::build_container_classes_and_styles($container_style);
        $style_attr = $styles ? ' style="' . esc_attr(implode(';', $styles)) . '"' : '';
        $badge_markup = self::build_badge_markup($container_style);
        $close_markup = '';
        if (!empty($behavior['close_button'])) {
            $close_markup = '<button type="button" class="magick-ad-close" aria-label="' . esc_attr__('关闭', 'magick-ad') . '" data-wp-on--click="actions.close">×</button>';
        }

        return '<div class="' . esc_attr(implode(' ', $classes)) . '"' . $style_attr . '>' . $badge_markup . $close_markup . '<div class="magick-ad-html-content">' . $body . '</div></div>';
    }

    private static function build_container_classes_and_styles(array $container_style): array {
        $styles = array();
        $classes = array('magick-ad-html-container');
        $max_width = isset($container_style['max_width']) ? absint($container_style['max_width']) : 100;
        $max_width_unit = isset($container_style['max_width_unit']) ? $container_style['max_width_unit'] : '%';
        $padding_top = isset($container_style['padding_top']) ? absint($container_style['padding_top']) : 0;
        $padding_right = isset($container_style['padding_right']) ? absint($container_style['padding_right']) : 0;
        $padding_bottom = isset($container_style['padding_bottom']) ? absint($container_style['padding_bottom']) : 0;
        $padding_left = isset($container_style['padding_left']) ? absint($container_style['padding_left']) : 0;
        $background = isset($container_style['background']) ? $container_style['background'] : 'transparent';
        $radius = isset($container_style['radius']) ? absint($container_style['radius']) : 0;
        $shadow = isset($container_style['shadow']) ? $container_style['shadow'] : 'none';
        $layout = isset($container_style['layout']) ? $container_style['layout'] : '';

        if ($max_width) {
            $styles[] = 'max-width:' . $max_width . $max_width_unit;
            if ($max_width_unit === 'px') {
                $styles[] = 'width:100%';
            }
        }
        if ($padding_top || $padding_right || $padding_bottom || $padding_left) {
            $styles[] = sprintf(
                'padding:%dpx %dpx %dpx %dpx',
                $padding_top,
                $padding_right,
                $padding_bottom,
                $padding_left
            );
        }
        if (!empty($background) && $background !== 'transparent') {
            $styles[] = 'background:' . $background;
        }
        if ($radius) {
            $styles[] = 'border-radius:' . $radius . 'px';
        }
        if ($shadow === 'soft') {
            $classes[] = 'magick-ad-shadow--soft';
        } elseif ($shadow === 'float') {
            $classes[] = 'magick-ad-shadow--float';
        }
        if ($layout === 'centered') {
            $classes[] = 'magick-ad-layout--centered';
            $styles[] = 'margin-left:auto';
            $styles[] = 'margin-right:auto';
        }

        return array($classes, $styles);
    }

    private static function build_badge_markup(array $container_style): string {
        if (empty($container_style['badge_enabled'])) {
            return '';
        }
        $badge_type = isset($container_style['badge_type']) ? $container_style['badge_type'] : 'text';
        if ($badge_type === 'image') {
            $badge_image = isset($container_style['badge_image']) && is_array($container_style['badge_image'])
                ? $container_style['badge_image']
                : array();
            $badge_url = isset($badge_image['url']) ? esc_url($badge_image['url']) : '';
            if ($badge_url !== '') {
                $badge_alt = isset($badge_image['alt']) ? $badge_image['alt'] : '';
                $fallback_text = isset($container_style['badge_text']) ? $container_style['badge_text'] : '广告';
                $badge_alt = $badge_alt !== '' ? $badge_alt : $fallback_text;
                return '<span class="magick-ad-badge is-image"><img src="' . esc_url($badge_url) . '" alt="' . esc_attr($badge_alt) . '" /></span>';
            }
        }
        $badge_text = isset($container_style['badge_text']) ? $container_style['badge_text'] : '广告';
        $badge_color = isset($container_style['badge_color']) ? $container_style['badge_color'] : '#1d2327';
        return '<span class="magick-ad-badge" style="background:' . esc_attr($badge_color) . ';">' . esc_html($badge_text) . '</span>';
    }

    private static function wrap_modal_container(string $body, string $container_type): string {
        if (!in_array($container_type, array('popup', 'interstitial'), true)) {
            return $body;
        }
        $label_id = self::ensure_dialog_label_id($body);
        $label_attr = $label_id !== '' ? ' aria-labelledby="' . esc_attr($label_id) . '"' : '';
        return '<div class="magick-ad-overlay" data-wp-on--click="actions.onOverlayClick"></div><div class="magick-ad-popup" role="dialog" aria-modal="true"' . $label_attr . ' tabindex="-1">' . $body . '</div>';
    }

    private static function ensure_dialog_label_id(string &$body): string {
        if ($body === '') {
            return '';
        }
        $pattern = '/<h([1-6])\b([^>]*)>/i';
        if (!preg_match($pattern, $body, $matches)) {
            return '';
        }
        $attrs = $matches[2] ?? '';
        if (preg_match('/\bid=["\']([^"\']+)["\']/i', $attrs, $id_match)) {
            return (string) $id_match[1];
        }
        $label_id = 'magick-ad-dialog-title-' . wp_generate_uuid4();
        $body = preg_replace_callback(
            $pattern,
            function ($match) use ($label_id) {
                if (isset($match[2]) && preg_match('/\bid=["\']([^"\']+)["\']/i', $match[2])) {
                    return $match[0];
                }
                $attrs = isset($match[2]) ? $match[2] : '';
                $attrs = rtrim($attrs);
                return '<h' . $match[1] . $attrs . ' id="' . esc_attr($label_id) . '">';
            },
            $body,
            1
        );
        return $label_id;
    }

    private static function build_data_attributes(array $ad, array $options, array $content, string $position, string $container_type): string {
        $behavior = isset($content['behavior']) ? $content['behavior'] : array();
        $display_mode = isset($options['display_mode']) ? $options['display_mode'] : 'show';
        $random_strategy = isset($options['random_strategy']) ? $options['random_strategy'] : 'request';
        $render_profile = self::resolve_render_profile($options);
        $usage_type = self::resolve_usage_type($options);
        $ad_id = isset($ad['id']) ? (string) $ad['id'] : '';

        $data_attrs = ' data-ad-id="' . esc_attr($ad_id) . '" data-ad-position="' . esc_attr($position) . '"';
        $data_attrs .= ' data-ad-container="' . esc_attr($container_type) . '"';
        $data_attrs .= ' data-ad-usage="' . esc_attr($usage_type) . '"';
        $data_attrs .= ' data-ad-render-profile="' . esc_attr($render_profile) . '"';
        if ($usage_type === 'decorative') {
            $data_attrs .= ' data-ad-track="0"';
        }

        $slot = '';
        if (!empty($ad['_slot']) && is_string($ad['_slot'])) {
            $slot = sanitize_title($ad['_slot']);
            if ($slot !== '') {
                $slot = substr($slot, 0, 64);
                $data_attrs .= ' data-ad-slot="' . esc_attr($slot) . '"';
            }
        }

        if ($ad_id !== '') {
            $sig_rev = (int) get_option(Settings::RUNTIME_REV_KEY, 0);
            $sig_ts = \MagickAD\Utils\Tracking_Signature::current_sig_ts();
            $sig = \MagickAD\Utils\Tracking_Signature::build(
                $ad_id,
                $sig_ts,
                $slot,
                $position,
                $container_type,
                (string) $sig_rev
            );
            $data_attrs .= ' data-ad-sig="' . esc_attr($sig) . '"';
            $data_attrs .= ' data-ad-sig-ts="' . esc_attr($sig_ts) . '"';
            if ($sig_rev > 0) {
                $data_attrs .= ' data-ad-sig-rev="' . esc_attr((string) $sig_rev) . '"';
            }
        }

        $placement_hook = isset($options['placement_hook']) ? $options['placement_hook'] : '';
        if ($placement_hook === 'node') {
            $data_attrs .= self::build_node_data_attributes($options);
        }

        $delay = self::resolve_behavior_delay($behavior, $container_type);
        $animation = isset($behavior['animation']) ? $behavior['animation'] : 'none';
        $close_on_esc = array_key_exists('close_on_esc', $behavior) ? (bool) $behavior['close_on_esc'] : true;
        $close_on_overlay = array_key_exists('close_on_overlay', $behavior) ? (bool) $behavior['close_on_overlay'] : true;
        $lock_scroll = !empty($behavior['lock_scroll']);
        $frequency_mode = isset($behavior['frequency_mode']) ? $behavior['frequency_mode'] : 'none';
        $frequency_limit = isset($behavior['frequency_limit']) ? absint($behavior['frequency_limit']) : 1;

        if ($delay > 0) {
            $data_attrs .= ' data-ad-delay="' . esc_attr($delay) . '"';
        }
        if ($animation && $animation !== 'none') {
            $data_attrs .= ' data-ad-anim="' . esc_attr($animation) . '"';
        }
        if ($display_mode === 'random' && $random_strategy === 'session') {
            $data_attrs .= ' data-ad-random="session"';
        }
        if ($close_on_esc) {
            $data_attrs .= ' data-ad-close-esc="1"';
        }
        if ($close_on_overlay) {
            $data_attrs .= ' data-ad-close-overlay="1"';
        }
        if ($lock_scroll) {
            $data_attrs .= ' data-ad-lock-scroll="1"';
        }
        if ($usage_type !== 'decorative' && $frequency_mode && $frequency_mode !== 'none') {
            $data_attrs .= ' data-ad-freq-mode="' . esc_attr($frequency_mode) . '"';
            $data_attrs .= ' data-ad-freq-limit="' . esc_attr($frequency_limit) . '"';
        }
        if (!empty($content['_variant_id'])) {
            $data_attrs .= ' data-ad-variant="' . esc_attr((string) $content['_variant_id']) . '"';
        }
        if (!empty($content['variants_enabled']) && !empty($content['variants_strategy']) && $content['variants_strategy'] === 'session') {
            $data_attrs .= ' data-ad-variant-strategy="session"';
        }

        $creative_type = isset($options['creative_type']) ? (string) $options['creative_type'] : '';
        if ($creative_type === 'video') {
            $video_settings = isset($content['video_settings']) && is_array($content['video_settings'])
                ? $content['video_settings']
                : array();
            if (!empty($video_settings['autoplay_first'])) {
                $data_attrs .= ' data-ad-video-autoplay-first="1"';
            }
            if (!empty($video_settings['repeat_muted'])) {
                $data_attrs .= ' data-ad-video-repeat-muted="1"';
            }
            if (isset($video_settings['poster_mode']) && $video_settings['poster_mode'] === 'auto') {
                $data_attrs .= ' data-ad-video-poster-auto="1"';
            }
            if ($usage_type !== 'decorative' && !empty($video_settings['track_events'])) {
                $data_attrs .= ' data-ad-video-track="1"';
            }
        }
        $data_attrs .= ' data-wp-init="actions.initAd"';

        return $data_attrs;
    }

    private static function build_node_data_attributes(array $options): string {
        $node_type = isset($options['node_target_type']) ? $options['node_target_type'] : 'id';
        $node_value = isset($options['node_target_value']) ? $options['node_target_value'] : '';
        $node_insert = isset($options['node_insert']) ? $options['node_insert'] : 'append';
        $node_match = isset($options['node_match']) ? $options['node_match'] : 'first';
        $node_index = isset($options['node_index']) ? absint($options['node_index']) : 1;
        $node_fallback = isset($options['node_fallback']) ? $options['node_fallback'] : 'hide';
        $node_compact = !isset($options['node_compact']) ? true : (bool) $options['node_compact'];

        $data_attrs = ' data-ad-node-type="' . esc_attr($node_type) . '"';
        $data_attrs .= ' data-ad-node-value="' . esc_attr($node_value) . '"';
        $data_attrs .= ' data-ad-node-insert="' . esc_attr($node_insert) . '"';
        $data_attrs .= ' data-ad-node-match="' . esc_attr($node_match) . '"';
        if ($node_index > 0) {
            $data_attrs .= ' data-ad-node-index="' . esc_attr($node_index) . '"';
        }
        $data_attrs .= ' data-ad-node-fallback="' . esc_attr($node_fallback) . '"';
        $data_attrs .= ' data-ad-node-compact="' . ($node_compact ? '1' : '0') . '"';
        return $data_attrs;
    }

    private static function build_unit_class(array $ad, array $options, string $position, string $container_type): string {
        $display_mode = isset($options['display_mode']) ? $options['display_mode'] : 'show';
        $random_strategy = isset($options['random_strategy']) ? $options['random_strategy'] : 'request';
        $placement_hook = isset($options['placement_hook']) ? $options['placement_hook'] : '';
        $render_profile = self::resolve_render_profile($options);

        $container_class = 'magick-ad-container--' . esc_attr($container_type);
        $profile_class = 'magick-ad-profile--' . esc_attr($render_profile);
        $unit_class = 'magick-ad-unit magick-ad-unit--' . esc_attr($position) . ' ' . $container_class . ' ' . $profile_class;
        if ($placement_hook === 'node' && (!isset($options['node_compact']) || $options['node_compact'])) {
            $unit_class .= ' magick-ad-placement--node-compact';
        }
        if ($display_mode === 'random' && $random_strategy === 'session') {
            $unit_class .= ' magick-ad-is-hidden';
        }
        if (!empty($ad['_extra_class']) && is_string($ad['_extra_class'])) {
            $classes = preg_split('/\s+/', trim($ad['_extra_class']));
            $classes = array_filter(array_map('sanitize_html_class', $classes));
            if (!empty($classes)) {
                $unit_class .= ' ' . implode(' ', $classes);
            }
        }
        return $unit_class;
    }

    private static function resolve_render_profile(array $options): string {
        $profile = isset($options['render_profile']) ? (string) $options['render_profile'] : 'minimal';
        if (!in_array($profile, array('inherit', 'minimal', 'isolated'), true)) {
            return 'minimal';
        }
        return $profile;
    }

    private static function default_non_critical_delay(string $container_type): int {
        $delay = in_array($container_type, array('popup', 'banner', 'floating', 'interstitial'), true)
            ? 1
            : 0;
        $delay = (int) apply_filters('magick_ad_default_non_critical_delay', $delay, $container_type);
        if ($delay < 0) {
            return 0;
        }
        if ($delay > 120) {
            return 120;
        }
        return $delay;
    }

    private static function resolve_behavior_delay(array $behavior, string $container_type): int {
        if (array_key_exists('delay', $behavior)) {
            $delay = absint($behavior['delay']);
        } else {
            $delay = self::default_non_critical_delay($container_type);
        }
        if ($delay > 120) {
            $delay = 120;
        }
        return $delay;
    }

    private static function resolve_reserve_height(array $content, string $content_type, string $container_type): int {
        $container_style = isset($content['container_style']) ? $content['container_style'] : array();
        $reserve_height = isset($container_style['reserve_height']) ? absint($container_style['reserve_height']) : 0;
        if ($reserve_height > 0) {
            return $reserve_height;
        }
        if ($container_type !== 'inline') {
            return 0;
        }

        if ($content_type === 'image' && self::get_image_aspect_ratio($content) !== '') {
            return 0;
        }
        if ($content_type === 'video' && self::get_video_aspect_ratio($content) !== '') {
            return 0;
        }
        if ($content_type === 'html' && self::get_html_placeholder_ratio($content) !== '') {
            return 0;
        }

        $fallback = match ($content_type) {
            'image' => 180,
            'block' => 160,
            default => 120,
        };
        $fallback = (int) apply_filters(
            'magick_ad_default_reserve_height',
            $fallback,
            $container_type,
            $content_type,
            $content
        );
        if ($fallback < 0) {
            return 0;
        }
        if ($fallback > 2000) {
            return 2000;
        }
        return $fallback;
    }

    private static function build_inner_style(array $content, string $content_type, string $container_type): string {
        $reserve_height = self::resolve_reserve_height($content, $content_type, $container_type);
        $styles = array();
        if ($reserve_height > 0) {
            $styles[] = 'min-height:' . $reserve_height . 'px';
        } else {
            $ratio = '';
            if ($content_type === 'image') {
                $ratio = self::get_image_aspect_ratio($content);
            } elseif ($content_type === 'video') {
                $ratio = self::get_video_aspect_ratio($content);
            } elseif ($content_type === 'html') {
                $ratio = self::get_html_placeholder_ratio($content);
            }
            if ($ratio !== '') {
                $styles[] = 'aspect-ratio:' . esc_attr($ratio);
            }
        }
        if (empty($styles)) {
            return '';
        }
        return ' style="' . esc_attr(implode(';', $styles)) . '"';
    }

    private static function wrap_zone_markup($markup, $zone) {
        if (!$markup) {
            return '';
        }
        return '<div class="magick-ad-zone magick-ad-zone--' . esc_attr($zone) . '">' . $markup . '</div>';
    }

    private static function get_slot_placeholder_ratio(array $candidates): string {
        if (empty($candidates)) {
            return '';
        }
        $ratio = '';
        foreach ($candidates as $candidate) {
            if (!is_array($candidate)) {
                return '';
            }
            $options = isset($candidate['options']) && is_array($candidate['options'])
                ? $candidate['options']
                : array();
            $content = isset($candidate['content']) && is_array($candidate['content'])
                ? $candidate['content']
                : array();
            $creative_type = isset($options['creative_type']) ? (string) $options['creative_type'] : '';
            $candidate_ratio = '';
            if ($creative_type === 'image') {
                $candidate_ratio = self::get_image_aspect_ratio($content);
            } elseif ($creative_type === 'video') {
                $candidate_ratio = self::get_video_aspect_ratio($content);
            } elseif ($creative_type === 'html') {
                $candidate_ratio = self::get_html_placeholder_ratio($content);
            }
            if ($candidate_ratio === '') {
                return '';
            }
            if ($ratio === '') {
                $ratio = $candidate_ratio;
                continue;
            }
            if ($ratio !== $candidate_ratio) {
                return '';
            }
        }
        return $ratio;
    }

    private static function get_image_aspect_ratio(array $content): string {
        $image = isset($content['image']) && is_array($content['image']) ? $content['image'] : array();
        $width = isset($image['width']) ? absint($image['width']) : 0;
        $height = isset($image['height']) ? absint($image['height']) : 0;
        if ($width > 0 && $height > 0) {
            return $width . ' / ' . $height;
        }

        $image_id = isset($image['id']) ? absint($image['id']) : 0;
        if ($image_id > 0) {
            $size = wp_get_attachment_image_src($image_id, 'full');
            if (is_array($size) && isset($size[1], $size[2])) {
                $width = absint($size[1]);
                $height = absint($size[2]);
                if ($width > 0 && $height > 0) {
                    return $width . ' / ' . $height;
                }
            }
        }

        return '';
    }

    private static function get_video_aspect_ratio(array $content): string {
        $settings = isset($content['video_settings']) && is_array($content['video_settings'])
            ? $content['video_settings']
            : array();
        $aspect = isset($settings['aspect_ratio']) ? (string) $settings['aspect_ratio'] : '16:9';
        if ($aspect === 'custom') {
            $custom_ratio = isset($settings['aspect_ratio_custom']) ? (string) $settings['aspect_ratio_custom'] : '';
            if (preg_match('/^\\d{1,3}:\\d{1,3}$/', $custom_ratio)) {
                $aspect = $custom_ratio;
            } else {
                $aspect = '';
            }
        }
        if ($aspect === '' || $aspect === 'auto') {
            return '';
        }
        return str_replace(':', ' / ', $aspect);
    }

    private static function get_html_placeholder_ratio(array $content): string {
        $placeholder = isset($content['html_placeholder_ratio'])
            ? sanitize_text_field((string) $content['html_placeholder_ratio'])
            : '';
        if ($placeholder !== '' && preg_match('/^\\d{1,3}:\\d{1,3}$/', $placeholder)) {
            return str_replace(':', ' / ', $placeholder);
        }
        return '';
    }


}
