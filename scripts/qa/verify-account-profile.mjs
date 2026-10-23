import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 30000 });
import AxeBuilder from "@axe-core/playwright";
const out = ".local/qa/session-17a";
fs.mkdirSync(out, { recursive: true });
const createAuditOnly = process.argv.includes("--create-audit-only");
const correctionsOnly = process.argv.includes("--corrections-only");
const publicContrastOnly = process.argv.includes("--public-contrast-only");
const recheckAdmin = process.argv.includes("--recheck-admin");
const recheckDark = process.argv.includes("--recheck-dark");
const completeMatrix = process.argv.includes("--complete-matrix") || recheckDark || recheckAdmin;
const matrixOnly = process.argv.includes("--matrix-only");
const flowsOnly = process.argv.includes("--flows-only");
const prior =
  flowsOnly || completeMatrix || publicContrastOnly
    ? JSON.parse(
        fs.readFileSync(
          `${out}/${completeMatrix || publicContrastOnly ? "evidence" : "matrix"}.json`,
          "utf8",
        ),
      )
    : null;
if (flowsOnly)
  assert.equal(
    prior.results.filter(
      (r) =>
        r.check === "portal account / language / responsive" &&
        (!recheckDark || r.theme === "light") &&
        (!recheckAdmin || r.role !== "admin"),
    ).length,
    42,
  );
const results = publicContrastOnly
    ? prior.results.filter((r) => r.check !== "public dark menu / outside click / accessibility")
    : prior
      ? prior.results.filter(
          (r) =>
            r.check === "portal account / language / responsive" &&
            (!recheckDark || r.theme === "light") &&
            (!recheckAdmin || r.role !== "admin"),
        )
      : [],
  errors = [],
  writes = publicContrastOnly ? prior.writes : [],
  scans = publicContrastOnly
    ? prior.scans.filter((r) => r.role !== "public")
    : (prior?.scans.filter(
        (r) =>
          !r.scope &&
          r.role !== "public" &&
          (!recheckDark || r.theme === "light") &&
          (!recheckAdmin || r.role !== "admin"),
      ) ?? []);
const origin = process.env.PORTAL_QA_ORIGIN || "http://localhost:3001";
const id = "71000000-0000-4000-8000-000000000001";
const stamp = "2026-10-20T04:15:00Z";
const browser = await chromium.launch();
const roles = { staff: "associate", admin: "admin", client: "client" };
const baseUser = {
  id,
  _id: id,
  firmId: "73000000-0000-4000-8000-000000000001",
  name: "Synthetic Profile Reviewer",
  email: "reviewer@example.invalid",
  role: "associate",
  avatar: null,
  phone: "+977 9800000000",
  bio: "Synthetic professional biography.",
  isActive: true,
  isPublicFacing: false,
  isPending: false,
  barCouncilNumber: null,
  barCouncilExpiry: null,
  twoFactorEnabled: false,
  twoFactorRequired: false,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: stamp,
  lastLoginAt: stamp,
};
let internalWorkspace = false;
let currentTheme = "light";
let page,
  context,
  user,
  fail = "",
  anonymous = false,
  delay = 0,
  sessionRows;
