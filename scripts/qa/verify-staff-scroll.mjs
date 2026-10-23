import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

// Reuse the existing Next preview. Every browser API request is synthetic;
// mutations, including automatic message read receipts, never reach the server.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const footerBoundaryOnly = process.argv.includes("--footer-boundary");
const ownerViewportOnly = process.argv.includes("--owner-viewport");
const staffRegressionOnly = process.argv.includes("--navigation-regression");
const out = path.join(
  root,
  ".local/qa/staff-scroll",
  ownerViewportOnly
    ? "final-owner-viewport"
    : staffRegressionOnly
      ? "final-owner-viewport/staff-regression"
      : footerBoundaryOnly
        ? "final-footer-fix"
        : "",
);
fs.mkdirSync(out, { recursive: true });
const origin = process.env.STAFF_SCROLL_ORIGIN || "http://localhost:3001";
const staffId = "71000000-0000-4000-8000-000000000001";
const caseId = "72000000-0000-4000-8000-000000000001";
const clientId = "73000000-0000-4000-8000-000000000001";
const stamp = "2026-10-20T04:15:00Z";
const user = {
  id: staffId,
  _id: staffId,
  firmId: clientId,
  name: "Synthetic Staff Reviewer",
  email: "staff@example.invalid",
  role: "associate",
  isActive: true,
  emailVerified: true,
  createdAt: stamp,
  updatedAt: stamp,
};
const client = {
  _id: clientId,
  fullName: "Synthetic Client",
  type: "individual",
  isActive: true,
  kycStatus: "pending",
};
const matter = {
  id: caseId,
  _id: caseId,
  title: "Synthetic legal matter",
  caseNumber: "QA-001",
  status: "active",
  practiceArea: "Civil Litigation",
  assignedLawyerId: staffId,
  clientId,
  filingDate: "2026-10-01",
  createdAt: stamp,
  updatedAt: stamp,
  teamMemberIds: [],
  parties: [],
  description: "Synthetic case summary for scroll QA.",
  clientSummary: "Synthetic summary.",
};
const many = (count, create) => Array.from({ length: count }, (_, i) => create(i));
const tasks = many(28, (i) => ({
  _id: `task-${i}`,
  title: `Synthetic task ${i + 1}`,
  status: "pending",
  priority: "medium",
  assignedTo: staffId,
  caseId,
  dueDate: "2026-10-21",
  createdAt: stamp,
}));
const research = many(14, (i) => ({
  _id: `note-${i}`,
  title: `Synthetic research note ${i + 1}`,
  category: "procedure",
  tags: [],
  content: "Research review paragraph.\n\n".repeat(60),
  createdBy: staffId,
  createdAt: stamp,
  updatedAt: stamp,
}));
const appointments = many(30, (i) => ({
  _id: `apt-${i}`,
  clientName: `Synthetic Appointment ${i + 1}`,
  practiceArea: "Civil Litigation",
  date: "2026-10-20",
  timeSlot: ["10:00 AM", "11:00 AM", "01:30 PM", "03:00 PM", "04:30 PM"][i % 5],
  status: "confirmed",
  assignedLawyerId: staffId,
}));
const routes = [
  ["dashboard", "/staff"],
  ["tasks", "/staff/tasks"],
  ["cases", "/staff/cases"],
  ["case-detail", `/staff/cases/${caseId}`],
  ["hearings", "/staff/hearings"],
  ["appointments", "/staff/appointments"],
  ["crm", "/staff/crm"],
  ["clients", "/staff/clients"],
  ["research", "/staff/research"],
  ["content", "/staff/content"],
  ["content-writer", "/staff/content/write?type=blog"],
  ["messages", `/staff/messages?caseId=${caseId}`],
  ["documents", "/staff/documents"],
  ["hr", "/staff/hr"],
];
let emptyTasks = false;
let fixtureState = "populated";
const extrasOnly = process.argv.includes("--extras-only");
const prior = extrasOnly
  ? JSON.parse(fs.readFileSync(path.join(out, "evidence.json"), "utf8"))
  : null;
if (extrasOnly)
  assert(
    (ownerViewportOnly
      ? prior.results.length === 234
      : staffRegressionOnly
        ? prior.results.length === 28
        : footerBoundaryOnly
          ? prior.results.length === 120
          : [112, 140].includes(prior.results.length)) && prior.errors.length === 0,
    "Complete route matrix required before extras-only QA",
  );
