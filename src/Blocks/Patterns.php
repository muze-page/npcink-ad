<?php

namespace MagickAD\Blocks;

if (!defined('ABSPATH')) {
    exit;
}

final class Patterns {
    private const CATEGORY = 'magick-ad';
    private const DEVICES = array('all', 'mobile', 'tablet', 'desktop');
    private const RISKS = array('low', 'medium', 'high');
    private const INDUSTRIES = array('general', 'corporate', 'content', 'ecommerce');
    public const TEMPLATE_SCHEMA_VERSION = 2;

    public function register(): void {
        if (did_action('init')) {
            $this->register_patterns();
            return;
        }
        add_action('init', array($this, 'register_patterns'));
    }

    public static function export_patterns(): array {
        $instance = new self();
        $payload = array();

        foreach ($instance->get_patterns() as $pattern) {
            $args = isset($pattern['args']) && is_array($pattern['args'])
                ? $pattern['args']
                : array();
            $payload[] = array(
                'name' => $pattern['name'],
                'title' => $args['title'] ?? '',
                'description' => $args['description'] ?? '',
                'categories' => $args['categories'] ?? array(),
                'content' => $args['content'] ?? '',
                'meta' => $pattern['meta'] ?? array(),
            );
        }

        return $payload;
    }

    public function register_patterns(): void {
        if (!function_exists('register_block_pattern')) {
            return;
        }

        register_block_pattern_category(self::CATEGORY, array(
            'label' => esc_html__('Magick AD', 'magick-ad'),
        ));

        foreach ($this->get_patterns() as $pattern) {
            register_block_pattern($pattern['name'], $pattern['args']);
        }
    }

    private function build_ad_block(array $attrs): string {
        if (!isset($attrs['templateVersion'])) {
            $attrs['templateVersion'] = self::TEMPLATE_SCHEMA_VERSION;
        }
        if (!isset($attrs['usageType'])) {
            $attrs['usageType'] = 'ad';
        }
        $json = wp_json_encode($attrs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        return sprintf('<!-- wp:magick-ad/ad %s /-->', $json ? $json : '{}');
    }

    private function media_placeholder_html(string $label): string {
        $text = esc_html($label);
        return '<div style="position:relative;width:100%;padding-top:56.25%;border-radius:8px;background:linear-gradient(135deg,#0f172a,#1e293b);overflow:hidden;">'
            . '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#e2e8f0;font-size:15px;text-align:center;">'
            . '<div style="width:52px;height:52px;border-radius:999px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;">'
            . '<div style="width:0;height:0;border-top:8px solid transparent;border-bottom:8px solid transparent;border-left:14px solid #e2e8f0;margin-left:3px;"></div>'
            . '</div>'
            . '<span>' . $text . '</span>'
            . '</div>'
            . '</div>';
    }

    private function allow_external_assets(): bool {
        return (bool) apply_filters('magick_ad_allow_external_pattern_assets', false);
    }

    private function get_placeholder_assets(): array {
        $asset_base = rtrim(MAGICK_AD_URL, '/') . '/assets/placeholders/';
        return array(
            'banner' => $asset_base . 'banner.svg',
            'square' => $asset_base . 'square.svg',
            'feature' => $asset_base . 'feature.svg',
            'floating' => $asset_base . 'floating.svg',
            'poster' => $asset_base . 'poster.svg',
            'story' => $asset_base . 'story.svg',
            'video' => $asset_base . 'video.svg',
        );
    }

    private function pattern(string $name, array $args, array $meta = array()): array {
        if (!isset($args['categories'])) {
            $args['categories'] = array(self::CATEGORY);
        }

        $meta = $this->sanitize_meta($meta);
        $keywords = isset($args['keywords']) && is_array($args['keywords'])
            ? $args['keywords']
            : array();
        if ($meta['scenario'] !== '') {
        $keywords[] = $meta['scenario'];
        }
        $keywords[] = $meta['device'];
        $keywords[] = $meta['risk'];
        $keywords[] = $meta['industry'];
        $args['keywords'] = array_values(array_unique(array_filter($keywords)));

        return array(
            'name' => $name,
            'args' => $args,
            'meta' => $meta,
        );
    }

    private function sanitize_meta(array $meta): array {
        $scenario = isset($meta['scenario']) ? sanitize_text_field((string) $meta['scenario']) : '';
        $device = isset($meta['device']) ? (string) $meta['device'] : 'all';
        if (!in_array($device, self::DEVICES, true)) {
            $device = 'all';
        }
        $risk = isset($meta['risk']) ? (string) $meta['risk'] : 'low';
        if (!in_array($risk, self::RISKS, true)) {
            $risk = 'low';
        }
        $version = isset($meta['version']) && is_numeric($meta['version'])
            ? (int) $meta['version']
            : self::TEMPLATE_SCHEMA_VERSION;
        if ($version < 1) {
            $version = 1;
        }
        $industry = isset($meta['industry'])
            ? (string) $meta['industry']
            : $this->infer_industry_from_scenario($scenario);
        if (!in_array($industry, self::INDUSTRIES, true)) {
            $industry = 'general';
        }

        return array(
            'scenario' => $scenario,
            'device' => $device,
            'risk' => $risk,
            'industry' => $industry,
            'version' => $version,
        );
    }

    private function infer_industry_from_scenario(string $scenario): string {
        if ($scenario === '') {
            return 'general';
        }
        if (preg_match('/转化|促销|优惠|活动|下单|成交/u', $scenario)) {
            return 'ecommerce';
        }
        if (preg_match('/内容|教程|课程|博客|视频/u', $scenario)) {
            return 'content';
        }
        if (preg_match('/品牌|公告|企业|服务|客服|订阅/u', $scenario)) {
            return 'corporate';
        }
        return 'general';
    }

    private function get_patterns(): array {
        $allow_external_assets = $this->allow_external_assets();
        $placeholders = $this->get_placeholder_assets();

        return array_merge(
            $this->get_html_patterns($allow_external_assets),
            $this->get_image_patterns($allow_external_assets, $placeholders),
            $this->get_video_patterns($allow_external_assets, $placeholders),
            $this->get_block_patterns($allow_external_assets, $placeholders),
            $this->get_homepage_industry_patterns($allow_external_assets, $placeholders),
            $this->get_container_patterns($allow_external_assets, $placeholders)
        );
    }

    private function get_html_patterns(bool $allow_external_assets): array {
        $patterns = array();

        $patterns[] = $this->pattern(
            'magick-ad/adsense-responsive',
            array(
                'title' => esc_html__('AdSense 响应式', 'magick-ad'),
                'description' => esc_html__('适配多数内容区域宽度的联盟广告结构', 'magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'templateCategory' => '联盟广告',
                    'html' => '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXX" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></ins>',
                )),
            ),
            array(
                'scenario' => '转化引导',
                'device' => 'all',
                'risk' => 'medium',
            )
        );

        $patterns[] = $this->pattern(
            'magick-ad/fullwidth-hero',
            array(
                'title' => esc_html__('全宽主视觉', 'magick-ad'),
                'description' => esc_html__('适合首页或专题页的通用品牌展示', 'magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'templateCategory' => '品牌',
                    'usageType' => 'promo',
                    'html' => sprintf(
                        '<section class="magick-hero-banner" style="%spadding:52px 24px;border-radius:16px;overflow:hidden;color:#ffffff;"><div style="max-width:860px;margin:0 auto;text-align:center;"><p style="margin:0 0 10px;font-size:13px;letter-spacing:.06em;opacity:.88;">推荐内容</p><h2 style="margin:0;font-size:30px;line-height:1.3;">向访客清晰传达你的核心价值</h2><p style="margin:14px auto 0;max-width:680px;font-size:16px;line-height:1.65;opacity:.94;">适用于活动推广、功能介绍、订阅引导等大多数站点场景。</p><div style="margin-top:20px;"><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:10px 18px;border-radius:999px;background:#ffffff;color:#0f172a;text-decoration:none;font-weight:600;line-height:1.2;">了解详情</a></div></div></section>',
                        $allow_external_assets
                            ? 'background-image:url(https://via.placeholder.com/1600x400?text=Banner);'
                            : 'background:linear-gradient(135deg,#2563eb,#22d3ee);'
                    ),
                )),
            ),
            array(
                'scenario' => '品牌曝光',
                'device' => 'all',
                'risk' => 'low',
            )
        );

