const fs = require('fs');
const { defineConfig, chromium } = require('@playwright/test');

const baseURL =
    process.env.MAGICK_AD_E2E_BASE_URL || 'http://localhost';

const resolveChromiumExecutablePath = () => {
    const computed = chromium.executablePath();
    if (computed && fs.existsSync(computed)) {
        return computed;
    }

    if (!computed || typeof computed !== 'string') {
        return '';
    }

    const candidates = [
        computed.replace('mac-x64', 'mac-arm64'),
        computed.replace('mac-arm64', 'mac-x64'),
    ];

    for (const candidate of candidates) {
        if (candidate !== computed && fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return computed;
};

const chromiumExecutablePath = resolveChromiumExecutablePath();

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
            use: {
                browserName: 'chromium',
                launchOptions: chromiumExecutablePath
                    ? { executablePath: chromiumExecutablePath }
                    : {},
            },
        },
    ],
});
