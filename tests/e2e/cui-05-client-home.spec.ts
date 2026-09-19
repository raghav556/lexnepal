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
  await page.goto("/client");
  await expect(page).toHaveURL(
    (url) => {
      const path = new URL(url).pathname;
      return path === "/client" || path.startsWith("/client/");
    },
    { timeout: 30_000 },
  );
}

test.describe("CUI-05 client home", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("renders locked Home hierarchy from live preview data", async ({ page }) => {
    await signInPreviewClient(page);
    await page.goto("/client");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /Good (Morning|Afternoon|Evening), Ravi/,
    );
    await expect(page.getByText("Client Portal", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Active Matters", { exact: true })).toBeVisible();
    await expect(page.getByText("Upcoming Hearing", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Documents Pending", { exact: true })).toBeVisible();
    await expect(page.getByText("Actions Required", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your Matters" })).toBeVisible();
    await expect(page.getByText("Sharma vs. ABC Construction Pvt. Ltd.").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upcoming Hearing" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Updates" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your Documents" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quick Actions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "We're Here for You" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Upload a Document/ })).toHaveAttribute(
      "href",
      "/client/documents",
    );
    await expect(page.getByRole("link", { name: /Request an Appointment/ })).toHaveAttribute(
      "href",
      "/client/booking",
    );
    await expect(page.getByText("Featured Matter")).toHaveCount(0);
    await expect(page.getByText("Secure client access")).toHaveCount(0);
    await expect(page.getByText("Your legal portal")).toHaveCount(0);
    await expect(page.getByText("Justice with Integrity")).toHaveCount(0);

    const heroPhoto = page.locator(".client-home-hero-photo img");
    await expect(heroPhoto).toHaveAttribute("alt", "");
    const heroMedia = await heroPhoto.evaluate((node) => {
      const image = node as HTMLImageElement;
      return {
        src: image.currentSrc || image.src,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      };
    });
    expect(heroMedia.src).toMatch(/\/api\/v1\/public\/cms\/assets\//);
    expect(heroMedia.naturalWidth).toBeGreaterThan(1);
    expect(heroMedia.naturalHeight).toBeGreaterThan(1);

    const sidebar = page.getByRole("navigation", { name: "Client portal navigation" });
    await expect(sidebar.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("View Matter and Quick Actions use real routes", async ({ page }) => {
    await signInPreviewClient(page);
    await page.goto("/client");
    const viewMatter = page.getByRole("link", { name: /View Matter Details/i });
    await expect(viewMatter).toBeVisible({ timeout: 60_000 });
    await viewMatter.click();
    await expect(page).toHaveURL(
      new RegExp(`/client/cases/${PREVIEW_PRIMARY_CASE_ID}|/client/cases/`),
    );

    await page.goto("/client");
    await page.getByRole("link", { name: "Send a Message" }).first().click();
    await expect(page).toHaveURL(/\/client\/messages/);
  });
});
