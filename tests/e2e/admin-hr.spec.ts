import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";

async function signInAdmin(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E_USERS.admin.email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin(\/|$)/, { timeout: 20_000 });
}

test.describe("Admin HR console", () => {
  test("admin can open HR tabs and review leave", async ({ page }) => {
    await signInAdmin(page);

    await page.goto("/admin/hr");
    await expect(page.getByRole("heading", { name: "HR" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("tab", { name: /Attendance/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Leave/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Payroll/i })).toBeVisible();

    await page.getByRole("tab", { name: /Leave/i }).click();
    await expect(page.getByText("Leave balances", { exact: false })).toBeVisible({
      timeout: 15_000,
    });

    const pendingRow = page
      .getByTestId("admin-leave-row")
      .filter({ hasText: "pending" })
      .first();
    if (await pendingRow.count()) {
      await pendingRow.getByRole("button", { name: /Approve/i }).click();
      await expect(page.getByRole("heading", { name: /Approve leave/i })).toBeVisible({
        timeout: 10_000,
      });
      await page.getByRole("dialog").getByRole("button", { name: /^Approve$/ }).click();
      await expect(page.getByText("Leave approved.", { exact: false })).toBeVisible({
        timeout: 15_000,
      });
    }

    await page.getByRole("tab", { name: /Payroll/i }).click();
    await expect(
      page.getByText(/Generate draft run|Payroll runs|Live preview/i).first(),
    ).toBeVisible({
      timeout: 15_000,
    });
  });
});
