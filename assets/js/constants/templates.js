export const HTML_TEMPLATES = [
    {
        id: 'adsense',
        name: 'AdSense 响应式容器',
        description: '标准 AdSense 响应式代码骨架',
        type: 'html',
        source: 'preset',
        data: {
            html: '<div class="adsense-slot">请在此替换为 AdSense 代码</div>',
            container_style: {
                mode: 'boxed',
                max_width: 100,
                max_width_unit: '%',
                padding_top: 0,
                padding_right: 0,
                padding_bottom: 0,
                padding_left: 0,
                background: 'transparent',
                radius: 0,
                shadow: 'none',
                badge_enabled: false,
                badge_text: '广告',
                badge_color: '#1d2327',
                layout: '',
            },
        },
    },
    {
        id: 'centered',
        name: '居中横幅',
        description: 'Flex 居中，背景透明',
        type: 'html',
        source: 'preset',
        data: {
            html: '<div class="banner-slot">横幅广告内容</div>',
            container_style: {
                mode: 'boxed',
                max_width: 100,
                max_width_unit: '%',
                padding_top: 12,
                padding_right: 12,
                padding_bottom: 12,
                padding_left: 12,
                background: 'transparent',
                radius: 0,
                shadow: 'none',
                badge_enabled: false,
                badge_text: '广告',
                badge_color: '#1d2327',
                layout: 'centered',
            },
        },
    },
    {
        id: 'card',
        name: '卡片式推广',
        description: '白色背景 + 圆角 + 阴影',
        type: 'html',
        source: 'preset',
        data: {
            html: '<h3>新品优惠</h3><p>立即领取专属折扣。</p>',
            container_style: {
                mode: 'boxed',
                max_width: 100,
                max_width_unit: '%',
                padding_top: 24,
                padding_right: 24,
                padding_bottom: 24,
                padding_left: 24,
                background: '#ffffff',
                radius: 8,
                shadow: 'soft',
                badge_enabled: true,
                badge_text: '推广',
                badge_color: '#1d2327',
                layout: '',
            },
        },
    },
    {
        id: 'raw',
        name: '原始代码',
        description: '无任何包裹样式',
        type: 'html',
        source: 'preset',
        data: {
            html: '<div class="custom-slot">粘贴你的 HTML 代码</div>',
            container_style: {
                mode: 'raw',
                max_width: 100,
                max_width_unit: '%',
                padding_top: 0,
                padding_right: 0,
                padding_bottom: 0,
                padding_left: 0,
                background: 'transparent',
                radius: 0,
                shadow: 'none',
                badge_enabled: false,
                badge_text: '广告',
                badge_color: '#1d2327',
                layout: '',
            },
        },
    },
];

export const IMAGE_TEMPLATES = [
    {
        id: 'image-banner',
        name: '横幅图片',
        description: '适用于文章内横幅',
        type: 'image',
        source: 'preset',
        data: {
            image: {
                id: 0,
                url: 'https://via.placeholder.com/1200x240?text=Banner',
                alt: 'Banner',
            },
            link: '',
            link_target: false,
            image_settings: {
                radius: 8,
                max_width: 1200,
                margin_top: 0,
                margin_bottom: 0,
                margin_left: 0,
                margin_right: 0,
                watermark: false,
            },
        },
    },
    {
        id: 'image-square',
        name: '方形图',
        description: '适用于侧边栏或列表',
        type: 'image',
        source: 'preset',
        data: {
            image: {
                id: 0,
                url: 'https://via.placeholder.com/600x600?text=Image',
                alt: 'Square',
            },
            link: '',
            link_target: true,
            image_settings: {
                radius: 12,
                max_width: 600,
                margin_top: 0,
                margin_bottom: 0,
                margin_left: 0,
                margin_right: 0,
                watermark: false,
            },
        },
    },
];

export const VIDEO_TEMPLATES = [
    {
        id: 'video-inline',
        name: '内嵌视频',
        description: '贴合正文的视频广告',
        type: 'video',
        source: 'preset',
        data: {
            video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        },
    },
    {
        id: 'video-cover',
        name: '封面视频',
        description: '适合弹窗或浮层的展示',
        type: 'video',
        source: 'preset',
        data: {
            video_url: 'https://www.w3schools.com/html/movie.mp4',
        },
    },
];

export const BLOCK_TEMPLATES = [
    {
        id: 'block-cta',
        name: 'CTA 卡片',
        description: '标题 + 文案 + 按钮',
        type: 'block',
        source: 'preset',
        data: {
            blocks:
                '<!-- wp:heading {"level":3} --><h3>限时特惠</h3><!-- /wp:heading --><!-- wp:paragraph --><p>今天下单享受 8 折优惠。</p><!-- /wp:paragraph --><!-- wp:buttons --><div class="wp-block-buttons"><div class="wp-block-button"><a class="wp-block-button__link">立即查看</a></div></div><!-- /wp:buttons -->',
        },
    },
    {
        id: 'block-feature',
        name: '图文卖点',
        description: '左右分栏图文排版',
        type: 'block',
        source: 'preset',
        data: {
            blocks:
                '<!-- wp:columns --><div class="wp-block-columns"><!-- wp:column --><div class="wp-block-column"><!-- wp:paragraph --><p>高转化广告位推荐</p><!-- /wp:paragraph --><!-- wp:list --><ul><li>快速配置</li><li>多端适配</li><li>自动统计</li></ul><!-- /wp:list --></div><!-- /wp:column --><!-- wp:column --><div class="wp-block-column"><!-- wp:image {"sizeSlug":"large"} --><figure class="wp-block-image size-large"><img src="https://via.placeholder.com/400x240?text=Image" alt=""/></figure><!-- /wp:image --></div><!-- /wp:column --></div><!-- /wp:columns -->',
        },
    },
];
