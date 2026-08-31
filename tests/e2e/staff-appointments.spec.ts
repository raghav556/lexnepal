import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

async function signInStaff(page: Page) {
  await prepareE2eAuth(page, E2E_USERS.staff.email);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E_USERS.staff.email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff(\/|$)/, { timeout: 20_000 });
}

test.describe("Staff appointments", () => {
  test("staff can open assignee appointments surface", async ({ page }) => {
    await signInStaff(page);

    await page.goto("/staff/appointments");
    await expect(page.getByRole("heading", { name: /My Appointments/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Asia\/Kathmandu|assigned to you/i).first()).toBeVisible();

    // Status filter is a Select — open and confirm completed option exists (APT-3).
    await page.locator('[role="combobox"]').first().click();
    await expect(page.getByRole("option", { name: /Pending/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Completed/i })).toBeVisible();
    await page.keyboard.press("Escape");

    // CRM stays separate — calendar is not absorbed into staff CRM.
    await page.goto("/staff/crm");
    await expect(
      page.getByRole("heading", { name: /CRM (?:&|—) Lead Pipeline|My leads/i }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { name: /My Appointments/i })).toHaveCount(0);
  });
});