        $patterns[] = $this->pattern(
            'magick-ad/responsive-embed',
            array(
                'title' => esc_html__('响应式视频位', 'magick-ad'),
                'description' => esc_html__('16:9 视频容器，适合教程、评测或品牌介绍', 'magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'templateCategory' => '视频',
                    'html' => $allow_external_assets
                        ? '<section style="max-width:920px;margin:0 auto;"><div style="position:relative;width:100%;padding-top:56.25%;overflow:hidden;border-radius:12px;background:#000;"><iframe src="https://www.youtube.com/embed/aqz-KE-bpKQ" title="Video" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><p style="margin:10px 4px 0;font-size:13px;color:#64748b;">可替换为课程讲解、产品演示或案例回放视频。</p></section>'
                        : '<section style="max-width:920px;margin:0 auto;">' . $this->media_placeholder_html('视频占位（请替换链接）') . '</section>',
                )),
            ),
            array(
                'scenario' => '内容运营',
                'device' => 'all',
                'risk' => 'medium',
            )
        );

        $patterns[] = $this->pattern(
            'magick-ad/centered-banner',
            array(
                'title' => esc_html__('简洁横幅条', 'magick-ad'),
                'description' => esc_html__('一行主文案 + 操作按钮，适合正文中插入', 'magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'templateCategory' => '通用',
                    'usageType' => 'decorative',
                    'html' => '<section style="max-width:900px;margin:0 auto;"><div class="magick-ad-banner-row" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:15px 16px;border:1px solid #d0d7de;border-radius:12px;background:#f8fafc;"><div style="min-width:220px;flex:1 1 360px;"><strong style="display:block;font-size:16px;line-height:1.45;color:#0f172a;">这里可以放置一条重点信息</strong><span style="display:block;margin-top:6px;font-size:13px;line-height:1.55;color:#475569;">适合文章中部、列表顶部或专题页。</span></div><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:8px 14px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:13px;line-height:1.2;">查看详情</a></div></section>',
                )),
            ),
            array(
                'scenario' => '公告通知',
                'device' => 'all',
                'risk' => 'low',
            )
        );

        $patterns[] = $this->pattern(
            'magick-ad/card-promo',
            array(
                'title' => esc_html__('信息卡片', 'magick-ad'),
                'description' => esc_html__('轻量卡片结构，适用于多数站点风格', 'magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'templateCategory' => '通用',
                    'usageType' => 'promo',
                    'html' => '<section style="max-width:760px;margin:0 auto;"><article style="padding:24px;border:1px solid #d9e1ea;border-radius:14px;background:#ffffff;box-shadow:0 8px 20px rgba(15,23,42,.06);"><div style="max-width:640px;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;">推荐</span><h3 style="margin:14px 0 10px;font-size:20px;line-height:1.35;color:#0f172a;">用一张卡片介绍你的重点内容</h3><p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">可用于课程报名、产品更新、下载入口或会员权益说明。</p><div style="margin-top:18px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:10px 16px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;line-height:1.2;white-space:nowrap;">立即了解</a></div></div></article></section>',
                )),
            ),
            array(
                'scenario' => '转化引导',
                'device' => 'all',
                'risk' => 'low',
            )
        );

        $patterns[] = $this->pattern(
            'magick-ad/raw-html',
            array(
                'title' => esc_html__('原始代码骨架', 'magick-ad'),
                'description' => esc_html__('仅保留最小结构，便于粘贴第三方代码', 'magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'templateCategory' => '通用',
                    'html' => '<section style="max-width:860px;margin:0 auto;padding:18px;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;color:#475569;font-size:14px;line-height:1.7;"><strong style="display:block;color:#0f172a;font-size:15px;margin-bottom:8px;">原始代码区</strong>在此粘贴你的 HTML / JS 代码，建议先在预览中验证展示与交互效果。</section>',
                )),
            ),
            array(
                'scenario' => '开发扩展',
                'device' => 'all',
                'risk' => 'high',
            )
        );

        return $patterns;
    }

    private function get_image_patterns(bool $allow_external_assets, array $placeholders): array {
        return array(
            $this->pattern(
                'magick-ad/image-banner',
                array(
                    'title' => esc_html__('横幅图片（通用）', 'magick-ad'),
                    'description' => esc_html__('适用于内容区横幅、专题头图或活动入口', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'templateCategory' => '通用',
                        'usageType' => 'promo',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/1200x240?text=Banner'
                            : $placeholders['banner'],
                        'imageAlt' => '通用横幅占位图',
                    )),
                ),
                array(
                    'scenario' => '品牌曝光',
                    'device' => 'all',
                    'risk' => 'low',
                )
            ),
            $this->pattern(
                'magick-ad/image-square',
                array(
                    'title' => esc_html__('方形图片（通用）', 'magick-ad'),
                    'description' => esc_html__('适用于侧栏推荐、卡片列表或聚合页', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'templateCategory' => '通用',
                        'usageType' => 'promo',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/600x600?text=Image'
                            : $placeholders['square'],
                        'imageAlt' => '通用方图占位图',
                    )),
                ),
                array(
                    'scenario' => '内容运营',
                    'device' => 'all',
                    'risk' => 'low',
                )
            ),
            $this->pattern(
                'magick-ad/image-cover-16-9',
                array(
                    'title' => esc_html__('内容封面图（16:9）', 'magick-ad'),
                    'description' => esc_html__('适用于文章首图、专题封面或视频封面', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'templateCategory' => '内容',
                        'usageType' => 'promo',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/1280x720?text=Cover'
                            : $placeholders['feature'],
                        'imageAlt' => '16:9 封面占位图',
                    )),
                ),
                array(
                    'scenario' => '内容运营',
                    'device' => 'all',
                    'risk' => 'low',
                )
            ),
            $this->pattern(
                'magick-ad/image-poster-3-4',
                array(
                    'title' => esc_html__('活动海报（3:4）', 'magick-ad'),
                    'description' => esc_html__('适用于活动宣传、下载引导和移动端焦点位', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'templateCategory' => '促销',
                        'usageType' => 'promo',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/900x1200?text=Poster'
                            : $placeholders['poster'],
                        'imageAlt' => '3:4 海报占位图',
                    )),
                ),
                array(
                    'scenario' => '活动促销',
                    'device' => 'mobile',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/image-brand-strip',
                array(
                    'title' => esc_html__('品牌条幅（宽屏）', 'magick-ad'),
                    'description' => esc_html__('适用于导航下方、列表上方或专题页顶部', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'templateCategory' => '品牌',
                        'usageType' => 'decorative',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/1440x220?text=Brand+Strip'
                            : $placeholders['banner'],
                        'imageAlt' => '宽屏条幅占位图',
                    )),
                ),
                array(
                    'scenario' => '品牌曝光',
                    'device' => 'desktop',
                    'risk' => 'low',
                )
            ),
            $this->pattern(
                'magick-ad/image-cta-banner',
                array(
                    'title' => esc_html__('转化横幅（图像）', 'magick-ad'),
                    'description' => esc_html__('适用于促销入口、优惠券领取或课程报名', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'templateCategory' => '转化',
                        'usageType' => 'promo',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/1200x480?text=CTA+Banner'
                            : $placeholders['banner'],
                        'imageAlt' => '转化横幅占位图',
                    )),
                ),
                array(
                    'scenario' => '转化引导',
                    'device' => 'all',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/image-story-9-16',
                array(
                    'title' => esc_html__('短视频封面图（9:16）', 'magick-ad'),
                    'description' => esc_html__('适用于移动端信息流、故事页或短内容导流', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'templateCategory' => '内容',
                        'usageType' => 'promo',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/1080x1920?text=Story'
                            : $placeholders['story'],
                        'imageAlt' => '9:16 竖版封面占位图',
                    )),
                ),
                array(
                    'scenario' => '内容运营',
                    'device' => 'mobile',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/image-popup-promo',
                array(
                    'title' => esc_html__('弹窗主图（促销）', 'magick-ad'),
                    'description' => esc_html__('适用于限时活动、下载引导和注册提醒', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'containerType' => 'popup',
                        'templateCategory' => '促销',
                        'usageType' => 'promo',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/900x1200?text=Popup'
                            : $placeholders['poster'],
                        'imageAlt' => '促销弹窗主图占位图',
                    )),
                ),
                array(
                    'scenario' => '活动促销',
                    'device' => 'all',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/image-footer-brand',
                array(
                    'title' => esc_html__('页脚品牌露出（轻装饰）', 'magick-ad'),
                    'description' => esc_html__('适用于页脚上方品牌强化或长期提示区', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'templateCategory' => '品牌',
                        'usageType' => 'decorative',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/1200x180?text=Brand+Footer'
                            : $placeholders['banner'],
                        'imageAlt' => '页脚品牌露出占位图',
                    )),
                ),
                array(
                    'scenario' => '品牌曝光',
                    'device' => 'all',
                    'risk' => 'low',
                )
            ),
            $this->pattern(
                'magick-ad/image-video-cover',
                array(
                    'title' => esc_html__('视频封面图（预告）', 'magick-ad'),
                    'description' => esc_html__('适用于视频预告位、课程导流或案例播放入口', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'templateCategory' => '视频',
                        'usageType' => 'promo',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/1280x720?text=Video+Cover'
                            : $placeholders['video'],
                        'imageAlt' => '视频封面占位图',
                    )),
                ),
                array(
                    'scenario' => '内容运营',
                    'device' => 'all',
                    'risk' => 'low',
                )
            ),
        );
    }

    private function get_video_patterns(bool $allow_external_assets, array $placeholders): array {
        $video_url = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
        $video_placeholder = sprintf(
            '<section style="max-width:920px;margin:0 auto;"><div style="overflow:hidden;border-radius:12px;background:#0f172a;"><img src="%s" alt="%s" style="display:block;width:100%%;height:auto;" /></div><p style="margin:10px 4px 0;font-size:13px;line-height:1.6;color:#64748b;">%s</p></section>',
            esc_url($placeholders['video']),
            esc_attr('视频封面占位图'),
            esc_html__('请替换为你的视频链接，建议优先使用 MP4 或稳定的视频托管地址。', 'magick-ad')
        );
        $story_placeholder = sprintf(
            '<section style="max-width:420px;margin:0 auto;"><div style="overflow:hidden;border-radius:12px;background:#0f172a;"><img src="%s" alt="%s" style="display:block;width:100%%;height:auto;" /></div><p style="margin:10px 4px 0;font-size:13px;line-height:1.6;color:#64748b;">%s</p></section>',
            esc_url($placeholders['story']),
            esc_attr('竖版视频占位图'),
            esc_html__('适合移动端短内容导流，请替换为 9:16 视频。', 'magick-ad')
        );

        return array(
            $this->pattern(
                'magick-ad/video-inline',
                array(
                    'title' => esc_html__('内容区视频（通用）', 'magick-ad'),
                    'description' => $allow_external_assets
                        ? esc_html__('适合教程、产品介绍或案例演示', 'magick-ad')
                        : esc_html__('视频占位（请替换为你的链接）', 'magick-ad'),
                    'content' => $this->build_ad_block($allow_external_assets
                        ? array(
                            'creativeType' => 'video',
                            'templateCategory' => '视频',
                            'usageType' => 'promo',
                            'videoUrl' => $video_url,
                        )
                        : array(
                            'creativeType' => 'html',
                            'templateCategory' => '视频',
                            'usageType' => 'promo',
                            'html' => $video_placeholder,
                        )),
                ),
                array(
                    'scenario' => '内容运营',
                    'device' => 'all',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/video-cover',
                array(
                    'title' => esc_html__('封面视频（强调型）', 'magick-ad'),
                    'description' => $allow_external_assets
                        ? esc_html__('适合首屏导流、弹窗或重点活动展示', 'magick-ad')
                        : esc_html__('视频占位（请替换为你的链接）', 'magick-ad'),
                    'content' => $this->build_ad_block($allow_external_assets
                        ? array(
                            'creativeType' => 'video',
                            'templateCategory' => '视频',
                            'usageType' => 'promo',
                            'videoUrl' => $video_url,
                        )
                        : array(
                            'creativeType' => 'html',
                            'templateCategory' => '视频',
                            'usageType' => 'promo',
                            'html' => $video_placeholder,
                        )),
                ),
                array(
                    'scenario' => '品牌曝光',
                    'device' => 'desktop',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/video-short',
                array(
                    'title' => esc_html__('短视频导流（通用）', 'magick-ad'),
                    'description' => $allow_external_assets
                        ? esc_html__('适合社媒分发、活动引导或短内容承接', 'magick-ad')
                        : esc_html__('视频占位（请替换为你的链接）', 'magick-ad'),
                    'content' => $this->build_ad_block($allow_external_assets
                        ? array(
                            'creativeType' => 'video',
                            'templateCategory' => '视频',
                            'usageType' => 'promo',
                            'videoUrl' => $video_url,
                        )
                        : array(
                            'creativeType' => 'html',
                            'templateCategory' => '视频',
                            'usageType' => 'promo',
                            'html' => $story_placeholder,
                        )),
                ),
                array(
                    'scenario' => '转化引导',
                    'device' => 'mobile',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/video-popup-highlight',
                array(
                    'title' => esc_html__('视频弹窗（重点提示）', 'magick-ad'),
                    'description' => $allow_external_assets
                        ? esc_html__('适合新品发布、直播预告或限时活动提醒', 'magick-ad')
                        : esc_html__('视频占位（请替换为你的链接）', 'magick-ad'),
                    'content' => $this->build_ad_block($allow_external_assets
                        ? array(
                            'creativeType' => 'video',
                            'containerType' => 'popup',
                            'templateCategory' => '视频',
                            'usageType' => 'ad',
                            'videoUrl' => $video_url,
                        )
                        : array(
                            'creativeType' => 'html',
                            'containerType' => 'popup',
                            'templateCategory' => '视频',
                            'usageType' => 'ad',
                            'html' => '<div style="max-width:420px;margin:0 auto;">' . $video_placeholder . '<p style="margin:12px 0 0;text-align:center;font-size:13px;color:#64748b;">建议替换为你的发布预告或活动视频。</p></div>',
                        )),
                ),
                array(
                    'scenario' => '活动促销',
                    'device' => 'all',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/video-interstitial-focus',
                array(
                    'title' => esc_html__('全屏视频（活动焦点）', 'magick-ad'),
                    'description' => $allow_external_assets
                        ? esc_html__('适合发布会、重大活动或阶段性强提醒', 'magick-ad')
                        : esc_html__('视频占位（请替换为你的链接）', 'magick-ad'),
                    'content' => $this->build_ad_block($allow_external_assets
                        ? array(
                            'creativeType' => 'video',
                            'containerType' => 'interstitial',
                            'templateCategory' => '视频',
                            'usageType' => 'ad',
                            'videoUrl' => $video_url,
                        )
                        : array(
                            'creativeType' => 'html',
                            'containerType' => 'interstitial',
                            'templateCategory' => '视频',
                            'usageType' => 'ad',
                            'html' => '<div style="max-width:560px;margin:0 auto;text-align:center;">' . $video_placeholder . '<p style="margin:12px 0 0;font-size:13px;color:#64748b;">建议用于活动节点，避免常驻打扰。</p></div>',
                        )),
                ),
                array(
                    'scenario' => '活动促销',
                    'device' => 'all',
                    'risk' => 'high',
                )
            ),
            $this->pattern(
                'magick-ad/video-product-spotlight',
                array(
                    'title' => esc_html__('产品亮点视频（转化）', 'magick-ad'),
                    'description' => $allow_external_assets
                        ? esc_html__('适合功能讲解、案例展示和购买前介绍', 'magick-ad')
                        : esc_html__('视频占位（请替换为你的链接）', 'magick-ad'),
                    'content' => $this->build_ad_block($allow_external_assets
                        ? array(
                            'creativeType' => 'video',
                            'templateCategory' => '转化',
                            'usageType' => 'promo',
                            'videoUrl' => $video_url,
                        )
                        : array(
                            'creativeType' => 'html',
                            'templateCategory' => '转化',
                            'usageType' => 'promo',
                            'html' => $video_placeholder,
                        )),
                ),
                array(
                    'scenario' => '转化引导',
                    'device' => 'all',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/video-mobile-reel',
                array(
                    'title' => esc_html__('移动竖屏视频（9:16）', 'magick-ad'),
                    'description' => $allow_external_assets
                        ? esc_html__('适合移动端短视频导流、活动预告或教程摘要', 'magick-ad')
                        : esc_html__('竖版视频占位（请替换为你的链接）', 'magick-ad'),
                    'content' => $this->build_ad_block($allow_external_assets
                        ? array(
                            'creativeType' => 'video',
                            'templateCategory' => '视频',
                            'usageType' => 'promo',
                            'videoUrl' => $video_url,
                        )
                        : array(
                            'creativeType' => 'html',
                            'templateCategory' => '视频',
                            'usageType' => 'promo',
                            'html' => $story_placeholder,
                        )),
                ),
                array(
                    'scenario' => '内容运营',
                    'device' => 'mobile',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/video-banner-reminder',
                array(
                    'title' => esc_html__('横栏视频提醒（活动）', 'magick-ad'),
                    'description' => $allow_external_assets
                        ? esc_html__('适合首页顶部活动提醒或直播预告', 'magick-ad')
                        : esc_html__('视频占位（请替换为你的链接）', 'magick-ad'),
                    'content' => $this->build_ad_block($allow_external_assets
                        ? array(
                            'creativeType' => 'video',
                            'containerType' => 'banner',
                            'templateCategory' => '视频',
                            'usageType' => 'ad',
                            'videoUrl' => $video_url,
                        )
                        : array(
                            'creativeType' => 'html',
                            'containerType' => 'banner',
                            'templateCategory' => '视频',
                            'usageType' => 'ad',
                            'html' => '<div style="max-width:520px;margin:0 auto;">' . $video_placeholder . '</div>',
                        )),
                ),
                array(
                    'scenario' => '活动促销',
                    'device' => 'all',
                    'risk' => 'high',
                )
            ),
        );
    }

    private function get_block_patterns(bool $allow_external_assets, array $placeholders): array {
        $image_url = esc_url(
            $allow_external_assets
                ? 'https://via.placeholder.com/400x240?text=Image'
                : $placeholders['feature']
        );

        return array(
            $this->pattern(
                'magick-ad/block-cta',
                array(
                    'title' => esc_html__('通用 CTA 卡片', 'magick-ad'),
                    'description' => esc_html__('标题、说明和按钮的基础结构', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'block',
                        'templateCategory' => '通用',
                        'usageType' => 'promo',
                        'blocks' => '<!-- wp:group {"style":{"spacing":{"padding":{"top":"20px","right":"20px","bottom":"20px","left":"20px"},"blockGap":"12px"},"border":{"radius":"12px","width":"1px"},"color":{"background":"#f8fafc","border":"#d9e1ea"}},"layout":{"type":"constrained"}} --><div class="wp-block-group has-border-color has-background" style="border-color:#d9e1ea;border-width:1px;border-radius:12px;background-color:#f8fafc;padding-top:20px;padding-right:20px;padding-bottom:20px;padding-left:20px"><!-- wp:heading {"level":3} --><h3>用简洁文案引导用户下一步操作</h3><!-- /wp:heading --><!-- wp:paragraph --><p>可替换为注册、咨询、下载、加入社群等任意行动目标。</p><!-- /wp:paragraph --><!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button {"style":{"border":{"radius":"999px"}}} --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" style="border-radius:999px">立即开始</a></div><!-- /wp:button --></div><!-- /wp:buttons --></div><!-- /wp:group -->',
                    )),
                ),
                array(
                    'scenario' => '转化引导',
                    'device' => 'all',
                    'risk' => 'low',
                )
            ),
            $this->pattern(
                'magick-ad/block-feature',
                array(
                    'title' => esc_html__('图文功能介绍', 'magick-ad'),
                    'description' => esc_html__('适合内容站、工具站和品牌站的两栏结构', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'block',
                        'templateCategory' => '内容',
                        'usageType' => 'promo',
                        'blocks' => sprintf(
                            '<!-- wp:group {"style":{"spacing":{"padding":{"top":"20px","right":"20px","bottom":"20px","left":"20px"}},"border":{"radius":"12px","width":"1px"},"color":{"background":"#ffffff","border":"#d9e1ea"}},"layout":{"type":"constrained"}} --><div class="wp-block-group has-border-color has-background" style="border-color:#d9e1ea;border-width:1px;border-radius:12px;background-color:#ffffff;padding-top:20px;padding-right:20px;padding-bottom:20px;padding-left:20px"><!-- wp:columns {"verticalAlignment":"center"} --><div class="wp-block-columns are-vertically-aligned-center"><!-- wp:column {"verticalAlignment":"center"} --><div class="wp-block-column is-vertically-aligned-center"><!-- wp:paragraph --><p>用图文组合表达你的核心卖点</p><!-- /wp:paragraph --><!-- wp:list --><ul><li>可替换为任意行业文案</li><li>支持快速替换主图和按钮</li><li>适配桌面与移动端阅读</li></ul><!-- /wp:list --></div><!-- /wp:column --><!-- wp:column {"verticalAlignment":"center"} --><div class="wp-block-column is-vertically-aligned-center"><!-- wp:image {"sizeSlug":"large"} --><figure class="wp-block-image size-large"><img src="%s" alt=""/></figure><!-- /wp:image --></div><!-- /wp:column --></div><!-- /wp:columns --></div><!-- /wp:group -->',
                            $image_url
                        ),
                    )),
                ),
                array(
                    'scenario' => '内容运营',
                    'device' => 'desktop',
                    'risk' => 'low',
                )
            ),
        );
    }

    private function get_homepage_industry_patterns(bool $allow_external_assets, array $placeholders): array {
        $content_video_url = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
        $content_video_placeholder = sprintf(
            '<section style="max-width:920px;margin:0 auto;"><div style="overflow:hidden;border-radius:14px;background:#0f172a;"><img src="%s" alt="%s" style="display:block;width:100%%;height:auto;" /></div><p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#64748b;">%s</p></section>',
            esc_url($placeholders['video']),
            esc_attr('内容视频占位图'),
            esc_html__('请替换为你的首页视频链接，建议展示 30-90 秒精华内容。', 'magick-ad')
        );

        return array(
            $this->pattern(
                'magick-ad/corporate-home-hero',
                array(
                    'title' => esc_html__('企业首页主视觉（服务型）', 'magick-ad'),
                    'description' => esc_html__('适合企业官网首页首屏，强调服务价值与咨询入口', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'html',
                        'templateCategory' => '企业站',
                        'templateIndustry' => 'corporate',
                        'usageType' => 'promo',
                        'html' => '<section style="max-width:980px;margin:0 auto;padding:30px 26px;border:1px solid #d9e1ea;border-radius:16px;background:#f8fafc;"><p style="margin:0 0 10px;font-size:13px;color:#64748b;">企业服务</p><h2 style="margin:0;font-size:28px;line-height:1.35;color:#0f172a;">让潜在客户在首页 5 秒内理解你的价值</h2><p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#475569;max-width:760px;">可替换为核心服务、方案优势、交付承诺与咨询联系方式，适配多数企业官网风格。</p><div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;"><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:10px 16px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;line-height:1.2;">预约咨询</a><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:10px 16px;border-radius:10px;border:1px solid #cbd5e1;color:#0f172a;text-decoration:none;font-size:14px;line-height:1.2;">查看案例</a></div></section>',
                    )),
                ),
                array(
                    'scenario' => '品牌曝光',
                    'device' => 'all',
                    'risk' => 'low',
                    'industry' => 'corporate',
                )
            ),
            $this->pattern(
                'magick-ad/corporate-home-service-strip',
                array(
                    'title' => esc_html__('企业首页能力条（轻装饰）', 'magick-ad'),
                    'description' => esc_html__('适合首页首屏下方展示服务能力与覆盖范围', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'html',
                        'templateCategory' => '企业站',
                        'templateIndustry' => 'corporate',
                        'usageType' => 'decorative',
                        'html' => '<section style="max-width:980px;margin:0 auto;"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:14px 16px;border:1px solid #d9e1ea;border-radius:12px;background:#ffffff;"><span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:12px;">7x24 支持</span><span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#ecfeff;color:#155e75;font-size:12px;">标准化交付</span><span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#f0fdf4;color:#166534;font-size:12px;">多行业经验</span><span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#fff7ed;color:#c2410c;font-size:12px;">全国服务</span></div></section>',
                    )),
                ),
                array(
                    'scenario' => '服务介绍',
                    'device' => 'desktop',
                    'risk' => 'low',
                    'industry' => 'corporate',
                )
            ),
            $this->pattern(
                'magick-ad/corporate-home-consult-card',
                array(
                    'title' => esc_html__('企业首页咨询卡片', 'magick-ad'),
                    'description' => esc_html__('适合首页中段引导预约咨询、留资和方案下载', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'block',
                        'templateCategory' => '企业站',
                        'templateIndustry' => 'corporate',
                        'usageType' => 'promo',
                        'blocks' => '<!-- wp:group {"style":{"spacing":{"padding":{"top":"22px","right":"22px","bottom":"22px","left":"22px"},"blockGap":"12px"},"border":{"radius":"14px","width":"1px"},"color":{"background":"#ffffff","border":"#d9e1ea"}},"layout":{"type":"constrained"}} --><div class="wp-block-group has-border-color has-background" style="border-color:#d9e1ea;border-width:1px;border-radius:14px;background-color:#ffffff;padding-top:22px;padding-right:22px;padding-bottom:22px;padding-left:22px"><!-- wp:heading {"level":3} --><h3>用 1 分钟留下需求，我们给你一份可执行方案</h3><!-- /wp:heading --><!-- wp:paragraph --><p>将这里替换为你的咨询承诺、响应时效和服务范围，让访客更愿意提交信息。</p><!-- /wp:paragraph --><!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button {"style":{"border":{"radius":"999px"}}} --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" style="border-radius:999px">提交需求</a></div><!-- /wp:button --><!-- wp:button {"backgroundColor":"white","textColor":"black","style":{"border":{"radius":"999px","width":"1px"}}} --><div class="wp-block-button"><a class="wp-block-button__link has-black-color has-white-background-color has-text-color has-background wp-element-button" style="border-width:1px;border-radius:999px">下载方案</a></div><!-- /wp:button --></div><!-- /wp:buttons --></div><!-- /wp:group -->',
                    )),
                ),
                array(
                    'scenario' => '咨询留资',
                    'device' => 'all',
                    'risk' => 'medium',
                    'industry' => 'corporate',
                )
            ),
            $this->pattern(
                'magick-ad/corporate-home-notice-banner',
                array(
                    'title' => esc_html__('企业首页公告横栏', 'magick-ad'),
                    'description' => esc_html__('适合首页顶部放置版本公告、服务调整或活动通知', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'html',
                        'containerType' => 'banner',
                        'templateCategory' => '企业站',
                        'templateIndustry' => 'corporate',
                        'usageType' => 'decorative',
                        'html' => '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;"><span style="font-size:14px;line-height:1.6;color:#0f172a;"><strong>通知：</strong>这里可展示服务升级、交付计划或节假日安排。</span><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:7px 13px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-size:12px;line-height:1.2;">查看详情</a></div>',
                    )),
                ),
                array(
                    'scenario' => '公告通知',
                    'device' => 'all',
                    'risk' => 'medium',
                    'industry' => 'corporate',
                )
            ),
            $this->pattern(
                'magick-ad/content-home-featured-hero',
                array(
                    'title' => esc_html__('内容首页首屏导读', 'magick-ad'),
                    'description' => esc_html__('适合博客、资讯、课程站首页展示本周重点内容', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'html',
                        'templateCategory' => '内容站',
                        'templateIndustry' => 'content',
                        'usageType' => 'promo',
                        'html' => '<section style="max-width:980px;margin:0 auto;padding:26px;border:1px solid #d9e1ea;border-radius:16px;background:#ffffff;"><p style="margin:0 0 10px;font-size:13px;color:#64748b;">编辑推荐</p><h2 style="margin:0;font-size:28px;line-height:1.35;color:#0f172a;">先看这一篇，快速掌握本期核心内容</h2><p style="margin:12px 0 0;max-width:760px;font-size:15px;line-height:1.7;color:#475569;">可替换为专题导读、课程路径或栏目精选，帮助首页访客快速进入内容主线。</p><div style="margin-top:18px;"><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:10px 16px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;line-height:1.2;">开始阅读</a></div></section>',
                    )),
                ),
                array(
                    'scenario' => '内容运营',
                    'device' => 'all',
                    'risk' => 'low',
                    'industry' => 'content',
                )
            ),
            $this->pattern(
                'magick-ad/content-home-editor-picks',
                array(
                    'title' => esc_html__('内容首页精选封面图', 'magick-ad'),
                    'description' => esc_html__('适合在首页中上区域展示精选内容主图', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'templateCategory' => '内容站',
                        'templateIndustry' => 'content',
                        'usageType' => 'promo',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/1280x720?text=Editor+Pick'
                            : $placeholders['feature'],
                        'imageAlt' => '内容首页精选封面图',
                    )),
                ),
                array(
                    'scenario' => '内容运营',
                    'device' => 'all',
                    'risk' => 'low',
                    'industry' => 'content',
                )
            ),
            $this->pattern(
                'magick-ad/content-home-subscribe-popup',
                array(
                    'title' => esc_html__('内容首页订阅弹窗', 'magick-ad'),
                    'description' => esc_html__('适合内容站首页提醒订阅更新、领取资料或加入社群', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'html',
                        'containerType' => 'popup',
                        'templateCategory' => '内容站',
                        'templateIndustry' => 'content',
                        'usageType' => 'ad',
                        'html' => '<div style="max-width:440px;margin:0 auto;text-align:center;"><p style="margin:0 0 8px;font-size:13px;color:#64748b;">内容更新提醒</p><h3 style="margin:0;font-size:24px;line-height:1.35;color:#0f172a;">订阅后第一时间收到最新内容</h3><p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#475569;">可替换为 newsletter、课程更新通知或资料包领取入口。</p><div style="margin-top:16px;"><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:10px 16px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-size:14px;line-height:1.2;">立即订阅</a></div></div>',
                    )),
                ),
                array(
                    'scenario' => '订阅留资',
                    'device' => 'all',
                    'risk' => 'medium',
                    'industry' => 'content',
                )
            ),
            $this->pattern(
                'magick-ad/content-home-video-recap',
                array(
                    'title' => esc_html__('内容首页视频回顾', 'magick-ad'),
                    'description' => esc_html__('适合首页展示栏目回顾、课程节选或访谈摘要', 'magick-ad'),
                    'content' => $this->build_ad_block($allow_external_assets
                        ? array(
                            'creativeType' => 'video',
                            'templateCategory' => '内容站',
                            'templateIndustry' => 'content',
                            'usageType' => 'promo',
                            'videoUrl' => $content_video_url,
                        )
                        : array(
                            'creativeType' => 'html',
                            'templateCategory' => '内容站',
                            'templateIndustry' => 'content',
                            'usageType' => 'promo',
                            'html' => $content_video_placeholder,
                        )),
                ),
                array(
                    'scenario' => '内容运营',
                    'device' => 'all',
                    'risk' => 'medium',
                    'industry' => 'content',
                )
            ),
            $this->pattern(
                'magick-ad/ecommerce-home-deal-hero',
                array(
                    'title' => esc_html__('电商首页活动主视觉', 'magick-ad'),
                    'description' => esc_html__('适合首页首屏展示活动档期、核心优惠与主推品类', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'html',
                        'templateCategory' => '电商站',
                        'templateIndustry' => 'ecommerce',
                        'usageType' => 'promo',
                        'html' => '<section style="max-width:980px;margin:0 auto;padding:28px;border-radius:16px;background:linear-gradient(135deg,#0f172a,#334155);color:#ffffff;"><p style="margin:0 0 8px;font-size:13px;opacity:.88;">限时活动</p><h2 style="margin:0;font-size:30px;line-height:1.3;">首页第一屏先讲清楚“现在买有什么好处”</h2><p style="margin:12px 0 0;max-width:760px;font-size:15px;line-height:1.7;opacity:.92;">可替换为满减、折扣、赠品和包邮策略，适合多品类电商站快速套用。</p><div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;"><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:10px 16px;border-radius:10px;background:#ffffff;color:#0f172a;text-decoration:none;font-size:14px;line-height:1.2;font-weight:600;">立即抢购</a><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:10px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.35);color:#ffffff;text-decoration:none;font-size:14px;line-height:1.2;">查看规则</a></div></section>',
                    )),
                ),
                array(
                    'scenario' => '活动促销',
                    'device' => 'all',
                    'risk' => 'medium',
                    'industry' => 'ecommerce',
                )
            ),
            $this->pattern(
                'magick-ad/ecommerce-home-coupon-banner',
                array(
                    'title' => esc_html__('电商首页优惠横栏', 'magick-ad'),
                    'description' => esc_html__('适合首页顶部常驻展示优惠券与包邮门槛', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'html',
                        'containerType' => 'banner',
                        'templateCategory' => '电商站',
                        'templateIndustry' => 'ecommerce',
                        'usageType' => 'ad',
                        'html' => '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;"><span style="font-size:14px;line-height:1.6;color:#0f172a;"><strong>今日优惠：</strong>满 199 减 30，满 299 包邮，可替换为你的活动规则。</span><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:7px 13px;border-radius:999px;background:#2563eb;color:#fff;text-decoration:none;font-size:12px;line-height:1.2;">立即领取</a></div>',
                    )),
                ),
                array(
                    'scenario' => '活动促销',
                    'device' => 'all',
                    'risk' => 'high',
                    'industry' => 'ecommerce',
                )
            ),
            $this->pattern(
                'magick-ad/ecommerce-home-product-grid',
                array(
                    'title' => esc_html__('电商首页新品导流图', 'magick-ad'),
                    'description' => esc_html__('适合首页中部展示新品合集、品类集合或爆款专题', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'templateCategory' => '电商站',
                        'templateIndustry' => 'ecommerce',
                        'usageType' => 'promo',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/1200x480?text=New+Arrivals'
                            : $placeholders['banner'],
                        'imageAlt' => '电商首页新品导流图',
                    )),
                ),
                array(
                    'scenario' => '转化引导',
                    'device' => 'all',
                    'risk' => 'medium',
                    'industry' => 'ecommerce',
                )
            ),
            $this->pattern(
                'magick-ad/ecommerce-home-flash-popup',
                array(
                    'title' => esc_html__('电商首页限时弹窗', 'magick-ad'),
                    'description' => esc_html__('适合大促节点、库存告急或新品首发提醒', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'containerType' => 'popup',
                        'templateCategory' => '电商站',
                        'templateIndustry' => 'ecommerce',
                        'usageType' => 'ad',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/900x1200?text=Flash+Sale'
                            : $placeholders['poster'],
                        'imageAlt' => '电商首页限时活动图',
                    )),
                ),
                array(
                    'scenario' => '活动促销',
                    'device' => 'all',
                    'risk' => 'high',
                    'industry' => 'ecommerce',
                )
            ),
        );
    }

    private function get_container_patterns(bool $allow_external_assets, array $placeholders): array {
        return array(
            $this->pattern(
                'magick-ad/popup-cta',
                array(
                    'title' => esc_html__('弹窗提示（通用）', 'magick-ad'),
                    'description' => esc_html__('适合订阅、优惠、下载等通用引导', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'html',
                        'containerType' => 'popup',
                        'templateCategory' => '通用',
                        'usageType' => 'promo',
                        'html' => '<div style="text-align:center;max-width:440px;margin:0 auto;"><p style="margin:0 0 8px;font-size:13px;color:#64748b;">限时推荐</p><h3 style="margin:0;font-size:24px;line-height:1.35;color:#0f172a;">欢迎查看本周重点内容</h3><p style="margin:12px 0 0;color:#475569;line-height:1.65;">这段文案可替换为订阅提醒、优惠领取或功能更新通知。</p><div style="margin-top:16px;"><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:10px 16px;border-radius:999px;background:#2563eb;color:#fff;text-decoration:none;font-size:14px;line-height:1.2;">继续查看</a></div></div>',
                    )),
                ),
                array(
                    'scenario' => '订阅留资',
                    'device' => 'all',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/banner-sticky',
                array(
                    'title' => esc_html__('横栏提示（通用）', 'magick-ad'),
                    'description' => esc_html__('适合公告、版本更新、活动提醒', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'html',
                        'containerType' => 'banner',
                        'templateCategory' => '通用',
                        'usageType' => 'decorative',
                        'html' => '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;"><span style="font-size:14px;line-height:1.6;color:#0f172a;"><strong>公告：</strong>这里放置一条不会过时的通用提示文案。</span><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:7px 13px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-size:12px;line-height:1.2;">查看</a></div>',
                    )),
                ),
                array(
                    'scenario' => '公告通知',
                    'device' => 'all',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/floating-corner',
                array(
                    'title' => esc_html__('角落悬浮（通用）', 'magick-ad'),
                    'description' => esc_html__('适合客服入口、活动提醒或快捷引导', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'image',
                        'containerType' => 'floating',
                        'templateCategory' => '通用',
                        'usageType' => 'promo',
                        'imageUrl' => $allow_external_assets
                            ? 'https://via.placeholder.com/320x320?text=Floating'
                            : $placeholders['floating'],
                        'imageAlt' => '悬浮位占位图',
                    )),
                ),
                array(
                    'scenario' => '客服触达',
                    'device' => 'mobile',
                    'risk' => 'medium',
                )
            ),
            $this->pattern(
                'magick-ad/interstitial-full',
                array(
                    'title' => esc_html__('全屏插屏（通用）', 'magick-ad'),
                    'description' => esc_html__('适合展示重点活动或阶段性公告', 'magick-ad'),
                    'content' => $this->build_ad_block(array(
                        'creativeType' => 'html',
                        'containerType' => 'interstitial',
                        'templateCategory' => '通用',
                        'usageType' => 'ad',
                        'html' => '<div style="text-align:center;max-width:580px;margin:0 auto;"><p style="margin:0 0 8px;font-size:13px;color:#64748b;">重点提示</p><h2 style="margin:0;font-size:28px;line-height:1.3;color:#0f172a;">在全屏中展示你的核心信息</h2><p style="margin:14px auto 0;max-width:520px;font-size:15px;line-height:1.65;color:#475569;">适合用于新功能发布、活动引导或重要公告。</p><div style="margin-top:18px;"><a href="#" style="display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:10px 18px;border-radius:999px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;line-height:1.2;">查看详情</a></div></div>',
                    )),
                ),
                array(
                    'scenario' => '活动促销',
                    'device' => 'all',
                    'risk' => 'high',
                )
            ),
        );
    }
}
