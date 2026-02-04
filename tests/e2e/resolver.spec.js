const { test, expect } = require('@playwright/test');
const {
    previewPath,
    resolverSelector,
    adSelector,
} = require('./helpers');
const expectResolver =
    process.env.MAGICK_AD_E2E_EXPECT_RESOLVER;

test('resolver hydrates ad markup (when enabled)', async ({
    page,
}) => {
    test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');
    if (expectResolver === '0') {
        test.skip(true, 'Resolver expected to be disabled');
    }

    await page.goto(previewPath, { waitUntil: 'networkidle' });
    const resolver = await page.$(resolverSelector);
    test.skip(!resolver, 'Resolver placeholder not found');

    const resolved = await page.waitForSelector(
        `${resolverSelector} [data-ad-id]`,
        { timeout: 10000 }
    );
    expect(resolved).toBeTruthy();
});

test('slot renders directly when resolver disabled (optional)', async ({
    page,
}) => {
    test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');
    if (expectResolver !== '0') {
        test.skip(true, 'Resolver expected to be enabled');
    }

    await page.goto(previewPath, { waitUntil: 'networkidle' });
    const resolver = await page.$(resolverSelector);
    expect(resolver).toBeNull();

    const ad = await page.$(adSelector);
    expect(ad).toBeTruthy();
});
