import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

const publicRoutes = [
  "/",
  "/about-us",
  "/blog",
  "/careers",
  "/consultation",
  "/contact",
  "/lawyers",
  "/news",
  "/practice-areas",
  "/privacy-policy",
  "/resources",
  "/terms",
  "/sign-in",
  "/sign-in/admin",
  "/sign-in/staff",
  "/sign-in/client",
] as const;

const adminRoutes = [
  "/admin",
  "/admin/analytics",
  "/admin/appointments",
  "/admin/audit",
  "/admin/clients",
  "/admin/cms",
  "/admin/cms/about",
  "/admin/cms/blog",
  "/admin/cms/careers",
  "/admin/cms/governance",
  "/admin/cms/homepage",
  "/admin/cms/navigation",
  "/admin/cms/news",
  "/admin/cms/practice-areas",
  "/admin/cms/resources",
  "/admin/cms/team",
  "/admin/cms/testimonials",
  "/admin/conflict-checker",
  "/admin/crm",
  "/admin/document-generator",
  "/admin/hr",
  "/admin/profile",
  "/admin/settings",
  "/admin/templates",
  "/admin/users",
] as const;

const staffRoutes = [
  "/staff",
  "/staff/appointments",
  "/staff/cases",
  "/staff/clients",
  "/staff/content",
  "/staff/crm",
  "/staff/documents",
  "/staff/hearings",
  "/staff/hr",
  "/staff/messages",
  "/staff/profile",
  "/staff/research",
  "/staff/tasks",
  "/staff/team-chat",
] as const;

const clientRoutes = [
  "/client",
  "/client/booking",
  "/client/cases",
  "/client/checklist",
  "/client/documents",
  "/client/hearings",
  "/client/kyc",
  "/client/messages",
  "/client/notifications",
  "/client/profile",
  "/client/signatures",
] as const;

async function signIn(page: Page, email: string, portal: "/admin" | "/staff" | "/client") {
  await prepareE2eAuth(page, email);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${portal}(/|$)`), { timeout: 20_000 });
}

async function verifyRoutes(page: Page, routes: readonly string[]) {
  const serverErrors: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
  });

  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.ok(), `${route} should return 2xx`).toBeTruthy();
    await expect(page, `${route} should remain on its authorized route`).toHaveURL(
      new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[?#]|$)`),
    );
    await expect(page.locator("body")).not.toContainText(
      /Application error|Internal Server Error|This page could not be found/i,
    );
    await expect(page.locator('main [data-state="loading"]')).toHaveCount(0, {
      timeout: 20_000,
    });
  }

  expect(serverErrors).toEqual([]);
}

test.describe("Complete static route coverage", () => {
  test("all public and authentication routes render", async ({ page }) => {
    await verifyRoutes(page, publicRoutes);
  });

  test("all admin routes render for an administrator", async ({ page }) => {
    await signIn(page, E2E_USERS.admin.email, "/admin");
    await verifyRoutes(page, adminRoutes);
  });

  test("all staff routes render for a staff member", async ({ page }) => {
    await signIn(page, E2E_USERS.staff.email, "/staff");
    await verifyRoutes(page, staffRoutes);
  });

  test("all client routes render for a client", async ({ page }) => {
    await signIn(page, E2E_USERS.client.email, "/client");
    await verifyRoutes(page, clientRoutes);
  });
});

test.describe("Removed finance routes", () => {
  const removedRoutes = [
    "/admin/finance",
    "/admin/expenses",
    "/staff/time",
    "/client/billing",
    "/client/billing/return",
    "/api/v1/financial/invoices",
    "/api/v1/financial/time-entries",
    "/api/v1/financial/expenses",
    "/api/v1/financial/trust-transactions",
  ] as const;

  for (const route of removedRoutes) {
    test(`${route} returns genuine 404`, async ({ request }) => {
      const response = await request.get(route);
      expect(response.status()).toBe(404);
    });
  }

  test("retained portals and settings expose no removed finance controls", async ({ page }) => {
    await signIn(page, E2E_USERS.admin.email, "/admin");
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: /Integrations Hub/i }).click();
    await expect(page.locator("body")).toContainText("SMS providers");
    await expect(page.locator("body")).toContainText("Online meeting platforms");
    await expect(page.locator("body")).not.toContainText(
      /Payment gateways|Billing & financials|Finance|Expenses/i,
    );

    await signIn(page, E2E_USERS.staff.email, "/staff");
    await expect(page.locator("body")).not.toContainText(/Time & Billing|Log Time Entry/i);

    await signIn(page, E2E_USERS.client.email, "/client");
    await expect(page.locator("body")).not.toContainText(/Billing|View Invoices|Pay invoices/i);
  });
});
