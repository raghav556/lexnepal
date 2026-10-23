import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Real Staff shell, page, components, query hooks and API client. Only auth/routing
// boundaries are adapted; Playwright intercepts every API request. No DB access.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(root, ".local/qa/session-15/final-review");
fs.mkdirSync(out, { recursive: true });
const adapter = path.join(root, "tests/staff-appointments/adapters.tsx");
const replacements = new Set([
  "next/link",
  "next/navigation",
  "@/client/navigation",
  "@/client/auth/auth-provider",
  "@/client/auth/local-auth-client",
  "@/components/auth/IdleSessionGuard",
]);
const bundled = await build({
  entryPoints: [path.join(root, "tests/staff-appointments/fixture.tsx")],
  absWorkingDir: root,
  bundle: true,
  write: false,
  platform: "browser",
  jsx: "automatic",
  outdir: out,
  define: { "process.env.NODE_ENV": '"test"', "process.env": "{}" },
  plugins: [
    {
      name: "isolated-auth-routing",
      setup(builder) {
        builder.onResolve({ filter: /^(?:@\/|next\/)/ }, ({ path: request }) => {
          const key = request.replace(/\.(tsx?|jsx?)$/, "");
          if (replacements.has(key)) return { path: adapter };
          if (key === "next/dynamic") return { path: key, namespace: "fixture-dynamic" };
          if (key.startsWith("@/server/") || key.startsWith("@/db/"))
            throw new Error("Server imports forbidden");
          if (key.startsWith("@/")) {
            const base = path.join(root, "src", request.slice(2));
            return {
              path: [
                base,
                base + ".ts",
                base + ".tsx",
                base + "/index.ts",
                base + "/index.tsx",
              ].find((p) => fs.existsSync(p) && fs.statSync(p).isFile()),
            };
          }
        });
        builder.onLoad({ filter: /.*/, namespace: "fixture-dynamic" }, () => ({
          contents: "export default function dynamic(){return ()=>null}",
          loader: "js",
        }));
      },
    },
  ],
});
const compiled = await postcss([tailwind({ base: root, optimize: false })]).process(
  fs.readFileSync(path.join(root, "src/index.css"), "utf8"),
  { from: path.join(root, "src/index.css") },
);
const css = postcss.parse(compiled.css);
css.walkAtRules("import", (rule) => {
  if (rule.params.startsWith("url(")) rule.remove();
});
const image = fs
  .readFileSync(path.join(root, "public/images/staff-home-nepal.jpg"))
  .toString("base64");
const styles = css
  .toString()
  .replaceAll("/images/staff-home-nepal.jpg", `data:image/jpeg;base64,${image}`);
