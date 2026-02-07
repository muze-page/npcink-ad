import { parse, serialize, createBlock } from '@wordpress/blocks';

export const MAGICK_BLOCK = 'magick-ad/ad';
export const FAVORITES_KEY = 'magick_ad_template_favorites';
export const PINNED_KEY = 'magick_ad_template_pins';
const DEVICE_OPTIONS = ['all', 'mobile', 'tablet', 'desktop'];
const RISK_OPTIONS = ['low', 'medium', 'high'];
const USAGE_OPTIONS = ['ad', 'promo', 'decorative'];
const INDUSTRY_OPTIONS = ['general', 'corporate', 'content', 'ecommerce'];

export const TEMPLATE_SCHEMA_VERSION = (() => {
    if (typeof window === 'undefined') {
        return 2;
    }
    const value = Number(window?.MagickAD?.templateSchemaVersion || 2);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 2;
})();

const sanitizeScenario = (value) =>
    typeof value === 'string' ? value.trim() : '';

const sanitizeDevice = (value) =>
    DEVICE_OPTIONS.includes(value) ? value : 'all';

const sanitizeRisk = (value) =>
    RISK_OPTIONS.includes(value) ? value : 'low';

export const sanitizeUsageType = (value) =>
    USAGE_OPTIONS.includes(value) ? value : 'ad';

const sanitizeIndustry = (value) => {
    const map = {
        general: 'general',
        通用: 'general',
        all: 'general',
        corporate: 'corporate',
        企业站: 'corporate',
        content: 'content',
        内容站: 'content',
        ecommerce: 'ecommerce',
        电商站: 'ecommerce',
    };
    if (typeof value !== 'string') {
        return 'general';
    }
    const next = map[value.trim()] || value.trim();
    return INDUSTRY_OPTIONS.includes(next) ? next : 'general';
};

const normalizeTemplateAttrs = (sourceAttrs) => {
    const attrs =
        sourceAttrs && typeof sourceAttrs === 'object' ? { ...sourceAttrs } : {};

    if (attrs.videoUrl === undefined && attrs.video_url !== undefined) {
        attrs.videoUrl = attrs.video_url;
    }
    if (attrs.linkTarget === undefined && attrs.link_target !== undefined) {
        attrs.linkTarget = attrs.link_target;
    }
    if (attrs.image && typeof attrs.image === 'object') {
        if (attrs.imageId === undefined) {
            attrs.imageId = attrs.image.id || 0;
        }
        if (attrs.imageUrl === undefined) {
            attrs.imageUrl = attrs.image.url || '';
        }
        if (attrs.imageAlt === undefined) {
            attrs.imageAlt = attrs.image.alt || '';
        }
    }
    if (attrs.usageType === undefined && attrs.usage_type !== undefined) {
        attrs.usageType = attrs.usage_type;
    }

    const legacyType = typeof attrs.creativeType === 'string' ? attrs.creativeType : '';
    attrs.creativeType =
        legacyType === 'visual'
            ? 'block'
            : legacyType === 'code'
              ? 'html'
              : ['html', 'image', 'video', 'block'].includes(legacyType)
                ? legacyType
                : 'html';
    attrs.containerType = ['inline', 'popup', 'banner', 'floating', 'interstitial'].includes(
        attrs.containerType
    )
        ? attrs.containerType
        : 'inline';

    if (!attrs.templateCategory && attrs.category) {
        attrs.templateCategory = attrs.category;
    }
    if (!attrs.templateScenario && attrs.scenario) {
        attrs.templateScenario = attrs.scenario;
    }
    if (!attrs.templateDevice && attrs.device) {
        attrs.templateDevice = attrs.device;
    }
    if (!attrs.templateRisk && attrs.risk) {
        attrs.templateRisk = attrs.risk;
    }
    if (!attrs.templateIndustry && attrs.industry) {
        attrs.templateIndustry = attrs.industry;
    }

    attrs.templateVersion = Math.max(
        TEMPLATE_SCHEMA_VERSION,
        Number(attrs.templateVersion || 1)
    );
    attrs.templateScenario =
        typeof attrs.templateScenario === 'string'
            ? attrs.templateScenario
            : '';
    attrs.templateDevice = DEVICE_OPTIONS.includes(attrs.templateDevice)
        ? attrs.templateDevice
        : 'all';
    attrs.templateRisk = RISK_OPTIONS.includes(attrs.templateRisk)
        ? attrs.templateRisk
        : 'low';
    attrs.templateIndustry = sanitizeIndustry(attrs.templateIndustry);
    attrs.usageType = sanitizeUsageType(attrs.usageType);

    return attrs;
};

