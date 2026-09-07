import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

async function signIn(page: Page, email: string) {
  await prepareE2eAuth(page, email);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin(\/|$)/, { timeout: 20_000 });
}

test.describe("Admin users directory", () => {
  test("table + drawer + deep links + clients surface", async ({ page }) => {
    await signIn(page, E2E_USERS.admin.email);

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Directory" })).toBeVisible();
    await expect(page.getByRole("button", { name: /invite user/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Staff" })).toBeVisible();

    await expect(page.locator("table")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("table").getByText("Person", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Open", exact: true }).first().click();

    const drawer = page.locator('[role="dialog"]').filter({ hasText: "Linked records" });
    await expect(drawer).toBeVisible({ timeout: 10_000 });
    await expect(drawer.getByRole("heading", { name: "Linked records" })).toBeVisible();
    await expect(drawer.getByRole("heading", { name: "Security & sessions" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: /firm audit log/i })).toBeVisible();

    await drawer.getByRole("button", { name: /suspend account|reactivate account/i }).click();
    await expect(page.getByRole("heading", { name: /suspend .+|reactivate .+/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: /^Cancel$/ }).click();

    await drawer.getByRole("button", { name: /^Close$/ }).click();
    await expect(drawer).toHaveCount(0);

    await page.getByRole("button", { name: /invite user/i }).click();
    await expect(page.getByRole("heading", { name: /^Invite user$/i })).toBeVisible();
    await expect(page.getByText(/mailpit/i)).toHaveCount(0);
    await page.getByRole("button", { name: /^Cancel$/ }).click();

    await page.goto("/admin/clients");
    await expect(page.getByRole("button", { name: /new client/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: "Clients", exact: true })).toBeVisible();
    await expect(page.locator("table")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Total clients").first()).toBeVisible();
  });
});
