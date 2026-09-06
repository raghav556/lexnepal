import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

const publicRoutes = ["/", "/practice-areas", "/consultation", "/sign-in"] as const;

function seriousViolations(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  return violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.slice(0, 5).map((node) => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary,
      })),
    }));
}

async function expectAccessible(page: Page) {
  await page.evaluate(async () => {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    for (let y = 0; y <= maxScroll; y += Math.max(240, Math.floor(window.innerHeight / 2))) {
      window.scrollTo(0, y);
      await new Promise((resolve) => window.setTimeout(resolve, 25));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(750);
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation-duration:0.01ms!important;animation-delay:0ms!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}",
  });
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    }
  });
  await page.waitForTimeout(100);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(seriousViolations(results.violations)).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `page has ${overflow}px horizontal overflow`).toBeLessThanOrEqual(1);
}

async function signIn(page: Page, email: string, portal: "/admin" | "/staff" | "/client") {
  await prepareE2eAuth(page, email);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${portal}(/|$)`), { timeout: 20_000 });
}

test.describe("Responsive accessibility smoke", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of publicRoutes) {
    test(`${route} has no serious accessibility or mobile overflow defects`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `${route} should return 2xx`).toBeTruthy();
      await page.waitForTimeout(750);
      await expectNoHorizontalOverflow(page);
      await expectAccessible(page);
    });
  }

  for (const fixture of [
    { email: E2E_USERS.admin.email, portal: "/admin" as const },
    { email: E2E_USERS.staff.email, portal: "/staff" as const },
    { email: E2E_USERS.client.email, portal: "/client" as const },
  ]) {
    test(`${fixture.portal} shell is accessible without mobile overflow`, async ({ page }) => {
      await signIn(page, fixture.email, fixture.portal);
      await expect(
        page.locator('[aria-label="Loading account"], [aria-label="Checking your session"]'),
      ).toHaveCount(0, { timeout: 15_000 });
      await expect(page.locator('main [data-state="loading"]')).toHaveCount(0, {
        timeout: 20_000,
      });
      await page.waitForTimeout(250);
      await expectNoHorizontalOverflow(page);
      await expectAccessible(page);
    });
  }

  test("public mobile navigation is keyboard operable", async ({ page }) => {
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: "Open menu" });
    await menuButton.focus();
    await expect(menuButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(page.getByRole("link", { name: "About Us", exact: true })).toBeVisible();
  });

  test("authenticated mobile navigation is keyboard operable", async ({ page }) => {
    await signIn(page, E2E_USERS.admin.email, "/admin");
    const menuButton = page.getByRole("button", { name: "Toggle menu" });
    await menuButton.focus();
    await expect(menuButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  });
});
