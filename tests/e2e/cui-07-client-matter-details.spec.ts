import { expect, test, type Page } from "@playwright/test";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

const QA_CLOCK = "2026-09-18T05:30:00.000Z";
const PRIMARY_TITLE = "Sharma vs. ABC Construction Pvt. Ltd.";

async function signInPreviewClient(page: Page) {
  await prepareE2eAuth(page, UI_PREVIEW_CLIENT.email);
  await page.clock.setFixedTime(new Date(QA_CLOCK));
  const login = await page.request.post("/api/auth/sign-in/email", {
    data: { email: UI_PREVIEW_CLIENT.email, password: e2ePasswordFor(UI_PREVIEW_CLIENT.email) },
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  await page.goto("/client/cases");
  await expect(page).toHaveURL(/\/client\/cases/, { timeout: 30_000 });
}

async function openPrimaryMatter(page: Page) {
  await expect(page.getByText(PRIMARY_TITLE).first()).toBeVisible({ timeout: 60_000 });
  await page
    .locator(".client-matters-card")
    .filter({ hasText: PRIMARY_TITLE })
    .getByRole("link", { name: /View Matter Details/i })
    .click();
  await expect(page).toHaveURL(/\/client\/cases\/[^/]+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: PRIMARY_TITLE })).toBeVisible({
    timeout: 60_000,
  });
}

test.describe("CUI-07 client matter details", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("renders Matter Details workspace from live preview data", async ({ page }) => {
    await signInPreviewClient(page);
    await openPrimaryMatter(page);

    const crumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumb.getByRole("link", { name: "My Matters" })).toBeVisible();
    await expect(crumb.getByText(PRIMARY_TITLE)).toBeVisible();

    await expect(page.getByText("CUI1-MATTER-001").first()).toBeVisible();
    await expect(page.getByText("Civil Dispute").first()).toBeVisible();
    await expect(page.getByText(/High Court, Kathmandu/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Message Legal Team/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to My Matters/i })).toBeVisible();

    await expect(page.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("heading", { name: "About This Matter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upcoming Hearing" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your Legal Team" }).first()).toBeVisible();
    await expect(page.getByText("Court Timeline")).toHaveCount(0);
    await expect(page.getByText("Procedural Timeline")).toHaveCount(0);
    await expect(page.getByText("Edit Matter")).toHaveCount(0);

    const sidebar = page.getByRole("navigation", { name: "Client portal navigation" });
    await expect(sidebar.getByRole("link", { name: "My Matters" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(sidebar.getByRole("link", { name: "Appointments" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("tabs, checklist filter, documents, and message route work", async ({ page }) => {
    await signInPreviewClient(page);
    await openPrimaryMatter(page);

    await page.getByRole("tab", { name: "Hearings" }).click();
    await expect(page.getByRole("heading", { name: "Court Hearings" })).toBeVisible();

    await page.getByRole("tab", { name: "Team" }).click();
    await expect(page.getByRole("heading", { name: "Your Legal Team" })).toBeVisible();

    await page.getByRole("tab", { name: "Actions" }).click();
    await expect(page.getByRole("heading", { name: "Client Action Checklist" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Checklist" })).toBeVisible();

    await page.getByRole("tab", { name: "Documents" }).click();
    await expect(page.getByRole("heading", { name: "Case Documents" })).toBeVisible();
    await expect(page.getByRole("link", { name: /View All Documents/i })).toBeVisible();

    await page.getByRole("tab", { name: "Updates" }).click();
    await expect(page.getByRole("heading", { name: "Recent Matter Activity" })).toBeVisible();

    await page.getByRole("tab", { name: "Overview" }).click();
    await page
      .locator(".client-matter-detail-hero-actions")
      .getByRole("link", { name: /Message Legal Team/i })
      .click();
    await expect(page).toHaveURL(/\/client\/messages\?caseId=/, { timeout: 30_000 });
  });

  test("breadcrumb returns to My Matters and mobile remains usable", async ({ page }) => {
    await signInPreviewClient(page);
    await openPrimaryMatter(page);

    await page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: "My Matters" })
      .click();
    await expect(page).toHaveURL(/\/client\/cases$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1, name: "My Matters" })).toBeVisible({
      timeout: 60_000,
    });

    await openPrimaryMatter(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("heading", { level: 1, name: PRIMARY_TITLE })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
    const primary = page.getByRole("navigation", { name: "Client primary navigation" });
    await expect(primary.getByText("Matters", { exact: true })).toBeVisible();
  });
});
