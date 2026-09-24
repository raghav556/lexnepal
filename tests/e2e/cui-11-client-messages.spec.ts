import { expect, test, type Page } from "@playwright/test";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { UI_PREVIEW_CASES } from "../../scripts/e2e/client-ui-preview-contract";
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

async function openMessages(page: Page) {
  await page.goto("/client/messages", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible({
    timeout: 60_000,
  });
  const missingProfile = page.getByText("No client profile linked");
  const conversations = page.getByRole("heading", { name: "Conversations" });
  try {
    await Promise.race([
      conversations.waitFor({ state: "visible", timeout: 45_000 }),
      missingProfile.waitFor({ state: "visible", timeout: 45_000 }),
    ]);
  } catch {
    /* fall through */
  }
  if (await missingProfile.isVisible().catch(() => false)) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible({
      timeout: 60_000,
    });
  }
  await expect(page.getByRole("heading", { name: "Conversations" })).toBeVisible({
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

function primaryOption(page: Page) {
  return page.getByRole("option", {
    name: new RegExp(UI_PREVIEW_CASES.primary.title.slice(0, 18), "i"),
  });
}

function propertyOption(page: Page) {
  return page.getByRole("option", {
    name: new RegExp(UI_PREVIEW_CASES.property.title.slice(0, 18), "i"),
  });
}

test.describe("CUI-11 client messages", () => {
  test.describe.configure({ timeout: 180_000 });

  test("defaults to unread matter after unread counts resolve", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await signInPreviewClient(page);

    // Hold mark-read so the unread badge remains observable before open settles.
    await page.route("**/api/v1/messages/read", (route) => route.abort());
    await openMessages(page);

    const primary = primaryOption(page);
    await expect(primary).toBeVisible({ timeout: 60_000 });
    await expect(primary.getByLabel(/unread message/i)).toBeVisible({ timeout: 60_000 });
    await expect(primary).toHaveAttribute("aria-selected", "true", { timeout: 60_000 });
    await expect(page.getByText(/draft reply has been filed/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
    await expect(page.getByLabel("Attach documents or files").first()).toBeVisible();
    await expect(page.getByText("Client Visible")).toHaveCount(0);
    await expect(page.getByText("Case Team Only")).toHaveCount(0);
    await expect(page.getByText(/encrypted/i)).toHaveCount(0);
    await expect(page.locator('[data-appearance="client"]').first()).toBeVisible();

    await page.unroute("**/api/v1/messages/read");
    await page.goto("/client/messages", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByRole("heading", { name: "Conversations" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(primaryOption(page)).toHaveAttribute("aria-selected", "true", {
      timeout: 60_000,
    });
    await expect(page.getByText(/draft reply has been filed/i).first()).toBeVisible({
      timeout: 60_000,
    });
    // Mark-read updates unread after the conversation is open.
    await expect(primaryOption(page).getByLabel(/unread message/i)).toHaveCount(0, {
      timeout: 30_000,
    });
  });

  test("preserves user selection and honors caseId deep-links", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInPreviewClient(page);
    await openMessages(page);

    const primary = primaryOption(page);
    const property = propertyOption(page);
    await expect(primary).toBeVisible({ timeout: 60_000 });
    await expect(property).toBeVisible();

    await property.click();
    await expect(property).toHaveAttribute("aria-selected", "true");
    await expect(primary).toHaveAttribute("aria-selected", "false");
    await page.waitForTimeout(1500);
    await expect(property).toHaveAttribute("aria-selected", "true");

    const matterHref = await page.getByLabel("View Matter").getAttribute("href");
    expect(matterHref).toMatch(/\/client\/cases\//);
    // Switch to primary via deep-link (override user selection with explicit caseId).
    await primary.click();
    await expect(primary).toHaveAttribute("aria-selected", "true");
    const primaryHref = await page.getByLabel("View Matter").getAttribute("href");
    const matterId = String(primaryHref).split("/").pop();
    expect(matterId).toBeTruthy();

    await page.goto(`/client/messages?caseId=${matterId}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(primaryOption(page)).toHaveAttribute("aria-selected", "true", {
      timeout: 60_000,
    });
    await expect(page.getByText(/draft reply has been filed/i).first()).toBeVisible({
      timeout: 60_000,
    });

    await page.goto("/client/messages?caseId=00000000-0000-4000-8000-000000000099", {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText("Matter unavailable")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/draft reply has been filed/i)).toHaveCount(0);
  });

  test("mobile starts on Conversations list without auto-opening chat", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInPreviewClient(page);
    await openMessages(page);

    const mobileNav = page.getByRole("navigation", { name: "Client primary navigation" });
    await expect(mobileNav.getByRole("link", { name: "Messages" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await expect(page.getByRole("heading", { name: "Conversations" })).toBeVisible();
    await expect(page.getByLabel("Back to conversations")).toBeHidden();
    await expect(page.getByRole("textbox", { name: "Message" })).toBeHidden();
    await assertNoHorizontalOverflow(page);

    const primary = primaryOption(page);
    await expect(primary).toBeVisible({ timeout: 60_000 });
    // Default selection may prefer unread, but mobile must stay on the list until tap.
    await page.waitForTimeout(1200);
    await expect(page.getByLabel("Back to conversations")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Conversations" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Message" })).toBeHidden();

    await primary.click();
    await expect(page.getByLabel("Back to conversations")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/draft reply has been filed/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await assertNoHorizontalOverflow(page);

    await page.getByLabel("Back to conversations").click();
    await expect(page.getByRole("heading", { name: "Conversations" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel("Back to conversations")).toBeHidden();

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/client/messages", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByRole("heading", { name: "Conversations" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByLabel("Back to conversations")).toBeHidden();
    await assertNoHorizontalOverflow(page);
    await primaryOption(page).click();
    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible({ timeout: 30_000 });
    await assertNoHorizontalOverflow(page);
  });
});
