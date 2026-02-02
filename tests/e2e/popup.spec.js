const { test, expect } = require('@playwright/test');

const previewPath = process.env.MAGICK_AD_E2E_PREVIEW_PATH;
const popupSelector =
    process.env.MAGICK_AD_E2E_POPUP_SELECTOR ||
    '[data-ad-container="popup"], [data-ad-container="interstitial"]';

test('popup closes via overlay', async ({ page }) => {
    test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');

    await page.goto(previewPath, { waitUntil: 'networkidle' });
    const popup = await page.$(popupSelector);
    test.skip(!popup, 'Popup/interstitial not found');

    const overlay = await page.$(`${popupSelector} .magick-ad-overlay`);
    test.skip(!overlay, 'Overlay not found');

    await overlay.click({ force: true });
    await expect(popup).toHaveClass(/magick-ad-is-hidden/);
});
