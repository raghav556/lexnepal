import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Actual Next.js route and production hooks. Every API request is intercepted;
// successful writes exist only in this process's synthetic browser fixture.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const polish = process.argv.includes("--final-polish");
const out = path.join(root, ".local/qa/session-16", ...(polish ? ["final-polish"] : []));
fs.mkdirSync(out, { recursive: true });
const origin = process.env.STAFF_HR_ORIGIN || "http://localhost:3001";
const staffId = "71000000-0000-4000-8000-000000000001";
const firmId = "73000000-0000-4000-8000-000000000001";
const stamp = "2026-10-20T07:30:00Z";
const user = {
  id: staffId,
  _id: staffId,
  firmId,
  name: "Synthetic Staff Reviewer",
  email: "staff@example.invalid",
  role: "associate",
  isActive: true,
  emailVerified: true,
  createdAt: stamp,
  updatedAt: stamp,
};
const types = ["annual", "sick", "maternity", "paternity", "unpaid"];
let attendance = [],
  leaves = [],
  balances = [];
let failure = null,
  delay = 0;
const requests = [],
  writes = [],
  errors = [],
  checks = [],
  axe = [];
function reset(mode = "closed") {
  failure = null;
  delay = 0;
  attendance = Array.from({ length: 20 }, (_, i) => ({
    id: `attendance-${i}`,
    _id: `attendance-${i}`,
    firmId,
    userId: staffId,
    date: `2026-10-${String(20 - i).padStart(2, "0")}`,
    clockIn: "09:00 AM",
    clockOut: i === 0 ? "01:15 PM" : "05:00 PM",
    status: "present",
    createdAt: stamp,
    updatedAt: stamp,
  }));
  attendance.push({
    ...attendance[0],
    id: "other-staff",
    userId: "72000000-0000-4000-8000-000000000001",
  });
  if (mode === "empty") attendance = [];
  if (mode === "open") delete attendance[0].clockOut;
  if (mode === "invalid") {
    attendance[0].clockIn = "invalid";
    delete attendance[0].clockOut;
  }
  leaves = [
    {
      id: "leave-pending",
      _id: "leave-pending",
      firmId,
      userId: staffId,
      type: "annual",
      fromDate: "2026-10-25",
      toDate: "2026-10-27",
      reason: "Synthetic leave request",
      status: "pending",
      reviewedBy: null,
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "leave-approved",
      _id: "leave-approved",
      firmId,
      userId: staffId,
      type: "sick",
      fromDate: "2026-10-12",
      toDate: "2026-10-13",
      reason: null,
      status: "approved",
      reviewedBy: staffId,
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "leave-rejected",
      _id: "leave-rejected",
      firmId,
      userId: staffId,
      type: "unpaid",
      fromDate: "2026-09-14",
      toDate: "2026-09-14",
      reason: "Synthetic previous request",
      status: "rejected",
      reviewedBy: staffId,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
  balances = [
    {
      userId: staffId,
      type: "annual",
      year: 2026,
      entitledDays: 20,
      usedDays: 5,
      pendingDays: 3,
      remainingDays: 12,
      source: "default",
    },
    {
      userId: staffId,
      type: "sick",
      year: 2026,
      entitledDays: 10,
      usedDays: 2,
      pendingDays: 0,
      remainingDays: 8,
      source: "override",
    },
  ];
}
reset();
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  timezoneId: "Asia/Kathmandu",
});
const page = await context.newPage();
await page.clock.setFixedTime(new Date(stamp));
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/api/**", async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    p = url.pathname,
    method = req.method();
  requests.push({ path: p, method, query: Object.fromEntries(url.searchParams) });
  const reply = (data, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(
        status >= 400
          ? {
              error: {
                code:
                  status === 401
                    ? "UNAUTHENTICATED"
                    : status === 403
                      ? "FORBIDDEN"
                      : status === 409
                        ? "CONFLICT"
                        : "VALIDATION_FAILED",
                message: "Synthetic HR request failure",
              },
            }
          : { data },
      ),
    });
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
  if (p === "/api/v1/users/me") return reply(user);
  if (p === "/api/auth/sign-out") return reply({ success: true });
  if (p === "/api/v1/auth/session") return reply({ capabilities: [] });
  if (p.includes("settings")) return reply({ firmName: "Srimar Law", onlineBookingEnabled: true });
  if (p === "/api/v1/users/directory") return reply([user]);
  if (method !== "GET") {
    const body = req.postDataJSON();
    writes.push({ path: p, body, intercepted: true });
    assert(
      ["/api/v1/hr/attendance", "/api/v1/hr/leave-requests"].includes(p),
      `Unexpected mutation ${p}`,
    );
    await new Promise((resolve) => setTimeout(resolve, polish ? 1000 : 180));
    if (failure?.method === method && failure.path === p) return reply(null, failure.status);
    if (p.endsWith("attendance")) {
      assert.equal(body.userId, staffId);
      const row = {
        ...body,
        id: "saved-attendance",
        _id: "saved-attendance",
        firmId,
        createdAt: stamp,
        updatedAt: stamp,
      };
      attendance = [...attendance.filter((r) => r.date !== body.date || r.userId !== staffId), row];
      return reply(row);
    }
    assert(!("userId" in body), "Leave ownership must be assigned by server");
    assert(types.includes(body.type));
    const row = {
      ...body,
      id: `saved-leave-${writes.length}`,
      _id: `saved-leave-${writes.length}`,
      firmId,
      userId: staffId,
      status: "pending",
      reviewedBy: null,
      createdAt: stamp,
      updatedAt: stamp,
    };
    leaves.push(row);
    if (body.type === "annual")
      balances = balances.map((r) =>
        r.type === "annual"
          ? { ...r, pendingDays: r.pendingDays + 1, remainingDays: r.remainingDays - 1 }
          : r,
      );
    return reply(row, 201);
  }
  if (p.startsWith("/api/v1/hr/")) {
    assert.equal(
      url.searchParams.get("userId"),
      staffId,
      "HR read must be scoped to signed-in Staff",
    );
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    if (failure?.method === "GET" && failure.path === p) return reply(null, failure.status);
    if (p.endsWith("attendance")) return reply(attendance);
    if (p.endsWith("leave-requests")) return reply(leaves);
    if (p.endsWith("leave-balances"))
      return reply(balances.map((r) => ({ ...r, year: Number(url.searchParams.get("year")) })));
    throw Error(`Unexpected HR read ${p}`);
  }
  return reply([]);
});
const main = () => page.locator("#staff-main-canvas");
const workspace = () => page.locator(".staff-hr-workspace");
const metric = (label) =>
  page.locator('[data-slot="metric-card"]').filter({ has: page.getByText(label, { exact: true }) });
async function open(theme = "light", viaSidebar = false) {
  await page.goto(origin + (viaSidebar ? "/staff" : "/staff/hr"), {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await main().waitFor({ timeout: 120000 });
  if (viaSidebar) {
    await main().evaluate((el) => el.scrollTo({ top: 100000, behavior: "instant" }));
    await page.locator('aside a[href="/staff/hr"]').click();
  }
  await expect(page.getByRole("heading", { name: "Human Resources", exact: true })).toBeVisible({
    timeout: 60000,
  });
  await page.evaluate(
    (t) => document.documentElement.classList.toggle("dark", t === "dark"),
    theme,
  );
  await page.waitForTimeout(250);
}
async function ready() {
  await expect(metric("Days Recorded")).toContainText("20");
}
async function capture(name) {
  await page.screenshot({ path: path.join(out, name + ".png"), animations: "disabled" });
}
async function tab(name) {
  await page.getByRole("tab", { name, exact: true }).click();
}
async function scan(label) {
  const result = await new AxeBuilder({ page })
    .include(".staff-hr-workspace")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  axe.push({
    label,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
  });
  assert.equal(
    result.violations.length,
    0,
    `${label}: accessibility violations ${result.violations.map((v) => v.id).join(",")}`,
  );
}
async function geometry(label) {
  const g = await page.evaluate(() => {
    const shell = document.querySelector(".staff-shell-content"),
      footer = document.querySelector(".staff-shell-footer").getBoundingClientRect(),
      nav = document.querySelector(".staff-mobile-primary"),
      main = document.querySelector("#staff-main-canvas");
    const boundary =
      getComputedStyle(nav).display === "none" ? innerHeight : nav.getBoundingClientRect().top;
    return {
      gap: boundary - footer.bottom,
      shellScroll: shell.scrollTop,
      shellRange: shell.scrollHeight - shell.clientHeight,
      bodyRange: document.scrollingElement.scrollHeight - innerHeight,
      horizontal: document.documentElement.scrollWidth - innerWidth,
      mainHorizontal: main.scrollWidth - main.clientWidth,
      mainRange: main.scrollHeight - main.clientHeight,
    };
  });
  assert(Math.abs(g.gap) <= 1, `${label}: footer gap`);
  assert.equal(g.shellScroll, 0);
  assert.equal(g.shellRange, 0);
  assert.equal(g.bodyRange, 0);
  assert.equal(g.horizontal, 0);
  assert.equal(g.mainHorizontal, 0);
  return g;
}
try {
  for (const width of [1440, 1280, 768, 390, 360])
    for (const theme of ["light", "dark"]) {
      reset();
      await page.setViewportSize({ width, height: 900 });
      await open(theme, width >= 768);
      await ready();
      await expect(metric("Hours Today")).toContainText("4h 15m");
      await expect(metric("Annual Leave Remaining")).toContainText("12 days");
      if (polish) {
        await expect(metric("Days Recorded")).toContainText("Recorded dates this month");
        for (const name of ["Clock In", "Clock Out"])
          await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
        const control = await page.getByRole("button", { name: "Clock In", exact: true }).evaluate((el) => {
          const s = getComputedStyle(el);
          return { background: s.backgroundColor, color: s.color, opacity: s.opacity, cursor: s.cursor };
        });
        assert.equal(control.opacity, "1");
        assert.equal(control.cursor, "not-allowed");
        await page.getByRole("tab", { name: "Attendance", exact: true }).focus();
        await page.keyboard.press("ArrowRight");
        await expect(page.getByRole("tab", { name: "Leave & Requests", exact: true })).toBeFocused();
        await expect(page.getByRole("tab", { name: "Leave & Requests", exact: true })).toHaveAttribute("aria-selected", "true");
        await page.keyboard.press("ArrowRight");
        await expect(page.getByRole("tab", { name: "Leave Balance", exact: true })).toBeFocused();
        await tab("Attendance");
        const tabs = await page.getByRole("tablist", { name: "HR sections" }).evaluate((el) =>
          Array.from(el.querySelectorAll('[role="tab"]')).map((tab) => {
            const r = tab.getBoundingClientRect();
            return { top: r.top, width: r.width, height: r.height, label: tab.textContent, clipped: tab.scrollWidth > tab.clientWidth };
          }));
        if (width <= 390) {
          assert(tabs.every((t) => Math.abs(t.top - tabs[0].top) < 1 && t.height >= 44 && t.width >= 80 && !t.clipped));
          await capture(`tabs-${width}-${theme}`);
        }
        await page.locator(".staff-hr-attendance-overview").scrollIntoViewIfNeeded();
        await capture(`day-closed-disabled-${width}-${theme}`);
        checks.push({ name: "polish tabs, keyboard, helper and closed controls", width, theme, tabs, disabledControl: control });
        await main().evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" }));
      }
      const g = await geometry(`${width}-${theme}`);
      await capture(`attendance-${width}-${theme}-top`);
      await main().evaluate((el) => el.scrollTo({ top: 100000, behavior: "instant" }));
      await page.waitForTimeout(100);
      await geometry("natural end");
      const top = page.getByRole("button", { name: "Scroll to top of page" });
      if (g.mainRange > 240) {
        await expect(top).toBeVisible();
        await top.click();
        await expect.poll(() => main().evaluate((el) => el.scrollTop)).toBe(0);
      }
      await tab("Leave & Requests");
      await expect(page.getByLabel("Reason (optional)")).toBeVisible();
      await capture(`leave-${width}-${theme}`);
      await tab("Leave Balance");
      await expect(page.getByRole("progressbar").first()).toHaveAttribute("value", "12");
      await capture(`balances-${width}-${theme}`);
      await geometry("balances end");
      await scan(`${width}-${theme}-balances`);
      await tab("Attendance");
      await scan(`${width}-${theme}-attendance`);
      checks.push({
        name: "responsive light/dark attendance/leave/balances and footer",
        width,
        theme,
        geometry: g,
      });
    }
  await page.setViewportSize({ width: 1440, height: 900 });
  reset("empty");
  await open();
  await expect(page.getByRole("button", { name: "Clock In", exact: true }).first()).toBeEnabled();
  const beforeIn = writes.length;
  await page
    .getByRole("button", { name: "Clock In", exact: true })
    .first()
    .evaluate((el) => {
      el.click();
      el.click();
    });
  if (polish) {
    await expect(page.getByRole("button", { name: "Clocking in…", exact: true })).toBeDisabled();
    await capture("clock-in-busy-disabled");
  }
  await expect(page.getByText("Clock-in saved.", { exact: true }).first()).toBeVisible();
  assert.equal(writes.length, beforeIn + 1);
  assert.equal(writes.at(-1).body.date, "2026-10-20");
  await expect(metric("Hours Today")).toContainText("In progress");
  await expect(page.getByRole("button", { name: "Clock In", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Clock Out", exact: true }).first()).toBeEnabled();
  if (polish) await capture("clocked-in-controls");
  await page.clock.setFixedTime(new Date("2026-10-20T08:30:00Z"));
  await page.getByRole("button", { name: "Clock Out", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Clock out?" });
  await expect(dialog).toBeVisible();
  await scan("clock-out dialog");
  await capture("clock-out-confirmation");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  assert.equal(writes.length, beforeIn + 1);
  await expect(page.getByRole("button", { name: "Clock Out", exact: true }).first()).toBeFocused();
  await page.getByRole("button", { name: "Clock Out", exact: true }).first().click();
  failure = { method: "POST", path: "/api/v1/hr/attendance", status: 500 };
  await page.getByRole("button", { name: "Confirm Clock Out" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Synthetic");
  await expect(dialog).toBeVisible();
  failure = null;
  await page.getByRole("button", { name: "Confirm Clock Out" }).click();
  await expect(dialog).toBeHidden();
  await expect(metric("Hours Today")).toContainText("1h 0m");
  await expect(page.getByRole("button", { name: "Clock Out", exact: true })).toBeDisabled();
  checks.push({
    name: "clock-in duplicate prevention, clock-out confirmation/Escape/error/retry/cache refresh",
  });
  reset();
  await page.clock.setFixedTime(new Date(stamp));
  await open();
  await ready();
  await tab("Leave & Requests");
  await page.getByLabel("From (AD)").fill("2026-10-25");
  await page.getByLabel("To (AD)").fill("2026-10-24");
  let before = writes.length;
  await page.getByRole("button", { name: "Submit Request" }).click();
  await expect(workspace().getByRole("alert")).toContainText("To date");
  assert.equal(writes.length, before);
  await page.getByLabel("From (AD)").fill("");
  await page.getByRole("button", { name: "Submit Request" }).click();
  await expect(workspace().getByRole("alert")).toBeVisible();
  assert.equal(writes.length, before);
  await page.getByLabel("From (AD)").fill("2026-10-25");
  await page.getByLabel("To (AD)").fill("2026-10-25");
  await page.getByLabel("Reason (optional)").fill("Retain this synthetic draft");
  failure = { method: "POST", path: "/api/v1/hr/leave-requests", status: 403 };
  await page.getByRole("button", { name: "Submit Request" }).click();
  await expect(workspace().getByRole("alert")).toContainText("permission");
  await expect(page.getByLabel("Reason (optional)")).toHaveValue("Retain this synthetic draft");
  await expect(page.getByLabel("From (AD)")).toHaveValue("2026-10-25");
  await capture("leave-permission-error-draft-retained");
  failure = null;
  before = writes.length;
  await page.getByRole("button", { name: "Submit Request" }).evaluate((el) => {
    el.click();
    el.click();
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Leave request submitted for review." }),
  ).toBeVisible();
  assert.equal(writes.length, before + 1);
  await expect(metric("Pending Leave")).toContainText("2");
  await expect(metric("Annual Leave Remaining")).toContainText("11 days");
  await expect(page.getByLabel("Reason (optional)")).toHaveValue("");
  await page.getByLabel("Type", { exact: true }).click();
  for (const type of [
    "Annual leave",
    "Sick leave",
    "Maternity leave",
    "Paternity leave",
    "Unpaid leave",
  ])
    await expect(page.getByRole("option", { name: type, exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await scan("leave form");
  checks.push({
    name: "leave validation, all five types, 403 retained draft, duplicate prevention and three-resource invalidation",
  });
  for (const resource of ["attendance", "leave-requests", "leave-balances"]) {
    reset();
    failure = {
      method: "GET",
      path: "/api/v1/hr/" + resource,
      status: resource === "attendance" ? 403 : 503,
    };
    await open();
    const retry = page.getByRole("button", {
      name:
        "Retry " +
        (resource === "leave-requests"
          ? "leave requests"
          : resource === "leave-balances"
            ? "balances"
            : "attendance"),
      exact: true,
    });
    if (resource === "leave-requests") await tab("Leave & Requests");
    await expect(retry.first()).toBeVisible({ timeout: 30000 });
    if (resource === "attendance") {
      await expect(metric("Hours Today")).toContainText("—");
      assert.equal(await page.getByRole("button", { name: "Clock In", exact: true }).count(), 0);
    }
    if (resource === "leave-balances")
      await expect(metric("Annual Leave Remaining")).toContainText("—");
    failure = null;
    await retry.first().click();
    await expect(
      metric(
        resource === "attendance"
          ? "Days Recorded"
          : resource === "leave-requests"
            ? "Pending Leave"
            : "Annual Leave Remaining",
      ),
    ).toContainText(
      resource === "attendance" ? "20" : resource === "leave-requests" ? "1" : "12 days",
    );
  }
  checks.push({
    name: "independent read failures/403, truthful unavailable KPIs and actual retry",
  });
  reset("empty");
  leaves = [];
  balances = [];
  await open();
  await expect(metric("Days Recorded")).toContainText("0");
  await expect(metric("Pending Leave")).toContainText("0");
  await expect(metric("Annual Leave Remaining")).toContainText("—");
  await expect(page.getByText("No attendance recorded", { exact: true })).toBeVisible();
  await tab("Leave Balance");
  await expect(page.getByText("No balances on file", { exact: true })).toBeVisible();
  await capture("empty-balances");
  reset();
  delay = 1200;
  await open();
  await expect(metric("Hours Today")).toContainText("…");
  await ready();
  delay = 0;
  checks.push({ name: "empty, missing balances and loading states" });
  reset("invalid");
  await open();
  await ready();
  await expect(metric("Hours Today")).toContainText("—");
  await expect(page.getByRole("button", { name: "Clock Out", exact: true })).toBeDisabled();
  reset("empty");
  await page.clock.setFixedTime(new Date("2026-10-19T18:30:00Z"));
  await open();
  await expect(page.getByRole("button", { name: "Clock In", exact: true }).first()).toBeEnabled();
  await page.getByRole("button", { name: "Clock In", exact: true }).first().click();
  await expect(page.getByText("Clock-in saved.", { exact: true }).first()).toBeVisible();
  assert.equal(writes.at(-1).body.date, "2026-10-20");
  assert.equal(writes.at(-1).body.clockIn, "12:15 AM");
  await page.clock.setFixedTime(new Date("2026-12-31T18:30:00Z"));
  await page.evaluate(() => window.dispatchEvent(new MouseEvent("mousemove")));
  await open();
  await expect
    .poll(() =>
      requests.some((r) => r.path === "/api/v1/hr/leave-balances" && r.query.year === "2027"),
    )
    .toBe(true);
  checks.push({
    name: "invalid clock data, Kathmandu UTC-midnight clock payload and year rollover",
  });
  await page.clock.setFixedTime(new Date(stamp));
  reset();
  await open();
  await ready();
  await page.getByRole("tab", { name: "Attendance", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Leave & Requests", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Leave Balance", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "View Attendance History", exact: true }).click();
  await expect(page.locator("#staff-hr-history")).toBeFocused();
  await page
    .getByRole("navigation", { name: "Attendance history pages" })
    .getByRole("button", { name: "2", exact: true })
    .click();
  await expect(page.getByText("9–16 of 20 records")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Request Leave", exact: true }).last().click();
  await expect(page.locator("#staff-hr-request")).toBeFocused();
  await scan("reduced-motion leave");
  checks.push({ name: "keyboard tabs, shortcuts, pagination, reduced motion and focus recovery" });
  reset("empty");
  failure = { method: "POST", path: "/api/v1/hr/attendance", status: 401 };
  await open();
  await page.getByRole("button", { name: "Clock In", exact: true }).first().click();
  await expect(workspace().getByRole("alert")).toContainText("session expired");
  assert(!writes.some((w) => w.path.includes("/public/")));
  checks.push({ name: "401 attendance failure has no public fallback" });
  reset();
  leaves = [{ ...leaves[0], fromDate: "2040-01-01", toDate: "2040-01-02" }];
  await open();
  await ready();
  await expect(page.getByText("2040-01-01 AD (BS unavailable)").first()).toBeVisible();
  await scan("unsupported BS date fallback");
  checks.push({ name: "unsupported BS dates retain truthful AD dates" });
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${checks.length} grouped HR checks; ${axe.length} accessibility scans; ${writes.length} intercepted mutation attempts; zero live writes.`,
  );
} finally {
  fs.writeFileSync(
    path.join(out, "evidence.json"),
    JSON.stringify(
      { checks, axe, errors, requests, writes, liveMutations: 0, browser: browser.version() },
      null,
      2,
    ),
  );
  await browser.close();
}
