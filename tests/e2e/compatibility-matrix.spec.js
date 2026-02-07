const { test, expect } = require('@playwright/test');
const {
    previewPath,
    adSelector,
    resolverSelector,
    getTrackUrl,
    getAdPayload,
    setConsentCookie,
} = require('./helpers');

const resolverMode = process.env.MAGICK_AD_E2E_EXPECT_RESOLVER;

const MATRIX_CASES = [
    { name: 'desktop-default-impression', viewport: { width: 1366, height: 900 }, event: 'impression', consent: false },
    { name: 'desktop-default-click', viewport: { width: 1366, height: 900 }, event: 'click', consent: false },
    { name: 'desktop-consent-impression', viewport: { width: 1366, height: 900 }, event: 'impression', consent: true },
    { name: 'desktop-consent-click', viewport: { width: 1366, height: 900 }, event: 'click', consent: true },
    { name: 'tablet-default-impression', viewport: { width: 1024, height: 768 }, event: 'impression', consent: false },
    { name: 'tablet-consent-click', viewport: { width: 1024, height: 768 }, event: 'click', consent: true },
    { name: 'mobile-default-impression', viewport: { width: 390, height: 844 }, event: 'impression', consent: false },
    { name: 'mobile-default-click', viewport: { width: 390, height: 844 }, event: 'click', consent: false },
    { name: 'mobile-consent-impression', viewport: { width: 390, height: 844 }, event: 'impression', consent: true },
    { name: 'mobile-consent-click', viewport: { width: 390, height: 844 }, event: 'click', consent: true },
];

for (const scenario of MATRIX_CASES) {
    test(`compatibility matrix: ${scenario.name}`, async ({ page }) => {
        test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');

        await page.setViewportSize(scenario.viewport);
        await page.context().clearCookies();

        if (scenario.consent) {
            await setConsentCookie(page.context(), previewPath, '1');
        }

        await page.goto(previewPath, { waitUntil: 'networkidle' });
        await page.waitForSelector(adSelector, { timeout: 10000 });

        if (resolverMode === '1') {
            const resolver = await page.$(resolverSelector);
            expect(resolver).toBeTruthy();
        } else if (resolverMode === '0') {
            const resolver = await page.$(resolverSelector);
            expect(resolver).toBeNull();
        }

        const adData = await getAdPayload(page);
        test.skip(!adData || !adData.ad_id, 'Ad payload not found');

        const trackUrl = getTrackUrl(previewPath);
        const response = await page.request.post(trackUrl, {
            data: {
                ...adData,
                event: scenario.event,
                session_id: `matrix-${scenario.name}`,
                page_hash: `matrix-${scenario.name}`,
            },
        });

        expect(response.status()).toBeLessThan(500);
        const body = await response.json();
        expect(
            body.success || body.blocked || body.deduped || body.rate_limited
        ).toBeTruthy();
    });
}
