import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";

type PortalCase = {
  label: string;
  email: string;
  portalPrefix: "/admin" | "/staff" | "/client";
  profilePath: string;
};

const PORTALS: PortalCase[] = [
  {
    label: "admin",
    email: E2E_USERS.admin.email,
    portalPrefix: "/admin",
    profilePath: "/admin/profile",
  },
  {
    label: "staff",
    email: E2E_USERS.staff.email,
    portalPrefix: "/staff",
    profilePath: "/staff/profile",
  },
  {
    label: "client",
    email: E2E_USERS.client.email,
    portalPrefix: "/client",
    profilePath: "/client/profile",
  },
];

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function expectSignedInPortal(page: Page, pathPrefix: string) {
  await expect(page).toHaveURL(new RegExp(`${pathPrefix}(/|$)`));
  await expect(page.getByRole("button", { name: /sign in/i })).toHaveCount(0, {
    timeout: 20_000,
  });
}

async function signOutFromPortal(page: Page) {
  await page.evaluate(async () => {
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
    window.location.href = "/sign-in";
  });
  await expect(page).toHaveURL(/\/sign-in/, { timeout: 20_000 });
}

test.describe("Auth portal smoke", () => {
  for (const portal of PORTALS) {
    test(`${portal.label}: sign-in → profile edit → sign-out`, async ({ page }) => {
      await signIn(page, portal.email);
      await expectSignedInPortal(page, portal.portalPrefix);

      await page.goto(portal.profilePath);
      await expect(page).toHaveURL(new RegExp(`${portal.profilePath.replace("/", "\\/")}`));

      await page.getByRole("tab", { name: "General" }).click();
      const nameInput = page.getByRole("tabpanel").getByRole("textbox").first();
      await expect(nameInput).toBeVisible();
      const currentName = await nameInput.inputValue();
      const editedName = currentName.endsWith(" (E2E)") ? currentName : `${currentName} (E2E)`;
      await nameInput.fill(editedName);
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Profile updated successfully!", { exact: false })).toBeVisible({
        timeout: 15_000,
      });

      await signOutFromPortal(page);
    });
  }
});
