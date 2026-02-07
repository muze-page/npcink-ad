const { test, expect } = require('@playwright/test');
const { previewPath, adSelector, clickAdTarget } = require('./helpers');

const storageState = process.env.MAGICK_AD_E2E_STORAGE_STATE;

test.describe('logged-in click tracking (optional)', () => {
    test.skip(!storageState, 'Set MAGICK_AD_E2E_STORAGE_STATE');
    test.use({ storageState });

    test('click sends track request without nonce header', async ({
        page,
    }) => {
        test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');

        const requestPromise = page.waitForRequest((request) =>
            request.url().includes('/wp-json/magick-ad/v1/track')
        );

        await page.goto(previewPath, { waitUntil: 'networkidle' });
        await page.waitForSelector(adSelector, { timeout: 10000 });
        await clickAdTarget(page, adSelector);

        const request = await requestPromise;
        const data = request.postData() || '';
        expect(data).toContain('"event":"click"');

        const headers = request.headers();
        expect(headers['x-wp-nonce']).toBeFalsy();
    });
});
