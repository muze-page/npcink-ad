import { expect, test, type Locator, type Page } from "@playwright/test";
import { logInAsE2EAdmin } from "./support";

const PAGE_SLUG = "npcink-ad-selector-e2e-page";
const PAGE_TITLE = "Npcink Ad selector E2E page";
const FILTERED_POST_SLUG = "npcink-ad-filtered-e2e-post";
const FILTERED_POST_TITLE = "Npcink Ad filtered E2E post";
const FILTER_CATEGORY_SLUG = "npcink-ad-e2e-category";
const FILTER_CATEGORY_NAME = "Npcink Ad E2E category";
const FILTER_TAG_SLUG = "npcink-ad-e2e-tag";
const FILTER_TAG_NAME = "Npcink Ad E2E tag";
const PROMOTION_TITLE = `First-run E2E Promotion ${Date.now()}-${process.pid}`;
const PROMOTION_CONTENT = `First-run E2E creative ${Date.now()}-${
  process.pid
}.`;

interface WordPressWindow extends Window {
  wp?: {
    data?: {
      dispatch?: (store: string) => {
        editPost?: (attributes: Record<string, unknown>) => void;
        openGeneralSidebar?: (name: string) => void;
        savePost?: () => Promise<unknown>;
      };
      select?: (store: string) => {
        getCurrentPostId?: () => number;
        getCurrentPostType?: () => string;
        getEditedPostAttribute?: (attribute: string) => unknown;
        getEditedPostContent?: () => string;
        isSavingPost?: () => boolean;
      };
    };
    plugins?: {
      getPlugin?: (name: string) => unknown;
    };
  };
}

let promotionId = 0;

test.skip(
  process.env.NPCINK_AD_E2E_FIXTURE_MODE !== "first-run",
  "The true first-run flow requires its dedicated empty Promotion fixture.",
);

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

async function resolveFilterFixtureIds(page: Page): Promise<{
  postId: number;
  categoryId: number;
  tagId: number;
}> {
  const ids = await page.evaluate(
    async ({ postSlug, categorySlug, tagSlug }) => {
      const loadId = async (restBase: string, slug: string) => {
        const response = await fetch(
          `/wp-json/wp/v2/${restBase}?slug=${encodeURIComponent(slug)}&_fields=id`,
          { credentials: "same-origin" },
        );
        if (!response.ok) {
          throw new Error(
            `Fixture ${restBase} REST request failed: ${response.status}`,
          );
        }

        const records = (await response.json()) as Array<{ id: number }>;
        if (records.length !== 1) {
          throw new Error(
            `Expected one ${restBase} fixture record, received ${records.length}.`,
          );
        }
        return records[0].id;
      };

      const [postId, categoryId, tagId] = await Promise.all([
        loadId("posts", postSlug),
        loadId("categories", categorySlug),
        loadId("tags", tagSlug),
      ]);

      return { postId, categoryId, tagId };
    },
    {
      postSlug: FILTERED_POST_SLUG,
      categorySlug: FILTER_CATEGORY_SLUG,
      tagSlug: FILTER_TAG_SLUG,
    },
  );

  expect(ids.postId).toBeGreaterThan(0);
  expect(ids.categoryId).toBeGreaterThan(0);
  expect(ids.tagId).toBeGreaterThan(0);
  return ids;
}

function queryIncludesId(
  query: URLSearchParams,
  key: string,
  id: number,
): boolean {
  return [...query.entries()].some(
    ([name, value]) =>
      (name === key || name.startsWith(`${key}[`)) &&
      value.split(",").includes(String(id)),
  );
}

async function waitForPromotionEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const wordpress = (window as WordPressWindow).wp;
    return (
      wordpress?.data?.select?.("core/editor")?.getCurrentPostType?.() ===
        "npcink_promotion" &&
      Boolean(wordpress?.plugins?.getPlugin?.("npcink-ad-editor"))
    );
  });
}

async function dismissWelcomeGuide(page: Page): Promise<void> {
  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to the block editor",
  });

  try {
    await welcomeDialog.waitFor({ state: "visible", timeout: 5_000 });
    await welcomeDialog.getByRole("button", { name: "Close" }).click();
  } catch {
    // The fixture user normally has the guide disabled already.
  }
}

async function openDocumentSettings(page: Page): Promise<void> {
  await page.evaluate(() => {
    const wordpress = (window as WordPressWindow).wp;
    wordpress?.data
      ?.dispatch?.("core/edit-post")
      ?.openGeneralSidebar?.("edit-post/document");
  });
}

