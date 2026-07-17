import { expect, type Page } from "@playwright/test";

const E2E_ADMIN_USERNAME = "npcink-e2e-admin";
const E2E_ADMIN_PASSWORD = "npcink-e2e-password";

/**
 * Log in through the fixture form without relying on browser autofill timing.
 *
 * Some headless Chromium environments rewrite the username while a password
 * field is being filled. Login is test setup rather than the product surface,
 * so set both native inputs in one browser task, password first, then verify
 * their final values before submitting the real form.
 */
export async function logInAsE2EAdmin(page: Page): Promise<void> {
  await page.goto("/wp-login.php");
  const form = page.locator("#loginform");
  await expect(form).toBeVisible();

  await form.evaluate(
    (element, credentials) => {
      const username = element.querySelector<HTMLInputElement>("#user_login");
      const password = element.querySelector<HTMLInputElement>("#user_pass");
      if (!username || !password) {
        throw new Error("The WordPress login inputs are unavailable.");
      }

      const setValue = (input: HTMLInputElement, value: string) => {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        if (!setter) {
          throw new Error("The native input value setter is unavailable.");
        }

        setter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };

      setValue(password, credentials.password);
      setValue(username, credentials.username);
    },
    { username: E2E_ADMIN_USERNAME, password: E2E_ADMIN_PASSWORD },
  );

  const username = form.locator("#user_login");
  const password = form.locator("#user_pass");
  await expect(username).toHaveValue(E2E_ADMIN_USERNAME);
  await expect(password).toHaveValue(E2E_ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL(/\/wp-admin\//),
    form.getByRole("button", { name: "Log In" }).click(),
  ]);
}
