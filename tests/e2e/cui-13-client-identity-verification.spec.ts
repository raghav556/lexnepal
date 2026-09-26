import { expect, test, type Page } from "@playwright/test";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

async function signInPreviewClient(page: Page) {
  await prepareE2eAuth(page, UI_PREVIEW_CLIENT.email);
  const response = await page.request.post("/api/auth/sign-in/email", {
    data: { email: UI_PREVIEW_CLIENT.email, password: e2ePasswordFor(UI_PREVIEW_CLIENT.email) },
    timeout: 120_000,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function openIdentity(page: Page) {
  await page.goto("/client/kyc", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Identity Verification" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("Citizenship-Copy.pdf", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
}

async function expectNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

test.describe("CUI-13 Client Identity Verification", () => {
  test.describe.configure({ timeout: 180_000 });

  test("renders submitted fixture documents and the active Identity Verification navigation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 876 });
    await signInPreviewClient(page);
    await openIdentity(page);
    const sidebar = page.getByRole("navigation", { name: "Client portal navigation" });
    await expect(
      sidebar.getByRole("link", { name: "Identity Verification", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Utility-Bill.pdf", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Verification status: Under review")).toBeVisible();
    const stages = page.locator('ol[aria-label="Verification progress"] li');
    await expect(stages.nth(2)).not.toHaveAttribute("aria-current", "step");
    await expect(stages.nth(3)).toHaveAttribute("aria-current", "step");
    await expect(
      page.getByRole("button", { name: /start verification|update and resubmit/i }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/Bar Council|Encrypted vault|restricted to compliance staff|last 3 months/i),
    ).toHaveCount(0);
  });

  test("keeps Identity Verification in More and has no small-mobile overflow", async ({ page }) => {
    await signInPreviewClient(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openIdentity(page);
    const mobileNav = page.getByRole("navigation", { name: "Client primary navigation" });
    await expect(
      mobileNav.getByRole("link", { name: "Identity Verification", exact: true }),
    ).toHaveCount(0);
    await expectNoOverflow(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await openIdentity(page);
    await expectNoOverflow(page);
  });
});