export const getDefaultMeta = ({
    type = 'html',
    containerType = 'inline',
    source = 'core',
}) => {
    const inferIndustry = (scenario = '') => {
        const text = String(scenario || '');
        if (/(转化|促销|优惠|活动|下单|成交)/.test(text)) {
            return 'ecommerce';
        }
        if (/(内容|教程|课程|博客|视频)/.test(text)) {
            return 'content';
        }
        if (/(品牌|公告|企业|服务|客服|订阅)/.test(text)) {
            return 'corporate';
        }
        return 'general';
    };

    if (source === 'user') {
        return {
            scenario: '自定义',
            device: 'all',
            risk: 'medium',
            industry: 'general',
        };
    }
    if (containerType === 'interstitial') {
        const scenario = '活动促销';
        return {
            scenario,
            device: 'all',
            risk: 'high',
            industry: inferIndustry(scenario),
        };
    }
    if (
        containerType === 'popup' ||
        containerType === 'banner' ||
        containerType === 'floating'
    ) {
        const scenario = '转化引导';
        return {
            scenario,
            device: 'all',
            risk: 'medium',
            industry: inferIndustry(scenario),
        };
    }
    if (type === 'video') {
        const scenario = '内容运营';
        return {
            scenario,
            device: 'all',
            risk: 'medium',
            industry: inferIndustry(scenario),
        };
    }
    if (type === 'block') {
        const scenario = '内容运营';
        return {
            scenario,
            device: 'desktop',
            risk: 'low',
            industry: inferIndustry(scenario),
        };
    }
    if (type === 'html') {
        const scenario = '通用推广';
        return {
            scenario,
            device: 'all',
            risk: 'low',
            industry: inferIndustry(scenario),
        };
    }
    const scenario = '通用推广';
    return {
        scenario,
        device: 'all',
        risk: 'low',
        industry: inferIndustry(scenario),
    };
};

export const normalizeTemplateMeta = (meta, fallback = {}) => {
    const sourceMeta = meta && typeof meta === 'object' ? meta : {};
    const fallbackMeta =
        fallback && typeof fallback === 'object' ? fallback : {};

    return {
        scenario: sanitizeScenario(
            sourceMeta.scenario || fallbackMeta.scenario || ''
        ),
        device: sanitizeDevice(
            sourceMeta.device || fallbackMeta.device || 'all'
        ),
        risk: sanitizeRisk(sourceMeta.risk || fallbackMeta.risk || 'low'),
        industry: sanitizeIndustry(
            sourceMeta.industry || fallbackMeta.industry || 'general'
        ),
    };
};

export const withTemplateMeta = (template, meta, fallbackMeta = null) => {
    const normalized = normalizeTemplateMeta(
        meta,
        fallbackMeta || getDefaultMeta(template)
    );
    return {
        ...template,
        scenario: normalized.scenario,
        device: normalized.device,
        risk: normalized.risk,
        industry: normalized.industry,
    };
};

const walkBlocks = (blocks, matcher) => {
    for (const block of blocks) {
        if (matcher(block)) {
            return block;
        }
        if (block.innerBlocks?.length) {
            const found = walkBlocks(block.innerBlocks, matcher);
            if (found) {
                return found;
            }
        }
    }
    return null;
};

export const extractTemplateFromContent = (content) => {
    if (!content) {
        return null;
    }
    const blocks = parse(content);
    const magickBlock = walkBlocks(blocks, (block) => block.name === MAGICK_BLOCK);
    if (!magickBlock) {
        return null;
    }

    const attrs = normalizeTemplateAttrs(magickBlock.attributes || {});
    const type = attrs.creativeType || 'html';
    const containerType = attrs.containerType || 'inline';
    const category =
        typeof attrs.templateCategory === 'string'
            ? attrs.templateCategory
            : '';
    const scenario =
        typeof attrs.templateScenario === 'string'
            ? attrs.templateScenario
            : '';
    const device =
        typeof attrs.templateDevice === 'string'
            ? attrs.templateDevice
            : '';
    const risk =
        typeof attrs.templateRisk === 'string' ? attrs.templateRisk : '';
    const industry =
        typeof attrs.templateIndustry === 'string'
            ? sanitizeIndustry(attrs.templateIndustry)
            : 'general';
    const usageType = sanitizeUsageType(attrs.usageType);

    if (type === 'image') {
        return {
            type,
            containerType,
            usageType,
            version: Number(attrs.templateVersion || 1),
            category,
            scenario,
            device,
            risk,
            industry,
            data: {
                image: {
                    id: Number(attrs.imageId || 0),
                    url: attrs.imageUrl || '',
                    alt: attrs.imageAlt || '',
                },
                link: attrs.link || '',
                link_target: Boolean(attrs.linkTarget),
            },
        };
    }

    if (type === 'video') {
        return {
            type,
            containerType,
            usageType,
            version: Number(attrs.templateVersion || 1),
            category,
            scenario,
            device,
            risk,
            industry,
            data: {
                video_url: attrs.videoUrl || '',
            },
        };
    }

    if (type === 'block') {
        return {
            type,
            containerType,
            usageType,
            version: Number(attrs.templateVersion || 1),
            category,
            scenario,
            device,
            risk,
            industry,
            data: {
                blocks: attrs.blocks || '',
            },
        };
    }

    return {
        type: 'html',
        containerType,
        usageType,
        version: Number(attrs.templateVersion || 1),
        category,
        scenario,
        device,
        risk,
        industry,
        data: {
            html: attrs.html || '',
        },
    };
};

