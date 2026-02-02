const { test, expect } = require('@playwright/test');

const previewPath = process.env.MAGICK_AD_E2E_PREVIEW_PATH;
const resolverSelector =
    process.env.MAGICK_AD_E2E_RESOLVER_SELECTOR ||
    '[data-magick-ad-slot-resolver="1"]';

test('resolver hydrates ad markup', async ({ page }) => {
    test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');

    await page.goto(previewPath, { waitUntil: 'networkidle' });
    const resolver = await page.$(resolverSelector);
    test.skip(!resolver, 'Resolver placeholder not found');

    const resolved = await page.waitForSelector(
        `${resolverSelector} [data-ad-id]`,
        { timeout: 10000 }
    );
    expect(resolved).toBeTruthy();
});
