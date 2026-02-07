export const usageOptions = [
    { label: '广告（完整能力）', value: 'ad' },
    { label: '运营模块（轻量）', value: 'promo' },
    { label: '装饰组件（不计统计）', value: 'decorative' },
];

const decorativePlacementHooks = new Set(['content', 'body_top', 'footer']);

export const normalizeUsageType = (value) =>
    ['ad', 'promo', 'decorative'].includes(value) ? value : 'ad';

export const isDecorativeUsage = (options = {}) =>
    normalizeUsageType(options?.usage_type || 'ad') === 'decorative';

export const getUsageLabel = (value) => {
    const hit = usageOptions.find((item) => item.value === value);
    return hit?.label || '广告（完整能力）';
};

export const enforceUsageTypeRules = (baseOptions = {}, baseContent = {}) => {
    const nextOptions = {
        ...baseOptions,
        usage_type: normalizeUsageType(baseOptions?.usage_type || 'ad'),
    };
    const nextContent = {
        ...baseContent,
    };
    const reasons = [];

    if (nextOptions.usage_type !== 'decorative') {
        return {
            options: nextOptions,
            content: nextContent,
            changed: false,
            reasons,
        };
    }

    if (nextOptions.container_type !== 'inline') {
        nextOptions.container_type = 'inline';
        reasons.push('容器已回退为“默认嵌入”');
    }
    if (!decorativePlacementHooks.has(nextOptions.placement_hook || '')) {
        nextOptions.placement_hook = 'footer';
        nextOptions.placement_position = '';
        nextOptions.placement_paragraph = 0;
        reasons.push('装饰组件不支持该位置，已回退到“底部”');
    } else if (nextOptions.placement_hook !== 'content') {
        nextOptions.placement_position = '';
        nextOptions.placement_paragraph = 0;
    }
    if (nextOptions.render_require_consent) {
        nextOptions.render_require_consent = false;
        reasons.push('已关闭“渲染需同意”');
    }

    const currentVariants = Array.isArray(nextContent.variants)
        ? nextContent.variants
        : [];
    if (nextContent.variants_enabled || currentVariants.length > 0) {
        nextContent.variants_enabled = false;
        nextContent.variants_strategy = 'request';
        nextContent.variants = [];
        reasons.push('装饰组件已禁用 A/B 版本');
    } else if (nextContent.variants_strategy === 'session') {
        nextContent.variants_strategy = 'request';
    }

    const nextBehavior =
        nextContent.behavior && typeof nextContent.behavior === 'object'
            ? { ...nextContent.behavior }
            : {};
    if (
        nextBehavior.frequency_mode !== 'none' ||
        Number(nextBehavior.frequency_limit || 1) !== 1
    ) {
        nextBehavior.frequency_mode = 'none';
        nextBehavior.frequency_limit = 1;
        reasons.push('装饰组件已禁用频控');
    }
    if (Number(nextBehavior.delay || 0) !== 0) {
        nextBehavior.delay = 0;
    }
    nextContent.behavior = nextBehavior;

    const nextVideoSettings =
        nextContent.video_settings &&
        typeof nextContent.video_settings === 'object'
            ? { ...nextContent.video_settings }
            : {};
    if (nextVideoSettings.track_events) {
        nextVideoSettings.track_events = false;
        reasons.push('装饰组件已关闭视频事件追踪');
    }
    nextContent.video_settings = nextVideoSettings;

    const nextContainerStyle =
        nextContent.container_style &&
        typeof nextContent.container_style === 'object'
            ? { ...nextContent.container_style }
            : {};
    if (nextContainerStyle.mode !== 'boxed') {
        nextContainerStyle.mode = 'boxed';
    }
    nextContent.container_style = nextContainerStyle;

    return {
        options: nextOptions,
        content: nextContent,
        changed: reasons.length > 0,
        reasons,
    };
};
