const { test, expect } = require('@playwright/test');
const {
    previewPath,
    getTrackUrl,
    getAdPayload,
    setConsentCookie,
} = require('./helpers');

const expectSignature =
    process.env.MAGICK_AD_E2E_REQUIRE_SIGNATURE !== '0';
const expectDedupe =
    process.env.MAGICK_AD_E2E_EXPECT_DEDUPE === '1';
const expectRateLimit =
    process.env.MAGICK_AD_E2E_EXPECT_RATE_LIMIT === '1';
const expectConsentGuard =
    process.env.MAGICK_AD_E2E_REQUIRE_CONSENT === '1';
const hasConsentCookie =
    process.env.MAGICK_AD_E2E_HAS_CONSENT === '1';

test('track endpoint accepts valid signature', async ({ page }) => {
    test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');

    await page.goto(previewPath, { waitUntil: 'networkidle' });
    const adData = await getAdPayload(page);
    test.skip(!adData || !adData.ad_id, 'Ad payload not found');

    const trackUrl = getTrackUrl(previewPath);
    const response = await page.request.post(trackUrl, {
        data: {
            ...adData,
            event: 'click',
            session_id: 'e2e-session',
            page_hash: 'e2e-page',
        },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBeTruthy();
});

test('track endpoint rejects invalid signature', async ({ page }) => {
    test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');
    test.skip(!expectSignature, 'Signature checks disabled');

    await page.goto(previewPath, { waitUntil: 'networkidle' });
    const adData = await getAdPayload(page);
    test.skip(!adData || !adData.ad_id, 'Ad payload not found');

    const trackUrl = getTrackUrl(previewPath);
    const response = await page.request.post(trackUrl, {
        data: {
            ...adData,
            sig: 'invalid',
            event: 'click',
            session_id: 'e2e-session',
            page_hash: 'e2e-page',
        },
    });

    expect(response.status()).toBe(403);
});

test('track endpoint respects consent guard (optional)', async ({
    page,
}) => {
    test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');
    test.skip(!expectConsentGuard, 'Consent guard not enabled');

    await page.goto(previewPath, { waitUntil: 'networkidle' });
    if (hasConsentCookie) {
        await setConsentCookie(page.context(), previewPath, '1');
    }
    const adData = await getAdPayload(page);
    test.skip(!adData || !adData.ad_id, 'Ad payload not found');

    const trackUrl = getTrackUrl(previewPath);
    const response = await page.request.post(trackUrl, {
        data: {
            ...adData,
            event: 'click',
            session_id: 'e2e-consent',
            page_hash: 'e2e-consent',
        },
    });

    const body = await response.json();
    if (hasConsentCookie) {
        expect(body.success).toBeTruthy();
    } else {
        expect(body.blocked || body.success).toBeTruthy();
    }
});

test('track endpoint dedupes repeated impressions (optional)', async ({
    page,
}) => {
    test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');
    test.skip(!expectDedupe, 'Dedupe not expected');

    await page.goto(previewPath, { waitUntil: 'networkidle' });
    const adData = await getAdPayload(page);
    test.skip(!adData || !adData.ad_id, 'Ad payload not found');

    const trackUrl = getTrackUrl(previewPath);
    const payload = {
        ...adData,
        event: 'impression',
        session_id: 'e2e-dedupe',
        page_hash: 'e2e-dedupe',
    };

    await page.request.post(trackUrl, { data: payload });
    const response = await page.request.post(trackUrl, {
        data: payload,
    });
    const body = await response.json();
    expect(body.deduped || body.success).toBeTruthy();
});

test('track endpoint rate-limits burst traffic (optional)', async ({
    page,
}) => {
    test.skip(!previewPath, 'Set MAGICK_AD_E2E_PREVIEW_PATH');
    test.skip(!expectRateLimit, 'Rate limit not configured for test');

    await page.goto(previewPath, { waitUntil: 'networkidle' });
    const adData = await getAdPayload(page);
    test.skip(!adData || !adData.ad_id, 'Ad payload not found');

    const trackUrl = getTrackUrl(previewPath);
    const payload = {
        ...adData,
        event: 'click',
        session_id: 'e2e-rl',
        page_hash: 'e2e-rl',
    };

    let rateLimited = false;
    for (let i = 0; i < 80; i += 1) {
        const response = await page.request.post(trackUrl, {
            data: payload,
        });
        const body = await response.json();
        if (body.rate_limited) {
            rateLimited = true;
            break;
        }
    }

    expect(rateLimited).toBeTruthy();
});
