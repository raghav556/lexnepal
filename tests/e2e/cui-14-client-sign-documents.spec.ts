import { expect, test, type Page } from "@playwright/test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { e2ePasswordFor, UI_PREVIEW_CLIENT } from "../../scripts/e2e/fixtures";
import { prepareE2eAuth } from "./auth-helpers";

async function signInPreviewClient(page: Page) {
  await prepareE2eAuth(page, UI_PREVIEW_CLIENT.email);
  const response = await page.request.post("/api/auth/sign-in/email", {
    data: { email: UI_PREVIEW_CLIENT.email, password: e2ePasswordFor(UI_PREVIEW_CLIENT.email) },
    timeout: 120_000,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function openSigning(page: Page) {
  await page.goto("/client/signatures", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Sign Documents" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("Client Engagement Letter.pdf", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
}

async function noOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(widths.scrollWidth, JSON.stringify(widths)).toBeLessThanOrEqual(widths.clientWidth);
}

if (process.env.CUI14_CHROME_PROOF) test.use({ channel: "chrome", headless: false });

test.describe("CUI-14 Sign Documents", () => {
  test.describe.configure({ timeout: 180_000 });

  test("renders one real pending envelope request and signer-scoped history", async ({ page }) => {
    await signInPreviewClient(page);
    await openSigning(page);
    const navigation = page.getByRole("navigation", { name: "Client portal navigation" });
    await expect(navigation.getByRole("link", { name: "Sign Documents" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      page.getByRole("heading", { name: "Documents awaiting your signature" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Pending signing requests").getByRole("button", { name: "Review & Sign" }),
    ).toHaveCount(1);
    await expect(
      page.getByLabel("Recently signed documents").getByText("NDA Agreement.pdf"),
    ).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Signature event summary" })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "How signing works" })).toBeVisible();
    await expect(
      page.getByLabel("Signing guidance").getByRole("link", { name: "Message Legal Team" }),
    ).toHaveAttribute("href", "/client/messages");
    await expect(
      page.getByText(/verified certificates|signature vault|completion certificates/i),
    ).toHaveCount(0);
    await expect(page.getByText(/storageId|protectedKey|Client B private signature/i)).toHaveCount(
      0,
    );
  });

  test("opens the single root dialog from a real envelope action and previews valid PDF bytes", async ({
    page,
  }) => {
    const frameErrors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /Framing .* violates.*Content Security Policy/i.test(message.text())
      ) {
        frameErrors.push(message.text());
      }
    });
    await signInPreviewClient(page);
    await openSigning(page);
    const previewResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/storage/objects/") &&
        response.request().method() === "GET",
    );
    await page
      .getByLabel("Pending signing requests")
      .getByRole("button", { name: "Review & Sign" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: /Review & Sign: Client Engagement Letter.pdf/ }),
    ).toBeVisible();
    const previewResponse = await previewResponsePromise;
    expect(
      previewResponse.ok(),
      `Document preview returned HTTP ${previewResponse.status()}`,
    ).toBeTruthy();
    expect(previewResponse.request().redirectedFrom()).toBeNull();
    const bytes = await previewResponse.body();
    expect(previewResponse.headers()["content-type"]).toBe("application/pdf");
    expect(previewResponse.headers()["x-frame-options"]).toBe("DENY");
    expect(previewResponse.headers()["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(bytes.toString("ascii", 0, 8)).toMatch(/^%PDF-1\.4/);
    expect(bytes.toString("ascii")).toContain("xref");
    const loadingTask = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
    const pdf = await loadingTask.promise;
    expect(pdf.numPages).toBe(1);
    const pageOne = await pdf.getPage(1);
    const textContent = await pageOne.getTextContent();
    expect(textContent.items.map((item) => ("str" in item ? item.str : "")).join(" ")).toContain(
      "Client Engagement Letter.pdf",
    );
    await loadingTask.destroy();
    await expect(dialog.getByText("Document preview recorded as viewed.")).toBeVisible();
    const preview = dialog.getByTestId("signing-pdf-preview");
    await expect(preview).toHaveAttribute(
      "aria-label",
      "Document preview: Client Engagement Letter.pdf",
    );
    const canvas = preview.getByRole("img", { name: /Page 1 of 1: Client Engagement Letter.pdf/ });
    await expect(canvas).toBeVisible();
    expect(
      await canvas.evaluate((element) => {
        const context = (element as HTMLCanvasElement).getContext("2d");
        if (!context) return false;
        const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data;
        for (let index = 0; index < pixels.length; index += 4) {
          if (
            pixels[index + 3] > 0 &&
            Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) < 200
          ) {
            return true;
          }
        }
        return false;
      }),
    ).toBe(true);
    await expect(dialog.locator("iframe")).toHaveCount(0);
    expect(frameErrors).toHaveLength(0);
    await expect(dialog.getByText("Choose how to sign", { exact: true })).toHaveCount(1);
    await expect(dialog.getByLabel("Full name for typed signature")).toHaveCount(1);
    await expect(dialog.getByRole("checkbox")).toHaveCount(1);
    await expect(dialog.getByLabel("Reason for declining to sign")).toHaveCount(1);
    await expect(dialog.getByTestId("signing-dialog-preview")).toHaveCount(1);
    await expect(dialog.getByLabel("Verification code")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Decline to sign" })).toBeVisible();
    await dialog.getByRole("button", { name: "draw", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "draw", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(dialog.getByRole("img", { name: "Draw your signature" })).toBeVisible();
    await dialog.getByRole("button", { name: "upload", exact: true }).click();
    await expect(dialog.locator('input[type="file"]')).toHaveAttribute(
      "accept",
      "image/png,image/jpeg",
    );
    await dialog.getByRole("button", { name: "type", exact: true }).click();
    await expect(dialog.getByLabel("Full name for typed signature")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Sign document" })).toBeDisabled();
  });

  test("direct action opens the same root dialog without decline controls", async ({ page }) => {
    await page.route("**/api/v1/envelopes/signing-inbox", async (route) => {
      const real = await route.fetch();
      const body = await real.json();
      const envelope = body.data.pendingEnvelopes[0];
      expect(envelope).toBeTruthy();
      await route.fulfill({
        status: real.status(),
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            ...body.data,
            pendingEnvelopes: [],
            pendingDirect: [{ kind: "direct", document: envelope.document }],
          },
        }),
      });
    });
    await signInPreviewClient(page);
    await openSigning(page);
    await page
      .getByLabel("Pending signing requests")
      .getByRole("button", { name: "Review & Sign" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: /Review & Sign: Client Engagement Letter.pdf/ }),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Decline to sign" })).toHaveCount(0);
    await expect(dialog.getByLabel("Verification code")).toBeVisible();
  });

  test("mark-viewed failure stays truthful and keeps Sign disabled", async ({ page }) => {
    await page.route("**/api/v1/envelopes/mark-viewed", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    );
    await signInPreviewClient(page);
    await openSigning(page);
    await page
      .getByLabel("Pending signing requests")
      .getByRole("button", { name: "Review & Sign" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/could not record that you viewed this document/i)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Sign document" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Request verification code" })).toBeDisabled();
  });

  test("preview download failure cannot mark the document viewed", async ({ page }) => {
    await page.route("**/api/v1/documents/*/download", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
    );
    await signInPreviewClient(page);
    await openSigning(page);
    await page
      .getByLabel("Pending signing requests")
      .getByRole("button", { name: "Review & Sign" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("This document could not be opened. Please close and try again."),
    ).toBeVisible();
    await expect(dialog.getByText("Document preview recorded as viewed.")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Request verification code" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Sign document" })).toBeDisabled();
  });

  test("invalid PDF bytes cannot mark the document viewed or enable signing", async ({ page }) => {
    let markViewedCalls = 0;
    await page.route("**/api/v1/storage/objects/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/pdf", body: "not a PDF" }),
    );
    await page.route("**/api/v1/envelopes/mark-viewed", (route) => {
      markViewedCalls += 1;
      return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });
    await signInPreviewClient(page);
    await openSigning(page);
    await page
      .getByLabel("Pending signing requests")
      .getByRole("button", { name: "Review & Sign" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("This document could not be opened. Please close and try again."),
    ).toBeVisible();
    expect(markViewedCalls).toBe(0);
    await expect(dialog.getByText("Document preview recorded as viewed.")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Sign document" })).toBeDisabled();
  });

  test("dialog keeps keyboard focus inside and restores the request action on Escape", async ({
    page,
  }) => {
    await signInPreviewClient(page);
    await openSigning(page);
    const trigger = page
      .getByLabel("Pending signing requests")
      .getByRole("button", { name: "Review & Sign" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))))
      .toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("review dialog stays opaque above mobile navigation with its final action reachable", async ({
    page,
  }) => {
    await signInPreviewClient(page);
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
      [360, 800],
    ] as const) {
      await page.setViewportSize({ width, height });
      await openSigning(page);
      await page
        .getByLabel("Pending signing requests")
        .getByRole("button", { name: "Review & Sign" })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toHaveAccessibleName(/Review & Sign: Client Engagement Letter\.pdf/);
      await expect(dialog.getByRole("button", { name: "Close dialog" })).toBeInViewport();
      await expect(dialog.getByRole("button", { name: "Sign document" })).toBeInViewport();
      await expect(page.getByTestId("signing-dialog-preview")).toBeVisible();

      const geometry = await page.evaluate(() => {
        const surface = document.querySelector<HTMLElement>("[data-client-signing-dialog]");
        const overlay = surface?.parentElement;
        const nav = document.querySelector<HTMLElement>(
          'nav[aria-label="Client primary navigation"]',
        );
        const scroll = document.querySelector<HTMLElement>('[data-testid="signing-dialog-scroll"]');
        if (!surface || !overlay || !scroll) throw new Error("Signing dialog is missing");
        const token = getComputedStyle(surface).getPropertyValue("--dashboard-panel").trim();
        const sample = document.createElement("div");
        sample.style.backgroundColor = token;
        document.body.append(sample);
        const expectedBackground = getComputedStyle(sample).backgroundColor;
        sample.remove();
        const rect = surface.getBoundingClientRect();
        const navRect = nav?.getBoundingClientRect();
        const navIsVisible = Boolean(navRect && navRect.width > 0 && navRect.height > 0);
        const topAtNav =
          navIsVisible && navRect
            ? document.elementFromPoint(navRect.left + navRect.width / 2, navRect.bottom - 8)
            : null;
        return {
          surfaceBackground: getComputedStyle(surface).backgroundColor,
          expectedBackground,
          surfaceOpacity: getComputedStyle(surface).opacity,
          overlayOpacity: getComputedStyle(overlay).opacity,
          overlayAboveNav: nav
            ? Number(getComputedStyle(overlay).zIndex) > Number(getComputedStyle(nav).zIndex)
            : true,
          navCoveredByOverlay: navIsVisible
            ? Boolean(topAtNav && overlay.contains(topAtNav))
            : true,
          contained:
            rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= window.innerWidth &&
            rect.bottom <= window.innerHeight,
          scrollable: scroll.scrollHeight > scroll.clientHeight,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      expect(geometry.surfaceBackground).toBe(geometry.expectedBackground);
      expect(geometry.surfaceOpacity).toBe("1");
      expect(geometry.overlayOpacity).toBe("1");
      expect(geometry.overlayAboveNav).toBe(true);
      expect(geometry.navCoveredByOverlay).toBe(true);
      expect(geometry.contained).toBe(true);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
      if (width < 500) {
        expect(geometry.scrollable).toBe(true);
        await page.getByTestId("signing-dialog-scroll").evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        await expect(dialog.getByRole("checkbox")).toBeInViewport();
        await expect(dialog.getByRole("button", { name: "Decline to sign" })).toBeInViewport();
        await expect(dialog.getByRole("button", { name: "Sign document" })).toBeInViewport();
      }
      await dialog.getByRole("button", { name: "Cancel" }).click();
    }
  });

  test("preserves mobile navigation and has no horizontal overflow across review widths", async ({
    page,
  }) => {
    await signInPreviewClient(page);
    for (const [width, height] of [
      [1440, 900],
      [1280, 800],
      [1024, 768],
      [768, 900],
      [390, 844],
      [360, 800],
    ] as const) {
      await page.setViewportSize({ width, height });
      await openSigning(page);
      await noOverflow(page);
      if (width <= 390) {
        const mobile = page.getByRole("navigation", { name: "Client primary navigation" });
        await expect(mobile.getByRole("link", { name: "Sign Documents" })).toHaveCount(0);
        await page
          .getByLabel("Pending signing requests")
          .getByRole("button", { name: "Review & Sign" })
          .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await noOverflow(page);
        await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
      }
    }
  });

  test("captures owner evidence from the real fixture", async ({ page }) => {
    test.skip(!process.env.CUI14_CAPTURE, "Owner evidence is captured only on demand");
    const root = path.resolve("..", "..", "qa", "cui-14");
    await mkdir(root, { recursive: true });
    await signInPreviewClient(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openSigning(page);
    await page.screenshot({ path: path.join(root, "01-desktop-pending.png"), fullPage: true });
    await page
      .getByLabel("Pending signing requests")
      .getByRole("button", { name: "Review & Sign" })
      .click();
    await expect(
      page.getByRole("dialog").getByText("Document preview recorded as viewed."),
    ).toBeVisible();
    await expect(
      page.getByTestId("signing-pdf-preview").getByRole("img", { name: /Page 1 of 1/ }),
    ).toBeVisible();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(root, "02-desktop-review-sign.png") });
    await page.screenshot({ path: path.join(root, "07-desktop-pdf-preview.png") });
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    await page
      .locator('section[data-slot="dashboard-section"]')
      .filter({ has: page.getByRole("heading", { name: "Recently signed" }) })
      .screenshot({ path: path.join(root, "03-desktop-recently-signed.png") });

    await page.setViewportSize({ width: 390, height: 844 });
    await openSigning(page);
    await page.screenshot({ path: path.join(root, "04-mobile-pending.png"), fullPage: true });
    await page
      .getByLabel("Pending signing requests")
      .getByRole("button", { name: "Review & Sign" })
      .click();
    await expect(
      page.getByRole("dialog").getByText("Document preview recorded as viewed."),
    ).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: path.join(root, "05-mobile-review-sign.png") });

    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    await page.setViewportSize({ width: 360, height: 800 });
    await openSigning(page);
    await page
      .getByLabel("Pending signing requests")
      .getByRole("button", { name: "Review & Sign" })
      .click();
    const smallDialog = page.getByRole("dialog");
    await expect(smallDialog.getByText("Document preview recorded as viewed.")).toBeVisible();
    await page.getByTestId("signing-dialog-scroll").evaluate((element) => {
      element.scrollTop = Math.max(0, element.scrollHeight - element.clientHeight - 8);
    });
    await expect(smallDialog.getByRole("button", { name: "Sign document" })).toBeInViewport();
    await noOverflow(page);
    await page.screenshot({ path: path.join(root, "06-mobile-review-sign-360.png") });
  });
});
