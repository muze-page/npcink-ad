import { defineConfig } from "@playwright/test";

const baseURL = process.env.NPCINK_AD_E2E_BASE_URL;

if (!baseURL) {
  throw new Error(
    "NPCINK_AD_E2E_BASE_URL is required. Run tests through tests/e2e/run.sh.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  outputDir: "test-results/editor-e2e",
});
