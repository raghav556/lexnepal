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

test.describe("Staff CRM assignee surface", () => {
  test("staff can open CRM from workspace nav", async ({ page }) => {
    await signInStaff(page);

    await page.goto("/staff/crm");
    await expect(
      page.getByRole("heading", { name: /CRM (?:&|—) Lead Pipeline|My leads/i }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /Add lead/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Search name, email, phone/i)).toBeVisible();

    // Appointments stay on a separate staff route — CRM bridges, does not absorb calendar.
    await page.goto("/staff/appointments");
    await expect(page.getByRole("heading", { name: /My Appointments/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
