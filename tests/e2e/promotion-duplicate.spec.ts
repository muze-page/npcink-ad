import { expect, test, type Page } from "@playwright/test";
import { logInAsE2EAdmin } from "./support";

const PAGE_SLUG = "npcink-ad-selector-e2e-page";
const SOURCE_TITLE = "Status Action E2E Promotion";
const COPY_TITLE = `${SOURCE_TITLE} — Copy`;

type PromotionRecord = {
  id: number;
  status: string;
  title: { raw: string };
  content: { raw: string };
  meta: Record<string, unknown>;
};

async function getPromotion(page: Page, promotionId: number) {
  return page.evaluate(async (id) => {
    const apiFetch = (
      window as typeof window & {
        wp: {
          apiFetch: (options: { path: string }) => Promise<PromotionRecord>;
        };
      }
    ).wp.apiFetch;

    return apiFetch({
      path: `/wp/v2/npcink_promotion/${id}?context=edit`,
    });
  }, promotionId);
}

test("duplicates a Promotion through a nonce-bound POST into an unscheduled draft", async ({
  page,
}) => {
  await logInAsE2EAdmin(page);
  await page.goto(
    `/wp-admin/edit.php?post_type=npcink_promotion&s=${encodeURIComponent(SOURCE_TITLE)}`,
  );

  const sourceRow = page
    .locator("tr[id^='post-']")
    .filter({ hasText: SOURCE_TITLE });
  await expect(sourceRow).toHaveCount(1);
  const sourceRowId = await sourceRow.getAttribute("id");
  const sourceId = Number(sourceRowId?.replace("post-", ""));
  expect(Number.isInteger(sourceId)).toBe(true);
  expect(sourceId).toBeGreaterThan(0);

  await sourceRow.hover();
  const duplicateButton = sourceRow.getByRole("button", {
    name: `Duplicate as draft: ${SOURCE_TITLE}`,
    exact: true,
  });
  await expect(duplicateButton).toBeVisible();
  const formId = await duplicateButton.getAttribute("form");
  expect(formId).toBe(`npcink-ad-duplicate-${sourceId}`);

  const duplicateForm = page.locator(`#${formId}`);
  await expect(duplicateForm).toHaveAttribute("method", "post");
  await expect(duplicateForm).toHaveAttribute(
    "action",
    /\/wp-admin\/admin-post\.php$/,
  );
  await expect(duplicateForm.locator("input[name='action']")).toHaveValue(
    "npcink_ad_duplicate_promotion",
  );
  await expect(
    duplicateForm.locator("input[name='promotion_id']"),
  ).toHaveValue(String(sourceId));
  await expect(duplicateForm.locator("input[name='_wpnonce']")).not.toHaveValue(
    "",
  );

  await Promise.all([
    page.waitForURL((url) => {
      return (
        url.pathname.endsWith("/wp-admin/post.php") &&
        url.searchParams.get("action") === "edit" &&
        url.searchParams.get("npcink_ad_duplicate_notice") === "duplicated"
      );
    }),
    duplicateButton.click(),
  ]);

  const copyId = Number(new URL(page.url()).searchParams.get("post"));
  expect(Number.isInteger(copyId)).toBe(true);
  expect(copyId).toBeGreaterThan(0);
  expect(copyId).not.toBe(sourceId);
  await expect(
    page.locator(".components-notice__content").getByText(
      "The promotion was duplicated as an unscheduled draft. Review it before publishing.",
      { exact: true },
    ),
  ).toBeVisible();

  const [source, copy] = await Promise.all([
    getPromotion(page, sourceId),
    getPromotion(page, copyId),
  ]);
  expect(source.status).toBe("publish");
  expect(source.meta._npcink_ad_start_at).not.toBe("");
  expect(source.meta._npcink_ad_end_at).not.toBe("");
  expect(copy.status).toBe("draft");
  expect(copy.title.raw).toBe(COPY_TITLE);
  expect(copy.content.raw).toBe(source.content.raw);
  expect(copy.meta._npcink_ad_location).toEqual(
    source.meta._npcink_ad_location,
  );
  expect(copy.meta._npcink_ad_content_scope).toEqual(
    source.meta._npcink_ad_content_scope,
  );
  expect(copy.meta._npcink_ad_include_ids).toEqual(
    source.meta._npcink_ad_include_ids,
  );
  expect(copy.meta._npcink_ad_exclude_ids).toEqual(
    source.meta._npcink_ad_exclude_ids,
  );
  expect(copy.meta._npcink_ad_category_ids).toEqual(
    source.meta._npcink_ad_category_ids,
  );
  expect(copy.meta._npcink_ad_tag_ids).toEqual(
    source.meta._npcink_ad_tag_ids,
  );
  expect(copy.meta._npcink_ad_device).toEqual(
    source.meta._npcink_ad_device,
  );
  expect(copy.meta._npcink_ad_paragraph_number).toEqual(
    source.meta._npcink_ad_paragraph_number,
  );
  expect(copy.meta._npcink_ad_start_at).toBe("");
  expect(copy.meta._npcink_ad_end_at).toBe("");

  await page.goto(`/?pagename=${PAGE_SLUG}`);
  await expect(
    page.locator(`[data-npcink-ad-promotion="${sourceId}"]`),
  ).toBeVisible();
  await expect(
    page.locator(`[data-npcink-ad-promotion="${copyId}"]`),
  ).toHaveCount(0);

  await page.goto(
    `/wp-admin/edit.php?post_type=npcink_promotion&s=${encodeURIComponent(COPY_TITLE)}`,
  );
  const copyRow = page.locator(`#post-${copyId}`);
  await expect(copyRow).toBeVisible();
  await expect(copyRow).toContainText(COPY_TITLE);
  await expect(copyRow).toContainText("Paused");
});