async function openSettingsPanel(page: Page, title: string): Promise<void> {
  await openDocumentSettings(page);
  const toggle = page.getByRole("button", { name: title, exact: true });
  await expect(toggle).toBeVisible();

  if ((await toggle.getAttribute("aria-expanded")) === "false") {
    await toggle.click();
  }

  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

async function openDeliverySettings(page: Page): Promise<{
  deliveryPanel: Locator;
  dialog: Locator;
}> {
  await openSettingsPanel(page, "Npcink Ad delivery");
  const deliveryPanel = page.locator(".components-panel__body").filter({
    has: page.getByRole("button", {
      name: "Npcink Ad delivery",
      exact: true,
    }),
  });
  await expect(deliveryPanel).toBeVisible();
  await expect(
    deliveryPanel.getByLabel("Placement", { exact: true }),
  ).toHaveCount(0);

  const editDeliverySettings = deliveryPanel.getByRole("button", {
    name: "Edit delivery settings",
    exact: true,
  });
  await expect(editDeliverySettings).toHaveCount(1);
  await expect(editDeliverySettings).toBeVisible();
  await editDeliverySettings.click();

  const dialog = page.getByRole("dialog", {
    name: "Npcink Ad delivery settings",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  for (const tabName of [
    "Placement",
    "Content scope",
    "Device and schedule",
    "Preview",
  ]) {
    await expect(
      dialog.getByRole("tab", { name: tabName, exact: true }),
    ).toBeVisible();
  }

  return { deliveryPanel, dialog };
}

async function selectDeliveryTab(
  dialog: Locator,
  tabName: string,
): Promise<void> {
  const tab = dialog.getByRole("tab", { name: tabName, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

async function setPromotionCreative(page: Page): Promise<void> {
  await page.evaluate(
    ({ title, content }) => {
      const wordpress = (window as WordPressWindow).wp;
      wordpress?.data?.dispatch?.("core/editor")?.editPost?.({
        title,
        content: `<!-- wp:paragraph --><p>${content}</p><!-- /wp:paragraph -->`,
      });
    },
    { title: PROMOTION_TITLE, content: PROMOTION_CONTENT },
  );

  await expect
    .poll(() =>
      page.evaluate(() => {
        const wordpress = (window as WordPressWindow).wp;
        return {
          title: wordpress?.data
            ?.select?.("core/editor")
            ?.getEditedPostAttribute?.("title"),
          content: wordpress?.data
            ?.select?.("core/editor")
            ?.getEditedPostContent?.(),
        };
      }),
    )
    .toMatchObject({
      title: PROMOTION_TITLE,
      content: expect.stringContaining(PROMOTION_CONTENT),
    });
}

async function savePromotion(page: Page, status?: "draft" | "publish") {
  const savedId = await page.evaluate(async (nextStatus) => {
    const wordpress = (window as WordPressWindow).wp;
    const editor = wordpress?.data?.dispatch?.("core/editor");
    if (!editor?.savePost) {
      throw new Error("The Core editor save API is unavailable.");
    }

    if (nextStatus) {
      editor.editPost?.({ status: nextStatus });
    }
    await editor.savePost();

    return Number(
      wordpress?.data?.select?.("core/editor")?.getCurrentPostId?.() ?? 0,
    );
  }, status);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const wordpress = (window as WordPressWindow).wp;
        return Boolean(
          wordpress?.data?.select?.("core/editor")?.isSavingPost?.(),
        );
      }),
    )
    .toBe(false);
  expect(savedId).toBeGreaterThan(0);
  promotionId = savedId;
  return savedId;
}

async function openPromotionListRow(page: Page): Promise<Locator> {
  const search = encodeURIComponent(PROMOTION_TITLE);
  await page.goto(`/wp-admin/edit.php?post_type=npcink_promotion&s=${search}`);

  const row = promotionId
    ? page.locator(`#post-${promotionId}`)
    : page.locator("tr.type-npcink_promotion").filter({
        hasText: PROMOTION_TITLE,
      });
  await expect(row).toBeVisible();
  await expect(row).toContainText(PROMOTION_TITLE);
  return row;
}

async function submitStatusAction(
  page: Page,
  actionName: string,
  noticeCode: string,
): Promise<void> {
  await Promise.all([
    page.waitForURL((url) => {
      return (
        url.pathname.endsWith("/wp-admin/edit.php") &&
        url.searchParams.get("npcink_ad_notice") === noticeCode
      );
    }),
    page.getByRole("button", { name: actionName, exact: true }).click(),
  ]);
}

async function trashCreatedPromotion(page: Page): Promise<void> {
  const row = await openPromotionListRow(page);
  await row.hover();
  const trashLink = row.locator(".row-actions .trash a");
  await expect(trashLink).toBeVisible({ timeout: 5_000 });
  await Promise.all([
    page.waitForURL(/\/wp-admin\/edit\.php/),
    trashLink.click(),
  ]);
  await expect(page.locator(`#post-${promotionId}`)).toHaveCount(0);
  promotionId = 0;
}

test.afterEach(async ({ page }) => {
  if (promotionId > 0) {
    await trashCreatedPromotion(page);
  }
});

test("completes a first selected-page Promotion from creation to live pause and resume", async ({
  page,
}) => {
  await logInAsE2EAdmin(page);
  const fixturePageId = await resolveFixturePageId(page);
  const filterFixtureIds = await resolveFilterFixtureIds(page);

  await page.goto("/wp-admin/edit.php?post_type=npcink_promotion");
  await expect(page.locator("tr.type-npcink_promotion")).toHaveCount(0);
  const emptyListGuide = page.locator(".npcink-ad-first-promotion-guide");
  await expect(emptyListGuide).toBeVisible();
  await expect(emptyListGuide).toContainText(
    "Publish your first Promotion in three steps",
  );
  const emptyListSteps = emptyListGuide.locator("ol > li");
  await expect(emptyListSteps).toHaveCount(3);
  await expect(emptyListSteps).toContainText([
    "Add the content you want to show.",
    "Choose its placement and content scope.",
    "Preview it on a real page, then publish.",
  ]);
  const addNewPromotion = emptyListGuide.getByRole("link", {
    name: "Add first Promotion",
    exact: true,
  });
  await expect(addNewPromotion).toBeVisible();
  await Promise.all([
    page.waitForURL((url) => url.pathname.endsWith("/wp-admin/post-new.php")),
    addNewPromotion.click(),
  ]);
  expect(new URL(page.url()).searchParams.get("post_type")).toBe(
    "npcink_promotion",
  );

  await dismissWelcomeGuide(page);
  await waitForPromotionEditor(page);
  await openSettingsPanel(page, "Publish in three steps");
  const firstRunGuide = page.getByTestId("npcink-ad-first-run-guide");
  const contentStep = page.getByTestId("npcink-ad-first-run-step-content");
  const deliveryStep = page.getByTestId("npcink-ad-first-run-step-delivery");
  const previewPublishStep = page.getByTestId(
    "npcink-ad-first-run-step-preview-publish",
  );
  await expect(firstRunGuide).toBeVisible();
  await expect(contentStep).toHaveAttribute("data-state", "incomplete");
  await expect(deliveryStep).toHaveAttribute("data-state", "complete");
  await expect(previewPublishStep).toHaveAttribute("data-state", "blocked");

  await setPromotionCreative(page);

  const { deliveryPanel, dialog: deliveryDialog } =
    await openDeliverySettings(page);
  await selectDeliveryTab(deliveryDialog, "Placement");
  const placement = deliveryDialog.getByRole("combobox", {
    name: "Placement",
    exact: true,
  });
  await placement.selectOption("block");

  await selectDeliveryTab(deliveryDialog, "Content scope");
  await expect(deliveryDialog).toContainText(
    "To target categories or tags automatically, first choose Before post content, After post content, or After paragraph N in Placement.",
  );
  await expect(
    deliveryDialog
      .getByRole("combobox", { name: "Content scope", exact: true })
      .locator('option[value="terms"]'),
  ).toHaveCount(0);

  await selectDeliveryTab(deliveryDialog, "Placement");
  await placement.selectOption("content_before");

  await selectDeliveryTab(deliveryDialog, "Content scope");
  await deliveryDialog
    .getByRole("combobox", { name: "Content scope", exact: true })
    .selectOption("selected");
  await expect(
    deliveryDialog.getByRole("tab", {
      name: "Content scope — needs attention",
      exact: true,
    }),
  ).toBeVisible();
  await deliveryDialog
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  await expect(deliveryDialog).toHaveCount(0);
  await expect(deliveryPanel).toContainText(
    "Delivery settings need attention.",
  );
  await deliveryPanel
    .getByRole("button", { name: "Edit delivery settings", exact: true })
    .click();
  await expect(deliveryDialog).toBeVisible();
  await expect(
    deliveryDialog.getByRole("tab", {
      name: "Content scope — needs attention",
      exact: true,
    }),
  ).toHaveAttribute("aria-selected", "true");
  const includedContent = deliveryDialog.getByRole("combobox", {
    name: "Included content",
  });
  await expect(includedContent).toBeVisible();
  const categoryFilter = deliveryDialog.getByRole("combobox", {
    name: "Filter by categories",
  });
  const tagFilter = deliveryDialog.getByRole("combobox", {
    name: "Filter by tags",
  });
  await categoryFilter.fill(FILTER_CATEGORY_NAME);
  await page
    .getByRole("option", { name: FILTER_CATEGORY_NAME, exact: true })
    .click();
  await tagFilter.fill(FILTER_TAG_NAME);
  await page
    .getByRole("option", { name: FILTER_TAG_NAME, exact: true })
    .click();

  const filteredPostResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.includes("/wp-json/wp/v2/posts") &&
      url.searchParams.get("search") === FILTERED_POST_TITLE &&
      queryIncludesId(
        url.searchParams,
        "categories",
        filterFixtureIds.categoryId,
      ) &&
      queryIncludesId(url.searchParams, "tags", filterFixtureIds.tagId)
    );
  });
  await includedContent.fill(FILTERED_POST_TITLE);
  expect((await filteredPostResponse).ok()).toBe(true);
  await page
    .getByRole("option")
    .filter({ hasText: `${FILTERED_POST_TITLE} — Post` })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const meta = (window as WordPressWindow).wp?.data
          ?.select?.("core/editor")
          ?.getEditedPostAttribute?.("meta") as
          | Record<string, unknown>
          | undefined;

        return {
          includeIds: meta?._npcink_ad_include_ids ?? [],
          categoryIds: meta?._npcink_ad_category_ids ?? [],
          tagIds: meta?._npcink_ad_tag_ids ?? [],
        };
      }),
    )
    .toEqual({
      includeIds: [filterFixtureIds.postId],
      categoryIds: [],
      tagIds: [],
    });
  await deliveryDialog
    .getByRole("button", {
      name: `Remove ${FILTERED_POST_TITLE}`,
      exact: true,
    })
    .click();
  await deliveryDialog
    .getByRole("button", {
      name: `Remove category ${FILTER_CATEGORY_NAME}`,
      exact: true,
    })
    .click();
  await deliveryDialog
    .getByRole("button", {
      name: `Remove tag ${FILTER_TAG_NAME}`,
      exact: true,
    })
    .click();

  await includedContent.fill(PAGE_TITLE);
  const pageOption = page
    .getByRole("option")
    .filter({ hasText: `${PAGE_TITLE} — Page` });
  await expect(pageOption).toBeVisible();
  await pageOption.click();
  await expect(
    deliveryDialog.locator(".npcink-ad-content-picker__selected").filter({
      hasText: PAGE_TITLE,
    }),
  ).toBeVisible();
  await expect(contentStep).toHaveAttribute("data-state", "complete");
  await expect(deliveryStep).toHaveAttribute("data-state", "complete");
  await expect(previewPublishStep).toHaveAttribute("data-state", "ready");
  await expect(
    deliveryDialog.getByRole("tab", {
      name: "Content scope",
      exact: true,
    }),
  ).toBeVisible();

  await selectDeliveryTab(deliveryDialog, "Device and schedule");
  await expect(
    deliveryDialog.getByRole("combobox", { name: "Device", exact: true }),
  ).toBeVisible();

  const startSchedule = deliveryDialog.getByRole("group", {
    name: "Start showing",
    exact: true,
  });
  const stopSchedule = deliveryDialog.getByRole("group", {
    name: "Stop showing",
    exact: true,
  });
  await expect(startSchedule).toBeVisible();
  await expect(stopSchedule).toBeVisible();

  const startDate = startSchedule.getByLabel("Date", { exact: true });
  const startTime = startSchedule.getByLabel("Time", { exact: true });
  await expect(startDate).toHaveAttribute("type", "date");
  await expect(startTime).toHaveAttribute("type", "time");
  await expect(startTime).toBeDisabled();

  await startDate.fill("2026-07-23");
  await expect(startTime).toBeEnabled();
  await expect(startTime).toHaveValue("00:00");
  await startTime.fill("19:14");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const meta = (window as WordPressWindow).wp?.data
          ?.select?.("core/editor")
          ?.getEditedPostAttribute?.("meta") as
          | Record<string, unknown>
          | undefined;
        return meta?._npcink_ad_start_at;
      }),
    )
    .toBe("2026-07-23 19:14:00");
  await startDate.fill("");
  await expect(startTime).toBeDisabled();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const meta = (window as WordPressWindow).wp?.data
          ?.select?.("core/editor")
          ?.getEditedPostAttribute?.("meta") as
          | Record<string, unknown>
          | undefined;
        return meta?._npcink_ad_start_at;
      }),
    )
    .toBe("");

  const createdPromotionId = await savePromotion(page, "draft");
  await selectDeliveryTab(deliveryDialog, "Preview");
  const openPreviewButton = deliveryDialog.getByRole("button", {
    name: /^(Save and open preview|Open preview)$/,
  });
  await expect(openPreviewButton).toBeEnabled();

  const previewPagePromise = page.waitForEvent("popup");
  await openPreviewButton.click();
  const previewPage = await previewPagePromise;
  await previewPage.waitForURL((url) => {
    return (
      url.pathname.endsWith("/wp-admin/admin.php") &&
      url.searchParams.get("page") === "npcink-ad-preview"
    );
  });

  const previewUrl = new URL(previewPage.url());
  expect(previewUrl.searchParams.get("promotion")).toBe(
    String(createdPromotionId),
  );
  expect(previewUrl.searchParams.get("target")).toBe(String(fixturePageId));
  expect(previewUrl.searchParams.get("device")).toBe("desktop");
  expect(previewUrl.searchParams.get("_wpnonce")).toBeTruthy();

  const previewFrameUrl = await previewPage
    .locator('iframe[title="Npcink Ad real-page preview"]')
    .getAttribute("src");
  expect(previewFrameUrl).toBeTruthy();
  const previewResponse = await previewPage
    .context()
    .request.get(
      new URL(previewFrameUrl as string, previewPage.url()).toString(),
    );
  expect(previewResponse.ok()).toBe(true);
  const previewHtml = await previewResponse.text();
  expect(previewHtml).toContain(
    "Not currently eligible: The promotion is not published.",
  );
  expect(previewHtml).toContain(PROMOTION_CONTENT);
  await previewPage.close();

  await deliveryDialog
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  await expect(deliveryDialog).toHaveCount(0);
  const editDeliverySettingsButton = deliveryPanel.getByRole("button", {
    name: "Edit delivery settings",
    exact: true,
  });
  await expect(editDeliverySettingsButton).toBeVisible();
  await expect(deliveryPanel).toContainText("Delivery settings checked.");
  await expect(deliveryPanel).toContainText("Before post content");
  await expect(deliveryPanel).toContainText("Only selected content");
  await expect(deliveryPanel).toContainText("All devices · No schedule");
  await expect(deliveryPanel).toContainText("Page selected");

  await editDeliverySettingsButton.click();
  const reopenedDeliveryDialog = page.getByRole("dialog", {
    name: "Npcink Ad delivery settings",
    exact: true,
  });
  await expect(reopenedDeliveryDialog).toBeVisible();
  await reopenedDeliveryDialog.press("Escape");
  await expect(reopenedDeliveryDialog).toHaveCount(0);
  await expect(editDeliverySettingsButton).toBeFocused();

  await savePromotion(page, "publish");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const wordpress = (window as WordPressWindow).wp;
        return wordpress?.data
          ?.select?.("core/editor")
          ?.getEditedPostAttribute?.("status");
      }),
    )
    .toBe("publish");
  await expect(firstRunGuide).toHaveCount(0);

  await page.goto(`/?page_id=${fixturePageId}`);
  const livePromotion = page.locator(
    `[data-npcink-ad-promotion="${createdPromotionId}"]`,
  );
  await expect(livePromotion).toBeVisible();
  await expect(livePromotion).toContainText(PROMOTION_CONTENT);

  let row = await openPromotionListRow(page);
  await expect(row).toContainText("Rule ready");
  await submitStatusAction(page, `Pause: ${PROMOTION_TITLE}`, "paused");
  row = page.locator(`#post-${createdPromotionId}`);
  await expect(row).toContainText("Paused");

  await page.goto(`/?page_id=${fixturePageId}`);
  await expect(
    page.locator(`[data-npcink-ad-promotion="${createdPromotionId}"]`),
  ).toHaveCount(0);

  row = await openPromotionListRow(page);
  await submitStatusAction(page, `Resume: ${PROMOTION_TITLE}`, "resumed");
  row = page.locator(`#post-${createdPromotionId}`);
  await expect(row).toContainText("Rule ready");

  await page.goto(`/?page_id=${fixturePageId}`);
  const resumedPromotion = page.locator(
    `[data-npcink-ad-promotion="${createdPromotionId}"]`,
  );
  await expect(resumedPromotion).toBeVisible();
  await expect(resumedPromotion).toContainText(PROMOTION_CONTENT);

  await trashCreatedPromotion(page);
});
