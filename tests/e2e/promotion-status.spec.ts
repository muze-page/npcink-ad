import { expect, test, type Locator, type Page } from "@playwright/test";
import { logInAsE2EAdmin } from "./support";

const PAGE_SLUG = "npcink-ad-selector-e2e-page";
const AUTOMATIC_PROMOTION_TITLE = "Status Action E2E Promotion";
const AUTOMATIC_PROMOTION_CONTENT = "Automatic status E2E promotion.";
const SCHEDULED_PROMOTION_TITLE = "Scheduled Status E2E Promotion";
const SCHEDULED_PROMOTION_CONTENT = "Scheduled status E2E promotion.";

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

async function openPromotionListRow(
  page: Page,
  promotionId: number,
  promotionTitle: string,
): Promise<Locator> {
  const search = encodeURIComponent(promotionTitle);
  await page.goto(`/wp-admin/edit.php?post_type=npcink_promotion&s=${search}`);

  const row = page.locator(`#post-${promotionId}`);
  await expect(row).toBeVisible();
  await expect(row).toContainText(promotionTitle);
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

test("pauses and resumes an automatic Promotion from the list", async ({
  page,
}) => {
  await logInAsE2EAdmin(page);
  const fixturePageId = await resolveFixturePageId(page);

  await page.goto(`/?page_id=${fixturePageId}`);
  const initialPromotion = page
    .locator(".npcink-ad-promotion")
    .filter({ hasText: AUTOMATIC_PROMOTION_CONTENT });
  await expect(initialPromotion).toHaveCount(1);
  await expect(initialPromotion).toBeVisible();

  const promotionIdValue = await initialPromotion.getAttribute(
    "data-npcink-ad-promotion",
  );
  const promotionId = Number(promotionIdValue);
  expect(Number.isInteger(promotionId)).toBe(true);
  expect(promotionId).toBeGreaterThan(0);

  let row = await openPromotionListRow(
    page,
    promotionId,
    AUTOMATIC_PROMOTION_TITLE,
  );
  await expect(row).toContainText("Rule ready");
  await submitStatusAction(
    page,
    `Pause: ${AUTOMATIC_PROMOTION_TITLE}`,
    "paused",
  );
  await expect(
    page.locator(".notice-success").filter({
      hasText: "The promotion is paused.",
    }),
  ).toBeVisible();
  row = page.locator(`#post-${promotionId}`);
  await expect(row).toContainText("Paused");
  await expect(
    row.getByRole("button", {
      name: `Resume: ${AUTOMATIC_PROMOTION_TITLE}`,
      exact: true,
    }),
  ).toBeVisible();

  await page.goto(`/?page_id=${fixturePageId}`);
  await expect(
    page.locator(`[data-npcink-ad-promotion="${promotionId}"]`),
  ).toHaveCount(0);

  row = await openPromotionListRow(
    page,
    promotionId,
    AUTOMATIC_PROMOTION_TITLE,
  );
  await submitStatusAction(
    page,
    `Resume: ${AUTOMATIC_PROMOTION_TITLE}`,
    "resumed",
  );
  await expect(
    page.locator(".notice-success").filter({
      hasText:
        "The promotion was published. Delivery still depends on its schedule and content rules.",
    }),
  ).toBeVisible();
  row = page.locator(`#post-${promotionId}`);
  await expect(row).toContainText("Rule ready");
  await expect(
    row.getByRole("button", {
      name: `Pause: ${AUTOMATIC_PROMOTION_TITLE}`,
      exact: true,
    }),
  ).toBeVisible();

  await page.goto(`/?page_id=${fixturePageId}`);
  const resumedPromotion = page.locator(
    `[data-npcink-ad-promotion="${promotionId}"]`,
  );
  await expect(resumedPromotion).toBeVisible();
  await expect(resumedPromotion).toContainText(AUTOMATIC_PROMOTION_CONTENT);
});

test("pauses a scheduled Promotion before it starts and resumes it now", async ({
  page,
}) => {
  await logInAsE2EAdmin(page);
  const fixturePageId = await resolveFixturePageId(page);

  await page.goto(
    `/wp-admin/edit.php?post_type=npcink_promotion&s=${encodeURIComponent(
      SCHEDULED_PROMOTION_TITLE,
    )}`,
  );
  let row = page
    .locator("tr[id^='post-']")
    .filter({ hasText: SCHEDULED_PROMOTION_TITLE });
  await expect(row).toHaveCount(1);
  const rowId = await row.getAttribute("id");
  const promotionId = Number(rowId?.replace("post-", ""));
  expect(Number.isInteger(promotionId)).toBe(true);
  expect(promotionId).toBeGreaterThan(0);
  await expect(row).toContainText("Not started");
  await expect(
    row.getByRole("button", {
      name: `Pause: ${SCHEDULED_PROMOTION_TITLE}`,
      exact: true,
    }),
  ).toBeVisible();

  await page.goto(`/?page_id=${fixturePageId}`);
  await expect(
    page
      .locator(".npcink-ad-promotion")
      .filter({ hasText: SCHEDULED_PROMOTION_CONTENT }),
  ).toHaveCount(0);

  row = await openPromotionListRow(
    page,
    promotionId,
    SCHEDULED_PROMOTION_TITLE,
  );
  await submitStatusAction(
    page,
    `Pause: ${SCHEDULED_PROMOTION_TITLE}`,
    "paused",
  );
  row = page.locator(`#post-${promotionId}`);
  await expect(row).toContainText("Paused");
  await expect(
    row.getByRole("button", {
      name: `Resume: ${SCHEDULED_PROMOTION_TITLE}`,
      exact: true,
    }),
  ).toBeVisible();

  await submitStatusAction(
    page,
    `Resume: ${SCHEDULED_PROMOTION_TITLE}`,
    "resumed",
  );
  row = page.locator(`#post-${promotionId}`);
  await expect(row).toContainText("Rule ready");

  await page.goto(`/?page_id=${fixturePageId}`);
  const resumedPromotion = page
    .locator(".npcink-ad-promotion")
    .filter({ hasText: SCHEDULED_PROMOTION_CONTENT });
  await expect(resumedPromotion).toHaveCount(1);
  await expect(resumedPromotion).toBeVisible();

  row = await openPromotionListRow(
    page,
    promotionId,
    SCHEDULED_PROMOTION_TITLE,
  );
  await submitStatusAction(
    page,
    `Pause: ${SCHEDULED_PROMOTION_TITLE}`,
    "paused",
  );
  await expect(page.locator(`#post-${promotionId}`)).toContainText("Paused");
});