const results = prior?.results || [],
  errors = [],
  mutations = prior?.mutations || [],
  additionalChecks = [];
const browser = await chromium.launch(ownerViewportOnly ? { channel: "chrome" } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (error) => errors.push({ route: page.url(), message: error.message }));
await page.clock.setFixedTime(new Date(stamp));
await page.route("**/api/**", async (route) => {
  const request = route.request(),
    url = new URL(request.url()),
    p = url.pathname;
  let data = [];
  if (request.method() !== "GET") {
    mutations.push({ path: p, method: request.method(), intercepted: true });
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: {} }) });
  }
  if (p === "/api/auth/get-session")
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        session: {
          id: "synthetic-session",
          userId: staffId,
          token: "synthetic-only",
          expiresAt: "2099-01-01T00:00:00Z",
        },
        user,
      }),
    });
  if (p === "/api/v1/users/me") data = user;
  else if (p.includes("settings")) data = { firmName: "Srimar Law", onlineBookingEnabled: true };
  else if (p === "/api/v1/auth/session")
    data = {
      capabilities: [
        "clients.manage",
        "clients.view_all",
        "users.view_directory",
        "cases.manage",
        "tasks.manage",
      ],
    };
  else if (p === "/api/v1/users/directory") data = [user];
  else if (p === "/api/v1/cases") data = [matter];
  else if (p.startsWith("/api/v1/cases/")) data = matter;
  else if (p === "/api/v1/clients")
    data = ownerViewportOnly
      ? many(fixtureState === "empty" ? 0 : fixtureState === "short" ? 1 : 4, (i) => ({
          ...client,
          _id: i === 0 ? clientId : `client-${i}`,
          fullName: `Synthetic Client ${i + 1}`,
        }))
      : [client];
  else if (p === "/api/v1/tasks")
    data =
      emptyTasks || fixtureState === "empty"
        ? []
        : fixtureState === "short"
          ? tasks.slice(0, 1)
          : tasks;
  else if (p === "/api/v1/research") data = research;
  else if (p === "/api/v1/appointments") data = appointments;
  else if (p.endsWith("/appointments/slots")) data = ["10:00 AM"];
  else if (p === "/api/v1/hearings")
    data = many(15, (i) => ({
      _id: `hearing-${i}`,
      caseId,
      dateGregorian: "2026-10-20",
      dateBs: "3 Kartik 2083",
      time: "10:00",
      court: "Synthetic Court",
      purpose: `Synthetic hearing ${i}`,
      status: "scheduled",
    }));
  else if (p === "/api/v1/leads")
    data = many(14, (i) => ({
      _id: `lead-${i}`,
      fullName: `Synthetic Lead ${i}`,
      assignedTo: staffId,
      status: "new",
      source: "website",
      createdAt: stamp,
    }));
  else if (p === "/api/v1/documents" || p === "/api/v1/documents/search")
    data = many(fixtureState === "empty" ? 0 : fixtureState === "short" ? 1 : 14, (i) => ({
      _id: `doc-${i}`,
      title: `Synthetic document ${i}.pdf`,
      fileName: `synthetic-${i}.pdf`,
      caseId,
      category: "evidence",
      type: "evidence",
      uploadedAt: stamp,
      uploadedBy: staffId,
      mimeType: "application/pdf",
      size: 1000,
      _creationTime: Date.parse(stamp),
    }));
  else if (p.endsWith("/blog-posts"))
    data = many(18, (i) => ({
      _id: `post-${i}`,
      title: `Synthetic article ${i}`,
      slug: `synthetic-${i}`,
      status: "draft",
      authorId: staffId,
      category: "General",
      content: "Synthetic draft.",
      updatedAt: stamp,
    }));
  else if (p === "/api/v1/hr/attendance")
    data = many(18, (i) => ({
      _id: `attendance-${i}`,
      userId: staffId,
      date: `2026-10-${String(20 - i).padStart(2, "0")}`,
      status: "present",
      checkIn: stamp,
    }));
  else if (p === "/api/v1/messages/unread") data = {};
  else if (p === "/api/v1/messages")
    data = {
      page: many(45, (i) => ({
        _id: `message-${i}`,
        caseId,
        senderId: clientId,
        content: `Synthetic history message ${i + 1}.`,
        createdAt: `2026-10-19T04:${String(i).padStart(2, "0")}:00Z`,
      })),
      isDone: true,
      continueCursor: "",
    };
  await route.fulfill({ contentType: "application/json", body: JSON.stringify({ data }) });
});

