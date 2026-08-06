import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";

const CMS_PATHS = ["/", "/blog", "/practice-areas", "/about-us", "/contact"] as const;

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function expectSignedInPortal(page: Page, pathPrefix: string) {
  await expect(page).toHaveURL(new RegExp(`${pathPrefix}(/|$)`));
  // Unauthenticated portal shells show a Sign-in CTA; authenticated shells should not.
  await expect(page.getByRole("button", { name: /sign in/i })).toHaveCount(0, {
    timeout: 20_000,
  });
}

test.describe("R5.7 E2E smoke", () => {
  test("CMS public pages load", async ({ page }) => {
    for (const path of CMS_PATHS) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `${path} should return 2xx`).toBeTruthy();
      await expect(page.locator("body")).not.toBeEmpty();
      await expect(page.getByText(/This page couldn.?t load/i)).toHaveCount(0);
    }
  });

  test("login → staff portal (matter + document)", async ({ page }) => {
    await signIn(page, E2E_USERS.staff.email);
    await expect(page).toHaveURL(/\/staff(\/|$)/, { timeout: 20_000 });
    await expectSignedInPortal(page, "/staff");

    await page.goto("/staff/cases");
    await expect(page).toHaveURL(/\/staff\/cases/);
    await expectSignedInPortal(page, "/staff/cases");

    await page.goto("/staff/documents");
    await expect(page).toHaveURL(/\/staff\/documents/);
    await expectSignedInPortal(page, "/staff/documents");
  });

  test("login → admin finance (invoice)", async ({ page }) => {
    await signIn(page, E2E_USERS.admin.email);
    await expect(page).toHaveURL(/\/admin(\/|$)/, { timeout: 20_000 });
    await expectSignedInPortal(page, "/admin");

    await page.goto("/admin/finance");
    await expect(page).toHaveURL(/\/admin\/finance/);
    await expectSignedInPortal(page, "/admin/finance");
  });

  test("login → client billing + signatures", async ({ page }) => {
    await signIn(page, E2E_USERS.client.email);
    await expect(page).toHaveURL(/\/client(\/|$)/, { timeout: 20_000 });
    await expectSignedInPortal(page, "/client");

    await page.goto("/client/billing");
    await expect(page).toHaveURL(/\/client\/billing/);
    await expectSignedInPortal(page, "/client/billing");

    await page.goto("/client/signatures");
    await expect(page).toHaveURL(/\/client\/signatures/);
    await expectSignedInPortal(page, "/client/signatures");
  });
});
