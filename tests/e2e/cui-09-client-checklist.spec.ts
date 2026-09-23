import { expect, test, type Page } from "@playwright/test";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import {
  UI_PREVIEW_NOW,
  UI_PREVIEW_TASK_TITLES,
} from "../../scripts/e2e/client-ui-preview-contract";
import { prepareE2eAuth } from "./auth-helpers";

async function signInPreviewClient(page: Page) {
  await prepareE2eAuth(page, UI_PREVIEW_CLIENT.email);
  // Freeze to UI_PREVIEW_NOW so Due Soon / Overdue buckets match seeded relative dates.
  await page.clock.setFixedTime(new Date(UI_PREVIEW_NOW));
  const login = await page.request.post("/api/auth/sign-in/email", {
    data: {
      email: UI_PREVIEW_CLIENT.email,
      password: e2ePasswordFor(UI_PREVIEW_CLIENT.email),
    },
    timeout: 120_000,
  });
  expect(login.ok(), await login.text()).toBeTruthy();
}

async function openChecklist(page: Page) {
  await page.goto("/client/checklist", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Action Checklist" })).toBeVisible({
    timeout: 60_000,
  });

  const progress = page.getByLabel("Overall checklist progress");
  const missingProfile = page.getByText("No client profile linked");
  try {
    await Promise.race([
      progress.waitFor({ state: "visible", timeout: 45_000 }),
      missingProfile.waitFor({ state: "visible", timeout: 45_000 }),
    ]);
  } catch {
    /* fall through */
  }
  if (await missingProfile.isVisible().catch(() => false)) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Action Checklist" })).toBeVisible({
      timeout: 60_000,
    });
  }
  await expect(progress).toBeVisible({ timeout: 60_000 });
  await expect(
    page.locator(".client-checklist-row").filter({ hasText: UI_PREVIEW_TASK_TITLES.overdue }),
  ).toBeVisible({
    timeout: 60_000,
  });
}

test.describe("CUI-09 client checklist", () => {
  test.describe.configure({ timeout: 180_000 });

  test("renders Action Checklist with My Matters active and truthful progress", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 933 });
    await signInPreviewClient(page);
    await openChecklist(page);

    await expect(page.getByText("Srimar Law").first()).toBeVisible();
    const sidebar = page.getByRole("navigation", { name: "Client portal navigation" });
    await expect(sidebar.getByRole("link", { name: "My Matters" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(sidebar.getByRole("link", { name: "Appointments" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );

    await expect(page.getByRole("tab", { name: /^All/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Overdue/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Due Soon/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Upcoming/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Completed/i })).toBeVisible();
    await expect(page.getByLabel("Overall checklist progress")).toContainText(/of \d+ action/);
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);
  });

  test("filters, Matter search, and real routes work without mutation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInPreviewClient(page);
    await openChecklist(page);

    const row = (title: string) => page.locator(".client-checklist-row").filter({ hasText: title });

    await page.getByRole("tab", { name: /Overdue/i }).click();
    await expect(row(UI_PREVIEW_TASK_TITLES.overdue)).toBeVisible();
    await expect(row(UI_PREVIEW_TASK_TITLES.dueSoon)).toHaveCount(0);

    await page.getByRole("tab", { name: /Due Soon/i }).click();
    await expect(row(UI_PREVIEW_TASK_TITLES.dueSoon)).toBeVisible();

    await page.getByRole("tab", { name: /Upcoming/i }).click();
    await expect(row(UI_PREVIEW_TASK_TITLES.upcoming)).toBeVisible();

    await page.getByRole("tab", { name: /Completed/i }).click();
    await expect(row(UI_PREVIEW_TASK_TITLES.completed)).toBeVisible();

    await page.getByRole("tab", { name: /^All/i }).click();
    await page.getByLabel("Search checklist by title, description or Matter").fill("zzzz-no-match");
    await expect(page.getByText("No checklist items match your filters")).toBeVisible();
    await page.getByLabel("Search checklist by title, description or Matter").fill("");
    await expect(row(UI_PREVIEW_TASK_TITLES.overdue)).toBeVisible();

    const viewMatter = page.getByRole("link", { name: /View Matter/i }).first();
    await expect(viewMatter).toBeVisible();
    const href = await viewMatter.getAttribute("href");
    expect(href).toMatch(/^\/client\/cases\//);
    await page.goto(href!, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page).toHaveURL(/\/client\/cases\//);

    await page.goto("/client/checklist", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Action Checklist" })).toBeVisible({
      timeout: 60_000,
    });
    const message = page.getByRole("link", { name: /Message Legal Team|Message/i }).first();
    await expect(message).toBeVisible();
    const messageHref = await message.getAttribute("href");
    expect(messageHref).toMatch(/\/client\/messages/);
  });

  test("mobile layout remains usable and read-only", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInPreviewClient(page);
    await openChecklist(page);

    await expect(page.getByRole("heading", { level: 1, name: "Action Checklist" })).toBeVisible();
    await expect(
      page.locator(".client-checklist-row").filter({ hasText: UI_PREVIEW_TASK_TITLES.overdue }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /Overdue/i })).toBeVisible();
    const overflow = await page.evaluate(() => {
      const root = document.scrollingElement || document.documentElement;
      return root.scrollWidth > root.clientWidth + 1;
    });
    expect(overflow).toBeFalsy();
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);
  });
});
