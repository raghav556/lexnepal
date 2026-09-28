import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { UI_PREVIEW_NOW } from "../../scripts/e2e/client-ui-preview-contract";
import { prepareE2eAuth } from "./auth-helpers";

const qaDir = path.resolve(process.cwd(), "..", "..", "qa", "cui-15");

async function signIn(page: Page) {
  await page.clock.setFixedTime(new Date(UI_PREVIEW_NOW));
  await prepareE2eAuth(page, UI_PREVIEW_CLIENT.email);
  const response = await page.request.post("/api/auth/sign-in/email", {
    data: { email: UI_PREVIEW_CLIENT.email, password: e2ePasswordFor(UI_PREVIEW_CLIENT.email) },
    timeout: 120_000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function openNotifications(page: Page) {
  await page.goto("/client/notifications", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Notifications" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Recent notifications" })).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Recent notifications" })
      .getByRole("button", { name: /Next hearing scheduled/ }),
  ).toBeVisible();
}

async function noOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
    dimensions.clientWidth,
  );
}

test.describe("CUI-15 Client Notifications", () => {
  test.describe.configure({ timeout: 180_000 });

  test("shows real feed, filters, Kathmandu groups, Important Dates, accessibility and responsive evidence", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await openNotifications(page);
    const feed = page.getByRole("region", { name: "Recent notifications" });
    await expect(feed.locator("li")).toHaveCount(6);
    await expect(feed.getByRole("heading", { name: "Today" })).toBeVisible();
    await expect(feed.getByRole("heading", { name: "This Week" })).toBeVisible();
    await expect(feed.getByRole("heading", { name: "Earlier" })).toBeVisible();
    await expect(page.getByText("3 unread in your recent notifications")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Important Dates" })).toBeVisible();
    await expect(page.getByText("Next hearing", { exact: true })).toBeVisible();
    await expect(page.getByText("Next confirmed appointment", { exact: true })).toBeVisible();
    await expect(page.getByText("High Court, Kathmandu")).toBeVisible();
    await expect(page.getByText("Virtual Consultation")).toBeVisible();
    await expect(page.getByRole("switch")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Signatures", exact: true })).toHaveCount(0);
    await expect(
      page.getByText(/Notification Preferences|Email Notifications|SMS Notifications/),
    ).toHaveCount(0);

    await mkdir(qaDir, { recursive: true });
    await page.screenshot({ path: path.join(qaDir, "01-desktop-all.png"), fullPage: true });
    await page.getByRole("button", { name: "Unread", exact: true }).click();
    await expect(feed.locator("li")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Unread", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.waitForTimeout(250); // Let the filter's color transition settle for visual evidence.
    await page.screenshot({ path: path.join(qaDir, "02-desktop-unread.png"), fullPage: true });
    await page.getByRole("button", { name: "Documents", exact: true }).click();
    await expect(feed.locator("li")).toHaveCount(2);
    await expect(feed.getByText("Signature requested")).toBeVisible();
    await expect(page.getByRole("button", { name: "Documents", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(qaDir, "03-desktop-category.png"), fullPage: true });
    await page.getByRole("button", { name: "Messages", exact: true }).click();
    await expect(feed.locator("li")).toHaveCount(1);
    await page.getByRole("button", { name: "Hearings", exact: true }).click();
    await expect(feed.locator("li")).toHaveCount(1);
    await page.getByRole("button", { name: "All", exact: true }).click();
    await page
      .getByRole("heading", { name: "Important Dates" })
      .locator("..")
      .screenshot({
        path: path.join(qaDir, "04-desktop-important-dates.png"),
      });

    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      ),
    ).toEqual([]);
    for (const width of [1440, 1280, 1024, 768, 390, 360]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
      await noOverflow(page);
      if (width === 390) {
        await page.screenshot({ path: path.join(qaDir, "05-mobile-all.png"), fullPage: true });
        await page.getByRole("button", { name: "Documents", exact: true }).click();
        await expect(page.getByRole("button", { name: "Documents", exact: true })).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(qaDir, "06-mobile-filtered.png"), fullPage: true });
        await page.getByRole("button", { name: "All", exact: true }).click();
      }
    }
  });

  test("keeps an unread notification and its destination unchanged when mark-read fails", async ({
    page,
  }) => {
    await signIn(page);
    await page.route("**/api/v1/notifications/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: '{"error":"test failure"}',
        });
      } else {
        await route.continue();
      }
    });
    await openNotifications(page);
    const notificationButton = page
      .getByRole("region", { name: "Recent notifications" })
      .getByRole("button", { name: /Next hearing scheduled/ });
    await notificationButton.focus();
    await page.keyboard.press("Space");
    await expect(page).toHaveURL(/\/client\/notifications$/);
    await expect(page.getByText("3 unread in your recent notifications")).toBeVisible();
    await expect(
      page.getByText("Could not mark this notification as read. Please try again."),
    ).toBeVisible();
  });

  test("shows a retryable error rather than an empty feed when notification loading fails", async ({
    page,
  }) => {
    await signIn(page);
    await page.route("**/api/v1/notifications", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: '{"error":"test failure"}',
      });
    });
    await page.goto("/client/notifications", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Loading recent notifications…")).toBeVisible();
    await expect(
      page.getByRole("alert").getByText("Notifications could not be loaded"),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByText("No notifications yet")).toHaveCount(0);
  });

  test("does not show read success when mark-all fails", async ({ page }) => {
    await signIn(page);
    await page.route("**/api/v1/notifications", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: '{"error":"test failure"}',
        });
      } else {
        await route.continue();
      }
    });
    await openNotifications(page);
    await page.getByRole("button", { name: "Mark all read" }).click();
    await expect(page.getByText("3 unread in your recent notifications")).toBeVisible();
    await expect(
      page.getByText("Could not mark notifications as read. Please try again."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Open notifications \(3 unread\)/ }),
    ).toBeVisible();
  });

  test("persists individual and all-read actions and reconciles the shared bell", async ({
    page,
  }) => {
    await signIn(page);
    await openNotifications(page);
    await expect(
      page.getByRole("button", { name: /Open notifications \(3 unread\)/ }),
    ).toBeVisible();
    const feed = page.getByRole("region", { name: "Recent notifications" });
    await feed.getByRole("button", { name: /Next hearing scheduled/ }).click();
    await expect(page).toHaveURL(/\/client\/hearings/);
    await openNotifications(page);
    await expect(page.getByText("2 unread in your recent notifications")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Open notifications \(2 unread\)/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mark all read" }).click();
    await expect(page.getByText("0 unread in your recent notifications")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open notifications", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark all read" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("0 unread in your recent notifications")).toBeVisible();
  });

  test("handles a no-destination notification and a long 50-row recent feed without overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    let firstRead = false;
    const items = Array.from({ length: 50 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      title:
        index === 0
          ? `Long notification without link ${"details ".repeat(12)}`
          : `Recent item ${index + 1}`,
      body:
        index === 0
          ? "This long body explains a matter update without inventing a navigation destination. ".repeat(
              4,
            )
          : "Recent activity",
      type: "system",
      isRead: index === 0 ? firstRead : true,
      link: null,
      createdAt: new Date(UI_PREVIEW_NOW).toISOString(),
    }));
    await page.route("**/api/v1/notifications", async (route) => {
      items[0]!.isRead = firstRead;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: items }),
      });
    });
    await page.route("**/api/v1/notifications/*", async (route) => {
      if (route.request().method() === "PATCH") firstRead = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: '{"data":{"success":true}}',
      });
    });
    await page.goto("/client/notifications", { waitUntil: "domcontentloaded" });
    const feed = page.getByRole("region", { name: "Recent notifications" });
    await expect(feed.locator("li")).toHaveCount(50);
    await noOverflow(page);
    await feed.getByRole("button", { name: /Long notification without link/ }).click();
    await expect(page).toHaveURL(/\/client\/notifications$/);
    await expect(page.getByText("0 unread in your recent notifications")).toBeVisible();
    await page.setViewportSize({ width: 360, height: 800 });
    await noOverflow(page);
  });

  test("distinguishes an empty feed from a filtered-empty category", async ({ page }) => {
    await signIn(page);
    let rows: unknown[] = [];
    await page.route("**/api/v1/notifications", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: rows }),
      });
    });
    await page.goto("/client/notifications", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "No notifications yet" })).toBeVisible();
    rows = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        title: "Message update",
        body: "A real category in a controlled empty-state test",
        type: "message",
        isRead: true,
        link: null,
        createdAt: new Date(UI_PREVIEW_NOW).toISOString(),
      },
    ];
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Recent notifications" }).locator("li"),
    ).toHaveCount(1);
    await page.getByRole("button", { name: "Documents", exact: true }).click();
    await expect(page.getByRole("heading", { name: "No document notifications" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today" })).toHaveCount(0);
  });
});