export const extractTemplateFromContentLoose = (content) => {
    if (!content || typeof content !== 'string') {
        return null;
    }
    const match = content.match(
        /<!--\s*wp:magick-ad\/ad\s+({[\s\S]*?})\s*\/-->/i
    );
    if (!match || !match[1]) {
        return null;
    }
    try {
        const attrs = normalizeTemplateAttrs(JSON.parse(match[1]));
        const type = attrs.creativeType || 'html';
        const containerType = attrs.containerType || 'inline';
        const category =
            typeof attrs.templateCategory === 'string'
                ? attrs.templateCategory
                : '';
        const scenario =
            typeof attrs.templateScenario === 'string'
                ? attrs.templateScenario
                : '';
        const device =
            typeof attrs.templateDevice === 'string'
                ? attrs.templateDevice
                : '';
        const risk =
            typeof attrs.templateRisk === 'string'
                ? attrs.templateRisk
                : '';
        const industry =
            typeof attrs.templateIndustry === 'string'
                ? sanitizeIndustry(attrs.templateIndustry)
                : 'general';
        const usageType = sanitizeUsageType(attrs.usageType);

        if (type === 'image') {
            return {
                type,
                containerType,
                usageType,
                version: Number(attrs.templateVersion || 1),
                category,
                scenario,
                device,
                risk,
                industry,
                data: {
                    image: {
                        id: Number(attrs.imageId || 0),
                        url: attrs.imageUrl || '',
                        alt: attrs.imageAlt || '',
                    },
                    link: attrs.link || '',
                    link_target: Boolean(attrs.linkTarget),
                },
            };
        }

        if (type === 'video') {
            return {
                type,
                containerType,
                usageType,
                version: Number(attrs.templateVersion || 1),
                category,
                scenario,
                device,
                risk,
                industry,
                data: {
                    video_url: attrs.videoUrl || '',
                },
            };
        }

        if (type === 'block') {
            return {
                type,
                containerType,
                usageType,
                version: Number(attrs.templateVersion || 1),
                category,
                scenario,
                device,
                risk,
                industry,
                data: {
                    blocks: attrs.blocks || '',
                },
            };
        }

        return {
            type: 'html',
            containerType,
            usageType,
            version: Number(attrs.templateVersion || 1),
            category,
            scenario,
            device,
            risk,
            industry,
            data: {
                html: attrs.html || '',
            },
        };
    } catch (err) {
        return null;
    }
};

export const buildPatternContent = (
    type,
    data,
    containerType = 'inline',
    category = '',
    usageType = 'ad',
    industry = 'general'
) => {
    const attrs = {
        creativeType: type,
        containerType,
        templateVersion: TEMPLATE_SCHEMA_VERSION,
        usageType: sanitizeUsageType(usageType),
        templateIndustry: sanitizeIndustry(industry),
    };
    if (category) {
        attrs.templateCategory = category;
    }
    if (type === 'image') {
        attrs.imageId = data.image?.id || 0;
        attrs.imageUrl = data.image?.url || '';
        attrs.imageAlt = data.image?.alt || '';
        attrs.link = data.link || '';
        attrs.linkTarget = Boolean(data.link_target);
    } else if (type === 'video') {
        attrs.videoUrl = data.video_url || '';
    } else if (type === 'block') {
        attrs.blocks = data.blocks || '';
    } else {
        attrs.html = data.html || '';
    }
    return serialize([createBlock(MAGICK_BLOCK, attrs)]);
};
