import { expect, test, type Page } from "@playwright/test";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { UI_PREVIEW_DOCUMENTS } from "../../scripts/e2e/client-ui-preview-contract";
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

async function openDocuments(page: Page) {
  await page.goto("/client/documents", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible({
    timeout: 60_000,
  });

  const library = page
    .getByRole("region", { name: "Document library" })
    .or(page.locator(".client-documents-library"));
  const missingProfile = page.getByText("No client profile linked");
  try {
    await Promise.race([
      library.waitFor({ state: "visible", timeout: 45_000 }),
      missingProfile.waitFor({ state: "visible", timeout: 45_000 }),
    ]);
  } catch {
    /* fall through */
  }
  if (await missingProfile.isVisible().catch(() => false)) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible({
      timeout: 60_000,
    });
  }
  await expect(page.locator(".client-documents-library")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(UI_PREVIEW_DOCUMENTS.courtPdf.title).first()).toBeVisible({
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

test.describe("CUI-10 client documents", () => {
  test.describe.configure({ timeout: 180_000 });

  test("renders Documents with upload action, compact toolbar, and real library", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await signInPreviewClient(page);
    await openDocuments(page);

    await expect(page.getByText("Srimar Law").first()).toBeVisible();
    const sidebar = page.getByRole("navigation", { name: "Client portal navigation" });
    await expect(sidebar.getByRole("link", { name: "Documents", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      sidebar.getByRole("link", { name: "My Matters", exact: true }),
    ).not.toHaveAttribute("aria-current", "page");

    const uploadTrigger = page.locator("#client-documents-upload-trigger");
    await expect(uploadTrigger).toBeVisible();
    await expect(page.getByRole("heading", { name: "Document Library" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upload Document" })).toHaveCount(0);
    await expect(page.getByLabel("Matter for upload")).toHaveCount(0);
    await expect(page.getByLabel("Choose files to upload")).toHaveCount(0);

    await expect(page.getByRole("tab", { name: /^All/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Legal Team/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /My Uploads/i })).toBeVisible();
    await expect(page.getByLabel("Search documents")).toBeVisible();
    await expect(page.getByLabel("Filter by Matter")).toBeVisible();
    await expect(page.getByLabel("Filter by document type")).toBeVisible();
    await expect(
      page.getByLabel(`Preview ${UI_PREVIEW_DOCUMENTS.courtPdf.title}`).first(),
    ).toBeVisible();
    await expect(page.getByLabel("Download document").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Delete$/i })).toHaveCount(0);
    await expect(page.getByText("Encrypted storage")).toHaveCount(0);
    await expect(page.getByText("Required Documents")).toHaveCount(0);
    await expect(page.getByText("Document Requests")).toHaveCount(0);
    await expect(page.getByText("Court Filings")).toHaveCount(0);
    await expect(page.getByText("Identity & KYC")).toHaveCount(0);
  });

  test("upload dialog reuses Matter/type/file controls and closes on Escape", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInPreviewClient(page);
    await openDocuments(page);

    const uploadTrigger = page.locator("#client-documents-upload-trigger");
    await uploadTrigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);
    await expect(dialog.getByRole("heading", { name: "Upload Document" })).toBeVisible();
    await expect(dialog.getByLabel("Matter for upload")).toBeVisible();
    await expect(dialog.getByLabel("Document type for upload")).toBeVisible();
    await expect(dialog.getByLabel("Choose files to upload")).toBeAttached();
    await expect(dialog.getByLabel("Upload document files")).toBeVisible();
    await expect(dialog.getByText(/up to 50 MB/i)).toBeVisible();

    const uploadTypeOptions = await dialog
      .getByLabel("Document type for upload")
      .locator("option")
      .allTextContents();
    expect(uploadTypeOptions.map((t) => t.trim())).toEqual(
      expect.arrayContaining([
        "Pleading",
        "Evidence",
        "Contract",
        "Affidavit",
        "Correspondence",
        "Other",
      ]),
    );
    expect(uploadTypeOptions.join(" ")).not.toMatch(
      /Court Filing|Power of Attorney|Template|Notice|Memo/i,
    );

    const settled = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return null;
      const style = getComputedStyle(dlg);
      return {
        bg: style.backgroundColor,
        opacity: Number(style.opacity),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    expect(settled?.opacity).toBe(1);
    expect(settled?.bg).toMatch(/rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255/);
    expect(settled?.overflow).toBeFalsy();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(uploadTrigger).toBeFocused({ timeout: 5_000 });
  });

  test("search, filters, source tabs, court_filing type, and caseId deep-link work", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await signInPreviewClient(page);
    await openDocuments(page);

    await expect(page.getByText(/6 documents/i).first()).toBeVisible();
    await expect(page.getByText(UI_PREVIEW_DOCUMENTS.courtPdf.title).first()).toBeVisible();

    const categories = page.locator(".client-documents-summary");
    await expect(categories.getByText("Court Filing", { exact: true })).toBeVisible();
    await expect(categories.getByText("Evidence", { exact: true })).toBeVisible();
    await expect(categories.getByText("Contract", { exact: true })).toBeVisible();
    await expect(categories.getByText("Correspondence", { exact: true })).toBeVisible();

    const typeFilter = page.getByLabel("Filter by document type");
    await expect(typeFilter.locator('option[value="court_filing"]')).toBeAttached();

    const categorySum = await page.evaluate(() => {
      const items = [...document.querySelectorAll(".client-documents-summary li strong")];
      return items.reduce((sum, el) => sum + (Number(el.textContent) || 0), 0);
    });
    expect(categorySum).toBe(6);

    await expect(
      page.locator(".client-documents-library").getByText("Court Filing").first(),
    ).toBeVisible();

    await page.getByLabel("Search documents").fill("Court Notice");
    await expect(page.getByText(UI_PREVIEW_DOCUMENTS.courtPdf.title).first()).toBeVisible();
    await expect(page.getByText(UI_PREVIEW_DOCUMENTS.clientDocx.title)).toHaveCount(0);

    await page.getByLabel("Search documents").fill("");
    await page.getByRole("tab", { name: /My Uploads/i }).click();
    await expect(page.getByRole("tab", { name: /My Uploads/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText(UI_PREVIEW_DOCUMENTS.clientDocx.title).first()).toBeVisible();

    await page.getByRole("tab", { name: /Legal Team/i }).click();
    await expect(page.getByRole("tab", { name: /Legal Team/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText(UI_PREVIEW_DOCUMENTS.courtPdf.title).first()).toBeVisible();

    await page.getByRole("tab", { name: /^All/i }).click();
    await page.getByLabel("Filter by document type").selectOption("court_filing");
    await expect(page.getByText(UI_PREVIEW_DOCUMENTS.courtPdf.title).first()).toBeVisible();
    await expect(page.getByText(UI_PREVIEW_DOCUMENTS.evidencePdf.title)).toHaveCount(0);

    await page.getByLabel("Filter by document type").selectOption("evidence");
    await expect(page.getByText(UI_PREVIEW_DOCUMENTS.evidencePdf.title).first()).toBeVisible();

    const matterSelect = page.getByLabel("Filter by Matter");
    const propertyOption = matterSelect.locator("option").filter({ hasText: /Property Dispute/i });
    await expect(propertyOption.first()).toBeAttached({ timeout: 15_000 });
    const matterId = await propertyOption.first().getAttribute("value");
    expect(matterId, "property matter id").toBeTruthy();

    await page.goto(`/client/documents?caseId=${matterId}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await expect(page.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByLabel("Filter by Matter")).toHaveValue(String(matterId), {
      timeout: 30_000,
    });
    await expect(page.getByText(UI_PREVIEW_DOCUMENTS.evidencePdf.title).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test("preview dialog and mobile density have no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await signInPreviewClient(page);
    await openDocuments(page);

    await page.getByLabel(`Preview ${UI_PREVIEW_DOCUMENTS.courtPdf.title}`).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByText(UI_PREVIEW_DOCUMENTS.courtPdf.title)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/client/documents", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible({
      timeout: 60_000,
    });
    const mobileNav = page.getByRole("navigation", { name: "Client primary navigation" });
    await expect(mobileNav.getByRole("link", { name: "Documents" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.locator(".client-documents-card").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("#client-documents-upload-trigger")).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/client/documents", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.locator(".client-documents-library")).toBeVisible({ timeout: 60_000 });
    await assertNoHorizontalOverflow(page);

    await page.locator("#client-documents-upload-trigger").click();
    const uploadDialog = page.getByRole("dialog");
    await expect(uploadDialog).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);
    await expect(uploadDialog.getByLabel("Matter for upload")).toBeVisible();
    const dialogOpacity = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      return dlg ? Number(getComputedStyle(dlg).opacity) : 0;
    });
    expect(dialogOpacity).toBe(1);
    await assertNoHorizontalOverflow(page);
    await page.keyboard.press("Escape");
  });
});
