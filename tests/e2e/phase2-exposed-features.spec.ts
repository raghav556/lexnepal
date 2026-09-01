import fs from "node:fs/promises";
import JSZip from "jszip";
import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERS } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

async function signInStaff(page: Page) {
  await prepareE2eAuth(page, E2E_USERS.staff.email);
  await page.goto("/sign-in");
  await page.locator("#email").fill(E2E_USERS.staff.email);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /sign in securely/i }).click();
  await expect(page).toHaveURL(/\/staff(\/|$)/, { timeout: 20_000 });
  await expect(page.getByText(E2E_USERS.staff.email, { exact: true })).toBeVisible();
}

test.describe("Phase 2 exposed features", () => {
  test("staff downloads selected documents as a real ZIP", async ({ page }) => {
    await signInStaff(page);
    await page.goto("/staff/documents");
    const rowCheckboxes = page.locator("tbody input[type=checkbox]");
    await expect(rowCheckboxes.first()).toBeVisible();
    expect(await rowCheckboxes.count()).toBeGreaterThanOrEqual(2);
    await rowCheckboxes.nth(0).check();
    await rowCheckboxes.nth(1).check();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download ZIP" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^lexnepal-documents-\d{4}-\d{2}-\d{2}\.zip$/);
    const path = await download.path();
    expect(path).toBeTruthy();
    const zip = await JSZip.loadAsync(await fs.readFile(path!));
    expect(Object.keys(zip.files)).toHaveLength(2);
    await expect(page.getByText(/Downloaded 2 documents as/)).toBeVisible();
  });

  test("staff sees persisted history and restores an old version as a new version", async ({
    page,
  }) => {
    await signInStaff(page);
    const documentsResponse = await page.request.get("/api/v1/documents");
    const documentsBody = await documentsResponse.text();
    expect(documentsResponse.ok(), documentsBody).toBe(true);
    const documents = JSON.parse(documentsBody).data as Array<{
      _id: string;
      title: string;
      uploadStatus: string;
    }>;
    let source: (typeof documents)[number] | undefined;
    let history: Array<{ _id: string; version: number }> = [];
    for (const candidate of documents.filter((document) => document.uploadStatus === "clean")) {
      const historyResponse = await page.request.get(`/api/v1/documents/${candidate._id}/versions`);
      if (!historyResponse.ok()) continue;
      const candidateHistory = (await historyResponse.json()).data as typeof history;
      if (candidateHistory.length > 1) {
        source = candidate;
        history = candidateHistory;
        break;
      }
    }
    expect(source).toBeTruthy();
    const currentVersion = history[0].version;

    await page.goto("/staff/documents");
    await page.getByRole("row").filter({ hasText: source!.title }).first().click();
    await expect(page.getByText("Version History", { exact: true })).toBeVisible();
    await expect(
      page.getByText(`Version ${currentVersion} (Current)`, { exact: true }),
    ).toBeVisible();
    const restoreButton = page.getByRole("button", { name: "Restore", exact: true }).last();
    await expect(restoreButton).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await restoreButton.click();
    await expect(page.getByText(/restored as new version/i)).toBeVisible();
    await expect(
      page.getByText(`Version ${currentVersion + 1} (Current)`, { exact: true }),
    ).toBeVisible();
  });

  test("public assistant identifies itself truthfully and avoids response guarantees", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open Chat" }).click();
    await expect(page.getByText("Automated guidance • not legal advice")).toBeVisible();
    await expect(page.getByText(/not a lawyer or live-chat agent/i)).toBeVisible();

    const input = page.getByPlaceholder("Type your message...");
    await input.fill("Can I sue after a fraud?");
    await input.press("Enter");
    const response = page.getByText(/This automated guide cannot assess your situation/i);
    await expect(response).toBeVisible();
    await expect(response).not.toContainText(/immediately|shortly|guaranteed response/i);
  });
});
