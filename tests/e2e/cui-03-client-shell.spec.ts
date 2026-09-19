import { expect, test, type Page } from "@playwright/test";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

const PREVIEW_PRIMARY_CASE_ID = "986d63db-7381-44f9-a4f7-2e6bd68e7f44";

async function signInPreviewClient(page: Page) {
  await prepareE2eAuth(page, UI_PREVIEW_CLIENT.email);
  await page.goto("/sign-in/client");
  await page.locator("#email").fill(UI_PREVIEW_CLIENT.email);
  await page.locator("#password").fill(e2ePasswordFor(UI_PREVIEW_CLIENT.email));
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(
    (url) => {
      const path = new URL(url).pathname;
      return path === "/client" || path.startsWith("/client/");
    },
    { timeout: 30_000 },
  );
}

async function expectDesktopSidebar(page: Page) {
  const sidebar = page.getByRole("navigation", { name: "Client portal navigation" });
  await expect(sidebar.getByRole("link", { name: "Home" })).toBeVisible({ timeout: 60_000 });
  return sidebar;
}

test.describe("CUI-03 client master shell", () => {
  test("desktop hearings activate My Matters, not Appointments", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInPreviewClient(page);
    await page.goto("/client/hearings");
    const sidebar = await expectDesktopSidebar(page);
    await expect(sidebar.getByRole("link", { name: "My Matters" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(sidebar.getByRole("link", { name: "Appointments" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(sidebar.getByRole("link", { name: "Hearings" })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: "Checklist" })).toHaveCount(0);
  });

  test("mobile primary labels are visible and More opens the drawer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInPreviewClient(page);
    const primary = page.getByRole("navigation", { name: "Client primary navigation" });
    await expect(primary.getByText("Home", { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(primary.getByText("Matters", { exact: true })).toBeVisible();
    await expect(primary.getByText("Documents", { exact: true })).toBeVisible();
    await expect(primary.getByText("Messages", { exact: true })).toBeVisible();
    await expect(primary.getByRole("button", { name: "More" })).toBeVisible();
    await primary.getByRole("button", { name: "More" }).click();
    await expect(primary.getByRole("button", { name: "More" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    const drawer = page.getByRole("navigation", { name: "Client mobile navigation" });
    await expect(drawer.getByRole("link", { name: "Appointments" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Identity Verification" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Sign Documents" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Notifications" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Profile" })).toBeVisible();
    await page.goto("/client/booking");
    await expect(drawer).toHaveCount(0);
    await expect(primary.getByRole("button", { name: "More" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("matter detail remains inside the dark Client shell", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInPreviewClient(page);
    await page.goto(`/client/cases/${PREVIEW_PRIMARY_CASE_ID}`);
    const sidebar = await expectDesktopSidebar(page);
    await expect(sidebar.getByRole("link", { name: "My Matters" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("button", { name: /search your matters/i })).toBeVisible();
  });
});
