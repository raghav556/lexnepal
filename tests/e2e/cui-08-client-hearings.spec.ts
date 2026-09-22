import { expect, test, type Page } from "@playwright/test";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

const PRIMARY_TITLE = "Sharma vs. ABC Construction Pvt. Ltd.";

async function signInPreviewClient(page: Page) {
  await prepareE2eAuth(page, UI_PREVIEW_CLIENT.email);
  // API sign-in (same as CUI-07). Do not install Playwright's fake clock before
  // navigation — useHearings/useTasks start disabled until useMyClient resolves,
  // and a frozen clock prevents those follow-up React Query fetches.
  const login = await page.request.post("/api/auth/sign-in/email", {
    data: {
      email: UI_PREVIEW_CLIENT.email,
      password: e2ePasswordFor(UI_PREVIEW_CLIENT.email),
    },
    timeout: 120_000,
  });
  expect(login.ok(), await login.text()).toBeTruthy();
}

async function openHearingsSchedule(page: Page) {
  await page.goto("/client/hearings", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Hearing Schedule" })).toBeVisible({
    timeout: 60_000,
  });

  // Cold compiles can briefly error /api/v1/clients/me; one reload recovers.
  const linked = page.getByRole("heading", { name: "Next Hearing" });
  const missingProfile = page.getByText("No client profile linked");
  try {
    await Promise.race([
      linked.waitFor({ state: "visible", timeout: 45_000 }),
      missingProfile.waitFor({ state: "visible", timeout: 45_000 }),
    ]);
  } catch {
    /* fall through to final assertion */
  }
  if (await missingProfile.isVisible().catch(() => false)) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Hearing Schedule" })).toBeVisible({
      timeout: 60_000,
    });
  }
  await expect(linked).toBeVisible({ timeout: 60_000 });
}

test.describe("CUI-08 client hearings", () => {
  test.describe.configure({ timeout: 180_000 });

  test("renders Hearing Schedule with My Matters active", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 933 });
    await signInPreviewClient(page);
    await openHearingsSchedule(page);

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
    await expect(page.getByRole("tab", { name: /Upcoming/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Past/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^All/i })).toBeVisible();
    await expect(page.locator(".client-hearings-next")).toContainText(PRIMARY_TITLE);
  });

  test("filters, Matter search, and real routes work", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInPreviewClient(page);
    await openHearingsSchedule(page);

    await page.getByRole("tab", { name: /Past/i }).click();
    await expect(page.getByRole("heading", { name: "Past Hearings" })).toBeVisible();

    await page.getByRole("tab", { name: /^All/i }).click();
    await expect(page.getByRole("heading", { name: "All Hearings" })).toBeVisible();

    await page.getByRole("tab", { name: /Upcoming/i }).click();
    await page.getByLabel("Filter by Matter").selectOption({ label: PRIMARY_TITLE });
    await expect(page.locator(".client-hearings-next")).toContainText(PRIMARY_TITLE);

    await page.getByLabel("Search hearings by matter, court or purpose").fill("zzzz-no-match");
    await expect(page.getByText("No hearings match your filters")).toBeVisible();
    await page.getByLabel("Search hearings by matter, court or purpose").fill("");
    await expect(page.locator(".client-hearings-next")).toContainText(PRIMARY_TITLE);

    const nextCard = page.locator(".client-hearings-next");
    const viewMatter = nextCard.locator('a[href*="/client/cases/"]');
    await expect(viewMatter).toHaveAttribute("href", /\/client\/cases\//);
    const matterHref = await viewMatter.getAttribute("href");
    await page.goto(matterHref!, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page).toHaveURL(/\/client\/cases\//, { timeout: 30_000 });

    await openHearingsSchedule(page);
    const messageLink = page
      .locator(".client-hearings-next")
      .getByRole("link", { name: "Message Legal Team" });
    await expect(messageLink).toHaveAttribute("href", /\/client\/messages\?caseId=/);
    const messageHref = await messageLink.getAttribute("href");
    await page.goto(messageHref!, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page).toHaveURL(/\/client\/messages\?caseId=/, { timeout: 30_000 });
  });

  test("calendar action and mobile layout remain usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInPreviewClient(page);
    await openHearingsSchedule(page);
    await expect(page.getByRole("button", { name: /Add to Calendar/i })).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: /primary|Client/i })
        .or(page.locator("[data-slot='portal-mobile-nav']"))
        .first(),
    ).toBeVisible({
      timeout: 30_000,
    });
    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });
});
