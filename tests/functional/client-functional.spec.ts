import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { FixtureOptions } from "./support/adapters";
import { createVisualData } from "../visual/support/scenarios";
import { MAX_DOCUMENT_BYTES } from "../../src/shared/contracts/documents";

const artifacts = path.resolve(process.env.CUI20_ARTIFACT_DIR!);
const healthy = createVisualData("healthy");
const matter2 = {
  ...healthy.cases[0],
  _id: "matter-2",
  id: "matter-2",
  title: "Synthetic property appeal",
  caseNumber: "PROP-002",
  status: "closed",
  practiceArea: "Property",
};
const matters = [healthy.cases[0], matter2];
const errors: string[] = [];
const attemptedNetwork: string[] = [];
async function mount(page: Page, route: string, options: FixtureOptions = {}) {
  await page.goto("https://client-functional.invalid/__fixture__");
  await page.clock.setFixedTime(new Date("2026-09-18T04:15:00.000Z"));
  await page.addStyleTag({ content: fs.readFileSync(path.join(artifacts, "fixture.css"), "utf8") });
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important}",
  });
  await page.addScriptTag({ content: fs.readFileSync(path.join(artifacts, "fixture.js"), "utf8") });
  await page.evaluate(
    ({ route, options }) => {
      const original = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        if (blob instanceof Blob)
          void blob.text().then((text) => window.clientFunctional.captureDownload(blob.type, text));
        return original(blob);
      };
      window.renderClientFunctional(route, options);
    },
    { route, options },
  );
  await page.locator("[data-client-shell] main").waitFor();
}
async function commands(page: Page, name: string) {
  return page.evaluate(
    (name) => window.clientFunctional.events().filter((event) => event.command === name),
    name,
  );
}
async function expectCommand(page: Page, name: string, count = 1) {
  await expect.poll(async () => (await commands(page, name)).length).toBe(count);
  return (await commands(page, name))[count - 1];
}
test.beforeEach(async ({ page, context }) => {
  errors.length = attemptedNetwork.length = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route("**/*", (route) => {
    if (route.request().url() === "https://client-functional.invalid/__fixture__")
      return route.fulfill({
        contentType: "text/html",
        body: '<!DOCTYPE html><html lang="en"><head><title>Isolated Client functional fixture</title></head><body><div id="root"></div></body></html>',
      });
    attemptedNetwork.push(route.request().url());
    return route.abort();
  });
});
test.afterEach(async ({ page }, info) => {
  await info.attach("in-memory-operations", {
    body: JSON.stringify(
      await page.evaluate(() => ({
        events: window.clientFunctional?.events(),
        navigation: window.clientFunctional?.navigation(),
        downloads: window.clientFunctional?.downloads(),
      })),
      null,
      2,
    ),
    contentType: "application/json",
  });
  await info.attach("blocked-network", {
    body: JSON.stringify(attemptedNetwork),
    contentType: "application/json",
  });
  expect(errors, "Unhandled browser errors").toEqual([]);
});

