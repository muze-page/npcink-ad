import { expect, test } from "@playwright/test";

const PAGE_SLUG = "npcink-ad-selector-e2e-page";
const THEME_SLUG = process.env.NPCINK_AD_E2E_THEME_SLUG ?? "";

test.skip(
  !THEME_SLUG,
  "Run this compatibility test through tests/e2e/run-theme-matrix.sh.",
);

test("renders dismissible top and bottom bars through the active theme", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/?pagename=${PAGE_SLUG}`);

  await expect(page.locator("body")).toHaveClass(
    new RegExp(`npcink-ad-e2e-theme-${THEME_SLUG}`),
  );

  const topBar = page.locator(".npcink-ad-page-bar--top");
  const bottomBar = page.locator(".npcink-ad-page-bar--bottom");
  await expect(topBar).toHaveCount(1);
  await expect(bottomBar).toHaveCount(1);
  await expect(topBar).toContainText("Theme top page bar.");
  await expect(bottomBar).toContainText("Theme bottom page bar.");

  const contentMarker = page.getByText(
    "Theme page-bar compatibility fixture.",
    { exact: true },
  );
  await expect(contentMarker).toHaveCount(1);
  await expect(contentMarker).toBeVisible();

  const topBox = await topBar.boundingBox();
  const contentBox = await contentMarker.boundingBox();
  const bottomBox = await bottomBar.boundingBox();
  expect(topBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(bottomBox).not.toBeNull();
  expect(topBox?.y).toBeLessThan(contentBox?.y ?? 0);
  expect(contentBox?.y).toBeLessThan(bottomBox?.y ?? 0);

  for (const bar of [topBar, bottomBar]) {
    const position = await bar.evaluate(
      (element) => window.getComputedStyle(element).position,
    );
    expect(["static", "relative"]).toContain(position);
  }

  const maximumScroll = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  expect(maximumScroll).toBeGreaterThan(300);
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(250);
  const topAfterScroll = await topBar.boundingBox();
  const bottomAfterScroll = await bottomBar.boundingBox();
  expect(topAfterScroll).not.toBeNull();
  expect(bottomAfterScroll).not.toBeNull();
  expect(topAfterScroll?.y).toBeLessThan((topBox?.y ?? 0) - 250);
  expect(bottomAfterScroll?.y).toBeLessThan((bottomBox?.y ?? 0) - 250);

  const dismissButtons = page.getByRole("button", {
    name: "Dismiss promotion bar",
    exact: true,
  });
  await expect(dismissButtons).toHaveCount(2);
  for (let index = 0; index < 2; index += 1) {
    const dismissBox = await dismissButtons.nth(index).boundingBox();
    expect(dismissBox).not.toBeNull();
    expect(dismissBox?.width).toBeGreaterThanOrEqual(44);
    expect(dismissBox?.height).toBeGreaterThanOrEqual(44);
  }

  const viewportGeometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewportGeometry.clientWidth).toBe(390);
  expect(viewportGeometry.scrollWidth).toBeLessThanOrEqual(
    viewportGeometry.clientWidth,
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopGeometry = await topBar.evaluate((bar) => {
    const inner = bar.querySelector<HTMLElement>(".npcink-ad-page-bar__inner");
    const dismiss = bar.querySelector<HTMLElement>("[data-npcink-ad-dismiss]");
    if (!inner || !dismiss) {
      throw new Error("Page-bar desktop geometry elements are missing.");
    }

    const barBox = bar.getBoundingClientRect();
    const innerBox = inner.getBoundingClientRect();
    const dismissBox = dismiss.getBoundingClientRect();
    return {
      barWidth: barBox.width,
      innerWidth: innerBox.width,
      innerMaxWidth: Number.parseFloat(getComputedStyle(inner).maxWidth),
      inlineStartGap: innerBox.left - barBox.left,
      inlineEndGap: barBox.right - innerBox.right,
      dismissLeft: dismissBox.left,
      dismissRight: dismissBox.right,
      innerLeft: innerBox.left,
      innerRight: innerBox.right,
    };
  });
  expect(desktopGeometry.innerWidth).toBeLessThanOrEqual(
    desktopGeometry.innerMaxWidth + 0.5,
  );
  expect(desktopGeometry.innerWidth).toBeLessThanOrEqual(
    desktopGeometry.barWidth - 31.5,
  );
  expect(
    Math.abs(desktopGeometry.inlineStartGap - desktopGeometry.inlineEndGap),
  ).toBeLessThanOrEqual(1);
  expect(desktopGeometry.dismissLeft).toBeGreaterThanOrEqual(
    desktopGeometry.innerLeft,
  );
  expect(desktopGeometry.dismissRight).toBeLessThanOrEqual(
    desktopGeometry.innerRight,
  );

  await expect(page.locator("script[src*='/build/page-bar.js']")).toHaveCount(
    1,
  );
  await dismissButtons.first().click();
  await expect(topBar).toBeHidden();
  await expect(bottomBar).toBeVisible();
});
