import { expect, test } from "@playwright/test";

function firmDateIso(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test.describe("Public consultation booking", () => {
  test("consultation page loads slots and accepts a pending request", async ({ page }) => {
    const response = await page.goto("/consultation", { waitUntil: "domcontentloaded" });
    expect(response?.ok(), "/consultation should return 2xx").toBeTruthy();

    await expect(page.getByRole("heading", { name: /Secure Your Appointment/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/pending until our team confirms|Request a slot/i).first(),
    ).toBeVisible();

    const stamp = Date.now();
    const dateIso = firmDateIso(35);
    const formCard = page.locator("form").filter({ hasText: /Request Consultation/i });
    await formCard.scrollIntoViewIfNeeded();

    await formCard.getByPlaceholder("Ramesh Shrestha").fill(`E2E Public ${stamp}`);
    await formCard.getByPlaceholder("+977 98XXXXXXXX").fill(`+977-98${String(stamp).slice(-8)}`);

    await formCard.getByRole("combobox").filter({ hasText: /Select the area of law|practice/i }).click();
    await page.getByRole("option").first().click();

    await formCard.locator('input[type="date"]').fill(dateIso);

    const timeTrigger = formCard.getByRole("combobox").nth(1);
    await expect(timeTrigger).toBeEnabled({ timeout: 10_000 });
    await timeTrigger.click();
    const slot = page.getByRole("option").first();
    await expect(slot).toBeVisible({ timeout: 10_000 });
    await slot.click();

    await formCard.getByRole("button", { name: /Request Consultation/i }).click();
    await expect(page.getByRole("heading", { name: /Request Received/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/pending/i).first()).toBeVisible();
  });
});