const settings = {
  firmName: "Srimar Law",
  heroImageUrl: "/images/staff-home-nepal.jpg",
  onlineBookingEnabled: true,
};
const audit = Array.from({ length: 9 }, (_, i) => ({
  id: `event-${i}`,
  action: "profile.updated",
  createdAt: stamp,
  details: "PRIVATE_QA_METADATA",
  ipAddress: "192.0.2.1",
}));
async function setup(role = "staff", width = 1440, theme = "light", height = 900) {
  if (context) await context.close();
  internalWorkspace = false;
  currentTheme = theme;
  user = { ...baseUser, role: roles[role] };
  anonymous = false;
  fail = "";
  delay = 0;
  sessionRows = [
    {
      id: "current",
      isCurrent: true,
      userAgent: "Mozilla/5.0 Chrome/148.0",
      ipAddress: "192.0.2.1",
      lastActive: stamp,
      expiresAt: "2099-01-01",
      revokedAt: null,
    },
    {
      id: "other",
      isCurrent: false,
      userAgent: "Mozilla/5.0 Firefox/145.0",
      ipAddress: "192.0.2.2",
      lastActive: stamp,
      expiresAt: "2099-01-01",
      revokedAt: null,
    },
  ];
  context = await browser.newContext({
    viewport: { width, height },
    timezoneId: "Asia/Kathmandu",
    colorScheme: theme,
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push({ url: page.url(), message: e.message }));
  await page.addInitScript(() => {
    localStorage.setItem("lexnepal_lang", "en");
  });
  await page.route("**/*", async (r) => {
    const req = r.request(),
      url = new URL(req.url()),
      p = url.pathname;
    if (p === "/__nextjs_original-stack-frames") return r.continue(); // Read-only local development diagnostics.
    if (!p.startsWith("/api/") && p !== "/qa-avatar-storage") {
      if (req.method() !== "GET" && req.method() !== "HEAD" && !req.headers()["next-action"]) {
        writes.push({ path: p, method: req.method(), intercepted: true, unexpected: true });
        return r.abort();
      }
      return r.continue();
    }
    let data = [];
    if (req.method() !== "GET") {
      writes.push({
        path: p,
        method: req.method(),
        body:
          p.includes("password") || p.includes("two-factor")
            ? "[synthetic security input redacted]"
            : req.postData(),
        intercepted: true,
      });
      if (delay) await new Promise((res) => setTimeout(res, delay));
      if (fail && p.includes(fail))
        return r.fulfill({
          status: 403,
          json: p.startsWith("/api/auth/")
            ? { code: "FORBIDDEN", message: "Synthetic permission denial" }
            : { error: { code: "FORBIDDEN", message: "Synthetic permission denial" } },
        });
      if (p === "/api/v1/users/me") {
        Object.assign(user, req.postDataJSON());
        data = user;
      } else if (p.endsWith("/avatar-upload-intents"))
        data = {
          intentId: "synthetic-intent",
          upload: { url: origin + "/qa-avatar-storage", fields: { key: "synthetic-avatar" } },
        };
      else if (p.endsWith("/complete")) {
        user.avatar = "/images/staff-home-nepal.jpg";
        data = { accepted: true };
      } else if (p.endsWith("/avatar")) user.avatar = null;
      else if (p.includes("/sessions/") && req.method() === "DELETE")
        sessionRows = sessionRows.filter((s) => s.id !== decodeURIComponent(p.split("/").at(-1)));
      else if (p.endsWith("/sessions")) {
        sessionRows = sessionRows.filter((s) => s.isCurrent);
        data = { revoked: 1 };
      } else if (p.endsWith("/two-factor/enable"))
        return r.fulfill({
          json: {
            method: "totp",
            totpURI: "otpauth://totp/Synthetic?secret=JBSWY3DPEHPK3PXP&issuer=LexNepal",
            backupCodes: ["SYNTHETIC-NOT-REAL"],
          },
        });
      else if (p.endsWith("/two-factor/verify-totp")) {
        user.twoFactorEnabled = true;
        return r.fulfill({ json: { status: true } });
      } else if (p.endsWith("/two-factor/disable")) {
        user.twoFactorEnabled = false;
        return r.fulfill({ json: { status: true } });
      } else if (p.startsWith("/api/auth/")) return r.fulfill({ json: { success: true } });
      return r.fulfill({ json: { data } });
    }
    if (p === "/api/auth/get-session")
      return r.fulfill({
        json: anonymous
          ? null
          : {
              session: {
                id: "current",
                userId: id,
                token: "synthetic-only",
                expiresAt: "2099-01-01T00:00:00Z",
              },
              user,
            },
      });
    if (p === "/api/v1/users/me") data = user;
    else if (p.endsWith("/sessions")) data = sessionRows;
    else if (p.endsWith("/audit-events"))
      data =
        role === "client"
          ? audit.map(({ id, action, createdAt }) => ({ id, action, createdAt }))
          : audit;
    else if (p === "/api/v1/auth/session")
      data = { capabilities: role === "admin" ? ["users.manage", "cms.manage"] : [] };
    else if (internalWorkspace && (p === "/api/v1/cases" || p.startsWith("/api/v1/cases/"))) {
      const matter = {
        id: "72000000-0000-4000-8000-000000000001",
        _id: "72000000-0000-4000-8000-000000000001",
        title: "Synthetic legal matter",
        caseNumber: "QA-001",
        status: "active",
        practiceArea: "Civil Litigation",
        assignedLawyerId: id,
        clientId: baseUser.firmId,
        filingDate: "2026-10-01",
        createdAt: stamp,
        updatedAt: stamp,
        teamMemberIds: [],
        parties: [],
      };
      data = p === "/api/v1/cases" ? [matter] : matter;
    } else if (internalWorkspace && p === "/api/v1/messages")
      data = {
        page: Array.from({ length: 45 }, (_, i) => ({
          _id: `message-${i}`,
          caseId: "72000000-0000-4000-8000-000000000001",
          senderId: baseUser.firmId,
          content: `Synthetic history message ${i + 1}.`,
          createdAt: `2026-10-19T04:${String(i).padStart(2, "0")}:00Z`,
        })),
        isDone: true,
        continueCursor: "",
      };
    else if (p === "/api/v1/messages/unread") data = {};
    else if (p.includes("settings")) data = settings;
    else if (p === "/api/v1/firm") data = { name: "Synthetic Firm", slug: "synthetic" };
    else if (p === "/api/v1/clients/me")
      data = {
        id: "client-qa",
        _id: "client-qa",
        fullName: user.name,
        email: user.email,
        type: "individual",
        kycStatus: "pending",
        isActive: true,
        phone: user.phone,
        address: "Synthetic address",
      };
    else if (p.includes("/assets/"))
      return r.fulfill({ status: 404, body: "Synthetic unavailable image" });
    return r.fulfill({ json: { data } });
  });
}
async function goto(role = "staff") {
  await page.goto(`${origin}/${role}/profile`, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Security", exact: true }).waitFor();
  await applyTheme();
}
async function applyTheme() {
  await page.evaluate(
    (theme) => document.documentElement.classList.toggle("dark", theme === "dark"),
    currentTheme,
  );
}
async function shot(name) {
  await applyTheme();
  await page.screenshot({ path: `${out}/${name}.png` });
}
function pass(check, details = {}) {
  results.push({ check, ...details });
  console.log("PASS", check);
}
async function geometry() {
  return page.evaluate(() => {
    const shell = document.querySelector(".dashboard-theme"),
      main = document.querySelector("#staff-main-canvas"),
      outer = document.querySelector(".staff-shell-content");
    return {
      width: innerWidth,
      height: innerHeight,
      bodyRange: document.documentElement.scrollHeight - innerHeight,
      overflow: document.documentElement.scrollWidth - innerWidth,
      shellRange: outer ? outer.scrollHeight - outer.clientHeight : null,
      mainPosition: main ? getComputedStyle(main).position : null,
      staffPrimary: document.querySelectorAll(".staff-navigation-sidebar nav a").length,
      bottomBar: !!document.querySelector(".staff-mobile-primary"),
      shellBottom: shell?.getBoundingClientRect().bottom,
      parentHorizontalRange:
        document.querySelector("#admin-main-canvas")?.parentElement.scrollWidth -
          document.querySelector("#admin-main-canvas")?.parentElement.clientWidth || 0,
    };
  });
}
async function accountOpen(role, width) {
  if (width >= (role === "client" ? 1024 : 768)) {
    const trigger = page.getByRole("button", { name: "Open account menu", exact: true });
    // Native keyboard activation avoids local Next dev-indicator overlap at sidebar footers.
    await trigger.focus();
    await trigger.press("Enter");
    return page.getByRole("menu", { name: "Account", exact: true });
  }
  if (role === "staff")
    await page.getByRole("button", { name: "Open Staff navigation", exact: true }).click();
  else if (role === "admin")
    await page.getByRole("button", { name: "Open Admin navigation", exact: true }).click();
  else await page.getByRole("button", { name: "More", exact: true }).click();
  return page.locator(".portal-account-drawer");
}
async function checkPublicDarkMenus() {
  for (const width of [390, 1440]) {
    await setup("staff", width, "dark");
    await page.goto(origin + "/");
    if (width < 768) await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page
      .getByRole("button", { name: "My Portal", exact: true })
      .filter({ visible: true })
      .click();
    await applyTheme();
    await page.waitForTimeout(300);
    const menu = page.getByRole("menu", { name: "My Portal", exact: true });
    for (const key of ["Home", "End"]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(200);
      const scan = await new AxeBuilder({ page })
        .include(".public-account-menu")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      scans.push({
        role: "public",
        width,
        theme: "dark",
        keyboard: key,
        violations: scan.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
      });
    }
    await shot(`public-${width}-dark-menu`);
    await page.mouse.click(width - 2, 898);
    await expect(menu).not.toBeVisible();
    pass("public dark menu / outside click / accessibility", { width });
  }
}

async function correctionScan(role, width, scope) {
  await page.waitForTimeout(250);
  const scan = await new AxeBuilder({ page })
    .include(scope)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  scans.push({
    role,
    width,
    scope,
    violations: scan.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  });
}
function sessionFixture(count) {
  const current = sessionRows.find((s) => s.isCurrent) ?? {
    id: "current",
    isCurrent: true,
    userAgent: "Chrome/148.0",
    lastActive: stamp,
    expiresAt: "2099-01-01",
    revokedAt: null,
  };
  sessionRows = Array.from({ length: Math.max(0, count - 1) }, (_, i) => ({
    ...current,
    id: `other-${i + 1}`,
    isCurrent: false,
  }));
  if (count) sessionRows.splice(Math.min(2, sessionRows.length), 0, current);
}
async function checkCorrections() {
  for (const role of ["staff", "admin", "client"]) {
    for (const [width, theme] of [
      [1440, "light"],
      [768, "dark"],
      [390, "light"],
      [360, "dark"],
    ]) {
      await setup(role, width, theme);
      await goto(role);
      const account = await accountOpen(role, width);
      // Preserve the existing Admin/Client scrollable drawer presentation.
      if (width < (role === "client" ? 1024 : 768)) await account.scrollIntoViewIfNeeded();
      await expect(account.locator(".portal-account-identity")).toContainText(user.name);
      await expect(account.locator(".portal-account-role")).toBeVisible();
      await expect(account.getByText("Appearance", { exact: true })).toHaveCount(0);
      const box = await account.boundingBox();
      assert(
        box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 901,
        JSON.stringify({ role, width, box }),
      );
      assert.equal((await geometry()).overflow, 0);
      if (width >= (role === "client" ? 1024 : 768)) {
        await page.keyboard.press("End");
        await expect(
          account.getByRole("menuitem", { name: "Sign Out", exact: true }),
        ).toBeFocused();
        await correctionScan(role, width, ".portal-account-menu");
        await shot(`correction-after-${role}-${width}-${theme}-account`);
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("button", { name: "Open account menu", exact: true }),
        ).toBeFocused();
      } else {
        await account.getByRole("button", { name: "Sign out everywhere", exact: true }).click();
        await expect(
          account.getByRole("group", { name: "Confirm sign out everywhere" }),
        ).toBeVisible();
        await account.getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(
          account.getByRole("button", { name: "Sign out everywhere", exact: true }),
        ).toBeFocused();
        await correctionScan(role, width, ".portal-account-drawer");
        await shot(`correction-after-${role}-${width}-${theme}-account`);
        await page.keyboard.press("Escape");
      }
      pass("correction premium account / role / bounds / keyboard", { role, width, theme });
    }
    for (const count of [0, 1, 7, 51]) {
      const width = role === "admin" ? 768 : role === "client" ? 390 : 1440;
      await setup(role, width, "light");
      sessionFixture(count);
      await goto(role);
      await page.getByRole("tab", { name: "Active Sessions", exact: true }).click();
      const panel = page.locator(".portal-session-list");
      await expect(panel).toBeVisible();
      await expect(panel.locator('[data-slot="current-session"]')).toHaveCount(count ? 1 : 0);
      await expect(panel.locator('[data-slot="other-session"]')).toHaveCount(
        Math.min(6, Math.max(0, count - 1)),
      );
      await expect(panel.getByRole("navigation", { name: "Active sessions pages" })).toHaveCount(
        count > 7 ? 1 : 0,
      );
      if (count === 0) await expect(panel).toContainText("No active sessions found.");
      if (count > 1) await expect(panel.getByRole("status")).toContainText(`of ${count - 1}`);
      assert.equal((await geometry()).overflow, 0);
      pass("correction sessions boundary / current protected / page size", { role, count, width });
      if (count !== 51) continue;
      const pages = panel.getByRole("navigation", { name: "Active sessions pages" });
      await pages.getByRole("button", { name: "9", exact: true }).click();
      await expect(panel.getByRole("status")).toContainText("Page 9 of 9");
      await expect(panel.locator('[data-slot="current-session"]')).toHaveCount(1);
      await expect(panel.locator('[data-slot="other-session"]')).toHaveCount(2);
      const writesBefore = writes.length;
      await correctionScan(role, width, ".portal-session-list");
      await panel.scrollIntoViewIfNeeded();
      await shot(`correction-${role}-51-sessions-page-9`);
      // Cancel and denial preserve the page and records. All writes are intercepted.
      await panel.getByRole("button", { name: "Revoke", exact: true }).last().click();
      const confirmation = page.getByRole("dialog", { name: "Confirm session revocation" });
      await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(panel.getByRole("status")).toContainText("Page 9 of 9");
      fail = "/sessions/";
      await panel.getByRole("button", { name: "Revoke", exact: true }).last().click();
      await confirmation.getByRole("button", { name: "Confirm revocation", exact: true }).click();
      await expect(confirmation.getByRole("alert")).toBeVisible();
      assert.equal(sessionRows.length, 51);
      fail = "";
      delay = 500;
      await confirmation.getByRole("button", { name: "Confirm revocation", exact: true }).click();
      await expect(
        confirmation.getByRole("button", { name: "Revoking...", exact: true }),
      ).toBeDisabled();
      await expect(confirmation).not.toBeVisible();
      await expect(panel.locator('[data-slot="other-session"]')).toHaveCount(1);
      await panel.getByRole("button", { name: "Revoke", exact: true }).click();
      await confirmation.getByRole("button", { name: "Confirm revocation", exact: true }).click();
      await expect(confirmation).not.toBeVisible();
      await expect(panel.getByRole("status")).toContainText("Page 8 of 8");
      await expect(panel.locator('[data-slot="other-session"]')).toHaveCount(6);
      await pages.getByRole("button", { name: "Previous page", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(panel.getByRole("status")).toContainText("Page 7 of 8");
      assert.equal(sessionRows.length, 49);
      await panel.getByRole("button", { name: "Sign out everywhere else", exact: true }).click();
      await confirmation.getByRole("button", { name: "Confirm revocation", exact: true }).click();
      await expect(confirmation).not.toBeVisible();
      await expect(panel.locator('[data-slot="current-session"]')).toHaveCount(1);
      await expect(panel.locator('[data-slot="other-session"]')).toHaveCount(0);
      await expect(pages).toHaveCount(0);
      assert.equal(
        writes.length - writesBefore,
        4,
        "denial, retry, final revoke, bulk: one request each",
      );
      // Let the closing confirmation restore focus before switching tabs.
      await page.waitForTimeout(200);
      await page.getByRole("tab", { name: "Data & Privacy", exact: true }).click();
      const auditLabel = role === "client" ? "profile.updated" : "Profile Updated";
      await expect(page.getByText(auditLabel, { exact: true }).first()).toBeVisible();
      await page.getByRole("button", { name: "Next page", exact: true }).click();
      await expect(page.getByText(auditLabel, { exact: true })).toHaveCount(3);
      await page.getByRole("tab", { name: "Active Sessions", exact: true }).click();
      await expect(panel.locator('[data-slot="current-session"]')).toHaveCount(1);
      pass("correction revoke denial / retry / busy / page clamp / keyboard / bulk", { role });
    }
    await setup(role, 360, "dark", 640);
    await goto(role);
    await accountOpen(role, 360);
    const drawer = page.locator(".portal-account-drawer");
    await drawer.getByRole("button", { name: "Sign out everywhere", exact: true }).click();
    const cancel = drawer.getByRole("button", { name: "Cancel", exact: true });
    await cancel.scrollIntoViewIfNeeded();
    const cancelBox = await cancel.boundingBox();
    assert(cancelBox.y >= 0 && cancelBox.y + cancelBox.height <= 640);
    await shot(`correction-${role}-360-short-confirm`);
    await cancel.click();
    await page.keyboard.press("Escape");
    pass("correction short drawer confirmation reachable", { role });
  }
}

async function createStyles(button) {
  return button.evaluate((e) => {
    const s = getComputedStyle(e);
    const resolve = (token) => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = s.getPropertyValue(token);
      probe.style.position = "absolute";
      e.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    };
    return {
      background: s.backgroundColor,
      color: s.color,
      height: e.getBoundingClientRect().height,
      font: s.font,
      radius: s.borderRadius,
      padding: s.padding,
      shadow: s.boxShadow,
      primary: resolve("--dashboard-primary"),
      hover: resolve("--dashboard-primary-hover"),
      pressed: resolve("--dashboard-primary-pressed"),
      foreground: resolve("--dashboard-primary-foreground"),
    };
  });
}
async function checkStaffCreate() {
  const links = ["/staff/tasks", "/staff/cases", "/staff/hearings", "/staff/clients"];
  for (const width of [768, 1024, 1280, 1440])
    for (const theme of ["light", "dark"]) {
      await setup("staff", width, theme);
      let reference;
      for (const path of ["/staff", "/staff/tasks", "/staff/cases"]) {
        if (path === "/staff") await page.goto(origin + path, { waitUntil: "domcontentloaded" });
        else
          await page
            .locator(".staff-navigation-sidebar nav")
            .getByRole("link", { name: path.endsWith("tasks") ? "Tasks" : "Cases", exact: true })
            .click();
        await expect(page).toHaveURL(origin + path);
        await applyTheme();
        const header = page.locator(".staff-admin-topbar"),
          button = header.getByRole("button", { name: "Create", exact: true });
        await expect(button).toBeVisible();
        await page.mouse.move(1, 1);
        await button.evaluate((e) => e.blur());
        await page.waitForTimeout(200);
        const normal = await createStyles(button);
        assert.equal(normal.background, normal.primary);
        assert.equal(normal.color, normal.foreground);
        assert.equal(normal.height, 44);
        await button.hover();
        await page.waitForTimeout(200);
        const hover = await createStyles(button);
        assert.equal(hover.background, normal.hover);
        await page.mouse.down();
        await page.waitForTimeout(200);
        const active = await createStyles(button);
        assert.equal(active.background, normal.pressed);
        await page.mouse.up();
        const menu = header.getByRole("menu");
        await expect(menu).toBeVisible();
        await page.waitForTimeout(200);
        const expanded = await createStyles(button);
        assert.equal(expanded.background, normal.pressed);
        assert.deepEqual(
          await menu
            .getByRole("menuitem")
            .evaluateAll((es) => es.map((e) => e.getAttribute("href"))),
          links,
        );
        await page.keyboard.press("End");
        await expect(menu.getByRole("menuitem", { name: "Add Client", exact: true })).toBeFocused();
        await page.keyboard.press("Home");
        await expect(menu.getByRole("menuitem", { name: "New Task", exact: true })).toBeFocused();
        if (width === 1440) await correctionScan("staff", width, ".staff-admin-topbar");
        await page.keyboard.press("Escape");
        await expect(button).toBeFocused();
        await page.mouse.move(1, 1);
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
        await expect(button).toBeFocused();
        await page.waitForTimeout(200);
        const focused = await createStyles(button);
        assert.notEqual(focused.shadow, "none");
        const signature = { normal, hover, active, expanded, focused };
        if (reference)
          assert.deepEqual(signature, reference, `Create state drift: ${width} ${theme} ${path}`);
        else reference = signature;
        const g = await geometry();
        assert.equal(g.overflow, 0);
        assert.equal(g.shellRange, 0);
        assert.equal(g.mainPosition, "relative");
        assert.equal(g.staffPrimary, 12);
        const boxes = await header.evaluate((e) => {
          const r = e.getBoundingClientRect();
          return [...e.querySelectorAll("button")]
            .filter((b) => b.getClientRects().length)
            .map((b) => ({
              label: b.getAttribute("aria-label") || b.textContent.trim(),
              left: b.getBoundingClientRect().left,
              right: b.getBoundingClientRect().right,
              top: b.getBoundingClientRect().top,
              bottom: b.getBoundingClientRect().bottom,
              header: r.toJSON(),
            }));
        });
        for (const b of boxes)
          assert(
            b.left >= b.header.left &&
              b.right <= b.header.right &&
              b.top >= b.header.top &&
              b.bottom <= b.header.bottom,
            JSON.stringify(b),
          );
        if (width === 1440 || width === 768)
          await shot(`create-after-${path.split("/")[2] || "dashboard"}-${width}-${theme}`);
        pass("Staff Create consistent normal / hover / active / expanded / focus / links", {
          path,
          width,
          theme,
          signature,
          geometry: g,
        });
      }
    }
  for (const theme of ["light", "dark"]) {
    await setup("staff", 1440, theme);
    internalWorkspace = true;
    for (const path of [
      "/staff/hearings",
      "/staff/documents",
      "/staff/research",
      "/staff/content",
      "/staff/crm",
      "/staff/clients",
      "/staff/messages",
      "/staff/appointments",
      "/staff/hr",
      "/staff/profile",
      "/staff/content/write",
      "/staff/cases/72000000-0000-4000-8000-000000000001",
    ]) {
      await page.goto(origin + path, { waitUntil: "domcontentloaded" });
      await applyTheme();
      const button = page
        .locator(".staff-admin-topbar")
        .getByRole("button", { name: "Create", exact: true });
      await expect(button).toBeVisible();
      await page.mouse.move(1, 1);
      await page.waitForTimeout(200);
      const s = await createStyles(button);
      assert.equal(s.background, s.primary);
      assert.equal(s.height, 44);
      const g = await geometry();
      assert.equal(g.overflow, 0);
      assert.equal(g.shellRange, 0);
      pass("Staff Create remaining and nested route parity", { path, theme, styles: s });
    }
  }
  for (const width of [360, 390])
    for (const theme of ["light", "dark"]) {
      await setup("staff", width, theme);
      await goto();
      const create = page
        .locator(".staff-admin-topbar")
        .getByRole("button", { name: "Create", exact: true });
      await expect(create).toBeHidden();
      await expect(
        page.getByRole("button", { name: /Switch language to/ }).filter({ visible: true }),
      ).toHaveCount(1);
      assert.equal((await geometry()).overflow, 0);
      pass("Staff mobile chrome / language unchanged", { width, theme });
    }
  const before = JSON.parse(fs.readFileSync(`${out}/create-isolation-before.json`, "utf8"));
  for (const role of ["admin", "client"]) {
    await setup(role, 1440, "light");
    await goto(role);
    const b = page
      .locator(".staff-admin-topbar")
      .getByRole("button", { name: "Create", exact: true });
    const actual = {
      role,
      count: await b.count(),
      styles: (await b.count())
        ? await b.evaluate((e) => ({
            background: getComputedStyle(e).backgroundColor,
            height: e.getBoundingClientRect().height,
            radius: getComputedStyle(e).borderRadius,
            font: getComputedStyle(e).font,
          }))
        : null,
    };
    assert.deepEqual(
      actual,
      before.find((r) => r.role === role),
    );
    pass("Create Admin / Client before-after isolation", actual);
  }
  await setup("staff", 1440, "light");
  await page.goto(origin + "/staff");
  const b = page
    .locator(".staff-admin-topbar")
    .getByRole("button", { name: "Create", exact: true });
  await b.focus();
  await b.press("ArrowDown");
  await page.getByRole("menuitem", { name: "New Task", exact: true }).press("Enter");
  await expect(page).toHaveURL(origin + "/staff/tasks");
  pass("Shared Create New Task actual routing preserved");
}

if (publicContrastOnly) {
  assert.equal(prior.results.length, 97);
  assert.equal(prior.errors.length, 0);
}
try {
  // All portal modes and shared account/header placement; use real profile routes.
  if (!flowsOnly && !publicContrastOnly && !correctionsOnly && !createAuditOnly)
    for (const role of ["staff", "admin", "client"])
      for (const width of [360, 390, 768, 1024, 1280, 1440, 1704])
        for (const theme of ["light", "dark"]) {
          if (
            completeMatrix &&
            results.some((r) => r.role === role && r.width === width && r.theme === theme)
          )
            continue;
          await setup(role, width, theme);
          await goto(role);
          await expect(page.locator('header button[aria-label="Open account menu"]')).toHaveCount(
            0,
          );
          const langs = page
            .getByRole("button", { name: /Switch language to/ })
            .filter({ visible: true });
          await expect(langs).toHaveCount(1);
          await langs.click();
          await expect(langs).toHaveAttribute("aria-label", "Switch language to English");
          assert.equal(await page.evaluate(() => localStorage.getItem("lexnepal_lang")), "ne");
          await langs.click();
          const g = await geometry();
          assert(g.overflow <= 1, `horizontal overflow ${role} ${width}: ${g.overflow}`);
          if (role === "admin")
            assert.equal(
              g.parentHorizontalRange,
              0,
              "Admin header must fit its actual content column",
            );
          if (role === "staff") {
            assert.equal(g.shellRange, 0);
            assert.equal(g.mainPosition, "relative");
            assert.equal(g.bottomBar, false);
            assert.equal(g.staffPrimary, 12);
          }
          if (role === "client" && width >= 1024)
            await expect(page.getByText("Need Help?", { exact: true })).toBeVisible();
          const account = await accountOpen(role, width);
          await expect(account).toBeVisible();
          await expect(account.getByText(user.email, { exact: true })).toBeVisible();
          await expect(account.getByText(/Language \(/)).toHaveCount(0);
          const box = await account.boundingBox();
          assert(box.x >= -1 && box.x + box.width <= width + 1, `account bounds ${role} ${width}`);
          await shot(`${role}-${width}-${theme}-account`);
          if (width >= (role === "client" ? 1024 : 768)) {
            await page.keyboard.press("End");
            await expect(
              page.getByRole("menuitem", { name: "Sign Out", exact: true }),
            ).toBeFocused();
            await page.keyboard.press("Escape");
            await expect(
              page.getByRole("button", { name: "Open account menu", exact: true }),
            ).toBeFocused();
          } else {
            await page.keyboard.press("Escape");
            await expect(account).not.toBeVisible();
          }
          pass("portal account / language / responsive", { role, width, theme, geometry: g });
          if (width === 1440 || width === 390) await shot(`${role}-${width}-${theme}-profile`);
          if ([1440, 390].includes(width)) {
            const scan = await new AxeBuilder({ page })
              .include(".dashboard-theme")
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze();
            scans.push({
              role,
              width,
              theme,
              violations: scan.violations.map((v) => ({
                id: v.id,
                impact: v.impact,
                nodes: v.nodes.map((n) => n.target),
              })),
            });
          }
        }
  if (!flowsOnly && !publicContrastOnly && !correctionsOnly && !createAuditOnly)
    fs.writeFileSync(`${out}/matrix.json`, JSON.stringify({ results, scans, errors }, null, 2));
  if (!matrixOnly && !publicContrastOnly && !correctionsOnly && !createAuditOnly) {
    // Existing command wiring, failures, retries, cache updates, and security confirmation.
    await setup();
    await goto();
    await page.getByLabel("Full Name", { exact: true }).fill("Synthetic Updated Reviewer");
    fail = "/users/me";
    await page.getByRole("button", { name: "Save Changes", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Could not save" })).toBeVisible();
    await expect(page.getByLabel("Full Name", { exact: true })).toHaveValue(
      "Synthetic Updated Reviewer",
    );
    fail = "";
    await page.getByRole("button", { name: "Save Changes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Synthetic Updated Reviewer" })).toBeVisible();
    pass("profile save denied / draft retained / retry / identity refresh");
    const fileInput = page.locator("input[type=file]");
    const writesBefore = writes.length;
    await fileInput.setInputFiles({
      name: "invalid.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("synthetic"),
    });
    await expect(page.getByText("Choose a JPG or PNG image up to 5 MB.")).toBeVisible();
    assert.equal(writes.length, writesBefore);
    await fileInput.setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await expect(page.getByRole("button", { name: "Remove", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(page.getByRole("button", { name: "Remove", exact: true })).toBeDisabled();
    pass("avatar type rejection / intent / intercepted storage / completion / removal");
    await page.getByRole("tab", { name: "Security", exact: true }).click();
    await page.getByLabel("Current Password", { exact: true }).fill("SyntheticCurrent123!");
    await page.getByLabel("New Password", { exact: true }).fill("SyntheticNew123!");
    await page.getByLabel("Confirm New Password", { exact: true }).fill("SyntheticNew123!");
    fail = "change-password";
    await page.getByRole("button", { name: "Update Password", exact: true }).click();
    await expect(page.getByLabel("Current Password", { exact: true })).toHaveValue(
      "SyntheticCurrent123!",
    );
    await expect(
      page.getByText(/Synthetic permission denial|Failed to change password|Forbidden/).first(),
    ).toBeVisible();
    fail = "";
    delay = 500;
    const prior = writes.filter((w) => w.path.includes("change-password")).length;
    await page.getByRole("button", { name: "Update Password", exact: true }).click();
    await expect(page.getByRole("button", { name: /Updating password/ })).toBeDisabled();
    await expect(page.getByLabel("Current Password", { exact: true })).toHaveValue("");
    assert.equal(writes.filter((w) => w.path.includes("change-password")).length, prior + 1);
    delay = 0;
    pass("password error / retained input / busy / successful reset");
    await page.getByRole("button", { name: "Enable 2FA", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "Enable authenticator" });
    await dialog.getByLabel("Current password", { exact: true }).fill("SyntheticCurrent123!");
    await dialog.getByRole("button", { name: "Continue", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Set up authenticator" });
    await expect(dialog).toBeVisible();
    await shot("totp-enrollment-synthetic");
    await dialog.getByLabel("Six-digit verification code").fill("123456");
    await dialog.getByRole("button", { name: "Confirm & enable" }).click();
    await expect(page.getByRole("button", { name: "Disable 2FA" })).toBeVisible();
    await page.getByRole("button", { name: "Disable 2FA" }).click();
    dialog = page.getByRole("dialog", { name: "Disable authenticator" });
    await dialog.getByLabel("Current password").fill("SyntheticCurrent123!");
    await dialog.getByRole("button", { name: "Disable 2FA" }).click();
    await expect(page.getByRole("button", { name: "Enable 2FA" })).toBeVisible();
    pass("TOTP existing enable / enrollment / confirmation / disable");
    await page.getByRole("tab", { name: "Active Sessions" }).click();
    await expect(page.getByText("Current session", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Revoke", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Confirm session revocation" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Revoke", exact: true }).click();
    fail = "/sessions/other";
    await page.getByRole("button", { name: "Confirm revocation" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Could not revoke" })).toBeVisible();
    fail = "";
    await page.getByRole("button", { name: "Confirm revocation" }).click();
    await expect(page.getByRole("button", { name: "Revoke", exact: true })).toHaveCount(0);
    await expect(page.getByText("Current session", { exact: true })).toBeVisible();
    pass("session current detection / confirmation / failure / retry / cache refresh");
    await page.getByRole("tab", { name: "Data & Privacy" }).click();
    await expect(page.getByText("Profile Updated", { exact: true }).first()).toBeVisible();
    assert.equal(
      await page.getByText("PRIVATE_QA_METADATA", { exact: false }).first().isVisible(),
      false,
    );
    await shot("privacy-human-readable");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Profile", exact: true }).click();
    const downloaded = await download;
    const exported = JSON.parse(fs.readFileSync(await downloaded.path(), "utf8"));
    assert.equal(exported.profile.email, user.email);
    assert.equal(exported.profile.password, undefined);
    pass("audit human-readable / details collapsed / pagination / profile JSON export");
    await page.getByRole("button", { name: "Open account menu", exact: true }).focus();
    await page.getByRole("button", { name: "Open account menu", exact: true }).press("Enter");
    await page.getByRole("menuitem", { name: "Sign out everywhere", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Sign out everywhere", exact: true });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Open account menu", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Open account menu", exact: true }).focus();
    await page.getByRole("button", { name: "Open account menu", exact: true }).press("Enter");
    await page.getByRole("menuitem", { name: "Sign out everywhere", exact: true }).click();
    fail = "/sessions";
    const logoutCount = writes.filter((w) => w.path.endsWith("/sign-out")).length;
    await page.getByRole("button", { name: "Sign out everywhere", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Some sessions may remain" }),
    ).toBeVisible();
    assert.equal(writes.filter((w) => w.path.endsWith("/sign-out")).length, logoutCount);
    fail = "sign-out";
    await page.getByRole("button", { name: "Sign out everywhere", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Some sessions may remain" }),
    ).toBeVisible();
    assert(page.url().includes("/staff/profile"));
    fail = "";
    await page.getByRole("button", { name: "Sign out everywhere", exact: true }).click();
    await page.waitForURL("**/sign-in");
    assert(writes.some((w) => w.path.endsWith("/sign-out")));
    pass("account destructive confirmation / Escape focus / failure stops local signout / retry");
    for (const role of ["admin", "client"]) {
      await setup(role);
      await goto(role);
      const nameField = page.getByLabel(role === "client" ? "Full name" : "Full Name", {
        exact: true,
      });
      const changedName = `Synthetic ${role} Updated`;
      await nameField.fill(changedName);
      if (role === "client")
        await page.getByLabel("Phone number", { exact: true }).fill("+977 0000000000");
      await page.getByRole("button", { name: /^Save changes$/i }).click();
      await expect(
        page.getByRole("button", { name: "Open account menu", exact: true }),
      ).toContainText(changedName);
      const lang = page
        .getByRole("button", { name: /Switch language to/ })
        .filter({ visible: true });
      await lang.focus();
      await lang.press("Enter");
      await expect(lang).toContainText("\u0928\u0947\u092a\u093e\u0932\u0940");
      await lang.click();
      await page.getByRole("tab", { name: "Security", exact: true }).click();
      await page.getByLabel("Current Password", { exact: true }).fill("SyntheticCurrent123!");
      await page.getByLabel("New Password", { exact: true }).fill("SyntheticNew123!");
      await page.getByLabel("Confirm New Password", { exact: true }).fill("SyntheticNew123!");
      await page.getByRole("button", { name: "Update Password", exact: true }).click();
      await expect(page.getByLabel("Current Password", { exact: true })).toHaveValue("");
      await page.getByRole("tab", { name: "Active Sessions" }).click();
      await page.getByRole("button", { name: "Sign out everywhere else" }).click();
      await page.getByRole("button", { name: "Confirm revocation" }).click();
      await expect(page.getByRole("button", { name: "Revoke", exact: true })).toHaveCount(0);
      await page.getByRole("tab", { name: "Data & Privacy" }).click();
      await expect(page.getByRole("button", { name: "Download Profile" })).toBeVisible();
      pass("preserved Admin/Client password / sessions / privacy / Nepali header", { role });
    }
    for (const role of ["staff", "admin", "client"]) {
      await setup(role, 390, "dark", 640);
      await goto(role);
      const drawer = await accountOpen(role, 390);
      await expect(drawer).toBeVisible();
      await drawer.getByRole("button", { name: "Sign out everywhere", exact: true }).click();
      await expect(
        drawer.getByRole("group", { name: "Confirm sign out everywhere" }),
      ).toBeVisible();
      await shot(`${role}-390-short-account-confirm`);
      await drawer.getByRole("button", { name: "Cancel", exact: true }).click();
      const scan = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      scans.push({
        role,
        scope: "mobile drawer account",
        violations: scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      });
      await page.keyboard.press("Escape");
      await expect(drawer).not.toBeVisible();
      pass("short-height account confirmation / drawer Escape / accessibility", { role });
    }
    for (const role of ["staff", "admin", "client"])
      for (const width of [360, 390, 768, 1024, 1280, 1440, 1704]) {
        await setup(role, width);
        await page.goto(origin + "/");
        if (width < 768) await page.getByRole("button", { name: "Open menu", exact: true }).click();
        await page
          .getByRole("button", { name: "My Portal", exact: true })
          .filter({ visible: true })
          .click();
        await applyTheme();
        const menu = page.getByRole("menu", { name: "My Portal", exact: true });
        await expect(menu).toBeVisible();
        const info = await menu.evaluate((e) => ({
          background: getComputedStyle(e).backgroundColor,
          bounds: e.getBoundingClientRect().toJSON(),
        }));
        assert(!info.background.includes("0, 0, 0, 0"));
        assert(info.bounds.x >= 0 && info.bounds.right <= width);
        await expect(menu.getByRole("menuitem", { name: "Open portal" })).toHaveAttribute(
          "href",
          `/${role}`,
        );
        if (role === "staff") await shot(`public-${width}-menu`);
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("button", { name: "My Portal", exact: true }).filter({ visible: true }),
        ).toBeFocused();
        if (width === 1440) {
          await page.getByRole("button", { name: "My Portal", exact: true }).click();
          await page.getByRole("menuitem", { name: "Open portal", exact: true }).click();
          await page.waitForURL(origin + `/${role}`);
          await expect(page.locator(`.dashboard-${role}`).first()).toBeVisible();
        }
        pass("public role routing / opaque surface / collision / Escape", { role, width, ...info });
      }
    await setup();
    await page.goto(origin + "/");
    await page.getByRole("button", { name: "My Portal", exact: true }).click();
    fail = "sign-out";
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Could not sign out" })).toBeVisible();
    assert(!page.url().includes("sign-in"));
    fail = "";
    await page.getByRole("button", { name: "My Portal", exact: true }).click();
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
    await page.waitForURL("**/sign-in");
    pass("public signout failure retained session / retry / authenticated command");

    await checkPublicDarkMenus();
    for (const role of ["staff", "admin", "client"]) {
      await setup(role, 1280, "dark");
      await goto(role);
      const menu = await accountOpen(role, 1280);
      const scan = await new AxeBuilder({ page })
        .include(".portal-account-menu")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      scans.push({
        role,
        scope: "desktop account menu",
        violations: scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      });
      await page.mouse.click(1278, 2);
      await expect(menu).not.toBeVisible();
      pass("desktop account outside click / accessibility", { role });
    }
    for (const width of [390, 768, 1440]) {
      await setup("staff", width, width === 390 ? "dark" : "light");
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const route of ["/staff", "/staff/tasks", "/staff/clients", "/staff/documents"]) {
        await page.goto(origin + route);
        await page.locator("#staff-main-canvas").waitFor();
        await page
          .getByRole("button", { name: /Switch language to/ })
          .filter({ visible: true })
          .waitFor();
        await page.locator("#staff-main-canvas").evaluate((e) => {
          e.scrollTop = e.scrollHeight;
        });
        const g = await geometry();
        assert.equal(g.bodyRange, 0);
        assert.equal(g.shellRange, 0);
        assert(g.overflow <= 1);
        const footer = page.locator(".staff-shell-footer");
        const bounds = await footer.boundingBox();
        assert(Math.abs(bounds.y + bounds.height - 900) <= 1);
        const top = page.getByRole("button", { name: "Scroll to top of page" });
        if (await top.isVisible()) {
          await top.click();
          await expect
            .poll(() => page.locator("#staff-main-canvas").evaluate((e) => e.scrollTop))
            .toBe(0);
        }
        if (route === "/staff/tasks" && width === 390) await shot("staff-tasks-footer-390-dark");
        pass("Staff canvas / footer / top / reduced motion regression", {
          route,
          width,
          geometry: g,
        });
      }
    }
    await setup();
    await page.route("**/api/auth/get-session", async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return r.fulfill({
        json: {
          session: { id: "current", userId: id, token: "synthetic-only", expiresAt: "2099-01-01" },
          user,
        },
      });
    });
    await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("status", { name: "Loading account" }).filter({ visible: true }),
    ).toBeVisible();
    await shot("public-loading");
    await expect(page.getByRole("button", { name: "My Portal", exact: true })).toBeVisible();
    pass("public account loading then authenticated");
    for (const width of [390, 1440]) {
      await setup("staff", width, "light", 778);
      internalWorkspace = true;
      await page.goto(origin + "/staff/messages?caseId=72000000-0000-4000-8000-000000000001");
      const history = page.getByRole("log").first();
      await expect(
        history.getByText("Synthetic history message 1.", { exact: true }),
      ).toBeVisible();
      await history.evaluate((e) => (e.scrollTop = 30));
      const reading = await history.evaluate((e) => e.scrollTop);
      await expect(page.getByRole("button", { name: "Scroll to top of page" })).toBeHidden();
      assert.equal(await history.evaluate((e) => e.scrollTop), reading);
      const composer = page.locator(".staff-messages-chat textarea");
      await expect(composer).toBeVisible();
      const box = await composer.boundingBox();
      assert(box.y + box.height <= 778);
      await shot(`messages-${width}-reading-composer`);
      await page.goto(origin + "/staff/research");
      await page.getByRole("button", { name: "New Research Note", exact: true }).click();
      const editor = page.locator(".staff-research-canvas");
      await editor.fill("Unsaved synthetic draft\n".repeat(80));
      await editor.evaluate((e) => (e.scrollTop = 90));
      const before = await editor.evaluate((e) => e.scrollTop);
      await page.locator("#staff-main-canvas").evaluate((e) => (e.scrollTop = 0));
      assert.equal(await editor.evaluate((e) => e.scrollTop), before);
      await shot(`research-${width}-unsaved-draft`);
      pass("Research and Messages independent reading / composer / unsaved draft", { width });
    }
    await setup();
    anonymous = true;
    await page.goto(origin + "/");
    await expect(page.getByRole("button", { name: "My Portal", exact: true })).toHaveCount(0);
    await shot("public-anonymous");
    pass("public anonymous state");
  }
  if (createAuditOnly) await checkStaffCreate();
  if (correctionsOnly) await checkCorrections();
  if (publicContrastOnly) await checkPublicDarkMenus();
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert(writes.every((w) => w.intercepted && !w.unexpected));
  assert(
    scans.every((s) => s.violations.length === 0),
    JSON.stringify(scans.filter((s) => s.violations.length)),
  );
} finally {
  fs.writeFileSync(
    `${out}/${createAuditOnly ? "create-evidence" : correctionsOnly ? "correction-evidence" : "evidence"}.json`,
    JSON.stringify(
      { browser: browser.version(), results, scans, errors, writes, liveMutations: 0 },
      null,
      2,
    ),
  );
  await browser.close();
}
console.log(
  JSON.stringify({
    checks: results.length,
    scans: scans.length,
    errors: errors.length,
    interceptedWrites: writes.length,
    liveMutations: 0,
  }),
);
