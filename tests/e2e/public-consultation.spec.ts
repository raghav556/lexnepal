import { expect, test, type Locator, type Page } from "@playwright/test";

function firmDateIso(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function chooseFirstOption(page: Page, trigger: Locator): Promise<void> {
  // CMS-backed options can replace the Radix content once while the public query settles.
  // Re-open the control instead of waiting forever on an option from the discarded portal.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await trigger.click();
    const option = page.getByRole("option").first();
    try {
      await expect(option).toBeVisible({ timeout: 2_500 });
      await option.click();
      return;
    } catch {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
    }
  }
  throw new Error("The consultation select did not expose an option after three attempts");
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
    const baseDaysAhead = 60 + (Math.floor(stamp / 1_000) % 300);
    const formCard = page.locator("form").filter({ hasText: /Request Consultation/i });
    await formCard.scrollIntoViewIfNeeded();

    const practiceAreaTrigger = formCard
      .getByRole("combobox")
      .filter({ hasText: /Select the area of law|practice/i });
    await chooseFirstOption(page, practiceAreaTrigger);

    const timeTrigger = formCard.getByRole("combobox").nth(1);
    const dateInput = formCard.locator('input[type="date"]');
    for (let offset = 0; offset < 7; offset += 1) {
      await dateInput.fill(firmDateIso(baseDaysAhead + offset));
      try {
        await expect(timeTrigger).toBeEnabled({ timeout: 3_000 });
        break;
      } catch {
        // A previous repeat may have filled a date; the next date must still remain bookable.
      }
    }
    await expect(timeTrigger).toBeEnabled({ timeout: 10_000 });
    await chooseFirstOption(page, timeTrigger);

    // Fill plain inputs after async slot data has settled so hydration cannot replace typed values.
    await formCard.getByPlaceholder("Ramesh Shrestha").fill(`E2E Public ${stamp}`);
    await formCard.getByPlaceholder("+977 98XXXXXXXX").fill(`+977-98${String(stamp).slice(-8)}`);

    await formCard.getByRole("button", { name: /Request Consultation/i }).click();
    await expect(page.getByRole("heading", { name: /Request Received/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/pending/i).first()).toBeVisible();
  });
});
