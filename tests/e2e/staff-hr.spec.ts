import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

async function signIn(page: Page, email: string) {
  await prepareE2eAuth(page, email);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/staff(\/|$)/, { timeout: 20_000 });
}

test.describe("Staff HR self-service", () => {
  test("staff can open HR and submit a leave request", async ({ page }) => {
    await signIn(page, E2E_USERS.staff.email);

    await page.goto("/staff/hr");
    await expect(page.getByRole("heading", { name: "HR" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("tab", { name: /Attendance/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Leave/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Payslips/i })).toBeVisible();

    await page.getByRole("tab", { name: /Leave/i }).click();
    await expect(page.getByText("Request leave", { exact: true })).toBeVisible();

    const reason = `E2E leave ${Date.now()}`;
    await page.getByLabel("Type").selectOption("sick");
    await page.getByLabel("Reason (optional)").fill(reason);
    await page.getByRole("button", { name: "Submit request" }).click();

    await expect(page.getByText("Leave request submitted.", { exact: false })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("leave-request-row").filter({ hasText: reason })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByTestId("leave-request-row").filter({ hasText: reason }).getByText("pending"),
    ).toBeVisible();

    await page.getByRole("tab", { name: /Payslips/i }).click();
    await expect(page.getByText(/No finalized payslips|Gross|Finalized/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
