import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

function firmDateIso(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function signInAdmin(page: Page) {
  await prepareE2eAuth(page, E2E_USERS.admin.email);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E_USERS.admin.email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin(\/|$)/, { timeout: 20_000 });
}

test.describe("Admin appointments", () => {
  test("admin can open appointments, book a slot, and see the row", async ({ page }) => {
    await signInAdmin(page);

    await page.goto("/admin/appointments");
    await expect(page.getByRole("heading", { name: /Appointments & Calendar/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /Book Appointment/i }).first()).toBeVisible();
    await expect(page.getByPlaceholder(/Search client, phone, area/i)).toBeVisible();
    await expect(page.getByText(/Pending today/i).first()).toBeVisible();

    // Ownership freeze: CRM pipeline is not embedded here.
    await expect(page.getByRole("heading", { name: /Lead Pipeline/i })).toHaveCount(0);

    const stamp = Date.now();
    const clientName = `E2E Appt Client ${stamp}`;
    // Unique far date so prior E2E runs do not exhaust the slot catalog.
    const dateIso = firmDateIso(40 + (stamp % 20));

    await page
      .getByRole("button", { name: /Book Appointment/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /Book New Appointment/i })).toBeVisible();

    await dialog.getByPlaceholder("Full Name").fill(clientName);
    await dialog.getByPlaceholder("Phone number").fill(`+977-98${String(stamp).slice(-8)}`);
    await dialog.locator('input[type="date"]').fill(dateIso);

    const timeTrigger = dialog.locator('[role="combobox"]').first();
    await expect(timeTrigger).toBeEnabled({ timeout: 10_000 });
    await timeTrigger.click();
    const slotOption = page.getByRole("option").first();
    await expect(slotOption).toBeVisible({ timeout: 10_000 });
    const slotLabel = (await slotOption.textContent())?.trim() || "";
    await slotOption.click();

    await dialog.getByRole("button", { name: /^Book Appointment$/i }).click();
    await expect(page.getByText(/Appointment booked successfully/i)).toBeVisible({
      timeout: 15_000,
    });

    await page.getByPlaceholder(/Search client, phone, area/i).fill(clientName);
    await expect(page.getByRole("heading", { name: clientName })).toBeVisible({
      timeout: 15_000,
    });
    if (slotLabel) {
      await expect(page.getByText(slotLabel).first()).toBeVisible();
    }
  });
});
