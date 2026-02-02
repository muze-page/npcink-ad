const { defineConfig } = require('@playwright/test');

const baseURL =
    process.env.MAGICK_AD_E2E_BASE_URL || 'http://localhost';

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 60000,
    expect: {
        timeout: 10000,
    },
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
});
