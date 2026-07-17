import {
  expect,
  test,
  type Locator,
  type Page,
  type Request,
} from "@playwright/test";
import { logInAsE2EAdmin } from "./support";

const PAGE_SLUG = "npcink-ad-selector-e2e-page";
const SELECTED_PROMOTION_TITLE = "ZZZ Selected Promotion";
const SEARCH_TARGET_TITLE = "Needle Match Z25";
const SEARCH_TERM = "Needle Match";

interface PromotionRestRequest {
  pathname: string;
  query: URLSearchParams;
}

function isPromotionRestRequest(request: Request): boolean {
  return new URL(request.url()).pathname.includes(
    "/wp-json/wp/v2/npcink_promotion",
  );
}

async function resolveFixturePageId(page: Page): Promise<number> {
  const pageIds = await page.evaluate(async (slug) => {
    const response = await fetch(
      `/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&_fields=id`,
      { credentials: "same-origin" },
    );
    if (!response.ok) {
      throw new Error(`Fixture page REST request failed: ${response.status}`);
    }

    const records = (await response.json()) as Array<{ id: number }>;
    return records.map((record) => record.id);
  }, PAGE_SLUG);

  expect(pageIds).toHaveLength(1);
  return pageIds[0];
}

async function dismissWelcomeGuide(page: Page): Promise<void> {
  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to the block editor",
  });

  try {
    await welcomeDialog.waitFor({ state: "visible", timeout: 5_000 });
    await welcomeDialog.getByRole("button", { name: "Close" }).click();
  } catch {
    // The guide was already dismissed for this fixture user.
  }
}

async function activeComboboxOptionText(
  page: Page,
  combobox: Locator,
): Promise<string> {
  const activeId = await combobox.getAttribute("aria-activedescendant");
  if (!activeId) {
    return "";
  }

  return page.evaluate(
    (id) => document.getElementById(id)?.textContent?.trim() ?? "",
    activeId,
  );
}

async function highlightDifferentOldSuggestion(
  page: Page,
  combobox: Locator,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await combobox.press("ArrowDown");
    const activeText = await activeComboboxOptionText(page, combobox);
    if (activeText && !activeText.includes(SELECTED_PROMOTION_TITLE)) {
      return activeText;
    }
  }

  throw new Error("Could not highlight a non-selected old suggestion.");
}

async function chooseOptionWithArrowKeys(
  page: Page,
  combobox: Locator,
  expectedTitle: string,
): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await combobox.press("ArrowDown");
    const activeText = await activeComboboxOptionText(page, combobox);
    if (activeText.includes(expectedTitle)) {
      await combobox.press("Enter");
      return;
    }
  }

  throw new Error(`Could not reach ${expectedTitle} with ArrowDown.`);
}

async function selectPromotionBlock(page: Page): Promise<string> {
  await page.waitForFunction(() => {
    const wordpress = (window as Window & { wp?: any }).wp;
    const blockEditor = wordpress?.data?.select("core/block-editor");

    return blockEditor
      ?.getBlocks()
      .some((block: { name: string }) => block.name === "npcink-ad/promotion");
  });

  const clientId = await page.evaluate(() => {
    const wordpress = (window as Window & { wp?: any }).wp;
    const blockEditor = wordpress.data.select("core/block-editor");
    const promotionBlock = blockEditor
      .getBlocks()
      .find((block: { name: string }) => block.name === "npcink-ad/promotion");

    if (!promotionBlock) {
      return null;
    }

    wordpress.data
      .dispatch("core/block-editor")
      .selectBlock(promotionBlock.clientId);
    wordpress.data
      .dispatch("core/edit-post")
      ?.openGeneralSidebar?.("edit-post/block");

    return promotionBlock.clientId as string;
  });

  expect(clientId).not.toBeNull();
  return clientId as string;
}

async function selectedPromotionId(
  page: Page,
  clientId: string,
): Promise<number> {
  return page.evaluate((selectedClientId) => {
    const wordpress = (window as Window & { wp?: any }).wp;
    const block = wordpress.data
      .select("core/block-editor")
      .getBlock(selectedClientId);

    return block?.attributes?.promotionId ?? 0;
  }, clientId);
}

