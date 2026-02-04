const previewPath = process.env.MAGICK_AD_E2E_PREVIEW_PATH;
const adSelector =
    process.env.MAGICK_AD_E2E_AD_SELECTOR || '[data-ad-id]';
const resolverSelector =
    process.env.MAGICK_AD_E2E_RESOLVER_SELECTOR ||
    '[data-magick-ad-slot-resolver="1"]';

const getTrackUrl = (previewUrl, baseUrl = '') => {
    const source =
        previewUrl ||
        baseUrl ||
        process.env.MAGICK_AD_E2E_BASE_URL ||
        'http://localhost';
    const url = new URL(source);
    url.pathname = '/wp-json/magick-ad/v1/track';
    url.search = '';
    url.hash = '';
    return url.toString();
};

const getAdPayload = async (page) => {
    return page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (!el) {
            return null;
        }
        const getAttr = (name) => el.getAttribute(name) || '';
        return {
            ad_id: getAttr('data-ad-id'),
            sig: getAttr('data-ad-sig'),
            sig_ts: getAttr('data-ad-sig-ts'),
            sig_rev: getAttr('data-ad-sig-rev'),
            slot: getAttr('data-ad-slot'),
            position: getAttr('data-ad-position'),
            container: getAttr('data-ad-container'),
            variant_id: getAttr('data-ad-variant'),
        };
    }, adSelector);
};

module.exports = {
    previewPath,
    adSelector,
    resolverSelector,
    getTrackUrl,
    getAdPayload,
};
