export const getCreativeTemplateData = (type, ad) => {
    const content = ad?.content || {};
    if (type === 'image') {
        return {
            image: content.image || {
                id: 0,
                url: '',
                alt: '',
                width: 0,
                height: 0,
            },
            link: content.link || '',
            link_target: Boolean(content.link_target),
            image_settings: content.image_settings || {},
        };
    }
    if (type === 'video') {
        return {
            video_url: content.video_url || '',
        };
    }
    if (type === 'block') {
        return {
            blocks: content.blocks || '',
        };
    }
    return {
        html: content.html || '',
    };
};

const getTemplateDefaultDelay = (containerType) =>
    ['popup', 'banner', 'floating', 'interstitial'].includes(containerType)
        ? 300
        : 0;

export const buildTemplateBehaviorDefaults = (containerType = 'inline') => ({
    animation: 'none',
    close_button: containerType !== 'inline',
    close_on_esc: true,
    close_on_overlay: true,
    lock_scroll: false,
    frequency_mode: 'none',
    frequency_limit: 1,
    delay: getTemplateDefaultDelay(containerType),
});

export const buildTemplateContainerStyleDefaults = (placementHook = '') => ({
    mode: placementHook === 'head' ? 'raw' : 'boxed',
    max_width: 100,
    max_width_unit: '%',
    reserve_height: 0,
    padding_top: 0,
    padding_right: 0,
    padding_bottom: 0,
    padding_left: 0,
    background: 'transparent',
    radius: 0,
    shadow: 'none',
    badge_enabled: false,
    badge_type: 'text',
    badge_text: '广告',
    badge_color: '#1d2327',
    badge_image: {
        id: 0,
        url: '',
        alt: '',
    },
    layout: '',
});
