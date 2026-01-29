<?php

namespace MagickAD\Blocks;

if (!defined('ABSPATH')) {
    exit;
}

final class Patterns {
    public function register(): void {
        add_action('init', array($this, 'register_patterns'));
    }

    public function register_patterns(): void {
        if (!function_exists('register_block_pattern')) {
            return;
        }

        register_block_pattern_category('magick-ad', array(
            'label' => esc_html__('Magick AD', 'magick-ad'),
        ));

        foreach ($this->get_patterns() as $pattern) {
            register_block_pattern($pattern['name'], $pattern['args']);
        }
    }

    private function build_ad_block(array $attrs): string {
        $json = wp_json_encode($attrs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        return sprintf('<!-- wp:magick-ad/ad %s /-->', $json ? $json : '{}');
    }

    private function get_patterns(): array {
        $patterns = array();

        $patterns[] = array(
            'name' => 'magick-ad/adsense-responsive',
            'args' => array(
                'title' => esc_html__('AdSense 响应式', 'magick-ad'),
                'description' => esc_html__('预置 adsbygoogle 响应式结构', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'templateCategory' => '联盟广告',
                    'html' => '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXX" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></ins>',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/fullwidth-hero',
            'args' => array(
                'title' => esc_html__('全宽横幅', 'magick-ad'),
                'description' => esc_html__('背景图 + 文字居中', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'templateCategory' => '促销',
                    'html' => '<div class="magick-hero-banner" style="background-image:url(https://via.placeholder.com/1600x400?text=Banner);padding:64px 24px;text-align:center;color:#ffffff;"><div style="max-width:960px;margin:0 auto;"><h2 style="margin:0 0 12px;font-size:32px;">全站优惠活动</h2><p style="margin:0;font-size:18px;opacity:.9;">立即加入，获取专属折扣</p></div></div>',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/responsive-embed',
            'args' => array(
                'title' => esc_html__('嵌入式视频', 'magick-ad'),
                'description' => esc_html__('响应式 iframe 容器（16:9）', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'templateCategory' => '视频',
                    'html' => '<div style="position:relative;width:100%;padding-top:56.25%;overflow:hidden;border-radius:8px;background:#000;"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Video" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/centered-banner',
            'args' => array(
                'title' => esc_html__('居中横幅', 'magick-ad'),
                'description' => esc_html__('Flex 居中，背景透明', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'templateCategory' => '品牌',
                    'html' => '<div class="banner-slot">横幅广告内容</div>',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/card-promo',
            'args' => array(
                'title' => esc_html__('卡片式推广', 'magick-ad'),
                'description' => esc_html__('白色背景 + 圆角 + 阴影', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'templateCategory' => '转化',
                    'html' => '<h3>新品优惠</h3><p>立即领取专属折扣。</p>',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/raw-html',
            'args' => array(
                'title' => esc_html__('原始代码', 'magick-ad'),
                'description' => esc_html__('无任何包裹样式', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'templateCategory' => '通用',
                    'html' => '<div class="custom-slot">粘贴你的 HTML 代码</div>',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/image-banner',
            'args' => array(
                'title' => esc_html__('横幅图片', 'magick-ad'),
                'description' => esc_html__('适用于文章内横幅', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'image',
                    'templateCategory' => '促销',
                    'imageUrl' => 'https://via.placeholder.com/1200x240?text=Banner',
                    'imageAlt' => 'Banner',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/image-square',
            'args' => array(
                'title' => esc_html__('方形图', 'magick-ad'),
                'description' => esc_html__('适用于侧边栏或列表', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'image',
                    'templateCategory' => '内容',
                    'imageUrl' => 'https://via.placeholder.com/600x600?text=Image',
                    'imageAlt' => 'Square',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/video-inline',
            'args' => array(
                'title' => esc_html__('内嵌视频', 'magick-ad'),
                'description' => esc_html__('贴合正文的视频广告', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'video',
                    'templateCategory' => '视频',
                    'videoUrl' => 'https://www.w3schools.com/html/mov_bbb.mp4',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/video-cover',
            'args' => array(
                'title' => esc_html__('封面视频', 'magick-ad'),
                'description' => esc_html__('适合弹窗或浮层的展示', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'video',
                    'templateCategory' => '视频',
                    'videoUrl' => 'https://www.w3schools.com/html/movie.mp4',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/block-cta',
            'args' => array(
                'title' => esc_html__('CTA 卡片', 'magick-ad'),
                'description' => esc_html__('标题 + 文案 + 按钮', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'block',
                    'templateCategory' => '转化',
                    'blocks' => '<!-- wp:heading {"level":3} --><h3>限时特惠</h3><!-- /wp:heading --><!-- wp:paragraph --><p>今天下单享受 8 折优惠。</p><!-- /wp:paragraph --><!-- wp:buttons --><div class="wp-block-buttons"><div class="wp-block-button"><a class="wp-block-button__link">立即查看</a></div></div><!-- /wp:buttons -->',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/block-feature',
            'args' => array(
                'title' => esc_html__('图文卖点', 'magick-ad'),
                'description' => esc_html__('左右分栏图文排版', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'block',
                    'templateCategory' => '内容',
                    'blocks' => '<!-- wp:columns --><div class="wp-block-columns"><!-- wp:column --><div class="wp-block-column"><!-- wp:paragraph --><p>高转化广告位推荐</p><!-- /wp:paragraph --><!-- wp:list --><ul><li>快速配置</li><li>多端适配</li><li>自动统计</li></ul><!-- /wp:list --></div><!-- /wp:column --><!-- wp:column --><div class="wp-block-column"><!-- wp:image {"sizeSlug":"large"} --><figure class="wp-block-image size-large"><img src="https://via.placeholder.com/400x240?text=Image" alt=""/></figure><!-- /wp:image --></div><!-- /wp:column --></div><!-- /wp:columns -->',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/popup-cta',
            'args' => array(
                'title' => esc_html__('弹窗 CTA', 'magick-ad'),
                'description' => esc_html__('弹窗容器 + 促销文案', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'containerType' => 'popup',
                    'templateCategory' => '转化',
                    'html' => '<h3>限时弹窗优惠</h3><p>现在领取 9 折券。</p>',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/banner-sticky',
            'args' => array(
                'title' => esc_html__('横栏通知', 'magick-ad'),
                'description' => esc_html__('横栏容器 + 简短提示', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'containerType' => 'banner',
                    'templateCategory' => '品牌',
                    'html' => '<strong>新功能上线：</strong>立刻体验我们的新版服务。',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/floating-corner',
            'args' => array(
                'title' => esc_html__('角落悬浮', 'magick-ad'),
                'description' => esc_html__('悬浮容器 + 图片', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'image',
                    'containerType' => 'floating',
                    'templateCategory' => '转化',
                    'imageUrl' => 'https://via.placeholder.com/320x320?text=Floating',
                    'imageAlt' => 'Floating',
                )),
            ),
        );

        $patterns[] = array(
            'name' => 'magick-ad/interstitial-full',
            'args' => array(
                'title' => esc_html__('全屏插屏', 'magick-ad'),
                'description' => esc_html__('插屏容器 + 视觉冲击', 'magick-ad'),
                'categories' => array('magick-ad'),
                'content' => $this->build_ad_block(array(
                    'creativeType' => 'html',
                    'containerType' => 'interstitial',
                    'templateCategory' => '促销',
                    'html' => '<div style="text-align:center;"><h2>全屏活动</h2><p>限时福利，马上领取！</p></div>',
                )),
            ),
        );

        return $patterns;
    }
}
