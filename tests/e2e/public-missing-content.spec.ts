import { expect, test } from "@playwright/test";

test.describe("Public missing content", () => {
  for (const [slug, title] of [
    ["terms", "Terms of Service"],
    ["privacy-policy", "Privacy Policy"],
  ]) {
    test(`${slug} displays the existing fallback when CMS content is absent`, async ({ page }) => {
      await page.route(`**/api/v1/public/cms/legal-pages/${slug}`, (route) =>
        route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "NOT_FOUND", message: "Legal page was not found" },
          }),
        }),
      );
      await page.goto(`/${slug}`);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.locator("article")).not.toBeEmpty();
    });
  }

  for (const collection of ["blog", "news", "resources", "practice-areas", "lawyers"]) {
    test(`${collection} rejects an unknown public detail`, async ({ page }) => {
      const response = await page.goto(`/${collection}/missing-public-content-${Date.now()}`);
      // Next can stream the shell before the lookup resolves; streamed not-found
      // responses use noindex even when HTTP headers have already been sent.
      expect([200, 404]).toContain(response?.status());
      await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
      await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
    });
  }
});
