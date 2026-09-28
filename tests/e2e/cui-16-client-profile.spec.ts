import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { e2ePasswordFor, E2E_USERS, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

const qaDir = path.resolve(process.cwd(), "..", "..", "qa", "cui-16");

async function signIn(page: Page, email: string) {
  await prepareE2eAuth(page, email);
  const response = await page.request.post("/api/auth/sign-in/email", {
    data: { email, password: e2ePasswordFor(email) },
    timeout: 120_000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function noHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
}

test.describe("CUI-16 Client Profile", () => {
  test.describe.configure({ timeout: 180_000 });

  test("Client composition, account functions, safe activity, accessibility, and responsive evidence", async ({
    page,
  }) => {
    await mkdir(qaDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, UI_PREVIEW_CLIENT.email);
    await page.goto("/client/profile");
    await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
    const personal = page.getByTestId("client-profile-personal-information");
    await expect(personal.getByRole("heading", { name: "Personal Information" })).toBeVisible();
    await expect(personal.getByLabel("Full name")).toHaveValue(UI_PREVIEW_CLIENT.name);
    await expect(personal.getByLabel("Phone number")).toBeVisible();
    await expect(personal.getByLabel("Address", { exact: true })).toHaveValue(/Nepal/);
    await expect(personal.getByLabel("Email address")).toHaveAttribute("readonly", "");
    await expect(personal.getByLabel("Choose a JPEG or PNG profile photo")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png",
    );
    await expect(page.getByRole("heading", { name: "Account Overview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Security & Access" })).toBeVisible();
    await expect(
      page.getByText(/emergency contact|preferred language|GDPR compliance/i),
    ).toHaveCount(0);
    await noHorizontalOverflow(page);
    await page.screenshot({ path: path.join(qaDir, "01-desktop-profile.png"), fullPage: true });

    await page.getByRole("button", { name: "Manage devices" }).click();
    await expect(page.getByRole("tab", { name: "Active Sessions" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await page.getByRole("tab", { name: "Security", exact: true }).click();
    await expect(page.getByLabel("Current Password")).toBeVisible();
    await expect(page.getByLabel("New Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Two-Factor Authentication" })).toBeVisible();
    await page.getByLabel("Current Password").fill("not-the-current-password");
    await page.getByLabel("New Password", { exact: true }).fill("NewPassword123!");
    await page.getByLabel("Confirm New Password").fill("different-password");
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText("New passwords do not match!")).toBeVisible();
    await page.getByLabel("Current Password").fill("");
    await page.getByLabel("New Password", { exact: true }).fill("");
    await page.getByLabel("Confirm New Password").fill("");
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, { timeout: 10_000 });
    await page.getByRole("heading", { name: "Change Password" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(qaDir, "02-desktop-security.png"), fullPage: true });

    await page.getByRole("tab", { name: "Active Sessions" }).click();
    await expect(page.getByRole("heading", { name: "Active Sessions" })).toBeVisible();
    await page.getByRole("heading", { name: "Active Sessions" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(qaDir, "03-desktop-sessions.png"), fullPage: true });

    await page.getByRole("tab", { name: "Data & Privacy" }).click();
    await expect(page.getByRole("heading", { name: "Activity Log" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Download Profile Information" })).toBeVisible();
    await expect(
      page.getByText("Download a small JSON copy of your account profile fields."),
    ).toBeVisible();
    await page.getByRole("heading", { name: "Activity Log" }).scrollIntoViewIfNeeded();
    const activityResponse = await page.request.get("/api/v1/users/me/audit-events");
    expect(activityResponse.ok()).toBe(true);
    const activity = (await activityResponse.json()).data as Array<Record<string, unknown>>;
    for (const event of activity) {
      expect(Object.keys(event).sort()).toEqual(["action", "createdAt", "id"]);
      expect(typeof event.action).toBe("string");
    }
    await expect(page.getByText(/uploadIntent=|document\.malware_scan/)).toHaveCount(0);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Profile" }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    let exportedJson = "";
    for await (const chunk of stream) exportedJson += chunk.toString();
    const exported = JSON.parse(exportedJson);
    expect(exported.profile.name).toBe(UI_PREVIEW_CLIENT.name);
    expect(exported.profile.email).toBe(UI_PREVIEW_CLIENT.email);
    expect(exported.auditLog).toBeUndefined();
    await page.screenshot({
      path: path.join(qaDir, "04-desktop-data-privacy.png"),
      fullPage: true,
    });

    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, { timeout: 10_000 });
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(
      accessibility.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);

    for (const [width, height] of [
      [1280, 800],
      [1024, 768],
      [768, 900],
      [390, 844],
      [360, 800],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/client/profile");
      await expect(page.getByTestId("client-profile-personal-information")).toBeVisible();
      await noHorizontalOverflow(page);
      if (width === 390)
        await page.screenshot({ path: path.join(qaDir, "05-mobile-profile.png"), fullPage: true });
      if (width === 360) {
        await page.getByRole("tab", { name: "Security", exact: true }).click();
        await page.getByRole("heading", { name: "Change Password" }).scrollIntoViewIfNeeded();
        await expect(page.getByRole("button", { name: "Update Password" })).toBeVisible();
        await page.getByRole("button", { name: "Update Password" }).click();
        await page.screenshot({ path: path.join(qaDir, "06-mobile-security.png"), fullPage: true });
      }
    }
  });

  test("real Client name, phone, and address updates use existing current-user APIs", async ({
    page,
  }) => {
    await signIn(page, UI_PREVIEW_CLIENT.email);
    await page.goto("/client/profile");
    const personal = page.getByTestId("client-profile-personal-information");
    await expect(personal.getByLabel("Address", { exact: true })).toHaveValue(/Nepal/);
    const originalName = await personal.getByLabel("Full name").inputValue();
    const originalPhone = await personal.getByLabel("Phone number").inputValue();
    const originalAddress = await personal.getByLabel("Address", { exact: true }).inputValue();
    try {
      await personal.getByLabel("Full name").fill(`${originalName} Test`);
      await personal.getByLabel("Phone number").fill(`${originalPhone}1`);
      await personal.getByLabel("Address", { exact: true }).fill(`${originalAddress} Test`);
      await personal.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText("Profile updated successfully!")).toBeVisible();
      const user = (await (await page.request.get("/api/v1/users/me")).json()).data;
      const client = (await (await page.request.get("/api/v1/clients/me")).json()).data;
      expect(user.name).toBe(`${originalName} Test`);
      expect(user.phone).toBe(`${originalPhone}1`);
      expect(client.phone).toBe(`${originalPhone}1`);
      expect(client.address).toBe(`${originalAddress} Test`);
    } finally {
      await page.request.patch("/api/v1/users/me", {
        data: { name: originalName, phone: originalPhone },
      });
      await page.request.patch("/api/v1/clients/me", {
        data: { phone: originalPhone, address: originalAddress },
      });
    }
  });

  test("failed Client lookup blocks contact saves but allows name-only and genuine absence", async ({
    page,
  }) => {
    await signIn(page, UI_PREVIEW_CLIENT.email);
    const userResponse = await page.request.get("/api/v1/users/me");
    expect(userResponse.ok()).toBe(true);
    const user = (await userResponse.json()).data;
    let clientLookupFails = true;
    let identityPatches = 0;
    let clientPatches = 0;

    await page.route("**/api/v1/clients/me", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: clientLookupFails ? 503 : 200,
          contentType: "application/json",
          body: JSON.stringify(
            clientLookupFails
              ? { error: { message: "Client lookup unavailable" } }
              : { data: null },
          ),
        });
      } else if (route.request().method() === "PATCH") {
        clientPatches += 1;
        await route.abort();
      } else {
        await route.continue();
      }
    });
    await page.route("**/api/v1/users/me", async (route) => {
      if (route.request().method() === "PATCH") {
        identityPatches += 1;
        const input = route.request().postDataJSON() as { name: string };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { ...user, name: input.name } }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/client/profile");
    const personal = page.getByTestId("client-profile-personal-information");
    const save = personal.getByRole("button", { name: "Save changes" });
    await expect(personal.getByRole("alert")).toContainText(
      "Phone and address changes are unavailable",
    );
    await expect(personal.getByLabel("Address", { exact: true })).toHaveValue(
      "Could not load address",
    );
    await expect(save).toBeDisabled();
    await personal.getByLabel("Phone number").fill(`${user.phone}1`);
    await personal.getByLabel("Full name").fill(`${user.name} Test`);
    await expect(save).toBeDisabled();
    expect(identityPatches).toBe(0);
    expect(clientPatches).toBe(0);
    await expect(page.getByText("Profile updated successfully!")).toHaveCount(0);

    await personal.getByLabel("Phone number").fill(user.phone ?? "");
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText("Name updated successfully!")).toBeVisible();
    await expect(page.getByText("Profile updated successfully!")).toHaveCount(0);
    expect(identityPatches).toBe(1);
    expect(clientPatches).toBe(0);

    clientLookupFails = false;
    await personal.getByRole("button", { name: "Try again" }).click();
    await expect(personal.getByRole("alert")).toHaveCount(0);
    await expect(personal.getByLabel("Address", { exact: true })).toHaveValue(
      "No linked Client record",
    );
    await expect(save).toBeEnabled();
    await personal.getByLabel("Full name").fill(`${user.name} Test`);
    await save.click();
    await expect(page.getByText("Profile updated successfully!")).toBeVisible();
    expect(identityPatches).toBe(2);
    expect(clientPatches).toBe(0);
  });

  for (const [portal, email, screenshot] of [
    ["staff", E2E_USERS.staff.email, "07-staff-profile-after.png"],
    ["admin", E2E_USERS.admin.email, "08-admin-profile-after.png"],
  ] as const) {
    test(`${portal} Profile presentation and account controls remain intact`, async ({ page }) => {
      await mkdir(qaDir, { recursive: true });
      await page.setViewportSize({ width: 1440, height: 900 });
      await signIn(page, email);
      await page.goto(`/${portal}/profile`);
      await expect(page.getByRole("tab", { name: "General" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Security", exact: true })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Active Sessions" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Data & Privacy" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Avatar" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Personal Information" })).toBeVisible();
      await page.getByRole("tab", { name: "Security", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Change Password" })).toBeVisible();
      await page.getByRole("tab", { name: "General" }).click();
      await expect(page.getByRole("heading", { name: "Avatar" })).toBeVisible();
      await page.waitForTimeout(450); // Let the existing tab transition settle for the visual baseline.
      await page.screenshot({ path: path.join(qaDir, screenshot), fullPage: true });
    });
  }
});
