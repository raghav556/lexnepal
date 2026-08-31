import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

async function signInAdmin(page: Page) {
  await prepareE2eAuth(page, E2E_USERS.admin.email);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E_USERS.admin.email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin(\/|$)/, { timeout: 20_000 });
}

test.describe("Admin CRM pipeline", () => {
  test("admin can open CRM, add a lead, and filter", async ({ page }) => {
    await signInAdmin(page);

    await page.goto("/admin/crm");
    await expect(page.getByRole("heading", { name: /CRM (?:&|—) Lead Pipeline/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /Add lead/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Search name, email, phone/i)).toBeVisible();

    const stamp = Date.now();
    const leadName = `E2E CRM Lead ${stamp}`;

    await page.getByRole("button", { name: /Add lead/i }).click();
    await expect(page.getByRole("heading", { name: /^Add lead$/i })).toBeVisible();
    await page.getByLabel("Full name").fill(leadName);
    await page.getByLabel("Phone").fill(`+977-98${String(stamp).slice(-8)}`);
    await page.getByRole("button", { name: /^Create lead$/i }).click();

    await expect(page.getByText("Lead created.", { exact: false })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByPlaceholder(/Search name, email, phone/i).fill(leadName);
    await expect(page.getByText(leadName, { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Ownership freeze: appointments calendar is not embedded in CRM.
    await expect(page.getByRole("heading", { name: /Appointments/i })).toHaveCount(0);
  });
});
