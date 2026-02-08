const { test, expect } = require('@playwright/test');
const {
    clickAdTarget,
    setConsentCookie,
} = require('./helpers');

const previewPath = process.env.MAGICK_AD_E2E_PREVIEW_PATH;
const adSelector =
    process.env.MAGICK_AD_E2E_AD_SELECTOR || '[data-ad-id]';
const requireConsent =
    process.env.MAGICK_AD_E2E_REQUIRE_CONSENT === '1';
const hasConsentCookie =
    process.env.MAGICK_AD_E2E_HAS_CONSENT !== '0';

const isTrackRequest = (request) => {
    if (request.method() !== 'POST') {
        return false;
    }
    try {
        const url = new URL(request.url());
        return url.pathname === '/wp-json/magick-ad/v1/track';
    } catch (err) {
        return request.url().includes('/wp-json/magick-ad/v1/track');
    }
};

test('tracking sends click payload', async ({ page }) => {
    test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');
    test.skip(
        requireConsent && !hasConsentCookie,
        'Consent guard enabled and MAGICK_AD_E2E_HAS_CONSENT=0'
    );

    if (requireConsent) {
        await setConsentCookie(page.context(), previewPath, '1');
    }

    await page.addInitScript(() => {
        const shim = (url, data) => {
            fetch(String(url || ''), {
                method: 'POST',
                body: data,
                keepalive: true,
                credentials: 'omit',
            }).catch(() => undefined);
            return true;
        };

        try {
            navigator.sendBeacon = shim;
        } catch (err) {
            try {
                Object.defineProperty(navigator, 'sendBeacon', {
                    value: shim,
                    configurable: true,
                });
            } catch (innerErr) {
                // ignore
            }
        }
    });

    await page.goto(previewPath, { waitUntil: 'networkidle' });
    await page.waitForSelector(adSelector, {
        state: 'attached',
        timeout: 15000,
    });
    await expect
        .poll(
            () =>
                page.evaluate(() => {
                    return (
                        Boolean(window.magickAdTrack) &&
                        typeof window.magickAdTrack.track === 'function'
                    );
                }),
            {
                timeout: 5000,
                message: 'magick-ad-track runtime should be loaded',
            }
        )
        .toBe(true);

    const [request] = await Promise.all([
        page.waitForRequest(isTrackRequest, { timeout: 15000 }),
        clickAdTarget(page, adSelector),
    ]);
    const data = request.postData() || '';
    expect(data).toContain('"event":"click"');
});
