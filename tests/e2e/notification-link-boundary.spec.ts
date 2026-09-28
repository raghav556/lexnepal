import { expect, test } from "@playwright/test";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

test("Client page and shared bell never follow unsafe notification links", async ({ page }) => {
  test.setTimeout(180_000);
  await prepareE2eAuth(page, UI_PREVIEW_CLIENT.email);
  const login = await page.request.post("/api/auth/sign-in/email", {
    data: {
      email: UI_PREVIEW_CLIENT.email,
      password: e2ePasswordFor(UI_PREVIEW_CLIENT.email),
    },
    timeout: 120_000,
  });
  expect(login.ok(), await login.text()).toBe(true);

  let marked = 0;
  await page.route("**/api/v1/notifications**", async (route) => {
    const method = route.request().method();
    if (method === "PATCH") {
      marked += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: '{"data":{"success":true}}',
      });
      return;
    }
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "Unsafe destination",
            body: "Controlled test notification",
            type: "system",
            isRead: false,
            link: "https://evil.example",
            createdAt: now,
          },
          {
            id: "00000000-0000-4000-8000-000000000002",
            title: "Wrong portal destination",
            body: "Controlled test notification",
            type: "system",
            isRead: true,
            link: "/staff/messages",
            createdAt: now,
          },
          {
            id: "00000000-0000-4000-8000-000000000003",
            title: "Safe messages destination",
            body: "Controlled test notification",
            type: "message",
            isRead: true,
            link: "/client/messages",
            createdAt: now,
          },
        ],
      }),
    });
  });

  await page.goto("/client/notifications", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Notifications" })).toBeVisible();
  await expect(page.getByText("Unsafe destination").first()).toBeVisible();
  await page.getByText("Unsafe destination").first().click();
  await page.waitForTimeout(250);
  await expect(page).toHaveURL(/\/client\/notifications$/);
  expect(marked).toBe(1);
  await page.getByText("Wrong portal destination").first().click();
  await page.waitForTimeout(250);
  await expect(page).toHaveURL(/\/client\/notifications$/);

  const bell = page.getByRole("button", { name: /Open notifications/ }).first();
  await bell.click();
  await page.getByRole("menuitem", { name: /Unsafe destination/ }).click();
  await page.waitForTimeout(250);
  await expect(page).toHaveURL(/\/client\/notifications$/);
  expect(marked).toBe(2);

  await page.getByRole("menuitem", { name: /Safe messages destination/ }).click();
  await expect(page).toHaveURL(/\/client\/messages(?:\?.*)?$/);

  await page.goto("/client/notifications", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Safe messages destination").first()).toBeVisible();
  await page.getByText("Safe messages destination").first().click();
  await expect(page).toHaveURL(/\/client\/messages(?:\?.*)?$/);
});