test("searches, paginates, saves, and restores a Promotion selection", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const restRequests: PromotionRestRequest[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (isPromotionRestRequest(request)) {
      const url = new URL(request.url());
      restRequests.push({
        pathname: url.pathname,
        query: url.searchParams,
      });
    }
  });

  await logInAsE2EAdmin(page);

  const pageId = await resolveFixturePageId(page);
  await page.goto(`/wp-admin/post.php?post=${pageId}&action=edit`);
  await dismissWelcomeGuide(page);
  let clientId = await selectPromotionBlock(page);
  const selectedSummary = page.getByTestId("npcink-ad-selected-promotion");
  const initiallySelectedId = await selectedPromotionId(page, clientId);
  expect(initiallySelectedId).toBeGreaterThan(0);
  await expect(selectedSummary).toContainText(SELECTED_PROMOTION_TITLE);
  await expect(selectedSummary).toContainText(`#${initiallySelectedId}`);

  await dismissWelcomeGuide(page);
  await expect(page.getByText("Promotion", { exact: true })).toBeVisible();
  const combobox = page.getByRole("combobox");
  await expect(combobox).toHaveCount(1);
  await expect(combobox).toBeVisible();
  await combobox.click();
  await expect.poll(() => page.getByRole("option").count()).toBeGreaterThan(1);
  const oldSuggestion = await highlightDifferentOldSuggestion(page, combobox);
  expect(oldSuggestion).not.toContain(SELECTED_PROMOTION_TITLE);

  const searchResponse = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname.includes("/wp-json/wp/v2/npcink_promotion") &&
        url.searchParams.get("search") === SEARCH_TERM
      );
    },
    { timeout: 15_000 },
  );
  await combobox.press("ControlOrMeta+A");
  await page.keyboard.type(SEARCH_TERM);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  expect(await selectedPromotionId(page, clientId)).toBe(initiallySelectedId);
  expect((await searchResponse).ok()).toBe(true);
  await expect(
    page.getByRole("option").filter({ hasText: SEARCH_TARGET_TITLE }),
  ).toHaveCount(0);

  const pageTwoResponse = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname.includes("/wp-json/wp/v2/npcink_promotion") &&
        url.searchParams.get("search") === SEARCH_TERM &&
        url.searchParams.get("page") === "2"
      );
    },
    { timeout: 15_000 },
  );
  await page.getByRole("button", { name: "Load more promotions" }).click();
  expect((await pageTwoResponse).ok()).toBe(true);
  await combobox.click();
  await expect(
    page.getByRole("option").filter({ hasText: SEARCH_TARGET_TITLE }),
  ).toBeVisible();
  await chooseOptionWithArrowKeys(page, combobox, SEARCH_TARGET_TITLE);
  await expect(selectedSummary).toContainText(SEARCH_TARGET_TITLE);
  await expect
    .poll(() => selectedPromotionId(page, clientId))
    .not.toBe(initiallySelectedId);
  const searchTargetId = await selectedPromotionId(page, clientId);
  expect(searchTargetId).toBeGreaterThan(0);

  await page.evaluate(async () => {
    const wordpress = (window as Window & { wp?: any }).wp;
    await wordpress.data.dispatch("core/editor").savePost();
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const wordpress = (window as Window & { wp?: any }).wp;
        return wordpress.data.select("core/editor").isSavingPost();
      }),
    )
    .toBe(false);

  await page.reload({ waitUntil: "domcontentloaded" });
  clientId = await selectPromotionBlock(page);
  await expect(selectedSummary).toContainText(SEARCH_TARGET_TITLE);
  await expect(selectedSummary).toContainText(`#${searchTargetId}`);
  await expect
    .poll(() => selectedPromotionId(page, clientId))
    .toBe(searchTargetId);

  expect(
    restRequests.some(
      (request) =>
        request.pathname.endsWith(`/npcink_promotion/${initiallySelectedId}`) &&
        request.query.get("context") === "edit",
    ),
  ).toBe(true);
  expect(
    restRequests.some(
      (request) =>
        request.pathname.endsWith("/npcink_promotion") &&
        request.query.get("per_page") === "20" &&
        request.query.get("page") === "1",
    ),
  ).toBe(true);
  expect(
    restRequests.some(
      (request) =>
        request.query.get("search") === SEARCH_TERM &&
        Array.from(request.query.entries()).some(
          ([key, value]) =>
            key.startsWith("search_columns") && value === "post_title",
        ),
    ),
  ).toBe(true);
  expect(
    restRequests.some(
      (request) =>
        request.query.get("page") === "2" &&
        request.query.get("per_page") === "20" &&
        request.query.get("search") === SEARCH_TERM,
    ),
  ).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
