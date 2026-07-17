import { expect, test, type Page } from "@playwright/test";
import { logInAsE2EAdmin } from "./support";

const PAGE_SLUG = "npcink-ad-selector-e2e-page";
const BLOCK_EDITOR_ASSET = "block-editor.js";
const PROMOTION_EDITOR_ASSET = "promotion-editor.js";

interface WordPressWindow extends Window {
  wp?: {
    blocks?: {
      getBlockType?: (name: string) => unknown;
    };
    data?: {
      select?: (store: string) => {
        getBlocks?: () => Array<{
          name: string;
          attributes?: { promotionId?: number };
        }>;
      };
    };
    plugins?: {
      getPlugin?: (name: string) => unknown;
    };
  };
}

function isEditorAsset(url: string, assetName: string): boolean {
  return new URL(url).pathname.endsWith(`/build/${assetName}`);
}

async function resolveFixturePageId(page: Page): Promise<number> {
  return page.evaluate(async (slug) => {
    const response = await fetch(
      `/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&_fields=id`,
      { credentials: "same-origin" },
    );
    if (!response.ok) {
      throw new Error(`Fixture page REST request failed: ${response.status}`);
    }

    const records = (await response.json()) as Array<{ id: number }>;
    if (records.length !== 1) {
      throw new Error(`Expected one fixture page, received ${records.length}.`);
    }

    return records[0].id;
  }, PAGE_SLUG);
}

async function resolvePromotionId(page: Page): Promise<number> {
  await page.waitForFunction(() => {
    const wordpress = (window as WordPressWindow).wp;
    const blocks = wordpress?.data
      ?.select?.("core/block-editor")
      ?.getBlocks?.();
    return blocks?.some(
      (block) =>
        block.name === "npcink-ad/promotion" &&
        Number(block.attributes?.promotionId) > 0,
    );
  });

  return page.evaluate(() => {
    const wordpress = (window as WordPressWindow).wp;
    const blocks = wordpress?.data
      ?.select?.("core/block-editor")
      ?.getBlocks?.();
    const promotion = blocks?.find(
      (block) => block.name === "npcink-ad/promotion",
    );
    return Number(promotion?.attributes?.promotionId ?? 0);
  });
}

test("loads editor assets only on their intended document screens", async ({
  page,
}) => {
  const requestedEditorAssets: string[] = [];

  page.on("request", (request) => {
    const url = request.url();
    if (
      isEditorAsset(url, BLOCK_EDITOR_ASSET) ||
      isEditorAsset(url, PROMOTION_EDITOR_ASSET)
    ) {
      requestedEditorAssets.push(url);
    }
  });

  await logInAsE2EAdmin(page);
  const fixturePageId = await resolveFixturePageId(page);

  requestedEditorAssets.length = 0;
  const blockEditorResponse = page.waitForResponse((response) =>
    isEditorAsset(response.url(), BLOCK_EDITOR_ASSET),
  );
  await page.goto(`/wp-admin/post.php?post=${fixturePageId}&action=edit`);
  expect((await blockEditorResponse).ok()).toBe(true);
  await page.waitForFunction(() => {
    const wordpress = (window as WordPressWindow).wp;
    return Boolean(wordpress?.blocks?.getBlockType?.("npcink-ad/promotion"));
  });

  expect(
    requestedEditorAssets.some((url) => isEditorAsset(url, BLOCK_EDITOR_ASSET)),
  ).toBe(true);
  expect(
    requestedEditorAssets.some((url) =>
      isEditorAsset(url, PROMOTION_EDITOR_ASSET),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() => {
      const wordpress = (window as WordPressWindow).wp;
      return Boolean(wordpress?.plugins?.getPlugin?.("npcink-ad-editor"));
    }),
  ).toBe(false);

  const promotionId = await resolvePromotionId(page);
  requestedEditorAssets.length = 0;
  const promotionEditorResponse = page.waitForResponse((response) =>
    isEditorAsset(response.url(), PROMOTION_EDITOR_ASSET),
  );
  await page.goto(`/wp-admin/post.php?post=${promotionId}&action=edit`);
  expect((await promotionEditorResponse).ok()).toBe(true);
  await page.waitForFunction(() => {
    const wordpress = (window as WordPressWindow).wp;
    return Boolean(wordpress?.plugins?.getPlugin?.("npcink-ad-editor"));
  });

  expect(
    requestedEditorAssets.some((url) =>
      isEditorAsset(url, PROMOTION_EDITOR_ASSET),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => {
      const wordpress = (window as WordPressWindow).wp;
      return Boolean(wordpress?.plugins?.getPlugin?.("npcink-ad-editor"));
    }),
  ).toBe(true);
});
