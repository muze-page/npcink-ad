import { expect, test, type Page } from "@playwright/test";
import { logInAsE2EAdmin } from "./support";

const AUTOPLAY_ADVISORY =
  "This video requests autoplay without being muted. Browsers may block playback; enable Muted in the Video block or keep playback controls. This advisory does not block publishing.";

interface WordPressWindow extends Window {
  wp?: {
    data?: {
      dispatch?: (store: string) => {
        editPost?: (attributes: Record<string, unknown>) => void;
      };
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

test("shows one non-blocking advisory for unmuted autoplay video", async ({
  page,
}) => {
  await logInAsE2EAdmin(page);
  await page.goto("/wp-admin/post-new.php?post_type=npcink_promotion");
  await waitForPromotionEditor(page);

  await page.evaluate(() => {
    const wordpress = (window as WordPressWindow).wp;
    wordpress?.data?.dispatch?.("core/editor")?.editPost?.({
      title: "Autoplay advisory E2E Promotion",
      content:
        '<!-- wp:html --><video autoplay controls src="/wp-content/uploads/e2e.mp4"></video><!-- /wp:html -->',
    });
  });

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const advisory = page.getByText(AUTOPLAY_ADVISORY, { exact: true });
  await expect(advisory).toHaveCount(1);
  await expect(advisory).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }).last(),
  ).toBeEnabled();

  await page.evaluate(() => {
    const wordpress = (window as WordPressWindow).wp;
    wordpress?.data?.dispatch?.("core/editor")?.editPost?.({
      content:
        '<!-- wp:html --><video autoplay muted controls src="/wp-content/uploads/e2e.mp4"></video><!-- /wp:html -->',
    });
  });
  await expect(advisory).toHaveCount(0);
});
