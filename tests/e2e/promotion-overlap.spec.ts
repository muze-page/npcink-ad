import { expect, test, type Page } from "@playwright/test";
import { logInAsE2EAdmin } from "./support";

const CANDIDATE_TITLE = "Overlap Advisory E2E Draft";
const PUBLISHED_TITLE = "Status Action E2E Promotion";

interface WordPressWindow extends Window {
  wp?: {
    data?: {
      select?: (store: string) => {
        getCurrentPostType?: () => string;
      };
    };
    plugins?: {
      getPlugin?: (name: string) => unknown;
    };
  };
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

test("links a possible overlap to the exact published Promotion", async ({
  page,
}) => {
  await logInAsE2EAdmin(page);
  await page.goto(
    `/wp-admin/edit.php?post_type=npcink_promotion&s=${encodeURIComponent(
      CANDIDATE_TITLE,
    )}`,
  );

  const row = page
    .locator("tr[id^='post-']")
    .filter({ hasText: CANDIDATE_TITLE });
  await expect(row).toHaveCount(1);
  const listLink = row
    .locator(".npcink-ad-overlap-hint a")
    .filter({ hasText: PUBLISHED_TITLE });
  await expect(listLink).toHaveCount(1);
  const listHref = await listLink.getAttribute("href");
  expect(listHref).not.toBeNull();
  const publishedId = Number(
    new URL(listHref as string).searchParams.get("post"),
  );
  expect(Number.isInteger(publishedId)).toBe(true);
  expect(publishedId).toBeGreaterThan(0);

  await Promise.all([
    page.waitForURL(/\/wp-admin\/post\.php\?post=\d+&action=edit/),
    row.locator(".row-title").click(),
  ]);
  await waitForPromotionEditor(page);
  await page.getByRole("button", { name: "Publish", exact: true }).click();

  const editorLink = page.getByRole("link", {
    name: `#${publishedId}`,
    exact: true,
  });
  await expect(editorLink).toBeVisible();
  await expect(editorLink).toHaveAttribute("target", "_blank");
  await expect(editorLink).toHaveAttribute("rel", "noopener noreferrer");
  const resolvedEditorHref = await editorLink.evaluate(
    (element) => (element as HTMLAnchorElement).href,
  );
  expect(resolvedEditorHref).toMatch(
    new RegExp(`/wp-admin/post\\.php\\?post=${publishedId}&action=edit$`),
  );
  const overlapAdvisory = page.locator(".components-notice.is-warning").filter({
    has: editorLink,
  });
  await expect(overlapAdvisory).toHaveCount(1);
  await expect(overlapAdvisory).toContainText(
    "This advisory does not block publishing.",
  );
});