const main = () => page.locator("#staff-main-canvas");
const control = () => page.getByRole("button", { name: "Scroll to top of page" });
const footer = () => page.locator(".staff-shell-footer");
async function capture(name) {
  await page.screenshot({ path: path.join(out, `${name}.png`), animations: "disabled" });
}
async function open(route) {
  await page.goto(origin + route, { waitUntil: "domcontentloaded", timeout: 180000 });
  await main().waitFor({ timeout: 120000 });
  await expect(
    main().locator('[data-slot="portal-page-shell"], .staff-content-writer').first(),
  ).toBeVisible({ timeout: 60000 });
  await page.waitForTimeout(350);
  assert.deepEqual(errors, [], "Browser exceptions during route load");
}
async function setTop(top) {
  await main().evaluate((el, top) => el.scrollTo({ top, behavior: "instant" }), top);
  await page.waitForTimeout(80);
}
async function metrics() {
  return main().evaluate((el) => ({
    scrollTop: el.scrollTop,
    height: el.clientHeight,
    scrollHeight: el.scrollHeight,
    max: el.scrollHeight - el.clientHeight,
    behavior: getComputedStyle(el).scrollBehavior,
    bodyScroll: document.scrollingElement.scrollTop,
    horizontal: el.scrollWidth - el.clientWidth,
    childPadding: el.firstElementChild ? getComputedStyle(el.firstElementChild).paddingBottom : "",
  }));
}
async function footerGeometry() {
  return page.evaluate(() => {
    const selectors = [
      "html",
      "body",
      ".dashboard-staff",
      ".staff-shell-content",
      ".staff-shell-canvas",
      "#staff-main-canvas",
      "#staff-main-canvas > *",
      ".staff-shell-footer",
    ];
    const nodes = selectors.map((selector) => {
      const el = document.querySelector(selector);
      const style = getComputedStyle(el),
        rect = el.getBoundingClientRect();
      return {
        selector,
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        scrollTop: el.scrollTop,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        css: Object.fromEntries(
          [
            "height",
            "minHeight",
            "maxHeight",
            "display",
            "flex",
            "position",
            "overflowY",
            "padding",
            "margin",
            "transform",
          ].map((key) => [key, style[key]]),
        ),
        before: getComputedStyle(el, "::before").content,
        after: getComputedStyle(el, "::after").content,
      };
    });
    const nav = document.querySelector(".staff-mobile-primary");
    const navTop =
      nav && getComputedStyle(nav).display !== "none"
        ? nav.getBoundingClientRect().top
        : innerHeight;
    const shell = nodes[2],
      canvas = nodes[4],
      foot = nodes[7];
    const visibleBottom = Math.min(shell.bottom, navTop, innerHeight);
    return {
      nodes,
      viewport: {
        width: innerWidth,
        height: innerHeight,
        scale: visualViewport?.scale,
        devicePixelRatio,
        outerWidth,
        outerHeight,
      },
      visibleBottom,
      belowFooter: visibleBottom - foot.bottom,
      canvasToFooter: foot.top - canvas.bottom,
      bodyRange: document.scrollingElement.scrollHeight - innerHeight,
      bodyTop: document.scrollingElement.scrollTop,
    };
  });
}
function assertFooterBoundary(geometry) {
  assert(
    Math.abs(geometry.belowFooter) <= 1,
    `Footer misses visible Staff boundary by ${geometry.belowFooter}px`,
  );
  assert(Math.abs(geometry.canvasToFooter) <= 1, "Gap between canvas and footer");
  assert.equal(geometry.bodyRange, 0, "Unexpected body scroll owner");
  assert.equal(geometry.bodyTop, 0, "Body scrolled behind Staff canvas");
  assert.equal(geometry.nodes[3].scrollTop, 0, "Shell scrolled behind canvas");
}
async function navigateStaff(route) {
  const link = page.locator(`a[href="${route}"]:visible`).first();
  // The development issues badge can cover the fixed mobile nav after visiting
  // unrelated modules. Use the existing drawer for that regression pass.
  if (staffRegressionOnly && page.viewportSize().width < 768) {
    await page.getByRole("button", { name: "Open Staff navigation", exact: true }).click();
    await page.locator(`#staff-mobile-drawer a[href="${route}"]`).click();
  } else if (await link.count()) await link.click();
  else {
    await page.getByRole("button", { name: "Open Staff navigation", exact: true }).click();
    await page.locator(`#staff-mobile-drawer a[href="${route}"]`).click();
  }
  await page.waitForURL(origin + route);
  await expect(
    main().locator('[data-slot="portal-page-shell"], .staff-content-writer').first(),
  ).toBeVisible();
  await page.waitForTimeout(350);
}
async function testOwnerViewport() {
  const sizes = [1704, 1680, 1440].flatMap((width) =>
    [778, 740, 1000].map((height) => ({ width, height })),
  );
  sizes.push(...[1280, 768, 390, 360].map((width) => ({ width, height: 778 })));
  for (const { width, height } of sizes) {
    await page.setViewportSize({ width, height });
    for (const theme of ["light", "dark"])
      for (const state of ["empty", "short", "populated"]) {
        fixtureState = state;
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "no-preference" });
        await open("/staff");
        await page.evaluate(
          (t) => document.documentElement.classList.toggle("dark", t === "dark"),
          theme,
        );
        for (const route of ["/staff", "/staff/tasks", "/staff/clients"]) {
          if (route !== "/staff") await navigateStaff(route);
          const name = route === "/staff" ? "dashboard" : route.split("/").at(-1);
          await setTop(0);
          await expect(control()).toBeHidden();
          const top = await metrics(),
            topGeometry = await footerGeometry();
          assertFooterBoundary(topGeometry);
          await setTop(100000);
          const end = await metrics(),
            geometry = await footerGeometry();
          assertFooterBoundary(geometry);
          assert.equal(
            geometry.nodes[3].scrollHeight,
            geometry.nodes[3].clientHeight,
            "Outer Staff shell acquired overflow",
          );
          assert(Math.abs(end.scrollTop - end.max) <= 1, "Main did not reach its natural end");
          assert(
            Math.abs(geometry.nodes[6].bottom - geometry.nodes[4].bottom) <= 1,
            "Page root leaves trailing space or hides content below footer",
          );
          assert.equal(end.horizontal, 0, "Canvas horizontal overflow");
          assert(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            "Document horizontal overflow",
          );
          assert.equal(
            end.scrollHeight,
            top.scrollHeight,
            "Floating control changed content height",
          );
          if (state === "populated" || (state === "empty" && height === 778))
            await capture(`after-${name}-${width}x${height}-${theme}-${state}-end`);
          if (end.scrollTop > 240) {
            await expect(control()).toBeVisible();
            const box = await control().boundingBox();
            assert(
              box.y + box.height < geometry.nodes[7].top,
              "Top control overlaps footer/navigation",
            );
            await control().click();
            await expect.poll(async () => (await metrics()).scrollTop).toBe(0);
            await expect(main()).toBeFocused();
            assertFooterBoundary(await footerGeometry());
          } else await expect(control()).toBeHidden();
          // Leave a scrolled page for the next genuine Link navigation. A reload
          // resets the hidden ancestor and would conceal the original regression.
          await setTop(100000);
          results.push({
            name,
            route,
            width,
            height,
            theme,
            state,
            navigation: route === "/staff" ? "reload reference" : "Staff Link",
            top,
            end,
            topGeometry,
            geometry,
          });
        }
      }
    console.log(
      `PASS owner navigation ${width}x${height}: Dashboard/Tasks/Clients, 3 states, light/dark`,
    );
  }
  fixtureState = "populated";
}
async function testFooterStates() {
  for (const height of [1000, 740])
    for (const width of [1440, 1280, 768, 390, 360]) {
      await page.setViewportSize({ width, height });
      for (const theme of ["light", "dark"])
        for (const state of ["empty", "short", "populated"]) {
          fixtureState = state;
          await page.emulateMedia({ colorScheme: theme });
          for (const name of ["tasks", "documents"]) {
            await open(`/staff/${name}`);
            await page.evaluate(
              (t) => document.documentElement.classList.toggle("dark", t === "dark"),
              theme,
            );
            await setTop(0);
            await expect(control()).toBeHidden();
            const top = await metrics(),
              topGeometry = await footerGeometry();
            assertFooterBoundary(topGeometry);
            if (
              height === 1000 &&
              state !== "short" &&
              theme === "light" &&
              [1440, 390].includes(width)
            )
              await capture(`review-${name}-${width}-${height}-${theme}-${state}-top`);
            await setTop(100000);
            const end = await metrics(),
              geometry = await footerGeometry();
            assertFooterBoundary(geometry);
            assert.equal(
              end.scrollHeight,
              top.scrollHeight,
              "Floating control changed document height",
            );
            assert.equal(end.horizontal, 0, "Canvas horizontal overflow");
            assert(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              "Document horizontal overflow",
            );
            assert(Math.abs(end.scrollTop - end.max) <= 1, "Canvas did not reach its natural end");
            // The page root must fill a short canvas or finish at its end. The footer
            // is a sibling and must never introduce a separate trailing scroll region.
            const rootBottom = geometry.nodes[6].bottom;
            assert(
              Math.abs(rootBottom - geometry.nodes[4].bottom) <= 1,
              "Trailing space after page root",
            );
            if (height === 1000 && state !== "short")
              await capture(`review-${name}-${width}-${height}-${theme}-${state}-end`);
            if (end.scrollTop > 240) {
              await expect(control()).toBeVisible();
              const box = await control().boundingBox();
              assert(
                box.y + box.height < geometry.nodes[7].top,
                "Control overlaps footer or mobile navigation",
              );
              await control().click();
              await expect.poll(async () => (await metrics()).scrollTop).toBe(0);
            } else await expect(control()).toBeHidden();
            results.push({ name, width, height, theme, state, top, end, topGeometry, geometry });
          }
        }
      console.log(
        `PASS Tasks/Documents footer boundaries ${width}x${height}: empty/short/populated, light/dark`,
      );
    }
  // Prove the boundary check detects the exact class of defect missed by the
  // original existence/height assertions. This style exists only in this page.
  await page.locator(".staff-shell-content").evaluate((el) => {
    el.style.maxHeight = "calc(100% - 160px)";
  });
  const injected = await footerGeometry();
  assert(injected.belowFooter >= 159, "Gap fault was not reproduced");
  assert.throws(() => assertFooterBoundary(injected), /Footer misses visible Staff boundary/);
  await page.locator(".staff-shell-content").evaluate((el) => {
    el.style.maxHeight = "";
  });
  assertFooterBoundary(await footerGeometry());
  additionalChecks.push(
    "Boundary assertion rejects an injected 160px gap and passes after removal",
  );
  fixtureState = "populated";
}
async function testRoute(name, route, width, theme) {
  if (
    staffRegressionOnly &&
    (await main().count()) &&
    !["case-detail", "content-writer", "messages"].includes(name)
  )
    await navigateStaff(route);
  else await open(route);
  await page.evaluate(
    (theme) => document.documentElement.classList.toggle("dark", theme === "dark"),
    theme,
  );
  await page.waitForTimeout(250);
  await setTop(0);
  await expect(control()).toBeHidden();
  const initial = await metrics();
  const foot = await footer().boundingBox();
  const geometry = await footerGeometry();
  assertFooterBoundary(geometry);
  assert(foot && foot.height <= 55, `${name}: excessive footer height`);
  assert.equal(await main().locator("footer").count(), 0, "Footer must not add canvas height");
  assert.equal(initial.horizontal, 0, `${name}: main horizontal overflow`);
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    `${name}: document overflow`,
  );
  assert.equal(
    await page.locator(".staff-tasks-scroll-slot, .staff-detail-scroll-slot").count(),
    0,
  );

  // An internal pane scroll must not toggle the page's control.
  const pane = await main().evaluate((el) => {
    const pane = [...el.querySelectorAll("*")].find(
      (p) =>
        p.scrollHeight - p.clientHeight > 100 && /auto|scroll/.test(getComputedStyle(p).overflowY),
    );
    if (!pane) return null;
    pane.setAttribute("data-scroll-qa-pane", "true");
    pane.scrollTop = Math.min(250, pane.scrollHeight - pane.clientHeight);
    return { className: pane.className, top: pane.scrollTop };
  });
  await page.waitForTimeout(80);
  await expect(control()).toBeHidden();
  await setTop(150);
  await expect(control()).toBeHidden();
  await setTop(100000);
  const end = await metrics();
  const suppressed = name === "messages";
  const expectedVisible = end.scrollTop > 240 && !suppressed;
  if (expectedVisible) {
    await expect(control()).toBeVisible();
    assert.equal(await control().evaluate((el) => getComputedStyle(el).position), "absolute");
    assert.equal(
      (await metrics()).scrollHeight,
      initial.scrollHeight,
      `${name}: control adds page height`,
    );
    const box = await control().boundingBox();
    assert(box.bottom === undefined ? box.y + box.height < foot.y : box.bottom < foot.y);
    assert(box.x >= 0 && box.x + box.width <= width && box.width === 44 && box.height === 44);
    const nav = page.getByRole("navigation", { name: "Staff primary navigation" });
    if (await nav.isVisible()) {
      const navBox = await nav.boundingBox();
      assert(box.y + box.height < navBox.y, "Control overlaps mobile navigation");
      assert(foot.y + foot.height <= navBox.y + 1, "Footer overlaps mobile navigation");
    }
    await control().focus();
    await expect(control()).toBeFocused();
    if (
      (width === 1440 && theme === "light") ||
      (width === 390 && theme === "dark") ||
      name === "dashboard"
    )
      await capture(`${name}-${width}-${theme}-end`);
    const paneBefore = pane
      ? await page.locator('[data-scroll-qa-pane="true"]').evaluate((el) => el.scrollTop)
      : null;
    await control().click();
    await expect.poll(async () => (await metrics()).scrollTop).toBe(0);
    await expect(control()).toBeHidden();
    await expect(main()).toBeFocused();
    if (pane)
      assert.equal(
        await page.locator('[data-scroll-qa-pane="true"]').evaluate((el) => el.scrollTop),
        paneBefore,
        "Page Top moved an internal pane",
      );
  } else {
    await expect(control()).toBeHidden();
    if ((width === 1440 && theme === "light") || (width === 390 && theme === "dark"))
      await capture(`${name}-${width}-${theme}-end`);
  }
  results.push({
    name,
    route,
    width,
    theme,
    initial,
    end,
    footer: foot,
    pane,
    geometry,
    expectedVisible,
    suppressed,
  });
  console.log(
    `PASS ${name} ${width} ${theme}: canvas range ${initial.max}px, ${suppressed ? "history control suppressed" : expectedVisible ? "floating/click/spacing verified" : "no meaningful page scroll"}`,
  );
}

