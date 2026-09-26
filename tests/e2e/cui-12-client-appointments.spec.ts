import { expect, test, type Page } from "@playwright/test";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

async function signInPreviewClient(page: Page) {
  await prepareE2eAuth(page, UI_PREVIEW_CLIENT.email);
  const login = await page.request.post("/api/auth/sign-in/email", {
    data: {
      email: UI_PREVIEW_CLIENT.email,
      password: e2ePasswordFor(UI_PREVIEW_CLIENT.email),
    },
    timeout: 120_000,
  });
  expect(login.ok(), await login.text()).toBeTruthy();
}

async function openAppointments(page: Page) {
  await page.goto("/client/booking", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Appointments" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("heading", { name: "Upcoming appointments" })).toBeVisible({
    timeout: 60_000,
  });
}

async function assertNoHorizontalOverflow(page: Page) {
  const measure = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(
    measure.scrollWidth,
    `scrollWidth ${measure.scrollWidth} > clientWidth ${measure.clientWidth}`,
  ).toBeLessThanOrEqual(measure.clientWidth);
}

test.describe("CUI-12 client appointments", () => {
  test.describe.configure({ timeout: 180_000 });

  test("renders the real appointment fixture and active desktop navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 876 });
    await signInPreviewClient(page);
    await openAppointments(page);

    const sidebar = page.getByRole("navigation", { name: "Client portal navigation" });
    await expect(sidebar.getByRole("link", { name: "Appointments", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByText("Virtual", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("In-Person", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Phone", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Completed", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /open meeting/i })).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: /reschedule|assign lawyer|complete|cancel/i }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/secure video|confidential consultation|Srimar Law Chambers/i),
    ).toHaveCount(0);
  });

  test("selects a mode and real slot, submits notes, and reports a pending request", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInPreviewClient(page);
    await openAppointments(page);

    const request = page.locator("#request-appointment");
    await request.getByRole("radio", { name: /phone/i }).click();
    await expect(request.getByRole("radio", { name: /phone/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const firstSlot = request.locator('button[aria-pressed="false"]').first();
    await expect(firstSlot).toBeVisible({ timeout: 60_000 });
    const slotLabel = await firstSlot.textContent();
    await firstSlot.click();
    await expect(request.getByRole("button", { name: String(slotLabel).trim() })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await request.getByLabel("Optional notes").fill("CUI-12 E2E booking test.");

    const bookingResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/appointments/book") &&
        response.request().method() === "POST",
    );
    await request.getByRole("button", { name: "Submit request" }).click();
    expect((await bookingResponse).ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Request submitted" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Awaiting confirmation from the legal team.")).toBeVisible();
    await expect(page.getByText("pending", { exact: true })).toBeVisible();
    await expect(page.getByText("CUI-12 E2E booking test.")).toBeVisible();
  });

  test("keeps the locked mobile navigation and has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInPreviewClient(page);
    await openAppointments(page);
    const mobileNav = page.getByRole("navigation", { name: "Client primary navigation" });
    await expect(mobileNav.getByRole("link", { name: "Appointments", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Request appointment" })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/client/booking", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Appointments" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("heading", { name: "Request appointment" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("captures owner visual evidence from the deterministic Client fixture", async ({ page }) => {
    test.skip(!process.env.CUI12_CAPTURE, "CUI-12 owner evidence is captured only on demand");
    const qaRoot = path.resolve("..", "..", "qa", "cui-12");
    const screenshotPath = (...segments: string[]) => path.join(qaRoot, ...segments);
    await Promise.all(
      ["reference", "after", "responsive", "states", "compare"].map((directory) =>
        mkdir(screenshotPath(directory), { recursive: true }),
      ),
    );
    await copyFile(
      "doc/ui-reference/client/references/08-appointments.jpg",
      screenshotPath("reference", "08-appointments.jpg"),
    );

    await signInPreviewClient(page);
    for (const [width, height, output] of [
      [1400, 876, screenshotPath("after", "appointments-1400x876.png")],
      [1280, 800, screenshotPath("after", "appointments-1280x800.png")],
      [1024, 768, screenshotPath("after", "appointments-1024x768.png")],
      [768, 900, screenshotPath("responsive", "appointments-768.png")],
      [390, 844, screenshotPath("responsive", "appointments-390x844.png")],
      [360, 800, screenshotPath("responsive", "appointments-360x800.png")],
    ] as const) {
      await page.setViewportSize({ width, height });
      await openAppointments(page);
      await expect(page.getByRole("heading", { name: "Request appointment" })).toBeVisible();
      await page.screenshot({ path: output, fullPage: width <= 768 });
      if (width <= 390) await assertNoHorizontalOverflow(page);
    }

    await page.setViewportSize({ width: 1400, height: 876 });
    await openAppointments(page);
    await page.screenshot({ path: screenshotPath("states", "appointments-upcoming.png") });

    await page.getByRole("heading", { name: "Request appointment" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: screenshotPath("states", "appointments-booking.png") });

    await page.getByRole("heading", { name: "Appointment history" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: screenshotPath("states", "appointments-history.png") });

    await page.route("**/api/v1/appointments/slots?*", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await openAppointments(page);
    await expect(page.getByText("No available times on this date.")).toBeVisible();
    await page.getByRole("heading", { name: "Request appointment" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: screenshotPath("states", "appointments-no-slots.png") });
    await page.unroute("**/api/v1/appointments/slots?*");

    await openAppointments(page);
    const request = page.locator("#request-appointment");
    const availableSlot = request.locator('button[aria-pressed="false"]').first();
    await expect(availableSlot).toBeVisible({ timeout: 60_000 });
    await availableSlot.click();
    await request.getByLabel("Optional notes").fill("CUI-12 visual evidence request.");
    await request.getByRole("button", { name: "Submit request" }).click();
    await expect(page.getByRole("heading", { name: "Request submitted" })).toBeVisible({
      timeout: 30_000,
    });
    await page.screenshot({ path: screenshotPath("states", "appointments-success-pending.png") });

    const after = screenshotPath("after", "appointments-1400x876.png");
    const reference = screenshotPath("reference", "08-appointments.jpg");
    const referenceSized = await sharp(reference).resize(1400, 876).png().toBuffer();
    const referenceOverlay = await sharp(reference)
      .resize(1400, 876)
      .ensureAlpha(0.45)
      .png()
      .toBuffer();
    await sharp(after)
      .composite([{ input: referenceOverlay, blend: "over" }])
      .png()
      .toFile(screenshotPath("compare", "appointments-overlay.png"));
    await sharp(after)
      .composite([{ input: referenceSized, blend: "difference" }])
      .png()
      .toFile(screenshotPath("compare", "appointments-diff.png"));
  });
});
