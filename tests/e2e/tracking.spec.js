const { test, expect } = require('@playwright/test');

const previewPath = process.env.MAGICK_AD_E2E_PREVIEW_PATH;
const adSelector =
    process.env.MAGICK_AD_E2E_AD_SELECTOR || '[data-ad-id]';

test('tracking sends click payload', async ({ page }) => {
    test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');

    const requestPromise = page.waitForRequest((request) => {
        return request.url().includes('/wp-json/magick-ad/v1/track');
    });

    await page.goto(previewPath, { waitUntil: 'networkidle' });
    await page.waitForSelector(adSelector);
    await page.click(adSelector);

    const request = await requestPromise;
    const data = request.postData() || '';
    expect(data).toContain('"event":"click"');
});
