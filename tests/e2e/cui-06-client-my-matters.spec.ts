import { expect, test, type Page } from "@playwright/test";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

const PREVIEW_PRIMARY_CASE_ID = "986d63db-7381-44f9-a4f7-2e6bd68e7f44";
const QA_CLOCK = "2026-09-18T05:30:00.000Z";

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

test.describe("CUI-06 client my matters", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("renders My Matters from live preview data", async ({ page }) => {
    await signInPreviewClient(page);
    await expect(page.getByRole("heading", { level: 1, name: "My Matters" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("My Cases")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /All Matters/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /In Progress/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /On hold/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Completed/ })).toBeVisible();
    await expect(page.getByLabel("Search matters")).toBeVisible();
    await expect(page.getByLabel("Matter Type")).toBeVisible();
    await expect(page.getByLabel("Status")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Cards" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "Table" })).toBeVisible();
    await expect(page.getByText("Sharma vs. ABC Construction Pvt. Ltd.").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Next Important Date" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Matter Activity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Need help with a matter?" })).toBeVisible();
    await expect(page.getByText("Under Review")).toHaveCount(0);
    await expect(page.getByText("Sort by Latest Update")).toHaveCount(0);
    await expect(page.getByText("Case filed")).toHaveCount(0);
    await expect(page.getByText("Written statement submitted")).toHaveCount(0);

    const sidebar = page.getByRole("navigation", { name: "Client portal navigation" });
    await expect(sidebar.getByRole("link", { name: "My Matters" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("filters, table mode, and real routes work", async ({ page }) => {
    await signInPreviewClient(page);
    await expect(page.getByRole("heading", { level: 1, name: "My Matters" })).toBeVisible({
      timeout: 60_000,
    });

    await page.getByLabel("Search matters").fill("Property Dispute");
    await expect(page.getByText("Property Dispute - Kathmandu").first()).toBeVisible();
    await expect(page.getByText("Family Settlement Matter")).toHaveCount(0);
    await page.getByLabel("Search matters").fill("");

    await page.getByLabel("Matter Type").selectOption("Family Law");
    await expect(page.getByText("Family Settlement Matter").first()).toBeVisible();
    await expect(page.getByText("Business Agreement Review")).toHaveCount(0);
    await page.getByLabel("Matter Type").selectOption("");

    await page.getByRole("button", { name: /Completed,/ }).click();
    await expect(
      page.locator(".client-matters-card").filter({ hasText: "Family Settlement Matter" }),
    ).toHaveCount(1);
    await expect(
      page
        .locator(".client-matters-card")
        .filter({ hasText: "Sharma vs. ABC Construction Pvt. Ltd." }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: /All Matters,/ }).click();

    await page.getByRole("tab", { name: "Table" }).click();
    await expect(page.getByRole("columnheader", { name: "Matter Number" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Table" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Cards" }).click();

    const viewMatter = page.getByRole("link", { name: /View Matter Details/i }).first();
    await expect(viewMatter).toHaveAttribute("href", /\/client\/cases\//);
    await viewMatter.click();
    await expect(page).toHaveURL(
      new RegExp(`/client/cases/${PREVIEW_PRIMARY_CASE_ID}|/client/cases/`),
    );

    await page.goto("/client/cases");
    await expect(page.getByRole("heading", { level: 1, name: "My Matters" })).toBeVisible({
      timeout: 60_000,
    });
    const message = page.getByRole("link", { name: /Message Legal Team/i }).first();
    await expect(message).toHaveAttribute("href", /\/client\/messages/);
    await message.click();
    await expect(page).toHaveURL(/\/client\/messages/);
  });
});