const js = bundled.outputFiles.find((f) => f.path.endsWith(".js")).text;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Session 15 isolated appointment QA</title><style>${styles}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`;
const server = http.createServer((req, res) => {
  if (req.url === "/fixture.js") {
    res.writeHead(200, { "content-type": "application/javascript" });
    return res.end(js);
  }
  res.writeHead(200, { "content-type": "text/html" });
  res.end(html);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const staffId = "71000000-0000-4000-8000-000000000001";
const clientId = "72000000-0000-4000-8000-000000000001";
const leadId = "73000000-0000-4000-8000-000000000001";
const slots = ["10:00 AM", "11:00 AM", "01:30 PM", "03:00 PM", "04:30 PM"];
const seed = () => [
  {
    id: "apt-1",
    _id: "apt-1",
    clientName: "Sunita Maharjan",
    clientPhone: "+977 9841234567",
    clientEmail: "sunita@example.invalid",
    clientId,
    practiceArea: "Property Law",
    date: "2026-10-20",
    timeSlot: slots[0],
    notes:
      "Initial consultation regarding a property purchase in Lalitpur. Review the sale agreement and due diligence documents.",
    status: "confirmed",
    assignedLawyerId: staffId,
    meetingLink: "https://meet.google.com/test-room",
  },
  {
    id: "apt-2",
    _id: "apt-2",
    clientName: "Ramesh Karki",
    clientPhone: "+977 9812345678",
    practiceArea: "Civil Litigation",
    date: "2026-10-20",
    timeSlot: slots[1],
    status: "pending",
    assignedLawyerId: staffId,
  },
  {
    id: "apt-3",
    _id: "apt-3",
    clientName: "Dipen Shah",
    practiceArea: "Commercial Contracts",
    date: "2026-10-20",
    timeSlot: slots[2],
    status: "confirmed",
    assignedLawyerId: staffId,
  },
  {
    id: "apt-4",
    _id: "apt-4",
    clientName: "Anil Bhandari",
    practiceArea: "General Legal Advice",
    date: "2026-10-20",
    timeSlot: slots[3],
    status: "pending",
    assignedLawyerId: staffId,
  },
  {
    id: "apt-5",
    _id: "apt-5",
    clientName: "Sita Karki",
    practiceArea: "Family Law",
    date: "2026-10-20",
    timeSlot: slots[4],
    status: "confirmed",
    assignedLawyerId: staffId,
  },
  {
    id: "apt-6",
    _id: "apt-6",
    clientName: "Nabin Gurung",
    practiceArea: "Employment Law",
    date: "2026-10-21",
    timeSlot: slots[0],
    status: "pending",
    assignedLawyerId: staffId,
  },
  {
    id: "apt-7",
    _id: "apt-7",
    clientName: "Completed Client",
    date: "2026-10-02",
    timeSlot: slots[0],
    status: "completed",
    assignedLawyerId: staffId,
  },
  {
    id: "apt-8",
    _id: "apt-8",
    clientName: "Cancelled Client",
    date: "2026-10-20",
    timeSlot: slots[0],
    status: "cancelled",
    assignedLawyerId: staffId,
  },
];
let records = seed(),
  mode = "normal",
  failure = 0,
  slotFailure = false;
const requests = [],
  errors = [],
  checks = [],
  a11y = [];
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
await page.clock.setFixedTime(new Date("2026-10-20T04:15:00Z"));
const json = (data, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(
    status >= 400
      ? {
          error: {
            code: status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : "CONFLICT",
            message: "Synthetic request rejected",
          },
        }
      : { data },
  ),
});
await page.route("**/api/**", async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    p = url.pathname,
    method = req.method();
  requests.push({
    path: p,
    query: url.search,
    method,
    body: method === "GET" ? undefined : req.postDataJSON(),
  });
  if (p === "/api/v1/appointments" && method === "GET") {
    if (mode === "loading") await new Promise((r) => setTimeout(r, 1500));
    if (mode === "error" || mode === "forbidden")
      return route.fulfill(json(null, mode === "error" ? 500 : 403));
    return route.fulfill(json(mode === "empty" ? [] : records));
  }
  if (p === "/api/v1/appointments/slots")
    return route.fulfill(
      json(
        slotFailure
          ? null
          : slots.filter(
              (s) =>
                !records.some(
                  (a) =>
                    a.date === url.searchParams.get("date") &&
                    a.timeSlot === s &&
                    ["pending", "confirmed"].includes(a.status),
                ),
            ),
        slotFailure ? 500 : 200,
      ),
    );
  if (method !== "GET") {
    if (failure) return route.fulfill(json(null, failure));
    const body = req.postDataJSON();
    if (p === "/api/v1/appointments") {
      const a = { ...body, id: `created-${records.length}`, status: "pending" };
      records.push(a);
      return route.fulfill(json(a));
    }
    const match = p.match(/\/appointments\/([^/]+)\/(status|reschedule)$/);
    if (match) {
      const a = records.find((a) => a.id === match[1]);
      Object.assign(a, body);
      return route.fulfill(json(a));
    }
    throw new Error(`Unexpected mutation blocked: ${method} ${p}`);
  }
  if (p === "/api/v1/clients")
    return route.fulfill(
      json([
        {
          _id: clientId,
          fullName: "Sunita Maharjan",
          phone: "+977 9841234567",
          email: "sunita@example.invalid",
        },
      ]),
    );
  if (p === "/api/v1/clients/me")
    return route.fulfill(
      json({ _id: clientId, fullName: "Sunita Maharjan", phone: "+977 9841234567" }),
    );
  if (p === "/api/v1/leads")
    return route.fulfill(
      json([
        {
          _id: leadId,
          fullName: "Permitted Lead",
          phone: "+977 9800000000",
          practiceAreaInterest: "Property Law",
        },
      ]),
    );
  if (p === "/api/v1/auth/session") return route.fulfill(json({ capabilities: [] }));
  if (p.includes("settings"))
    return route.fulfill(json({ firmName: "Srimar Law", onlineBookingEnabled: true }));
  return route.fulfill(json([]));
});
const shot = async (name, locator = page) =>
  locator.screenshot({ path: path.join(out, name + ".png"), animations: "disabled" });
const check = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
const list = () => page.locator(".staff-appointments-list");
const details = () => page.locator(".staff-appointments-details");
const openRow = (id) => list().locator(`#appointment-${id}`).click();
async function fresh(query = "") {
  await page.goto(origin + "/staff/appointments" + query);
  await page.getByRole("heading", { name: "Appointments", exact: true }).first().waitFor();
}
async function chooseSlot(value = "11:00 AM") {
  await page.getByRole("combobox", { name: "Start slot" }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}
async function overflow() {
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Horizontal overflow",
  );
  for (const selector of [
    "#staff-main-canvas",
    ".staff-appointments-list",
    ".staff-appointments-calendar",
  ]) {
    const element = page.locator(selector);
    if (await element.isVisible())
      assert(
        await element.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
        `${selector} clipped horizontally`,
      );
  }
}
async function axe(label) {
  const result = await new AxeBuilder({ page })
    .include(".staff-appointments-workspace")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  a11y.push({ label, violations: result.violations });
  assert.equal(
    result.violations.length,
    0,
    `${label}: ${result.violations.map((v) => v.id).join(", ")}`,
  );
}
try {
  await fresh();
  await expect(list().locator(".staff-appointments-row")).toHaveCount(6);
  assert(
    requests.some(
      (r) => r.path === "/api/v1/appointments" && r.query === `?assignedLawyerId=${staffId}`,
    ),
  );
  await expect(page.getByText("All staff", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Team Chat", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Command Center", { exact: true })).toHaveCount(0);
  await overflow();
  await shot("01-desktop-light-1440");
  await axe("1440 light");
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(350);
  await shot("02-desktop-dark-1440");
  await axe("1440 dark");
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await openRow("apt-2");
  await expect(details().getByRole("heading", { name: "Ramesh Karki" })).toBeVisible();
  await shot("03-selected-appointment-details");
  await page.getByRole("textbox", { name: "Search appointments" }).fill("sunita");
  await expect(list().locator(".staff-appointments-row")).toHaveCount(1);
  await page.getByRole("textbox", { name: "Search appointments" }).fill("no match");
  await expect(list().getByText("No appointments", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Search appointments" }).fill("");
  await page.getByRole("combobox", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "Pending", exact: true }).click();
  await expect(list().locator(".staff-appointments-row")).toHaveCount(2);
  await page.getByRole("combobox", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "All statuses" }).click();
  await page.getByRole("button", { name: "Upcoming", exact: true }).click();
  await expect(list().locator(".staff-appointments-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(list().locator(".staff-appointments-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Today", exact: true }).first().click();
  await page.getByRole("button", { name: "Next date", exact: true }).click();
  await expect(list().locator(".staff-appointments-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Today", exact: true }).last().click();
  check("assigned scope, search, statuses, tabs and date navigation");

  await page.getByRole("button", { name: "Week", exact: true }).click();
  await shot("06a-calendar-week");
  const selectedDate = page.locator("[data-date='2026-10-20']");
  await selectedDate.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[data-date='2026-10-21']")).toBeFocused();
  await page.getByRole("button", { name: "Next week", exact: true }).click();
  await page.getByRole("button", { name: "Previous week", exact: true }).click();
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(details().getByRole("heading", { name: "Nabin Gurung" })).toBeVisible();
  await expect(list().locator("#appointment-apt-6")).toHaveAttribute("aria-pressed", "true");
  await shot("06b-calendar-month");
  await expect(page.locator(".staff-appointments-date-grid button")).toHaveCount(42);
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await page.getByRole("button", { name: "Previous month", exact: true }).click();
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await page.getByRole("button", { name: "Previous day", exact: true }).click();
  await page.getByRole("button", { name: "Today", exact: true }).last().click();
  check("Day/Week/Month navigation and calendar keyboard focus");

  await page.getByRole("button", { name: "New Appointment", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New Appointment", exact: true });
  await expect(dialog.getByRole("combobox", { name: "Client or lead" })).toBeFocused();
  await expect(
    dialog.getByRole("button", { name: "Create appointment", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Client name", { exact: false }).fill("Synthetic New Client");
  await page.getByLabel("Phone", { exact: false }).fill("+977 9811111111");
  await page.getByLabel("Practice area", { exact: false }).fill("Property Law");
  await page.getByLabel("Date", { exact: false }).last().fill("2026-10-22");
  await chooseSlot();
  await shot("04-new-appointment-dialog");
  await axe("New Appointment dialog");
  // Invalid required field must not send a request.
  await page.getByLabel("Client name", { exact: false }).fill("");
  let count = requests.filter((r) => r.method === "POST").length;
  await dialog.getByRole("button", { name: "Create appointment", exact: true }).click();
  assert.equal(requests.filter((r) => r.method === "POST").length, count);
  await page.getByLabel("Client name", { exact: false }).fill("Synthetic New Client");
  failure = 401;
  await dialog.getByRole("button", { name: "Create appointment", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("session expired");
  assert(!requests.some((r) => r.path.includes("/public/appointments")));
  await expect(page.getByLabel("Client name", { exact: false })).toHaveValue(
    "Synthetic New Client",
  );
  failure = 403;
  await dialog.getByRole("button", { name: "Create appointment", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("permission");
  failure = 0;
  await dialog.getByRole("button", { name: "Create appointment", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(details().getByRole("heading", { name: "Synthetic New Client" })).toBeVisible();
  assert.equal(records.at(-1).assignedLawyerId, staffId);
  check(
    "create validation, 401 without public fallback, 403, retained draft and successful refresh",
  );

  await details().getByRole("button", { name: "Reschedule", exact: true }).click();
  const reschedule = page.getByRole("dialog", { name: "Reschedule appointment", exact: true });
  await page.getByLabel("Date", { exact: false }).last().fill("2026-10-23");
  await chooseSlot("03:00 PM");
  await shot("05-reschedule-dialog");
  await axe("Reschedule dialog");
  await reschedule.getByRole("button", { name: "Review reschedule" }).click();
  failure = 409;
  await reschedule.getByRole("button", { name: "Confirm reschedule" }).click();
  await expect(reschedule.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Date", { exact: false }).last()).toHaveValue("2026-10-23");
  failure = 0;
  await reschedule.getByRole("button", { name: "Review reschedule" }).click();
  await reschedule.getByRole("button", { name: "Confirm reschedule" }).click();
  await expect(reschedule).toHaveCount(0);
  await expect(details()).toContainText("Oct 23, 2026");
  await details().getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(details().getByRole("button", { name: "Mark Completed" })).toBeVisible();
  await details().getByRole("button", { name: "Mark Completed" }).click();
  await expect(details().getByRole("button", { name: "Reschedule", exact: true })).toHaveCount(0);
  check("reschedule review, failure retention, success, confirm and complete");

  await page.getByRole("button", { name: "Today", exact: true }).last().click();
  await openRow("apt-2");
  await details().getByRole("button", { name: "Add Meeting Link" }).click();
  const meeting = page.getByRole("dialog", { name: "Add meeting link", exact: true });
  await meeting.getByRole("textbox").fill("javascript:alert(1)");
  await meeting.getByRole("button", { name: "Save", exact: true }).click();
  await expect(meeting).toBeVisible();
  await meeting.getByRole("textbox").fill("https://meet.google.com/synthetic-meeting");
  failure = 409;
  await meeting.getByRole("button", { name: "Save", exact: true }).click();
  await expect(meeting.getByRole("textbox")).toHaveValue(
    "https://meet.google.com/synthetic-meeting",
  );
  failure = 0;
  await meeting.getByRole("button", { name: "Save", exact: true }).click();
  await expect(meeting).toHaveCount(0);
  await details().getByRole("button", { name: "Copy Link" }).click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    "https://meet.google.com/synthetic-meeting",
  );
  await expect(details().getByRole("link", { name: "Join", exact: true })).toHaveAttribute(
    "href",
    "https://meet.google.com/synthetic-meeting",
  );
  await details().getByRole("button", { name: "Cancel", exact: true }).click();
  const cancellation = page.getByRole("dialog", { name: "Cancel appointment?", exact: true });
  failure = 403;
  await cancellation.getByRole("button", { name: "Cancel appointment", exact: true }).click();
  await expect(cancellation.getByRole("alert")).toContainText("permission");
  failure = 0;
  await cancellation.getByRole("button", { name: "Cancel appointment", exact: true }).click();
  await expect(cancellation).toHaveCount(0);
  await expect(details().getByRole("link", { name: "Join", exact: true })).toHaveCount(0);
  check("meeting URL validation/error/save/copy/join and cancel confirmation/error/success");

  records = seed();
  await fresh("?appointment=apt-6");
  await expect(details().getByRole("heading", { name: "Nabin Gurung" })).toBeVisible();
  await expect(page.getByLabel("Choose calendar date")).toHaveValue("2026-10-21");
  await fresh("?appointment=unavailable");
  await expect(page.getByRole("status").filter({ hasText: "unavailable" })).toBeVisible();
  await fresh();
  await openRow("apt-3");
  await expect(details()).toContainText("Not recorded");
  await expect(details().getByRole("link", { name: "Open Client" })).toHaveCount(0);
  check("deep links, unavailable IDs and missing optional fields");

  // TL regression: the old ID must not keep Oct 20 actions alive on Oct 21.
  await fresh();
  await openRow("apt-2");
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await page.locator('[data-date="2026-10-21"]').click();
  await expect(details().getByRole("heading", { name: "Nabin Gurung" })).toBeVisible();
  await expect(list().locator("#appointment-apt-6")).toHaveAttribute("aria-pressed", "true");
  await expect(details()).not.toContainText("Ramesh Karki");
  await shot("tl-01-desktop-month-oct21-synchronized");
  for (const view of ["Day", "Week", "Month"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await expect(details().getByRole("heading", { name: "Nabin Gurung" })).toBeVisible();
  }
  await page.locator('[data-date="2026-10-22"]').click();
  await expect(list().locator(".staff-appointments-row")).toHaveCount(0);
  await expect(details().getByRole("button")).toHaveCount(0);
  await expect(details()).not.toContainText("Nabin Gurung");

  await fresh();
  await openRow("apt-2");
  const search = page.getByRole("textbox", { name: "Search appointments" });
  await search.fill("sunita");
  await expect(details().getByRole("heading", { name: "Sunita Maharjan" })).toBeVisible();
  await expect(page.locator(".staff-appointments-calendar .staff-appointments-event")).toHaveCount(
    1,
  );
  await search.fill("");
  await expect(list().locator(".staff-appointments-row")).toHaveCount(6);
  await expect(list().locator("#appointment-apt-1")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("combobox", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "Pending", exact: true }).click();
  await expect(details().getByRole("heading", { name: "Ramesh Karki" })).toBeVisible();
  await page.getByRole("combobox", { name: "Filter by status" }).click();
  await page.getByRole("option", { name: "All statuses" }).click();
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(details().getByRole("heading", { name: "Completed Client" })).toBeVisible();
  await expect(page.getByLabel("Choose calendar date")).toHaveValue("2026-10-02");
  await expect(details().getByRole("button")).toHaveCount(0);
  await page.getByRole("button", { name: "Upcoming", exact: true }).click();
  await expect(details().getByRole("heading", { name: "Nabin Gurung" })).toBeVisible();
  await expect(page.getByLabel("Choose calendar date")).toHaveValue("2026-10-21");
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(list().locator("#appointment-apt-6")).toHaveAttribute("aria-pressed", "true");
  await openRow("apt-2");
  await expect(page.getByLabel("Choose calendar date")).toHaveValue("2026-10-20");

  await fresh();
  await openRow("apt-2");
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await page
    .locator(".staff-appointments-calendar .staff-appointments-event")
    .filter({ hasText: "Nabin Gurung" })
    .click();
  await expect(list().locator("#appointment-apt-6")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Choose calendar date")).toHaveValue("2026-10-21");
  await expect(details().getByRole("heading", { name: "Nabin Gurung" })).toBeVisible();

  const navigateFixture = async (suffix) =>
    page.evaluate((suffix) => {
      history.pushState({}, "", "/staff/appointments" + suffix);
      dispatchEvent(new PopStateEvent("popstate"));
    }, suffix);
  await navigateFixture("?appointment=apt-1");
  await expect(details().getByRole("heading", { name: "Sunita Maharjan" })).toBeVisible();
  await expect(page.getByLabel("Choose calendar date")).toHaveValue("2026-10-20");
  await navigateFixture("?appointment=apt-6");
  await expect(details().getByRole("heading", { name: "Nabin Gurung" })).toBeVisible();
  await expect(list().locator("#appointment-apt-6")).toHaveAttribute("aria-pressed", "true");
  await navigateFixture("");
  await search.fill("no match");
  await expect(details().getByRole("heading", { name: "Nabin Gurung" })).toHaveCount(0);
  await navigateFixture("?appointment=apt-6");
  await expect(search).toHaveValue("");
  await expect(page.getByLabel("Choose calendar date")).toHaveValue("2026-10-21");
  await expect(details().getByRole("heading", { name: "Nabin Gurung" })).toBeVisible();
  await shot("tl-02-desktop-deep-link-selection");
  check(
    "TL selection regression: date, empty results, search/status/tabs, view changes, week event selection and repeated deep links",
  );

  for (const width of [1440, 1280, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 1100 });
    await fresh();
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (dark) => document.documentElement.classList.toggle("dark", dark),
        theme === "dark",
      );
      await page.waitForTimeout(350);
      await overflow();
      await axe(`${width} ${theme}`);
      if (width >= 1280) await expect(details()).toBeVisible();
      if (width === 768) {
        await expect(list()).toBeVisible();
        await expect(page.locator(".staff-appointments-calendar")).toBeHidden();
        if (theme === "light") await shot("tl-03-tablet-list-768");
        await page.getByRole("button", { name: "Calendar", exact: true }).click();
        await expect(list()).toBeHidden();
        await expect(page.locator(".staff-appointments-calendar")).toBeVisible();
        await overflow();
        await axe(`768 ${theme} calendar`);
        if (theme === "light") await shot("tl-04-tablet-calendar-768");
        await page
          .locator(".staff-appointments-calendar .staff-appointments-event")
          .filter({ hasText: "Sunita Maharjan" })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Appointment details", exact: true }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "Appointment list", exact: true }).click();
      }
      await shot(`responsive-${width}-${theme}`);
    }
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    if (width < 1200) {
      await openRow("apt-1");
      const mobileDetails = page.getByRole("dialog", { name: "Appointment details", exact: true });
      await expect(mobileDetails).toBeVisible();
      await expect(
        mobileDetails.getByRole("button", { name: "Reschedule", exact: true }),
      ).toBeVisible();
      if (width === 390) {
        await shot("08-mobile-appointment-details");
        await axe("390 details dialog");
      }
      await page.keyboard.press("Escape");
      await expect(mobileDetails).toHaveCount(0);
      await expect(list().locator("#appointment-apt-1")).toBeFocused();
    }
    if (width < 768) {
      if (width === 390) {
        await page.locator("#staff-main-canvas").evaluate((e) => (e.scrollTop = 0));
        await shot("07-mobile-list");
      }
      await page.getByRole("button", { name: "Calendar", exact: true }).click();
      await expect(page.locator(".staff-appointments-calendar")).toBeVisible();
      await page.getByRole("button", { name: "Month", exact: true }).click();
      await overflow();
      await page.getByRole("button", { name: "Appointment list", exact: true }).click();
      await expect(list()).toBeVisible();
      await page.getByRole("button", { name: "New Appointment", exact: true }).click();
      await overflow();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      assert(await page.getByRole("dialog").evaluate((el) => el.contains(document.activeElement)));
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "New Appointment", exact: true }),
      ).toBeFocused();
    }
  }
  check(
    "all five widths, light/dark AA scan, responsive details, focus recovery and mobile calendar/dialog",
  );

  await page.setViewportSize({ width: 1440, height: 1100 });
  for (const state of ["loading", "empty", "error", "forbidden"]) {
    mode = state;
    await page.goto(origin + "/staff/appointments");
    if (state === "loading")
      await expect(page.getByText("Loading your appointments…")).toBeVisible();
    else if (state === "empty")
      await expect(
        page.getByRole("heading", { name: "No appointments", exact: true }),
      ).toBeVisible();
    else {
      await expect(
        page.getByRole("heading", { name: "Unable to load appointments" }),
      ).toBeVisible();
      mode = "normal";
      await page.getByRole("button", { name: "Retry appointments" }).click();
      await expect(list()).toBeVisible();
    }
  }
  mode = "normal";
  records = Array.from({ length: 150 }, (_, i) => ({
    ...seed()[0],
    id: `long-${i}`,
    clientName: `Long full client identity ${i} with multiple legal names`,
    notes: "long note ".repeat(100),
    clientEmail: "very-long-contact-address@example.invalid",
  }));
  await fresh();
  const scroll = list().locator(".staff-appointments-list-scroll");
  assert(await scroll.evaluate((e) => e.scrollHeight > e.clientHeight));
  await overflow();
  records = seed();
  await fresh();
  await page.getByRole("button", { name: "New Appointment", exact: true }).click();
  slotFailure = true;
  await page.getByLabel("Date", { exact: false }).last().fill("2026-10-25");
  await expect(page.getByRole("button", { name: "Retry slots" })).toBeVisible();
  slotFailure = false;
  await page.getByRole("button", { name: "Retry slots" }).click();
  await page.getByRole("combobox", { name: "Client or lead" }).click();
  await page.getByRole("option", { name: "Permitted Lead · lead" }).click();
  await expect(page.getByLabel("Client name", { exact: false })).toHaveValue("Permitted Lead");
  await chooseSlot();
  await page.getByRole("button", { name: "Create appointment", exact: true }).click();
  assert.equal(records.at(-1).leadId, leadId);
  check(
    "loading/empty/error/permission/retry states, 150-record bounds, slot retry and permitted lead creation",
  );

  await page.evaluate(() => window.renderAppointmentsFixture("admin"));
  await expect(page.locator(".staff-appointments-workspace")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Appointments/ }).first()).toBeVisible();
  await page.evaluate(() => window.renderAppointmentsFixture("client"));
  await expect(page.locator(".client-appointments")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reschedule", exact: true })).toHaveCount(0);
  await expect(page.locator(".staff-appointments-workspace")).toHaveCount(0);
  assert.equal(errors.length, 0, errors.join("\n"));
  check("actual Admin/Client composition isolation and no browser exceptions");
} finally {
  fs.writeFileSync(
    path.join(out, "evidence.json"),
    JSON.stringify({ checks, errors, requests, a11y }, null, 2),
  );
  await browser.close();
  server.close();
}