try {
  if (ownerViewportOnly && !extrasOnly) await testOwnerViewport();
  if (staffRegressionOnly && !extrasOnly) {
    for (const [width, theme] of [
      [1440, "light"],
      [390, "dark"],
    ]) {
      await page.setViewportSize({ width, height: 778 });
      for (const [name, route] of routes) await testRoute(name, route, width, theme);
    }
  }
  if (footerBoundaryOnly && !extrasOnly) await testFooterStates();
  if (!extrasOnly && !footerBoundaryOnly && !ownerViewportOnly && !staffRegressionOnly)
    for (const width of [1440, 1280, 768, 390, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ["light", "dark"]) {
        // The actual app theme engine reads this preference on navigation.
        await page.addInitScript((theme) => localStorage.setItem("theme", theme), theme);
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "no-preference" });
        for (const [name, route] of routes) {
          await testRoute(name, route, width, theme);
        }
      }
    }
  for (const width of [1440, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await open(`/staff/messages?caseId=${caseId}`);
    const history = page.getByRole("log").first();
    await expect(history.getByText("Synthetic history message 1.", { exact: true })).toBeVisible();
    await history.evaluate((el) => (el.scrollTop = 200));
    const readingPosition = await history.evaluate((el) => el.scrollTop);
    await setTop(100000);
    await expect(control()).toBeHidden();
    assert.equal(
      await history.evaluate((el) => el.scrollTop),
      readingPosition,
      "Canvas scrolling disturbed message history",
    );
    const composer = page.locator(".staff-messages-chat textarea");
    await expect(composer).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Staff primary navigation" });
    if (await nav.isVisible()) {
      const composerBox = await composer.boundingBox(),
        navBox = await nav.boundingBox();
      assert(
        composerBox.y + composerBox.height <= navBox.y,
        "Composer obstructed by mobile navigation",
      );
    }
    additionalChecks.push(`message history and composer ${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  emptyTasks = true;
  await open("/staff/tasks");
  await setTop(0);
  assert((await metrics()).max <= 1, "Empty Tasks still has footer/control-only scroll space");
  await capture("empty-tasks-no-footer-gap");
  emptyTasks = false;
  additionalChecks.push("empty Tasks has no footer-only overflow");

  await open("/staff/research");
  await page.getByRole("button", { name: "New Research Note" }).click();
  const researchCanvas = page.locator(".staff-research-canvas");
  await researchCanvas.fill("Unsaved synthetic research paragraph.\n".repeat(100));
  await researchCanvas.evaluate((el) => (el.scrollTop = 200));
  await setTop(0);
  await expect(control()).toBeHidden();
  await setTop(100000);
  if ((await metrics()).scrollTop > 240) {
    const draftScroll = await researchCanvas.evaluate((el) => el.scrollTop);
    await control().click();
    await expect.poll(async () => (await metrics()).scrollTop).toBe(0);
    assert.equal(await researchCanvas.evaluate((el) => el.scrollTop), draftScroll);
  }
  await expect(researchCanvas).toHaveValue("Unsaved synthetic research paragraph.\n".repeat(100));
  additionalChecks.push("Research inline editor retains draft and internal scroll");
  // Leave a dirty inline editor safely; never save its test content.
  page.once("dialog", (dialog) => dialog.accept());
  await page.setViewportSize({ width: 1440, height: 740 });
  await open("/staff/appointments");
  await setTop(100000);
  await expect(control()).toBeVisible();
  await page
    .getByRole("button", { name: "New Appointment", exact: true })
    .evaluate((el) => el.click());
  await expect(page.getByRole("dialog", { name: "New Appointment", exact: true })).toBeVisible();
  await expect(control()).toHaveCount(1);
  await expect(control()).toBeHidden();
  await capture("dialog-control-suppressed");
  await page.keyboard.press("Escape");
  additionalChecks.push("visible floating control suppressed during accessible dialog");
  await page.setViewportSize({ width: 1440, height: 1000 });

  for (const motion of ["reduce", "no-preference"]) {
    await page.emulateMedia({ reducedMotion: motion });
    await open("/staff");
    assert.equal((await metrics()).behavior, motion === "reduce" ? "auto" : "smooth");
    await setTop(100000);
    await control().click();
    await expect.poll(async () => (await metrics()).scrollTop).toBe(0);
  }
  additionalChecks.push("normal and reduced motion target the page canvas");
  user.role = "admin";
  await page.goto(origin + "/admin/appointments", {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page
    .getByRole("heading", { name: "Appointments", exact: true })
    .first()
    .waitFor({ timeout: 60000 });
  const adminMain = page.locator("main").first();
  await adminMain.evaluate((el) => el.scrollTo({ top: 100000, behavior: "instant" }));
  await expect(control()).toBeVisible();
  assert.equal(await control().evaluate((el) => getComputedStyle(el).position), "fixed");
  assert.equal(await control().evaluate((el) => getComputedStyle(el).bottom), "56px");
  assert.equal(await page.locator(".staff-scroll-top").count(), 0);
  await capture("admin-shared-control-unchanged");
  additionalChecks.push("Admin shared control remains fixed at its original offset");
  assert.deepEqual(errors, [], "Browser exceptions occurred");
  console.log(
    `PASS ${results.length} Staff route/width/theme checks; inline editor, dialog, reduced motion, empty Tasks and unchanged Admin control.`,
  );
} finally {
  fs.writeFileSync(
    path.join(out, "evidence.json"),
    JSON.stringify(
      {
        browserVersion: browser.version(),
        results,
        errors,
        mutations,
        liveMutations: 0,
        additionalChecks,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
