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

const setConsentCookie = async (context, previewUrl, value = '1') => {
    if (!previewUrl) {
        return;
    }
    await context.addCookies([
        {
            name: 'magick_ad_consent',
            value,
            url: previewUrl,
        },
    ]);
};

const clickAdTarget = async (page, selector) => {
    const interactiveSelector = [
        `${selector} a:not(.magick-ad-close)`,
        `${selector} button:not(.magick-ad-close)`,
        `${selector} [role="button"]:not(.magick-ad-close)`,
    ].join(', ');

    const interactiveTargets = page.locator(interactiveSelector);
    const targetCount = await interactiveTargets.count();
    for (let i = 0; i < targetCount; i += 1) {
        const target = interactiveTargets.nth(i);
        if (!(await target.isVisible())) {
            continue;
        }
        await target.click({ force: true });
        return;
    }

    const visibleUnits = page.locator(`${selector}:visible`);
    if ((await visibleUnits.count()) > 0) {
        await visibleUnits.first().click({ force: true });
        return;
    }

    // Fallback for delayed/hidden containers in test fixtures:
    // trigger a synthetic click so tracking pipeline can still be validated.
    const dispatched = await page.evaluate((rootSelector) => {
        const root = document.querySelector(rootSelector);
        if (!root) {
            return false;
        }
        const target = root.querySelector(
            'a:not(.magick-ad-close),button:not(.magick-ad-close),[role="button"]:not(.magick-ad-close)'
        ) || root;
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
        });
        return target.dispatchEvent(event);
    }, selector);

    if (!dispatched) {
        throw new Error(`No ad target found for selector: ${selector}`);
    }
};

module.exports = {
    previewPath,
    adSelector,
    resolverSelector,
    getTrackUrl,
    getAdPayload,
    setConsentCookie,
    clickAdTarget,
};