test("Home — KPI, matter, document and quick-action navigation", async ({ page }) => {
  await mount(page, "/client");
  const main = page.locator("main");
  for (const href of [
    "/client/cases",
    "/client/cases/matter-1",
    "/client/documents",
    "/client/messages",
    "/client/booking",
  ]) {
    const link = main.locator(`a[href='${href}']`).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect
      .poll(() => page.evaluate(() => window.clientFunctional.navigation().at(-1)))
      .toBe(href);
  }
  expect(await commands(page, "sendMessage")).toHaveLength(0);
});
test("Home — a delayed hearing source preserves working matter actions", async ({ page }) => {
  await mount(page, "/client", { queries: { hearings: { pending: true } } });
  await page.locator("main a[href='/client/cases/matter-1']").first().click();
  expect(await page.evaluate(() => window.clientFunctional.navigation())).toContain(
    "/client/cases/matter-1",
  );
  await expect(page.locator("main")).toContainText("Loading");
});
test("My Matters — search, type/status filters and Cards/Table switching", async ({ page }) => {
  await mount(page, "/client/cases", { data: { cases: matters } });
  const main = page.locator("main");
  await page.getByLabel("Search matters", { exact: true }).fill("property");
  await expect(main.locator("a[href='/client/cases/matter-2']").first()).toBeVisible();
  await expect(page.locator(".client-matters-cards a[href='/client/cases/matter-1']")).toHaveCount(
    0,
  );
  await page.getByLabel("Search matters", { exact: true }).fill("");
  await page.getByLabel("Matter Type", { exact: true }).selectOption("Property");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(page.getByRole("table")).toContainText("PROP-002");
  await page.getByLabel("Matter Type", { exact: true }).selectOption("");
  await page.getByLabel("Status", { exact: true }).selectOption("active");
  await expect(page.getByRole("table")).not.toContainText("PROP-002");
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(page.getByRole("table")).toHaveCount(0);
});
test("My Matters — pagination resets after searching and messaging targets the matter", async ({
  page,
}) => {
  const cases = Array.from({ length: 35 }, (_, i) => ({
    ...healthy.cases[0],
    _id: "matter-" + (i + 1),
    id: "matter-" + (i + 1),
    title: "Synthetic matter " + (i + 1),
  }));
  await mount(page, "/client/cases", { data: { cases } });
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByRole("button", { name: "Previous page", exact: true })).toBeEnabled();
  await page.getByLabel("Search matters", { exact: true }).fill("Synthetic matter 35");
  await expect(page.locator("main a[href='/client/cases/matter-35']").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Next page", exact: true })).toHaveCount(0);
  await expect(
    page.locator("main a[href='/client/messages?caseId=matter-35']").first(),
  ).toHaveAttribute("href", "/client/messages?caseId=matter-35");
});
test("Matter Details — section tabs, scoped checklist, document and discussion actions", async ({
  page,
}) => {
  await mount(page, "/client/cases/matter-1");
  for (const tab of ["Hearings", "Team", "Actions", "Documents", "Updates", "Overview"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await expect(page.getByRole("tab", { name: tab, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tabpanel")).toBeVisible();
  }
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await page
    .getByRole("button", { name: /Download/i })
    .first()
    .click();
  expect((await expectCommand(page, "downloadDocument")).args[0]).toBe("document-1");
  await expect(
    page.locator("main a[href='/client/messages?caseId=matter-1']").first(),
  ).toHaveAttribute("href", "/client/messages?caseId=matter-1");
});
for (const status of [401, 403, 404])
  test(`Matter Details — ${status} never exposes cached authorized matter`, async ({ page }) => {
    await mount(page, "/client/cases/matter-1", { queries: { detail: { status } } });
    await expect(page.locator("main")).not.toContainText(healthy.detail.title);
    expect(await commands(page, "downloadDocument")).toHaveLength(0);
  });
for (const width of [1440, 1280, 1024, 768, 390, 360])
  test(`S22-A11Y-01 — Matter Details breadcrumb contrast and keyboard access at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await mount(page, "/client/cases/matter-1");
    await page.evaluate(() => document.fonts.ready);
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb", exact: true });
    const link = breadcrumb.getByRole("link", { name: "My Matters", exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/client/cases");
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(healthy.detail.title);

    // Reach the real link using the keyboard, without forcing focus or clicking it.
    for (
      let tab = 0;
      tab < 60 && !(await link.evaluate((node) => document.activeElement === node));
      tab++
    )
      await page.keyboard.press("Tab");
    await expect(link).toBeFocused();

    const measurements = await breadcrumb.evaluate((nav) => {
      const hero = nav.closest('[data-slot="dashboard-hero"]');
      const anchor = nav.querySelector("a");
      const separator = nav.querySelector('li[aria-hidden="true"]');
      const current = nav.querySelector('[aria-current="page"]');
      if (!hero || !anchor || !separator || !current) throw new Error("Missing breadcrumb parts");
      const surface = getComputedStyle(hero);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas color measurement unavailable");
      // Rasterize CSS colors over the actual white header, including translucent text.
      function rgb(color: string, background: string) {
        context!.clearRect(0, 0, 1, 1);
        context!.fillStyle = background;
        context!.fillRect(0, 0, 1, 1);
        context!.fillStyle = color;
        context!.fillRect(0, 0, 1, 1);
        return Array.from(context!.getImageData(0, 0, 1, 1).data).slice(0, 3);
      }
      function luminance(channels: number[]) {
        const linear = channels.map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
      }
      function contrast(color: string) {
        const foreground = luminance(rgb(color, surface.backgroundColor));
        const background = luminance(rgb(surface.backgroundColor, "white"));
        return (
          (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
        );
      }
      const text = [anchor, separator, current].map((node) => {
        const style = getComputedStyle(node);
        return {
          text: node.textContent,
          color: style.color,
          contrast: contrast(style.color),
          opacity: style.opacity,
          background: style.backgroundColor,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          rect: node.getBoundingClientRect().toJSON(),
        };
      });
      const focus = getComputedStyle(anchor);
      return {
        background: surface.backgroundColor,
        backgroundImage: surface.backgroundImage,
        heroOpacity: surface.opacity,
        text,
        focus: {
          visible: anchor.matches(":focus-visible"),
          color: focus.outlineColor,
          width: focus.outlineWidth,
          offset: focus.outlineOffset,
          style: focus.outlineStyle,
          contrast: contrast(focus.outlineColor),
        },
      };
    });
    await info.attach("breadcrumb-contrast", {
      body: JSON.stringify({ width, ...measurements }, null, 2),
      contentType: "application/json",
    });
    await info.attach("focused-breadcrumb", {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
    // These assumptions keep the measurement valid if the header treatment changes.
    expect(measurements.background).toBe("rgb(255, 255, 255)");
    expect(measurements.backgroundImage).toBe("none");
    expect(measurements.heroOpacity).toBe("1");
    for (const sample of measurements.text) {
      expect(sample.opacity).toBe("1");
      expect(sample.background).toBe("rgba(0, 0, 0, 0)");
      expect(sample.contrast, `Normal text: ${sample.text}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(measurements.focus.visible).toBe(true);
    expect(measurements.focus.style).toBe("solid");
    expect(parseFloat(measurements.focus.width)).toBeGreaterThanOrEqual(2);
    expect(parseFloat(measurements.focus.offset)).toBeGreaterThanOrEqual(2);
    expect(measurements.focus.contrast).toBeGreaterThanOrEqual(3);
    await page.keyboard.press("Enter");
    await expect
      .poll(() => page.evaluate(() => window.clientFunctional.navigation().at(-1)))
      .toBe("/client/cases");
  });

test("Hearings — search, upcoming/past/all, matter filter and calendar export", async ({
  page,
}) => {
  const hearings = [
    healthy.hearings[0],
    {
      ...healthy.hearings[0],
      _id: "past-hearing",
      caseId: "matter-2",
      dateGregorian: "2026-09-10",
      purpose: "Past evidence review",
      status: "completed",
    },
  ];
  await mount(page, "/client/hearings", { data: { cases: matters, hearings } });
  await page.getByRole("button", { name: /^Past \(/ }).click();
  await expect(page.locator("main")).toContainText("Past evidence review");
  await page.getByRole("button", { name: /^All \(/ }).click();
  await page.getByLabel("Filter by Matter", { exact: true }).selectOption("matter-1");
  await expect(page.locator(".client-hearings-main")).not.toContainText("Past evidence review");
  await page.getByRole("searchbox").fill("unmatched");
  await expect(page.locator(".client-hearings-main")).not.toContainText("Evidence hearing");
  await page.getByRole("searchbox").fill("");
  await page
    .getByRole("button", { name: /Add to calendar|Export calendar/i })
    .first()
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.clientFunctional
          .downloads()
          .some((item) => item.text.includes("BEGIN:VCALENDAR") && item.text.includes("20260924")),
      ),
    )
    .toBe(true);
});
test("Checklist — due/status/search filters, progress and read-only Client permissions", async ({
  page,
}) => {
  const tasks = [
    healthy.tasks[0],
    { ...healthy.tasks[0], _id: "done-task", title: "Completed evidence review", status: "done" },
    {
      ...healthy.tasks[0],
      _id: "overdue-task",
      title: "Overdue evidence review",
      dueDate: "2026-09-10",
    },
  ];
  await mount(page, "/client/checklist", { data: { tasks } });
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
  await page
    .getByRole("button", { name: /^Completed/ })
    .first()
    .click();
  await expect(page.locator(".client-checklist-list-card")).toContainText(
    "Completed evidence review",
  );
  await expect(page.locator(".client-checklist-list-card")).not.toContainText(
    "Overdue evidence review",
  );
  await page
    .getByRole("button", { name: /^Overdue/ })
    .first()
    .click();
  await expect(page.locator(".client-checklist-list-card")).toContainText(
    "Overdue evidence review",
  );
  await page.getByLabel("Search checklist by title, description or Matter").fill("unmatched");
  await expect(page.locator(".client-checklist-list-card")).toContainText(
    "No checklist items match",
  );
  expect(await page.evaluate(() => window.clientFunctional.events())).toHaveLength(0);
  await expect(
    page.getByRole("button", { name: /complete task|mark done|delete task|edit task/i }),
  ).toHaveCount(0);
});
test("Documents — search/type/matter filters, pagination, preview and download", async ({
  page,
}) => {
  const documents = Array.from({ length: 26 }, (_, i) => ({
    ...healthy.documents[0],
    _id: "document-" + (i + 1),
    title: "Evidence " + (i + 1),
    mimeType: "image/png",
  }));
  await mount(page, "/client/documents", { data: { documents } });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Search documents", { exact: true }).fill("Evidence 26");
  await expect(page.locator("main")).toContainText("Evidence 26");
  await page.getByRole("button", { name: "Preview Evidence 26", exact: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect((await expectCommand(page, "downloadDocument")).args[0]).toBe("document-26");
  await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: /Download/ })
    .first()
    .click();
  await expectCommand(page, "downloadDocument", 2);
});
test("Documents — successful upload payload, busy state and failure handling", async ({ page }) => {
  await mount(page, "/client/documents", { holds: ["uploadDocument"] });
  await page.getByRole("button", { name: "Upload Document", exact: true }).first().click();
  const file = {
    name: "synthetic-evidence.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("synthetic bytes"),
  };
  await page.getByLabel("Choose files to upload", { exact: true }).setInputFiles(file);
  await expect(page.getByRole("dialog")).toContainText("Uploading and scanning");
  const event = await expectCommand(page, "uploadDocument");
  expect(event.args[0]).toMatchObject({ caseId: "matter-1", title: file.name, type: "other" });
  await page.evaluate(() => window.clientFunctional.release("uploadDocument"));
  await expect(page.getByRole("dialog")).toContainText("Upload received");
});
test("Documents — failed upload can be retried without false success", async ({ page }) => {
  await mount(page, "/client/documents", {
    failures: { uploadDocument: "Synthetic scan rejected" },
  });
  await page.getByRole("button", { name: "Upload Document", exact: true }).first().click();
  await page.getByLabel("Choose files to upload", { exact: true }).setInputFiles({
    name: "evidence.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("test"),
  });
  await expect(page.getByRole("dialog")).toContainText("Upload failed");
  await expect(page.locator("body")).toContainText("Synthetic scan rejected");
  await page.evaluate(() => window.clientFunctional.recover("uploadDocument"));
  await page
    .getByLabel("Choose files to upload", { exact: true })
    .setInputFiles({ name: "retry.pdf", mimeType: "application/pdf", buffer: Buffer.from("test") });
  await expect(page.getByRole("dialog")).toContainText("Upload received");
});
test("Documents — absent authorized matters prevents upload", async ({ page }) => {
  await mount(page, "/client/documents", { data: { cases: [] } });
  await page.getByRole("button", { name: "Upload Document", exact: true }).first().click();
  await expect(page.getByLabel("Choose files to upload", { exact: true })).toBeDisabled();
  expect(await commands(page, "uploadDocument")).toHaveLength(0);
});
test("Documents — matter/type/source filters operate on the returned authorized collection", async ({
  page,
}) => {
  const own = {
    ...healthy.documents[0],
    _id: "own-document",
    title: "Synthetic own contract",
    type: "contract",
    uploadedBy: "visual-user",
    caseId: "matter-2",
  };
  await mount(page, "/client/documents", {
    data: { cases: matters, documents: [healthy.documents[0], own] },
  });
  await page.getByLabel("Filter by Matter", { exact: true }).selectOption("matter-2");
  await expect(
    page.getByRole("button", { name: /Preview Synthetic own contract/ }).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Preview Evidence submission/ })).toHaveCount(0);
  await page.getByLabel("Filter by document type", { exact: true }).selectOption("contract");
  await page.getByRole("button", { name: /^My Uploads/ }).click();
  await expect(
    page.getByRole("button", { name: /Preview Synthetic own contract/ }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Legal Team/ }).click();
  await expect(page.getByRole("button", { name: /Preview Synthetic own contract/ })).toHaveCount(0);
});
test("Documents — oversized file is rejected before an upload intent", async ({ page }) => {
  await mount(page, "/client/documents");
  await page.getByRole("button", { name: "Upload Document", exact: true }).first().click();
  const file = await page.evaluateHandle((size) => {
    const transfer = new DataTransfer();
    const file = new File(["synthetic"], "synthetic-large.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: size });
    transfer.items.add(file);
    return transfer;
  }, MAX_DOCUMENT_BYTES + 1);
  await page
    .getByRole("button", { name: "Upload document files", exact: true })
    .dispatchEvent("drop", { dataTransfer: file });
  await expect(page.getByRole("dialog")).toContainText("Upload failed");
  expect(await commands(page, "uploadDocument")).toHaveLength(0);
});
test("Documents — repeated drop while uploading cannot create a second upload", async ({
  page,
}) => {
  await mount(page, "/client/documents", { holds: ["uploadDocument"] });
  await page.getByRole("button", { name: "Upload Document", exact: true }).first().click();
  const file = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["synthetic"], "synthetic.pdf", { type: "application/pdf" }));
    return transfer;
  });
  const drop = page.getByRole("button", { name: "Upload document files", exact: true });
  await drop.dispatchEvent("drop", { dataTransfer: file });
  await expect(page.getByRole("dialog")).toContainText("Uploading and scanning");
  await drop.dispatchEvent("drop", { dataTransfer: file });
  expect(await commands(page, "uploadDocument")).toHaveLength(1);
  await page.evaluate(() => window.clientFunctional.release("uploadDocument"));
  await expect(page.getByRole("dialog")).toContainText("Upload received");
});
test("Documents — preview failure is visible and does not expose a usable download", async ({
  page,
}) => {
  await mount(page, "/client/documents", {
    failures: { downloadDocument: "Synthetic access denied" },
  });
  await page
    .getByRole("button", { name: /Preview Evidence submission/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Preview unavailable");
  await expect(page.locator("body")).toContainText("Failed to load document preview");
});
test("Messages — conversation changes scope the thread and read command", async ({ page }) => {
  const second = {
    ...healthy.messages.page[0],
    _id: "message-2",
    caseId: "matter-2",
    content: "Synthetic second conversation",
  };
  await mount(page, "/client/messages", {
    data: {
      cases: matters,
      messages: { ...healthy.messages, page: [healthy.messages.page[0], second] },
    },
  });
  await expect(page.locator("main")).toContainText(healthy.messages.page[0].content);
  await page.locator(".client-messages-channel").filter({ hasText: matter2.title }).click();
  await expect(page.locator("main")).toContainText(second.content);
  await expect(page.locator("main")).not.toContainText(healthy.messages.page[0].content);
  expect((await expectCommand(page, "markMessagesRead", 2)).args[0]).toEqual({
    caseId: "matter-2",
  });
});
test("Messages — matter lookup failure retries without opening an unrelated thread", async ({
  page,
}) => {
  await mount(page, "/client/messages", {
    search: "caseId=matter-1",
    queries: { cases: { status: 503, missing: true } },
  });
  await expect(page.locator("main textarea")).toHaveCount(0);
  await page
    .getByRole("button", { name: /Try again|Retry/i })
    .first()
    .click();
  await expectCommand(page, "refetch:cases");
  await expect(page.locator("main textarea")).toBeVisible();
});
test("Messages — failed unread count requests retry rather than reporting zero", async ({
  page,
}) => {
  await mount(page, "/client/messages", { queries: { unread: { status: 503, missing: true } } });
  await expect(page.locator("main")).toContainText("Unread counts unavailable");
  await page
    .getByRole("button", { name: /Try again|Retry/i })
    .first()
    .click();
  await expectCommand(page, "refetch:unread");
  await expect(page.locator("main")).not.toContainText("Unread counts unavailable");
});
test("Messages — attachment intent/storage/completion precede the scoped send", async ({
  page,
}) => {
  await mount(page, "/client/messages", { search: "caseId=matter-1" });
  await page.locator("main input[type='file']").setInputFiles({
    name: "synthetic-attachment.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("synthetic"),
  });
  await expectCommand(page, "attachmentComplete");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  expect((await expectCommand(page, "sendMessage")).args[0]).toMatchObject({
    caseId: "matter-1",
    content: "(attachment)",
    isInternal: false,
    attachmentIds: ["synthetic-attachment-key"],
  });
  const events = await page.evaluate(() =>
    window.clientFunctional.events().map((event) => event.command),
  );
  expect(events.indexOf("attachmentIntent")).toBeLessThan(events.indexOf("attachmentStorage"));
  expect(events.indexOf("attachmentStorage")).toBeLessThan(events.indexOf("attachmentComplete"));
  expect(events.indexOf("attachmentComplete")).toBeLessThan(events.indexOf("sendMessage"));
});
test("Messages — failed attachment upload has feedback and allows retry", async ({ page }) => {
  await mount(page, "/client/messages", {
    search: "caseId=matter-1",
    failures: { attachmentStorage: "Synthetic attachment rejected" },
  });
  const file = {
    name: "synthetic-attachment.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("synthetic"),
  };
  await page.locator("main input[type='file']").setInputFiles(file);
  await expect(page.locator("body")).toContainText("Synthetic attachment rejected");
  expect(await commands(page, "attachmentComplete")).toHaveLength(0);
  await page.evaluate(() => window.clientFunctional.recover("attachmentStorage"));
  await page.locator("main input[type='file']").setInputFiles(file);
  await expectCommand(page, "attachmentComplete");
});
test("Messages — denied Client access prevents drag-and-drop attachment commands", async ({
  page,
}) => {
  await mount(page, "/client/messages", {
    search: "caseId=matter-1",
    queries: { messages: { status: 403 } },
  });
  const transfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["synthetic"], "synthetic.pdf", { type: "application/pdf" }));
    return transfer;
  });
  await page
    .locator("main [data-appearance='client']")
    .last()
    .dispatchEvent("drop", { dataTransfer: transfer });
  expect(await commands(page, "attachmentIntent")).toHaveLength(0);
});
test("Notifications — independent hearing dates remain navigable when appointments fail", async ({
  page,
}) => {
  await mount(page, "/client/notifications", {
    queries: { appointments: { status: 503, missing: true } },
  });
  await page.getByRole("link", { name: "View hearings", exact: true }).click();
  expect(await page.evaluate(() => window.clientFunctional.navigation())).toContain(
    "/client/hearings",
  );
  await expect(page.locator("main")).toContainText("Unable to load appointment dates");
});
test("Notifications — an existing read notification navigates to its safe Client destination", async ({
  page,
}) => {
  await mount(page, "/client/notifications", {
    data: { notifications: [{ ...healthy.notifications[0], isRead: true }] },
  });
  const requested = page.waitForRequest("https://client-functional.invalid/client/hearings");
  await page.getByRole("button", { name: new RegExp(healthy.notifications[0].title) }).click();
  expect((await requested).url()).toBe("https://client-functional.invalid/client/hearings");
});
test("Profile — successful password change clears the form and account sign-out is delegated", async ({
  page,
}) => {
  await mount(page, "/client/profile");
  await page.getByLabel("Current Password", { exact: true }).fill("synthetic-current");
  await page.getByLabel("New Password", { exact: true }).fill("synthetic-new");
  await page.getByLabel("Confirm New Password", { exact: true }).fill("synthetic-new");
  await page.getByRole("button", { name: "Update Password", exact: true }).click();
  await expectCommand(page, "changePassword");
  await expect(page.getByLabel("Current Password", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expectCommand(page, "signout");
});
test("Profile — a password change in flight prevents duplicate submission", async ({ page }) => {
  await mount(page, "/client/profile", { holds: ["changePassword"] });
  await page.getByLabel("Current Password", { exact: true }).fill("synthetic-current");
  await page.getByLabel("New Password", { exact: true }).fill("synthetic-new");
  await page.getByLabel("Confirm New Password", { exact: true }).fill("synthetic-new");
  const submit = page
    .locator("form")
    .filter({ has: page.locator("#profile-current-password") })
    .locator("button[type='submit']");
  await submit.click();
  await expectCommand(page, "changePassword");
  await expect(submit).toBeDisabled();
  await submit.locator("..").dispatchEvent("submit");
  await page.evaluate(() => window.clientFunctional.release("changePassword"));
  await expect(page.getByLabel("Current Password", { exact: true })).toHaveValue("");
  expect(await commands(page, "changePassword")).toHaveLength(1);
});
for (const variant of ["staff", "admin"] as const)
  test(`Shared Profile — ${variant} retains General editing and its existing security controls`, async ({
    page,
  }) => {
    await mount(page, "/client/profile", { profileVariant: variant });
    await expect(page.getByRole("tab", { name: "General", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page
      .getByRole("tabpanel")
      .getByRole("textbox")
      .first()
      .fill("Synthetic shared account name");
    await page.getByRole("button", { name: "Save Changes", exact: true }).click();
    expect((await expectCommand(page, "updateProfile")).args[0]).toMatchObject({
      name: "Synthetic shared account name",
    });
    await page.getByRole("tab", { name: "Security", exact: true }).click();
    await expect(page.getByRole("button", { name: "Update Password", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Enable 2FA", exact: true })).toBeVisible();
  });
test("Profile — local profile export includes only the current synthetic account", async ({
  page,
}) => {
  await mount(page, "/client/profile");
  await page.getByRole("tab", { name: "Data & Privacy", exact: true }).click();
  await page.getByRole("button", { name: "Download Profile", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.clientFunctional.downloads().filter((item) => item.type === "application/json")
            .length,
      ),
    )
    .toBe(1);
  const exported = await page.evaluate(
    () =>
      window.clientFunctional.downloads().find((item) => item.type === "application/json")!.text,
  );
  expect(JSON.parse(exported)).toMatchObject({
    profile: { name: "Ravi Sharma", email: "ravi@visual.example.invalid" },
  });
});
test("Profile — sign out other devices preserves the current synthetic session", async ({
  page,
}) => {
  const other = {
    ...healthy.sessions[0],
    id: "synthetic-other-session",
    isCurrent: false,
    current: false,
  };
  await mount(page, "/client/profile", { data: { sessions: [healthy.sessions[0], other] } });
  await page.getByRole("tab", { name: "Active Sessions", exact: true }).click();
  await page.getByRole("button", { name: "Sign out everywhere else", exact: true }).click();
  expect((await expectCommand(page, "revokeAllOtherSessions")).args[0]).toBe("visual-user");
  await expect(page.locator("main")).toContainText("Current session");
  await expect(page.getByRole("button", { name: "Revoke", exact: true })).toHaveCount(0);
});
for (const rejected of [false, true])
  test(`Sign Documents — envelope decline ${rejected ? "failure retains review" : "success records the reason"}`, async ({
    page,
  }) => {
    const envelope = {
      kind: "envelope",
      envelopeId: "synthetic-envelope",
      recipientId: "synthetic-recipient",
      routing: "parallel",
      order: 0,
      envelopeTitle: "Synthetic engagement",
      document: {
        ...healthy.inbox.pendingDirect[0].document,
        mimeType: "image/png",
        title: "Synthetic declaration.png",
      },
    };
    await mount(page, "/client/signatures", {
      data: { inbox: { ...healthy.inbox, pendingDirect: [], pendingEnvelopes: [envelope] } },
      failures: rejected ? { declineEnvelope: "Synthetic decline rejected" } : {},
    });
    await page.getByRole("button", { name: "Review & Sign", exact: true }).click();
    await expect(page.getByRole("button", { name: "Decline to sign", exact: true })).toBeDisabled();
    await page
      .getByLabel("Reason for declining to sign", { exact: true })
      .fill("Synthetic correction required");
    await page.getByRole("button", { name: "Decline to sign", exact: true }).click();
    expect((await expectCommand(page, "declineEnvelope")).args[0]).toEqual({
      envelopeId: "synthetic-envelope",
      reason: "Synthetic correction required",
    });
    if (rejected) {
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.locator("body")).toContainText("Synthetic decline rejected");
    } else await expect(page.getByRole("dialog")).toHaveCount(0);
  });
test("Messages — valid deep link, message send/read payload and duplicate guard", async ({
  page,
}) => {
  await mount(page, "/client/messages", { search: "caseId=matter-1", holds: ["sendMessage"] });
  await expect(page.locator("main")).toContainText(healthy.messages.page[0].content);
  expect((await expectCommand(page, "markMessagesRead")).args[0]).toEqual({ caseId: "matter-1" });
  const composer = page.locator("main textarea");
  await composer.fill("  Synthetic reply  ");
  await composer.press("Enter");
  const event = await expectCommand(page, "sendMessage");
  expect(event.args[0]).toMatchObject({
    caseId: "matter-1",
    content: "Synthetic reply",
    isInternal: false,
  });
  await composer.press("Enter");
  expect(await commands(page, "sendMessage")).toHaveLength(1);
  await page.evaluate(() => window.clientFunctional.release("sendMessage"));
  await expect(composer).toHaveValue("");
  await expect(page.locator("main")).toContainText("Synthetic reply");
});
test("Messages — failed send preserves draft and allows retry", async ({ page }) => {
  await mount(page, "/client/messages", {
    search: "caseId=matter-1",
    failures: { sendMessage: "Synthetic send rejected" },
  });
  const composer = page.locator("main textarea");
  await composer.fill("Keep my draft");
  await composer.press("Enter");
  await expect(page.locator("body")).toContainText("Synthetic send rejected");
  await expect(composer).toHaveValue("Keep my draft");
  await page.evaluate(() => window.clientFunctional.recover("sendMessage"));
  await composer.press("Enter");
  await expect(composer).toHaveValue("");
  await expectCommand(page, "sendMessage", 2);
});
test("Shared chat — Staff presentation retains internal send permissions and contains a failed send", async ({
  page,
}) => {
  await mount(page, "/client/messages", {
    sharedChat: true,
    failures: { sendMessage: "Synthetic shared send rejected" },
  });
  await page.getByRole("button", { name: "Case Team Only", exact: true }).click();
  await page.getByLabel("Message", { exact: true }).fill("Synthetic internal note");
  await page.getByLabel("Message", { exact: true }).press("Enter");
  expect((await expectCommand(page, "sendMessage")).args[0]).toMatchObject({
    isInternal: true,
    content: "Synthetic internal note",
  });
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Synthetic internal note");
  await page.evaluate(() => window.clientFunctional.recover("sendMessage"));
  await page.getByLabel("Message", { exact: true }).press("Enter");
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("");
});
test("Shared chat — Client denied-query guard does not disable the default Staff presentation", async ({
  page,
}) => {
  await mount(page, "/client/messages", {
    sharedChat: true,
    queries: { messages: { status: 403 } },
  });
  await expect(page.getByLabel("Message", { exact: true })).toBeEnabled();
});
test("Messages — cross-account deep link cannot open an alternative conversation", async ({
  page,
}) => {
  await mount(page, "/client/messages", { search: "caseId=other-account-matter" });
  await expect(page.locator("main")).toContainText("Matter unavailable");
  await expect(page.locator("main textarea")).toHaveCount(0);
  expect(await commands(page, "markMessagesRead")).toHaveLength(0);
});
test("Messages — pending deep link waits, then renders the authorized conversation", async ({
  page,
}) => {
  await mount(page, "/client/messages", {
    search: "caseId=matter-1",
    queries: { cases: { pending: true } },
  });
  await expect(page.locator("main")).not.toContainText("Matter unavailable");
  await page.evaluate(() => window.clientFunctional.setQuery("cases", {}));
  await expect(page.locator("main textarea")).toBeVisible();
});
for (const status of [401, 403, 404])
  test(`Messages — ${status} hides cached thread contents and blocks composer`, async ({
    page,
  }) => {
    await mount(page, "/client/messages", {
      search: "caseId=matter-1",
      queries: { messages: { status } },
    });
    await expect(page.locator("main")).not.toContainText(healthy.messages.page[0].content);
    await expect(page.locator("main textarea")).toBeDisabled();
    expect(await commands(page, "sendMessage")).toHaveLength(0);
  });
test("Appointments — mode/date reset, validation, duplicate guard and pending confirmation", async ({
  page,
}) => {
  await mount(page, "/client/booking", { holds: ["bookConsultation"] });
  const submit = page.locator("#request-appointment button[type='submit']");
  await expect(submit).toBeDisabled();
  await page.locator("label.client-consultation-mode").filter({ hasText: "Phone" }).click();
  await page.getByRole("button", { name: "09:00", exact: true }).click();
  await page.getByRole("button", { name: "Show next available date", exact: true }).click();
  await expect(submit).toBeDisabled();
  await page.getByRole("button", { name: "10:00", exact: true }).click();
  await submit.click();
  expect((await expectCommand(page, "bookConsultation")).args[0]).toMatchObject({
    clientId: "visual-client",
    practiceArea: "Phone Consultation",
    date: "2026-09-19",
    timeSlot: "10:00",
  });
  await expect(submit).toBeDisabled();
  await page.evaluate(() => window.clientFunctional.release("bookConsultation"));
  await expect(page.locator("main")).toContainText("pending");
  await page.getByRole("button", { name: "Request another appointment", exact: true }).click();
  await expect(submit).toBeDisabled();
});
test("Appointments — availability failure retries independently and booking failure remains truthful", async ({
  page,
}) => {
  await mount(page, "/client/booking", {
    queries: { slots: { status: 503, missing: true } },
    failures: { bookConsultation: "Synthetic time conflict" },
  });
  await expect(page.locator("main")).toContainText("Upcoming appointments");
  await page.getByRole("button", { name: /Try again|Retry/ }).click();
  await expectCommand(page, "refetch:slots");
  await page.getByRole("button", { name: "09:00", exact: true }).click();
  await page
    .getByRole("button", { name: /Submit request|Request consultation|Request appointment/i })
    .last()
    .click();
  await expect(page.locator("main")).toContainText("Synthetic time conflict");
  await expect(page.getByRole("button", { name: "Request another appointment" })).toHaveCount(0);
});
async function prepareKyc(page: Page, failures: Record<string, string> = {}, holds: string[] = []) {
  await mount(page, "/client/kyc", {
    data: {
      client: {
        ...healthy.client,
        kycStatus: "rejected",
        kycRejectionReason: "Synthetic replacement required",
      },
    },
    failures,
    holds,
  });
  await page
    .getByRole("button", {
      name: /Start verification|Continue verification|Resubmit|Upload documents|Begin verification/i,
    })
    .first()
    .click();
  const file = {
    name: "synthetic-id.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("synthetic"),
  };
  await page.getByRole("button", { name: "Choose file", exact: true }).first().click();
  await page.locator("input[type='file']").setInputFiles(file);
  await expectCommand(page, "uploadKycFile");
  await page.getByRole("button", { name: "Choose file", exact: true }).first().click();
  await page
    .locator("input[type='file']")
    .setInputFiles({ ...file, name: "synthetic-address.pdf" });
  await expectCommand(page, "uploadKycFile", 2);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Address", { exact: true }).fill("Synthetic address");
  await page.getByLabel("ID number", { exact: true }).fill("SYNTHETIC-ID-123");
  await expect(page.getByRole("button", { name: "Review submission", exact: true })).toBeDisabled();
  await page.locator("#kyc-consent").check();
  await page.getByRole("button", { name: "Review submission", exact: true }).click();
}
test("Identity — rejected KYC retry wizard, consent, scoped submission and busy guard", async ({
  page,
}) => {
  await prepareKyc(page, {}, ["submitKyc"]);
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  const event = await expectCommand(page, "submitKyc");
  expect(event.args[0]).toEqual({
    address: "Synthetic address",
    idNumber: "SYNTHETIC-ID-123",
    consentAccepted: true,
    files: [{ storageId: "synthetic-government_id" }, { storageId: "synthetic-proof_of_address" }],
  });
  await expect(page.getByRole("button", { name: /Submitting/ })).toBeDisabled();
  await page.evaluate(() => window.clientFunctional.release("submitKyc"));
  await expect(page.getByRole("button", { name: "Submit for review", exact: true })).toHaveCount(0);
  await expect(page.locator("body")).toContainText("Documents submitted for firm review");
});
test("Identity — failed submission retains review and can be retried", async ({ page }) => {
  await prepareKyc(page, { submitKyc: "Synthetic submission rejected" });
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expect(page.locator("body")).toContainText("Synthetic submission rejected");
  await expect(page.getByRole("button", { name: "Submit for review", exact: true })).toBeEnabled();
  await page.evaluate(() => window.clientFunctional.recover("submitKyc"));
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expectCommand(page, "submitKyc", 2);
});
test("Identity — unsupported file is rejected before any upload command", async ({ page }) => {
  await mount(page, "/client/kyc", {
    data: { client: { ...healthy.client, kycStatus: "pending" } },
  });
  await page
    .getByRole("button", {
      name: /Start verification|Continue verification|Upload documents|Begin verification/i,
    })
    .first()
    .click();
  await page.locator("input[type='file']").setInputFiles({
    name: "script.exe",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("synthetic"),
  });
  await expect(page.locator("body")).toContainText("Choose a PDF, JPG/JPEG, or PNG file");
  expect(await commands(page, "uploadKycFile")).toHaveLength(0);
});
async function reviewSignature(page: Page, failures: Record<string, string> = {}) {
  const signing = {
    ...healthy.inbox.pendingDirect[0].document,
    mimeType: "image/png",
    title: "Synthetic declaration.png",
  };
  await mount(page, "/client/signatures", {
    data: { inbox: { ...healthy.inbox, pendingDirect: [{ kind: "direct", document: signing }] } },
    failures,
  });
  await page
    .getByRole("button", { name: /Review.*sign|Review document/i })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectCommand(page, "markDocumentViewed");
  await expect(page.getByRole("button", { name: "Sign document", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: /Request verification code/i }).click();
  await page.getByLabel(/Verification code/i).fill("000000");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign document", exact: true })).toBeDisabled();
  await page.getByLabel(/Verification code/i).fill("123456");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await page.getByRole("button", { name: "type", exact: true }).click();
  await page.getByLabel("Full name for typed signature", { exact: true }).fill("Synthetic Client");
  await page.getByRole("dialog").getByRole("checkbox").check();
}
test("Sign Documents — view/OTP/consent gates and correct typed signature command", async ({
  page,
}) => {
  await reviewSignature(page);
  await page.getByRole("button", { name: "Sign document", exact: true }).click();
  expect((await expectCommand(page, "signDocument")).args[0]).toMatchObject({
    documentId: "document-1",
    signatureMethod: "type",
    typedSignatureText: "Synthetic Client",
    consentAccepted: true,
    otpChallengeId: "synthetic-otp",
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("Sign Documents — rejected signature remains open without false completion", async ({
  page,
}) => {
  await reviewSignature(page, { signDocument: "Synthetic signature rejected" });
  await page.getByRole("button", { name: "Sign document", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("body")).toContainText("Synthetic signature rejected");
});
test("Sign Documents — completed inbox exposes download without another sign action", async ({
  page,
}) => {
  await mount(page, "/client/signatures", { state: "complete" });
  await expect(page.getByRole("button", { name: /Review.*sign/ })).toHaveCount(0);
  await page
    .getByRole("button", { name: /Open document:/ })
    .first()
    .click();
  await expectCommand(page, "downloadDocument");
});
test("Notifications — category filtering and mark-all refresh preserve Important Dates", async ({
  page,
}) => {
  await mount(page, "/client/notifications");
  await page.getByRole("button", { name: "Documents", exact: true }).click();
  await expect(page.locator("main")).toContainText("No document notifications");
  await page
    .getByRole("button", { name: /^Unread/ })
    .first()
    .click();
  await expect(page.locator("main")).toContainText(healthy.notifications[0].title);
  await page.getByRole("button", { name: "Mark all read", exact: true }).click();
  await expectCommand(page, "markAllRead");
  await expect(page.locator("main")).toContainText("No unread notifications");
  await expect(page.locator("main")).toContainText("Important Dates");
});
test("Notifications — rejected read command retains unread status and does not navigate", async ({
  page,
}) => {
  await mount(page, "/client/notifications", { failures: { markRead: "Synthetic read rejected" } });
  await page.getByRole("button", { name: new RegExp(healthy.notifications[0].title) }).click();
  await expectCommand(page, "markRead");
  await expect(page.locator("body")).toContainText("Could not mark this notification as read");
  await expect(
    page.getByRole("button", { name: new RegExp(healthy.notifications[0].title) }),
  ).toContainText("Unread");
  expect(await page.evaluate(() => window.clientFunctional.navigation())).toHaveLength(0);
});
test("Notifications — successful read is scoped to the selected notification", async ({ page }) => {
  await mount(page, "/client/notifications", {
    data: { notifications: [{ ...healthy.notifications[0], link: undefined }] },
  });
  await page.getByRole("button", { name: new RegExp(healthy.notifications[0].title) }).click();
  expect((await expectCommand(page, "markRead")).args[0]).toEqual({
    notificationId: "notification-1",
  });
  await expect(page.locator("main")).toContainText("0 unread in your recent notifications");
});
test("Profile — edit account/contact fields, preserve read-only email and prevent duplicates", async ({
  page,
}) => {
  await mount(page, "/client/profile", { holds: ["updateProfile"] });
  await expect(page.getByLabel("Email address", { exact: true })).toHaveAttribute("readonly", "");
  await page.getByLabel("Full name", { exact: true }).fill("Synthetic Client Changed");
  await page.getByLabel("Address", { exact: true }).fill("Synthetic new address");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("button", { name: /Saving/ })).toBeDisabled();
  await page.evaluate(() => window.clientFunctional.release("updateProfile"));
  expect((await expectCommand(page, "updateMine")).args[0]).toMatchObject({
    address: "Synthetic new address",
  });
  await expect(page.locator("body")).toContainText("Profile updated successfully");
});
test("Profile — partial contact save failure reports precisely and preserves edits", async ({
  page,
}) => {
  await mount(page, "/client/profile", { failures: { updateMine: "Synthetic contact rejected" } });
  await page.getByLabel("Address", { exact: true }).fill("Keep edited address");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator("body")).toContainText("Client contact details could not be saved");
  await expect(page.getByLabel("Address", { exact: true })).toHaveValue("Keep edited address");
});
test("Profile — password validation and failed command cannot imply success", async ({ page }) => {
  await mount(page, "/client/profile", {
    failures: { changePassword: "Synthetic password rejected" },
  });
  await page.getByLabel("Current Password", { exact: true }).fill("synthetic-current");
  await page.getByLabel("New Password", { exact: true }).fill("synthetic-new");
  await page.getByLabel("Confirm New Password", { exact: true }).fill("different");
  await page.getByRole("button", { name: "Update Password", exact: true }).click();
  await expect(page.locator("body")).toContainText("New passwords do not match");
  expect(await commands(page, "changePassword")).toHaveLength(0);
  await page.getByLabel("Confirm New Password", { exact: true }).fill("synthetic-new");
  await page.getByRole("button", { name: "Update Password", exact: true }).click();
  await expect(page.locator("body")).toContainText("Synthetic password rejected");
  expect((await expectCommand(page, "changePassword")).args).toEqual([
    "synthetic-current",
    "synthetic-new",
  ]);
});
test("Profile — session revocation is scoped and failure preserves the session", async ({
  page,
}) => {
  const other = {
    ...healthy.sessions[0],
    id: "synthetic-other-session",
    isCurrent: false,
    current: false,
  };
  await mount(page, "/client/profile", {
    data: { sessions: [healthy.sessions[0], other] },
    failures: { revokeSession: "Synthetic revoke rejected" },
  });
  await page.getByRole("tab", { name: "Active Sessions", exact: true }).click();
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await expectCommand(page, "revokeSession");
  await expect(page.locator("body")).toContainText("Failed to revoke session");
  await page.evaluate(() => window.clientFunctional.recover("revokeSession"));
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  expect((await expectCommand(page, "revokeSession", 2)).args[0]).toBe("synthetic-other-session");
  await expect(page.locator("body")).toContainText("Session revoked successfully");
});
test("Profile — MFA confirmation failure preserves dialog and successful enrollment closes it", async ({
  page,
}) => {
  await mount(page, "/client/profile", {
    failures: { beginTotp: "Synthetic MFA password rejected" },
  });
  await page.getByRole("button", { name: "Enable 2FA", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel(/Password/i)
    .fill("synthetic-current");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Continue|Confirm/i })
    .click();
  await expect(page.locator("body")).toContainText("Synthetic MFA password rejected");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => window.clientFunctional.recover("beginTotp"));
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Continue|Confirm/i })
    .click();
  await expectCommand(page, "beginTotp", 2);
  await page.getByRole("dialog").getByLabel(/code/i).fill("123456");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Verify|Confirm|Enable/i })
    .click();
  await expectCommand(page, "confirmTotp");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
for (const status of [401, 403, 404])
  test(`Profile/Identity — ${status} prevents cached activity and submitted-file links`, async ({
    page,
  }) => {
    await mount(page, "/client/profile", { queries: { audit: { status } } });
    await page.getByRole("tab", { name: "Data & Privacy", exact: true }).click();
    await expect(page.locator("main")).not.toContainText("Profile updated");
    await mount(page, "/client/kyc", { queries: { files: { status } } });
    await expect(page.locator("main")).not.toContainText("Proof of address.pdf");
    await expect(page.locator("main a[href*='disabled-file']")).toHaveCount(0);
  });

// Focused release corrections. The fixture uses actual views/CSS, synthetic
// query/command adapters and blocked network; this is not authenticated API E2E.
async function renderedTextContrast(target: Locator) {
  return target.evaluate((element) => {
    const surfaces: string[] = [];
    let opacity = 1;
    let screenReaderOnly = false;
    let reachedOpaque = false;
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      opacity *= Number(style.opacity);
      screenReaderOnly ||=
        style.clip === "rect(0px, 0px, 0px, 0px)" ||
        style.clipPath === "inset(50%)" ||
        (rect.width <= 1 && rect.height <= 1 && style.overflow === "hidden");
      if (!reachedOpaque) {
        if (style.backgroundImage !== "none") throw new Error("Unmeasured background image");
        surfaces.push(style.backgroundColor);
        reachedOpaque = style.backgroundColor.startsWith("rgb(");
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.fillStyle = "white";
    context.fillRect(0, 0, 1, 1);
    for (const background of surfaces.reverse()) {
      context.fillStyle = background;
      context.fillRect(0, 0, 1, 1);
    }
    const background = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    const style = getComputedStyle(element);
    context.globalAlpha = opacity;
    context.fillStyle = style.color;
    context.fillRect(0, 0, 1, 1);
    const foreground = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    function luminance(rgb: number[]) {
      const linear = rgb.map((value) => {
        const s = value / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    }
    const first = luminance(foreground),
      second = luminance(background);
    return {
      color: style.color,
      background,
      foreground,
      opacity,
      screenReaderOnly,
      contrast: (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05),
    };
  });
}

for (const width of [1440, 1280, 1024, 768, 390, 360]) {
  for (const [route, selector] of [
    ["/client", ".client-home-matter-facts"],
    ["/client/cases", ".client-matters-card-facts"],
  ])
    test(`S22-A11Y-02 — ${route} accessible matter facts and navigation at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await mount(page, route);
      const facts = page.locator(selector).first();
      await expect(facts).toBeVisible();
      await expect(facts.locator("dl")).toHaveCount(3);
      const pairs = await facts.locator("dl").evaluateAll((lists) =>
        lists.map((list) => ({
          tags: Array.from(list.children).map((child) => child.tagName),
          label: list.querySelector("dt")?.textContent,
          value: list.querySelector("dd")?.textContent,
        })),
      );
      expect(pairs.map((pair) => pair.label)).toEqual([
        "Lead Advocate",
        "Next Hearing",
        "Last Update",
      ]);
      for (const pair of pairs) {
        expect(pair.tags).toEqual(["DT", "DD"]);
        expect(pair.value?.trim()).toBeTruthy();
      }
      const scan = await new AxeBuilder({ page })
        .include(selector)
        .withRules(["definition-list", "dlitem"])
        .analyze();
      expect(scan.violations).toEqual([]);
      await info.attach("valid-matter-facts", {
        body: JSON.stringify({ width, pairs, scan }),
        contentType: "application/json",
      });
      const link = page.locator("main a[href='/client/cases/matter-1']").first();
      for (
        let tabs = 0;
        tabs < 60 && !(await link.evaluate((el) => el === document.activeElement));
        tabs++
      )
        await page.keyboard.press("Tab");
      await expect(link).toBeFocused();
      await page.keyboard.press("Enter");
      await expect
        .poll(() => page.evaluate(() => window.clientFunctional.navigation().at(-1)))
        .toBe("/client/cases/matter-1");
    });

  test(`S22-A11Y-03 — summary contrast and existing breadcrumb at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await mount(page, "/client/cases/matter-1");
    const summary = page.locator(".client-matter-detail-hero-summary");
    const measurement = await renderedTextContrast(summary);
    expect(measurement.opacity).toBe(1);
    expect(measurement.contrast).toBeGreaterThanOrEqual(4.5);
    expect(measurement.screenReaderOnly).toBe(width < 640);
    const scan = await new AxeBuilder({ page })
      .include(".client-matter-detail-hero")
      .withRules(["color-contrast"])
      .analyze();
    expect(scan.violations).toEqual([]);
    await info.attach("summary-contrast", {
      body: JSON.stringify({ width, measurement, scan }),
      contentType: "application/json",
    });
  });

  test(`S22-A11Y-04 — single upload target, keyboard/mouse picker and focus at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    for (const activation of ["Enter", "Space", "mouse"]) {
      await mount(page, "/client/documents", { holds: ["uploadDocument"] });
      const trigger = page.getByRole("button", { name: "Upload Document", exact: true }).first();
      await trigger.click();
      const dialog = page.getByRole("dialog");
      const target = dialog.getByRole("button", { name: "Upload document files", exact: true });
      const input = page.getByLabel("Choose files to upload", { exact: true });
      await expect(input).toBeHidden();
      await expect(input).toHaveAttribute("tabindex", "-1");
      await expect(target.locator("input, button, a, select, textarea, [tabindex]")).toHaveCount(0);
      await expect(target).toHaveAttribute("aria-disabled", "false");
      const scan = await new AxeBuilder({ page })
        .include(".client-documents-upload-dialog")
        .withRules(["nested-interactive", "button-name", "label"])
        .analyze();
      expect(scan.violations).toEqual([]);
      for (
        let tabs = 0;
        tabs < 15 && !(await target.evaluate((el) => el === document.activeElement));
        tabs++
      )
        await page.keyboard.press("Tab");
      await expect(target).toBeFocused();
      const focus = await target.evaluate((el) => ({
        visible: el.matches(":focus-visible"),
        outline: getComputedStyle(el).outlineStyle,
        width: getComputedStyle(el).outlineWidth,
        rect: el.getBoundingClientRect().toJSON(),
      }));
      expect(focus.visible).toBe(true);
      expect(focus.outline).toBe("solid");
      expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(2);
      expect(focus.rect.width).toBeGreaterThan(10);
      expect(focus.rect.height).toBeGreaterThan(10);
      expect(focus.rect.x).toBeGreaterThanOrEqual(0);
      expect(focus.rect.right).toBeLessThanOrEqual(width);
      await info.attach(`upload-focus-${activation}`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
      await page.keyboard.press("Tab");
      expect(await input.evaluate((el) => el === document.activeElement)).toBe(false);
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
      await page.keyboard.press("Shift+Tab");
      await expect(target).toBeFocused();
      let chooserCount = 0;
      const countChooser = () => {
        chooserCount++;
      };
      page.on("filechooser", countChooser);
      const chooserPromise = page.waitForEvent("filechooser");
      if (activation === "mouse") await target.click();
      else await page.keyboard.press(activation);
      const chooser = await chooserPromise;
      expect(chooser.isMultiple()).toBe(true);
      await chooser.setFiles({
        name: `${activation}.pdf`,
        mimeType: "application/pdf",
        buffer: Buffer.from("synthetic"),
      });
      page.off("filechooser", countChooser);
      expect(chooserCount).toBe(1);
      await expectCommand(page, "uploadDocument");
      await expect(target).toHaveAttribute("aria-busy", "true");
      await expect(target).toHaveAttribute("aria-disabled", "true");
      await expect(target).toHaveAttribute("tabindex", "-1");
      await expect(input).toBeDisabled();
      await page.keyboard.press("Enter");
      await expectCommand(page, "uploadDocument");
      await page.evaluate(() => window.clientFunctional.release("uploadDocument"));
      await expect(dialog).toContainText("Upload received");
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
  });

  test(`S22-A11Y-04 — multiple drop, failure/retry and authorization guard at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await mount(page, "/client/documents", {
      failures: { uploadDocument: "Synthetic rejected upload" },
    });
    await page.getByRole("button", { name: "Upload Document", exact: true }).first().click();
    const target = page.getByRole("button", { name: "Upload document files", exact: true });
    const files = await page.evaluateHandle(() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(["synthetic"], "one.pdf", { type: "application/pdf" }));
      transfer.items.add(new File(["synthetic"], "two.pdf", { type: "application/pdf" }));
      return transfer;
    });
    await target.dispatchEvent("dragover", { dataTransfer: files });
    await expect(target).toHaveClass(/client-documents-dropzone-active/);
    await target.dispatchEvent("drop", { dataTransfer: files });
    await expect(page.getByRole("dialog")).toContainText("Upload failed");
    await expect(target).toHaveAttribute("aria-disabled", "false");
    await page.evaluate(() => window.clientFunctional.recover("uploadDocument"));
    await target.dispatchEvent("drop", { dataTransfer: files });
    await expectCommand(page, "uploadDocument", 3);
    await expect(page.getByRole("dialog")).toContainText("Upload received");
    const uploads = await commands(page, "uploadDocument");
    expect(uploads.slice(1).map((event) => (event.args[0] as { title: string }).title)).toEqual([
      "one.pdf",
      "two.pdf",
    ]);
    await mount(page, "/client/documents", { queries: { cases: { status: 403 } } });
    await page.getByRole("button", { name: "Upload Document", exact: true }).first().click();
    await expect(
      page.getByRole("button", { name: "Upload document files", exact: true }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByLabel("Choose files to upload", { exact: true })).toBeDisabled();
    const deniedFiles = await page.evaluateHandle(() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(["synthetic"], "denied.pdf", { type: "application/pdf" }));
      return transfer;
    });
    await page
      .getByRole("button", { name: "Upload document files", exact: true })
      .dispatchEvent("drop", { dataTransfer: deniedFiles });
    expect(await commands(page, "uploadDocument")).toHaveLength(0);
  });

  test(`S22-A11Y-05 — Client badge contrast preserves shared defaults at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const results: {
      variant: "client" | "staff" | "admin";
      measurement: Awaited<ReturnType<typeof renderedTextContrast>>;
    }[] = [];
    for (const variant of ["client", "staff", "admin"] as const) {
      await mount(page, "/client/profile", { profileVariant: variant });
      const sessions = page.getByRole("tab", { name: "Active Sessions", exact: true });
      await sessions.focus();
      await page.keyboard.press("Enter");
      await expect(sessions).toHaveAttribute("aria-selected", "true");
      const badges = page.getByText("Current session", { exact: true });
      const sharedBadge = page.locator('[data-slot="session-current-status"]');
      await expect(sharedBadge).toHaveCount(1);
      const measurement = await renderedTextContrast(sharedBadge);
      if (variant === "client") {
        expect(measurement.contrast).toBeGreaterThanOrEqual(4.5);
        const scan = await new AxeBuilder({ page })
          .include('[data-slot="session-current-status"]')
          .withRules(["color-contrast"])
          .analyze();
        expect(scan.violations).toEqual([]);
        for (const badge of await badges.all())
          if (await badge.isVisible())
            expect((await renderedTextContrast(badge)).contrast).toBeGreaterThanOrEqual(4.5);
      } else {
        // The added data hook must not override the shared green utility classes.
        const defaultColor = await sharedBadge.evaluate((el) => {
          const probe = document.createElement("span");
          probe.className = el.className;
          el.parentElement!.appendChild(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        });
        expect(measurement.color).toBe(defaultColor);
        await expect(page.locator("#client-profile-account-controls")).toHaveCount(0);
      }
      results.push({ variant, measurement });
    }
    await info.attach("session-badge-colors", {
      body: JSON.stringify({ width, results }),
      contentType: "application/json",
    });
  });
}
