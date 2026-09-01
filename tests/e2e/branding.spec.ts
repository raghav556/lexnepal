import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

type PublicBranding = { firmName: string; logoUrl: string; faviconUrl: string };

async function getPublishedBranding(page: Page): Promise<PublicBranding> {
  const response = await page.request.get("/api/v1/public/cms/settings");
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { data?: Record<string, unknown> };
  const firmName = String(body.data?.firmName || "");
  const logoUrl = String(body.data?.logoUrl || "");
  const faviconUrl = String(body.data?.faviconUrl || "");
  expect(firmName).not.toBe("");
  expect(logoUrl).not.toBe("");
  expect(faviconUrl).not.toBe("");
  const assetResponse = await page.request.get(logoUrl, { maxRedirects: 0 });
  expect(assetResponse.status()).toBe(200);
  expect(assetResponse.headers()["content-type"]).toMatch(/^image\/(png|jpeg)$/);
  return { firmName, logoUrl, faviconUrl };
}

async function expectRenderedLogo(locator: Locator, logoUrl: string) {
  await expect(locator).toHaveAttribute("src", logoUrl);
  await expect
    .poll(() => locator.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
}

async function signIn(page: Page, email: string) {
  await prepareE2eAuth(page, email);
  await page.goto("/sign-in");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /sign in securely/i }).click();
}

test.describe("published firm branding", () => {
  test("uses the same CMS logo in the public header, footer, and sign-in", async ({ page }) => {
    const branding = await getPublishedBranding(page);
    await page.goto("/");
    await expectRenderedLogo(
      page.locator("header").getByAltText(`${branding.firmName} logo`),
      branding.logoUrl,
    );
    await expectRenderedLogo(
      page.locator("footer").getByAltText(`${branding.firmName} logo`),
      branding.logoUrl,
    );

    await page.goto("/sign-in");
    await expectRenderedLogo(page.getByAltText(`${branding.firmName} logo`), branding.logoUrl);
    await expect(page.locator('head link[data-dynamic-firm-favicon="true"]')).toHaveAttribute(
      "href",
      branding.faviconUrl,
    );
  });

  for (const portal of [
    { name: "admin", user: E2E_USERS.admin, path: "/admin" },
    { name: "staff", user: E2E_USERS.staff, path: "/staff" },
    { name: "client", user: E2E_USERS.client, path: "/client" },
  ] as const) {
    test(`${portal.name} navigation uses the published CMS logo`, async ({ page }) => {
      const branding = await getPublishedBranding(page);
      await signIn(page, portal.user.email);
      await expect(page).toHaveURL(new RegExp(`${portal.path}(/|$)`), { timeout: 20_000 });
      await expectRenderedLogo(
        page.locator("aside").getByAltText(`${branding.firmName} logo`),
        branding.logoUrl,
      );
    });
  }

  test("admin branding editor renders the saved logo and keeps desktop tabs polished", async ({
    page,
  }) => {
    const branding = await getPublishedBranding(page);
    await signIn(page, E2E_USERS.admin.email);
    await expect(page).toHaveURL(/\/admin(\/|$)/, { timeout: 20_000 });
    await page.goto("/admin/cms");
    await page.getByRole("tab", { name: "Branding & Media" }).click();
    await expectRenderedLogo(page.getByAltText("Preview").first(), branding.logoUrl);
    await expect(page.getByText("No Logo Provided", { exact: true })).toHaveCount(0);
    const tabList = page.getByRole("tablist");
    await expect
      .poll(() => tabList.evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
      .toBe(true);
  });

  test("client mobile header uses the published CMS logo", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const branding = await getPublishedBranding(page);
    await signIn(page, E2E_USERS.client.email);
    await expect(page).toHaveURL(/\/client(\/|$)/, { timeout: 20_000 });
    await expectRenderedLogo(
      page.getByAltText(`${branding.firmName} logo`).first(),
      branding.logoUrl,
    );
  });
});
