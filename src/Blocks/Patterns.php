<?php

namespace MagickAD\Blocks;

if (!defined('ABSPATH')) {
    exit;
}

final class Patterns {
    private const CATEGORY = 'magick-ad';
    private const DEVICES = array('all', 'mobile', 'tablet', 'desktop');
    private const RISKS = array('low', 'medium', 'high');
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

        return array(
            'scenario' => $scenario,
            'device' => $device,
            'risk' => $risk,
            'version' => $version,
        );
    }

    private function get_patterns(): array {
        $allow_external_assets = $this->allow_external_assets();
        $placeholders = $this->get_placeholder_assets();

        return array_merge(
            $this->get_html_patterns($allow_external_assets),
            $this->get_image_patterns($allow_external_assets, $placeholders),
            $this->get_video_patterns($allow_external_assets),
            $this->get_block_patterns($allow_external_assets, $placeholders),
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
                    'html' => sprintf(
                        '<section class="magick-hero-banner" style="%spadding:56px 24px;border-radius:14px;text-align:center;color:#ffffff;"><div style="max-width:920px;margin:0 auto;"><p style="margin:0 0 10px;font-size:13px;letter-spacing:.06em;opacity:.9;">推荐内容</p><h2 style="margin:0 0 12px;font-size:30px;line-height:1.3;">向访客清晰传达你的核心价值</h2><p style="margin:0 0 18px;font-size:16px;opacity:.92;">适用于活动推广、功能介绍、订阅引导等大多数场景。</p><a href="#" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#ffffff;color:#0f172a;text-decoration:none;font-weight:600;">了解详情</a></div></section>',
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
                        ? '<div style="position:relative;width:100%;padding-top:56.25%;overflow:hidden;border-radius:10px;background:#000;"><iframe src="https://www.youtube.com/embed/aqz-KE-bpKQ" title="Video" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'
                        : $this->media_placeholder_html('视频占位（请替换链接）'),
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
                    'html' => '<div class="magick-ad-banner-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 16px;border:1px solid #d0d7de;border-radius:12px;background:#f8fafc;"><div><strong style="display:block;font-size:16px;color:#0f172a;">这里可以放置一条重点信息</strong><span style="font-size:13px;color:#475569;">适合文章中部、列表顶部或专题页。</span></div><a href="#" style="display:inline-block;padding:8px 14px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:13px;">查看详情</a></div>',
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
                    'html' => '<section style="max-width:760px;margin:0 auto;"><article style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:20px;border:1px solid #d9e1ea;border-radius:14px;background:#ffffff;box-shadow:0 8px 20px rgba(15,23,42,.06);"><div style="flex:1 1 320px;min-width:220px;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;">推荐</span><h3 style="margin:12px 0 8px;font-size:20px;line-height:1.35;color:#0f172a;">用一张卡片介绍你的重点内容</h3><p style="margin:0;font-size:14px;line-height:1.65;color:#475569;">可用于课程报名、产品更新、下载入口或会员权益说明。</p></div><a href="#" style="display:inline-block;align-self:flex-start;padding:9px 14px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;white-space:nowrap;">立即了解</a></article></section>',
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
                    'html' => '<div class="magick-ad-custom-slot">在此粘贴你的 HTML / JS 代码</div>',
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
        );
    }

    private function get_video_patterns(bool $allow_external_assets): array {
        $placeholder = $this->media_placeholder_html('视频占位（请替换为你的链接）');

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
                            'videoUrl' => 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
                        )
                        : array(
                            'creativeType' => 'html',
                            'templateCategory' => '视频',
                            'html' => $placeholder,
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
                            'videoUrl' => 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
                        )
                        : array(
                            'creativeType' => 'html',
                            'templateCategory' => '视频',
                            'html' => $placeholder,
                        )),
                ),
                array(
                    'scenario' => '品牌曝光',
                    'device' => 'desktop',
                    'risk' => 'medium',
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
                        'blocks' => '<!-- wp:heading {"level":3} --><h3>用简洁文案引导用户下一步操作</h3><!-- /wp:heading --><!-- wp:paragraph --><p>可替换为注册、咨询、下载、加入社群等任意行动目标。</p><!-- /wp:paragraph --><!-- wp:buttons --><div class="wp-block-buttons"><div class="wp-block-button"><a class="wp-block-button__link">立即开始</a></div></div><!-- /wp:buttons -->',
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
                        'blocks' => sprintf(
                            '<!-- wp:columns --><div class="wp-block-columns"><!-- wp:column --><div class="wp-block-column"><!-- wp:paragraph --><p>用图文组合表达你的核心卖点</p><!-- /wp:paragraph --><!-- wp:list --><ul><li>可替换为任意行业文案</li><li>支持快速替换主图和按钮</li><li>适配桌面与移动端阅读</li></ul><!-- /wp:list --></div><!-- /wp:column --><!-- wp:column --><div class="wp-block-column"><!-- wp:image {"sizeSlug":"large"} --><figure class="wp-block-image size-large"><img src="%s" alt=""/></figure><!-- /wp:image --></div><!-- /wp:column --></div><!-- /wp:columns -->',
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
                    'html' => '<div style="text-align:center;max-width:420px;margin:0 auto;"><h3 style="margin:0 0 10px;">欢迎查看本周重点内容</h3><p style="margin:0 0 14px;color:#475569;">这段文案可替换为订阅提醒、优惠领取或功能更新通知。</p><a href="#" style="display:inline-block;padding:9px 14px;border-radius:999px;background:#2563eb;color:#fff;text-decoration:none;">继续查看</a></div>',
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
                    'html' => '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;"><span><strong>公告：</strong>这里放置一条不会过时的通用提示文案。</span><a href="#" style="display:inline-block;padding:6px 12px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-size:12px;">查看</a></div>',
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
                    'html' => '<div style="text-align:center;max-width:560px;margin:0 auto;"><p style="margin:0 0 8px;font-size:13px;color:#64748b;">重点提示</p><h2 style="margin:0 0 12px;font-size:28px;line-height:1.3;color:#0f172a;">在全屏中展示你的核心信息</h2><p style="margin:0 0 16px;font-size:15px;color:#475569;">适合用于新功能发布、活动引导或重要公告。</p><a href="#" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#0f172a;color:#ffffff;text-decoration:none;">查看详情</a></div>',
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
