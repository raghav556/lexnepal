import fs from "node:fs";
import { spawnSync } from "node:child_process";

// Reuse the committed role/session fixtures and complete API interception.
const out = ".local/qa/session-17e";
fs.mkdirSync(out, { recursive: true });
const shared = fs.readFileSync("scripts/qa/verify-account-profile.mjs", "utf8").replaceAll("\r\n", "\n").replace('localStorage.setItem("lexnepal_lang", "en");', 'if (!localStorage.getItem("lexnepal_lang")) localStorage.setItem("lexnepal_lang", "en");');
const boundary = shared.indexOf("if (publicContrastOnly) {\n  assert.equal(prior.results.length");
const paging = fs.readFileSync("scripts/qa/verify-staff-pagination.mjs", "utf8").replaceAll("\r\n", "\n");
const setupStart = paging.indexOf("async function paginationAudit()");
const setupEnd = paging.indexOf("  async function exercise(label)");
if (boundary < 0 || setupStart < 0 || setupEnd < 0) throw new Error("Review committed QA fixture boundaries.");
const fixtures = paging.slice(setupStart, setupEnd).replace("async function paginationAudit()", "async function dateAudit()")
  .replace('role === "staff" ? "#staff-main-canvas" : "main"', 'path.startsWith("/staff") ? "#staff-main-canvas" : "main"')
  .replace('waitUntil: "domcontentloaded"', 'waitUntil: "commit", timeout: 90000')
  .replace('await applyTheme();\n    await page.waitForTimeout(350);', 'await page.locator("h1").first().waitFor({ timeout: 45000 });\n    await applyTheme();\n    await page.waitForTimeout(350);');
const checks = String.raw`
  async function scan(label, scope) {
    const result = await new AxeBuilder({ page }).include(scope).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    scans.push({ label, scope, violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
  }
  async function field(selector, bs, ad) {
    const input = page.locator(selector);
    const root = input.locator('xpath=ancestor::*[@data-slot="bs-date-field"]');
    await input.fill((await root.getAttribute("data-calendar-system")) === "ad" ? ad : bs);
    await expect(root).toHaveAttribute("data-ad-date", ad);
    await expect(root.locator("[data-date-conversion]")).toHaveAttribute("readonly", "");
    assert(await input.evaluate(e => e.checkValidity()));
    pass("B.S. entry / Gregorian value / native validity", { selector, bs, ad });
  }
  async function forms() {
    await open("/staff/tasks");
    await page.getByRole("button", { name: "New Task", exact: true }).click();
    await field("#create-due-bs", "2083-07-03", "2026-10-20");
    const input = page.locator("#create-due-bs");
    await input.fill("2082-01-32");
    assert.equal(await input.evaluate(e => e.checkValidity()), false);
    await expect(page.getByRole("alert").filter({ hasText: /day|date/i }).first()).toBeVisible();
    pass("Invalid B.S. month length blocks submission");
    await field("#create-due-bs", "२०८३-०७-०३", "2026-10-20");
    await scan("Task B.S. date field", '[data-slot="bs-date-field"]');
    await capture("after-task-bs-entry-1440-light");
    await page.locator("#create-task-title").fill("Synthetic B.S. date task");
    const requests = [];
    await page.route("**/api/v1/tasks", async r => {
      if (r.request().method() !== "POST") return r.fallback();
      const payload = r.request().postDataJSON(); requests.push(payload);
      writes.push({ path: "/api/v1/tasks", method: "POST", intercepted: true, dateFixture: true, payload });
      await r.fulfill({ json: { data: { id: "date-task", ...payload } } });
    });
    await page.getByRole("button", { name: "Create Task", exact: true }).click();
    await expect.poll(() => requests.length).toBe(1);
    assert.equal(requests[0].dueDate, "2026-10-20");
    assert.match(requests[0].dueDateBs, /3.*2083/);
    pass("Actual task command sends A.D. contract and calculated B.S.");

    await open("/staff/hearings", 390, "dark");
    await page.getByRole("button", { name: /add hearing|new hearing/i }).first().click();
    await field("#hearing-create-date", "2083-07-03", "2026-10-20");
    await page.locator("#hearing-create-case").selectOption(caseId);
    await page.locator("#hearing-create-time").fill("10:30");
    const hearingRequests = [];
    await page.route("**/api/v1/hearings", async r => {
      if (r.request().method() !== "POST") return r.fallback();
      const payload = r.request().postDataJSON(); hearingRequests.push(payload);
      writes.push({ path: "/api/v1/hearings", method: "POST", intercepted: true, dateFixture: true, payload });
      await r.fulfill({ json: { data: { id: "date-hearing", ...payload } } });
    });
    await scan("Hearing mobile B.S. field", '[data-slot="bs-date-field"]');
    await capture("after-hearing-bs-entry-390-dark");
    await page.getByRole("button", { name: "Schedule Hearing", exact: true }).click();
    await expect.poll(() => hearingRequests.length).toBe(1);
    assert.equal(hearingRequests[0].dateGregorian, "2026-10-20");
    assert.equal(hearingRequests[0].hearingTime, "10:30");
    pass("Actual hearing command preserves A.D. day and court time");

    await open("/client/booking", 390, "light", 1, "client");
    await field("#client-booking-bs-date", "2083-07-04", "2026-10-21");
    await scan("Client booking B.S. input", '[data-slot="bs-date-field"]');
    await capture("after-client-booking-390-light");

    await open("/consultation", 390, "light");
    await field('[data-date-primary][aria-label^="Preferred Date"]', "2083-07-04", "2026-10-21");
    await scan("Public booking B.S. input", '[data-slot="bs-date-field"]');
    await capture("after-public-consultation-390-light");
    await open("/staff/hr", 360, "dark");
    await page.getByRole("button", { name: "Request Leave", exact: true }).first().click();
    await field("#staff-hr-from", "2083-07-04", "2026-10-21");
    await field("#staff-hr-to", "2083-07-05", "2026-10-22");
    await scan("HR mobile range", '[data-slot="bs-date-field"]');
    await capture("after-hr-leave-360-dark");
  }
  async function calendars() {
    await open("/staff/tasks");
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    const calendar = page.getByRole("region", { name: "Task calendar", exact: true });
    await expect(calendar).toContainText("October 2026");
    await calendar.getByRole("button", { name: "Next month", exact: true }).click();
    await expect(calendar).toContainText("November 2026");
    await calendar.getByRole("button", { name: "Previous month", exact: true }).click();
    await expect(calendar).toContainText("October 2026");
    await capture("after-task-bs-calendar-1440-light");
    await scan("Task B.S. calendar", ".staff-task-calendar");
    pass("Task calendar actual B.S. month / next / previous / A.D. keys");
  }
  async function extra() {
    await open("/staff/tasks", 390, "dark", 1);
    const original = { _id: "74000000-0000-4000-8000-000000000001", id: "74000000-0000-4000-8000-000000000001", title: "Instant-preserving task", assignedTo: id, priority: "medium", status: "todo", dueDate: "2026-10-19T19:10:00.000Z", dueDateBs: "3 Kartik 2083", reminderAt: "2026-10-19T19:00:00.000Z", createdAt: stamp, updatedAt: stamp };
    const updates = [];
    await page.route("**/api/v1/tasks*", async r => {
      if (new URL(r.request().url()).pathname !== "/api/v1/tasks") return r.fallback();
      await r.fulfill({ json: { data: [original] } });
    });
    await page.route("**/api/v1/tasks/**", async r => {
      if (r.request().method() !== "PATCH") return r.fallback();
      const payload = r.request().postDataJSON(); updates.push(payload);
      writes.push({ path: new URL(r.request().url()).pathname, method: "PATCH", intercepted: true, dateFixture: true, payload });
      await r.fulfill({ json: { data: { ...original, ...payload } } });
    });
    await page.reload({ waitUntil: "commit" });
    await page.getByText("Instant-preserving task", { exact: true }).first().click();
    await expect(page.locator("#edit-task-reminder")).toHaveValue("2026-10-20");
    await page.locator("#edit-task-title").fill("Only title changed");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => updates.length).toBe(1);
    assert.equal(updates[0].dueDate, original.dueDate);
    assert.equal(updates[0].reminderAt, original.reminderAt);
    pass("Actual task edit preserves original due/reminder instants");

    await open("/staff/hr", 360, "dark");
    await page.getByRole("button", { name: "Request Leave", exact: true }).first().click();
    await field("#staff-hr-from", "2083-07-04", "2026-10-21");
    await field("#staff-hr-to", "2083-07-05", "2026-10-22");
    const leave = [];
    await page.route("**/api/v1/hr/leave-requests", async r => {
      if (r.request().method() !== "POST") return r.fallback();
      const payload = r.request().postDataJSON(); leave.push(payload);
      writes.push({ path: "/api/v1/hr/leave-requests", method: "POST", intercepted: true, dateFixture: true, payload });
      await r.fulfill({ json: { data: { id: "synthetic-leave", ...payload, status: "pending" } } });
    });
    await page.locator("#staff-hr-from").fill("2082-01-32");
    await page.getByRole("button", { name: "Submit Request", exact: true }).click();
    assert.equal(leave.length, 0);
    pass("HR noValidate form rejects invalid B.S. instead of stale A.D.");
    await field("#staff-hr-from", "2083-07-04", "2026-10-21");
    await page.getByRole("button", { name: "Submit Request", exact: true }).click();
    await expect.poll(() => leave.length).toBe(1);
    assert.equal(leave[0].fromDate, "2026-10-21"); assert.equal(leave[0].toDate, "2026-10-22");
    pass("Actual leave command keeps existing A.D. range");
    await page.locator("#staff-hr-from").fill("2082-01-32");
    assert.equal(await page.locator("#staff-hr-from").evaluate(e => e.checkValidity()), false);
    await page.getByRole("button", { name: "Switch language to Nepali", exact: true }).filter({ visible: true }).click();
    await expect(page.locator("#staff-hr-from")).toHaveValue("२०८३-०७-०३");
    assert.equal(await page.locator("#staff-hr-from").evaluate(e => e.checkValidity()), true);
    await scan("Nepali B.S. date fields", '[data-slot="bs-date-field"]');
    await capture("after-nepali-hr-date-360-dark");
    pass("Existing language control updates B.S. digits / no duplicate control");

    await open("/staff/appointments", 768, "light", 1);
    await page.getByRole("button", { name: "New Appointment", exact: true }).click();
    await page.locator("#appointment-name").fill("Synthetic date booking");
    await page.locator("#appointment-phone").fill("9800000000");
    await page.locator("#appointment-practice").fill("Civil Litigation");
    await field("#appointment-date", "2083-07-04", "2026-10-21");
    await page.locator("#appointment-slot").click();
    await page.getByRole("option", { name: "10:00 AM", exact: true }).click();
    const bookings = [];
    await page.route("**/api/v1/appointments", async r => {
      if (r.request().method() !== "POST") return r.fallback();
      const payload = r.request().postDataJSON(); bookings.push(payload);
      writes.push({ path: "/api/v1/appointments", method: "POST", intercepted: true, dateFixture: true, payload });
      await r.fulfill({ json: { data: { id: "synthetic-date-booking", ...payload, status: "pending" } } });
    });
    await scan("Tablet appointment B.S. field", '[data-slot="bs-date-field"]');
    await capture("after-appointment-bs-entry-768-light");
    await page.getByRole("button", { name: "Create appointment", exact: true }).click();
    await expect.poll(() => bookings.length).toBe(1);
    assert.equal(bookings[0].date, "2026-10-21"); assert.equal(bookings[0].timeSlot, "10:00 AM");
    pass("Actual appointment command / unchanged A.D. slot contract");

    await open("/admin/appointments", 1440, "light", 1, "admin");
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await expect(page.getByText("October 2026", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next month", exact: true }).click();
    await expect(page.getByText("November 2026", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Previous month", exact: true }).click();
    await capture("after-admin-bs-calendar-1440-light");
    pass("Admin appointment B.S. calendar / next / previous");
  }
  async function routes() {
    if (process.argv.includes("--resume")) {
      const seen = new Set();
      for (const filename of ["routes-staff-initial.json", "routes-evidence.json"]) {
        if (!fs.existsSync(out + "/" + filename)) continue;
        const previous = JSON.parse(fs.readFileSync(out + "/" + filename, "utf8"));
        assert.equal(previous.errors.length, 0);
        for (const result of previous.results) {
          const key = [result.path, result.width, result.theme].join("|");
          if (!seen.has(key)) { results.push(result); seen.add(key); }
        }
        for (const scan of previous.scans) if (!scans.some(s => s.label === scan.label)) scans.push(scan);
      }
    }
    const paths = {
      staff: ["/staff", "/staff/tasks", "/staff/cases", "/staff/hearings", "/staff/documents", "/staff/research", "/staff/crm", "/staff/clients", "/staff/messages", "/staff/appointments", "/staff/content", "/staff/hr", "/staff/profile"],
      admin: ["/admin", "/admin/cases", "/admin/appointments", "/admin/hr", "/admin/crm", "/admin/templates", "/admin/document-generator", "/admin/users", "/admin/audit", "/admin/cms/blog", "/admin/cms/news", "/admin/cms/resources", "/admin/cms/team", "/admin/cms/careers", "/admin/cms/governance", "/admin/profile"],
      client: ["/client", "/client/cases", "/client/hearings", "/client/booking", "/client/documents", "/client/messages", "/client/profile", "/client/notifications"],
      public: ["/", "/blog", "/news", "/resources", "/consultation"],
    };
    for (const [role, list] of Object.entries(paths)) for (const path of list) {
      if (process.argv.includes("--remaining") && role === "staff") continue;
      for (const [width, theme] of [[1440, "light"], [768, "light"], [390, "dark"]]) {
        if (results.some(r => r.path === path && r.width === width && r.theme === theme)) continue;
        await open(path, width, theme, 53, role === "public" ? "staff" : role);
        assert(!page.url().includes("/auth/"), path + " must remain authorized");
        assert.equal(await page.getByText("This page could not be found.", { exact: true }).count(), 0, path);
        const g = await geometry();
        assert.equal(g.overflow, 0, JSON.stringify({ path, width, g }));
        if (role === "staff") {
          assert.equal(g.bodyRange, 0); assert.equal(g.shellRange, 0);
          assert.equal(g.staffPrimary, 12); assert.equal(g.bottomBar, false); assert.equal(g.mainPosition, "relative");
        }
        const dual = page.locator('[data-slot="dual-date-display"]');
        if (await dual.count()) {
          assert.match(await dual.first().textContent(), /B\.S\.|वि\.सं\.|unavailable/);
          if (width === 390 && ["/staff/hr", "/client/hearings", "/admin/hearings"].includes(path)) await scan(path + " mobile dates", '[data-slot="dual-date-display"]');
        }
        pass("Route / date rendering / responsive preservation", { role, path, width, theme, geometry: g });
        if (["/staff/hearings", "/staff/appointments", "/client/hearings", "/admin/appointments", "/staff/hr"].includes(path)) await capture("after-" + path.slice(1).replaceAll("/", "-") + "-" + width + "-" + theme);
      }
    }
  }
  async function timezones() {
    for (const tz of ["UTC", "America/New_York", "Australia/Sydney", "Asia/Kathmandu"]) {
      process.env.DATE_QA_TIMEZONE = tz;
      await open("/client/booking", 390, "light", 1, "client");
      await field("#client-booking-bs-date", "2083-07-03", "2026-10-20");
      const current = page.locator("#client-booking-bs-date");
      assert.equal(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone), tz === "Asia/Kathmandu" ? "Asia/Katmandu" : tz);
      await localeChoice("ne");
      await field("#client-booking-bs-date", "२०८३-०७-०३", "2026-10-20");
      pass("Actual locale entry independent of browser timezone", { tz });
    }
    delete process.env.DATE_QA_TIMEZONE;
    await open("/staff/hr", 360, "dark");
    for (const [instant, expected] of [["2026-10-19T18:14:59Z", "2026-10-19"], ["2026-10-19T18:15:00Z", "2026-10-20"]]) {
      await page.clock.setFixedTime(new Date(instant));
      await page.reload({ waitUntil: "commit" });
      await page.getByRole("button", { name: "Request Leave", exact: true }).first().click();
      await expect(page.locator("#staff-hr-from")).toHaveValue(expected);
      pass("Browser Nepal midnight boundary", { instant, expected });
    }
    await scan("Final mobile date validity / labels", '[data-slot="bs-date-field"]');
    await capture("after-nepal-midnight-360-dark");
  }
  async function finalCaptures() {
    for (const [width, theme] of [[1440, "light"], [390, "dark"]]) {
      await open("/staff/tasks", width, theme);
      await page.getByRole("button", { name: "Calendar", exact: true }).click();
      const calendar = page.getByRole("region", { name: "Task calendar", exact: true });
      await calendar.scrollIntoViewIfNeeded();
      await expect(calendar).toContainText("October 2026");
      await scan("Final task month " + width, ".staff-task-calendar");
      assert.equal((await geometry()).overflow, 0);
      await capture("final-task-bs-calendar-" + width + "-" + theme);
      await page.getByRole("button", { name: "Switch language to Nepali", exact: true }).filter({ visible: true }).click();
      await expect(calendar).toContainText("कार्तिक २०८३ वि.सं.");
      await capture("final-task-nepali-calendar-" + width + "-" + theme);
      pass("Final task month / mobile containment / Nepali labels", { width, theme });
    }
    for (const [path, selector, role, width, theme, name] of [
      ["/client/booking", "#client-booking-bs-date", "client", 390, "light", "client-booking"],
      ["/consultation", '[data-date-primary][aria-label^="Preferred Date"]', "staff", 390, "light", "public-consultation"],
      ["/staff/hr", "#staff-hr-from", "staff", 360, "dark", "staff-hr"],
    ]) {
      await open(path, width, theme, 53, role);
      if (path === "/staff/hr") await page.getByRole("button", { name: "Request Leave", exact: true }).first().click();
      await field(selector, "2083-07-04", "2026-10-21");
      if (path === "/staff/hr") {
        await field("#staff-hr-to", "2083-07-05", "2026-10-22");
        await expect(page.getByLabel("From (B.S.)", { exact: true })).toBeVisible();
        await expect(page.getByLabel("To (B.S.)", { exact: true })).toBeVisible();
      }
      await page.locator(selector).evaluate(e => e.closest('[data-slot="bs-date-field"]').scrollIntoView({ block: "center", behavior: "instant" }));
      await scan("Final date entry " + name, '[data-slot="bs-date-field"]');
      assert.equal((await geometry()).overflow, 0);
      await capture("final-" + name + "-" + width + "-" + theme);
      pass("Final input visible / derived A.D. / responsive", { path, width, theme });
    }
    await open("/staff/cases", 390, "dark");
    await page.getByRole("button", { name: /new case|create case/i }).first().click();
    await field("#case-filing-date-bs", "2083-07-03", "2026-10-20");
    await scan("Case filing B.S. input", '[data-slot="bs-date-field"]');
    await capture("final-case-filing-390-dark");
    pass("Existing case create / B.S. filing / A.D. contract");
  }
  async function publicDates() {
    for (const [width, theme] of [[1440, "light"], [390, "dark"]]) {
      await open("/blog", width, theme);
      await page.route("**/api/v1/public/cms/blog-posts*", async r => {
        if (r.request().method() !== "GET") return r.fallback();
        const article = { id: "synthetic-date-article", _id: "synthetic-date-article", title: "Synthetic date-system publication", slug: "date-system-proof", excerpt: "Synthetic public publication for date display verification.", category: "General", author: "Synthetic Reviewer", status: "published", content: "Synthetic content only.", publishDate: "2026-10-19T19:00:00Z", isFeatured: true };
        await r.fulfill({ json: { data: [article, { ...article, id: "synthetic-undated", _id: "synthetic-undated", slug: "synthetic-undated", title: "Synthetic undated publication", publishDate: undefined, isFeatured: false }] } });
      });
      await page.reload({ waitUntil: "commit" });
      await page.clock.setSystemTime(new Date(stamp));
      await applyTheme();
      const published = page.getByText("20 Oct 2026 A.D. (3 Kartik 2083 B.S.)", { exact: true }).first();
      await expect(published).toBeVisible();
      await expect(page.getByText("Date not recorded", { exact: true }).first()).toBeVisible();
      await published.scrollIntoViewIfNeeded();
      await page.clock.runFor(1500);
      await expect.poll(() => published.evaluate(e => {
        let opacity = 1; for (let parent = e; parent; parent = parent.parentElement) opacity *= Number(getComputedStyle(parent).opacity);
        return opacity;
      })).toBeGreaterThan(0.99);
      await published.evaluate(e => e.setAttribute("data-qa-date", "publication"));
      await scan("Public publication date " + width, '[data-qa-date="publication"]');
      if (theme === "dark") {
        const heading = page.getByRole("heading", { name: "Synthetic date-system publication", exact: true });
        await heading.evaluate(e => e.setAttribute("data-qa-heading", "publication"));
        const diagnostic = await new AxeBuilder({ page }).include('[data-qa-heading="publication"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        const style = await heading.evaluate(e => {
          const color = getComputedStyle(e).color;
          let background = "white";
          for (let parent = e; parent; parent = parent.parentElement) {
            const value = getComputedStyle(parent).backgroundColor;
            if (value !== "rgba(0, 0, 0, 0)" && value !== "transparent") { background = value; break; }
          }
          const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          const rgb = value => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1); return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3); };
          const foregroundRgb = rgb(color), backgroundRgb = rgb(background);
          const luminance = values => values.map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((s, x, i) => s + x * [.2126, .7152, .0722][i], 0);
          const a = luminance(foregroundRgb), b = luminance(backgroundRgb);
          return { color, background, foregroundRgb, backgroundRgb, contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), classes: e.className };
        });
        fs.writeFileSync(out + "/public-dark-heading-diagnostic.json", JSON.stringify({ path: "/blog", width, theme, scope: "Existing non-date publication heading; separate from date-control gate", style, violations: diagnostic.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) }, null, 2));
      }
      assert.equal((await geometry()).overflow, 0);
      await capture("final-public-publication-" + width + "-" + theme);
      pass("Actual public publication / Nepal instant / locale-primary date", { width, theme });
      pass("Missing publication date stays unavailable; no invented today", { width });
    }
  }
  async function clientLocale() {
    for (const path of ["/client", "/client/cases", "/client/hearings"]) {
      await open(path, 390, "light", 1, "client");
      await page.getByRole("button", { name: "Switch language to Nepali", exact: true }).filter({ visible: true }).click();
      const day = page.locator(path === "/client" ? ".client-home-hearing-day" : path === "/client/hearings" ? ".client-hearings-dateblock-day" : ".client-matters-hearing-day").first();
      if (path === "/client/cases") {
        await expect(page.getByText(/कार्तिक २०८३/).first()).toBeVisible();
      } else await expect(day).toHaveText("३");
      assert.equal((await geometry()).overflow, 0);
      await capture("final-" + path.slice(1).replaceAll("/", "-") + "-nepali-390-light");
      pass("Client date badges follow existing Nepali preference", { path });
    }
  }
  async function dateConsistency() {
    await open("/client/hearings", 390, "light", 1, "client");
    await expect(page.locator(".client-hearings-row-meta").first()).toContainText("20 Oct 2026 A.D. (3 Kartik 2083 B.S.)");
    await page.getByLabel("Search hearings by matter, court or purpose", { exact: true }).fill("3 Kartik");
    await expect(page.locator(".client-hearings-row-meta")).toHaveCount(1);
    pass("Actual hearing metadata/search use calculated B.S., not inconsistent recorded label");
    await page.getByRole("button", { name: "Switch language to Nepali", exact: true }).filter({ visible: true }).click();
    await expect(page.locator(".client-hearings-row-meta").first()).toContainText("३ कार्तिक २०८३ वि.सं.");
    await scan("Final Client hearing date metadata", ".client-hearings-row-meta");
    await capture("final-client-hearings-nepali-390-light");
    pass("Client hearing metadata and date tile agree in Nepali");
    for (const role of ["staff", "admin", "client"]) for (const [width, theme] of [[1440, "light"], [390, "dark"]]) {
      await open('/' + role + '/cases/' + caseId, width, theme, 1, role);
      await page.getByRole("tab", { name: /hearings/i }).first().click();
      const panel = page.getByRole("tabpanel").filter({ visible: true });
      await expect(panel).toContainText("20 Oct 2026 A.D. (3 Kartik 2083 B.S.)");
      assert.equal((await geometry()).overflow, 0);
      await scan("Nested " + role + " hearing dates " + width, role === "staff" ? "[data-detail-hearing]" : '[role="tabpanel"]');
      await capture("final-" + role + "-case-hearings-" + width + "-" + theme);
      pass("Actual nested case hearing list / authoritative date / responsive", { role, width, theme });
    }
    await open("/staff", 390, "dark", 1);
    const upcoming = page.getByRole("heading", { name: "Upcoming Hearings", exact: true }).locator("xpath=ancestor::section[1]");
    await expect(upcoming).toContainText("20 Oct 2026 A.D. (3 Kartik 2083 B.S.)");
    assert.equal((await geometry()).bodyRange, 0);
    assert.equal((await geometry()).overflow, 0);
    await upcoming.scrollIntoViewIfNeeded();
    await capture("final-staff-dashboard-hearing-date-390-dark");
    pass("Dashboard hearing date tile and A.D. secondary use authoritative date");
    await open("/staff/appointments", 1440, "light", 1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Month", exact: true }).click();
    const grid = page.getByRole("group", { name: "month dates", exact: true });
    await grid.locator('[data-date="2026-10-20"]').focus();
    await page.keyboard.press("ArrowRight");
    await expect(grid.locator('[data-date="2026-10-21"]')).toBeFocused();
    await expect(grid.locator('[data-date="2026-10-21"]')).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Home");
    await expect(grid.locator('[data-date="2026-10-19"]')).toBeFocused();
    await page.keyboard.press("End");
    await expect(grid.locator('[data-date="2026-10-25"]')).toBeFocused();
    await scan("B.S. month keyboard selection", ".staff-appointments-date-grid");
    await capture("final-staff-appointment-keyboard-month-1440-light");
    pass("B.S. month keyboard / focus / A.D. keys / reduced motion");
    await open("/staff/appointments", 1440, "dark", 1);
    await page.getByRole("button", { name: "Month", exact: true }).click();
    await scan("B.S. month secondary date contrast dark", ".staff-appointments-date-grid");
    await capture("final-staff-appointment-month-1440-dark");
    pass("B.S. month secondary dates remain readable in dark theme");
  }
  async function localeChoice(language) {
    const control = page.getByRole("button", { name: language === "ne" ? "Switch language to Nepali" : "Switch language to English", exact: true }).filter({ visible: true });
    if (await control.count()) await control.click();
  }
  async function localePicker(selector, language, label) {
    const input = page.locator(selector).first(), root = input.locator('xpath=ancestor::*[@data-slot="bs-date-field"]');
    await expect(root).toHaveAttribute("data-calendar-system", language === "ne" ? "bs" : "ad");
    const trigger = root.locator(".locale-date-trigger"), popup = page.locator("[data-calendar-popover]");
    await trigger.click(); await expect(popup).toBeVisible();
    await expect(popup).toHaveAttribute("data-calendar-system", language === "ne" ? "bs" : "ad");
    await expect(popup.locator("strong")).toHaveText(language === "ne" ? "कार्तिक २०८३ वि.सं." : "October 2026");
    await expect(popup.locator("button[data-date]")).toHaveCount(language === "ne" ? 30 : 31);
    await expect(popup.locator('[data-date="2026-10-20"]')).toHaveText(language === "ne" ? "३" : "20");
    await popup.getByRole("button", { name: language === "ne" ? "अर्को महिना" : "Next month", exact: true }).click();
    await expect(popup.locator("strong")).toHaveText(language === "ne" ? "मंसिर २०८३ वि.सं." : "November 2026");
    await popup.getByRole("button", { name: language === "ne" ? "अघिल्लो महिना" : "Previous month", exact: true }).click();
    await popup.locator('[data-date="2026-10-21"]').click();
    await expect(popup).toHaveCount(0);
    await expect(input).toHaveValue(language === "ne" ? "२०८३-०७-०४" : "2026-10-21");
    await expect(root).toHaveAttribute("data-ad-date", "2026-10-21");
    await expect(root.locator("[data-date-conversion]")).toHaveValue(language === "ne" ? "2026-10-21" : "2083-07-04");
    await expect(root.locator("[data-date-conversion]")).toHaveAttribute("readonly", "");
    await trigger.click(); await page.keyboard.press("ArrowLeft");
    await expect(popup.locator('[data-date="2026-10-20"]')).toBeFocused();
    await page.keyboard.press("Enter"); await expect(root).toHaveAttribute("data-ad-date", "2026-10-20");
    await input.fill(language === "ne" ? "2091-01-01" : "2200-01-01");
    assert.equal(await input.evaluate(e => e.checkValidity()), false); await expect(root.getByRole("alert")).toBeVisible();
    await input.fill(language === "ne" ? "२०८३-०७-०३" : "2026-10-20");
    assert.equal(await input.evaluate(e => e.checkValidity()), true);
    await trigger.click(); await scan("Locale picker " + label + " " + language, "[data-calendar-popover]");
    await capture("locale-" + label + "-" + language + "-picker");
    await page.keyboard.press("Escape"); await expect(trigger).toBeFocused(); await expect(input).toBeVisible();
    await input.scrollIntoViewIfNeeded(); await capture("locale-" + label + "-" + language + "-conversion");
    assert.equal((await geometry()).overflow, 0);
    pass("Real locale picker / navigation / keyboard / conversion / range / Escape", { label, language });
  }
  async function closureCase() {
    const before = process.argv.includes('--closure-case-before');
    for (const role of before ? ['staff'] : ['staff', 'admin']) for (const language of ['en', 'ne']) {
      await open('/' + role + '/cases', 1440, 'light', 1, role); await localeChoice(language);
      const opener = page.getByRole('button', { name: /new case|create case/i }).first(); await opener.click();
      const dialog = page.getByRole('dialog', { name: 'Create New Case', exact: true }), input = page.locator('#case-filing-date-bs');
      const field = input.locator('xpath=ancestor::*[@data-slot="bs-date-field"]'), trigger = field.locator('.locale-date-trigger');
      for (const width of before ? [360] : role === 'staff' ? [360, 390, 1440] : [360, 1440]) for (const theme of before ? ['dark'] : ['light', 'dark']) for (const scale of before ? [200] : [100, 200]) {
        await page.setViewportSize({ width, height: 900 }); currentTheme = theme; capturedTheme = theme; await applyTheme(); await page.evaluate(s => { document.documentElement.style.fontSize = s + '%'; }, scale);
        await trigger.evaluate(e => e.scrollIntoView({ block: 'center' })); await page.evaluate(() => document.fonts.ready);
        const measure = await dialog.evaluate(e => {
          const t = e.querySelector('.locale-date-trigger'), a = e.querySelector('[data-date-primary]'), b = e.querySelector('[data-date-conversion]'), form = e.querySelector('form'), header = e.querySelector('#case-create-title').parentElement, footer = form.lastElementChild;
          const r = t.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          const fit = n => { const s = getComputedStyle(n), c = document.createElement('canvas').getContext('2d'); c.font = s.fontWeight + " " + s.fontSize + " " + s.fontFamily; return { text: c.measureText(n.value).width, space: n.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) }; };
          return { dialogHeight: e.clientHeight, dialogScroll: e.scrollHeight - e.clientHeight, headerHeight: header.getBoundingClientRect().height, formHeight: form.clientHeight, footerHeight: footer.getBoundingClientRect().height, triggerCovered: !t.contains(hit), hit: hit?.textContent?.trim().slice(0, 80), sameRow: Math.abs(a.getBoundingClientRect().y - b.getBoundingClientRect().y) < 1, available: a.closest('[data-slot="bs-date-field"]').clientWidth, primaryText: fit(a), conversionText: fit(b), formOverflow: getComputedStyle(form).overflowY, footerPosition: getComputedStyle(footer).position };
        });
        if (before) {
          assert(measure.triggerCovered); await capture('closure-case-before-' + language + '-360-dark-200'); pass('Reproduced Case text-zoom obstruction', { role, language, width, theme, scale, measure }); continue;
        }
        assert(!measure.triggerCovered, JSON.stringify({ role, language, width, theme, scale, measure }));
        assert(measure.primaryText.text <= measure.primaryText.space + 1 && measure.conversionText.text <= measure.conversionText.space + 1, JSON.stringify(measure));
        await trigger.click(); const popup = page.locator('[data-calendar-popover]'); await expect(popup).toBeVisible();
        await popup.locator('[data-date="2026-10-21"]').click(); await expect(field).toHaveAttribute('data-ad-date', '2026-10-21'); await expect(field.locator('[data-date-conversion]')).toHaveValue(language === 'en' ? '2083-07-04' : '2026-10-21');
        await trigger.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await expect(trigger).toBeFocused(); await expect(dialog).toBeVisible();
        await input.fill(language === 'ne' ? '२०८३-०७-०३' : '2026-10-20');
        for (const label of ['Create Case', 'Cancel', 'Close dialog']) { const control = dialog.getByRole('button', { name: label, exact: true }); await control.focus(); await control.evaluate(e => e.scrollIntoView({ block: 'center' })); await expect(control).toBeInViewport(); assert(await control.evaluate(e => { const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), label + ' is covered'); }
        await input.focus(); await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button', { name: 'Close dialog', exact: true })).toBeFocused();
        assert.equal((await geometry()).overflow, 0); assert.equal((await geometry()).bodyRange, 0);
        await scan('Closure Case ' + role + language + width + theme + scale, '[aria-labelledby="case-create-title"]');
        if (role === 'staff' && ((width === 360 && theme === 'dark' && scale === 200) || (width === 1440 && theme === 'light' && scale === 100))) { await trigger.evaluate(e => e.scrollIntoView({ block: 'center' })); await capture('closure-case-after-' + language + '-' + width + '-' + theme + '-' + scale); }
        pass('Case zoom / picker / conversion / reachable actions / focus / containment', { role, language, width, theme, scale, measure });
      }
      if (!before) { await dialog.getByRole('button', { name: 'Cancel', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused(); await opener.click(); await dialog.getByRole('button', { name: 'Close dialog', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(dialog).toHaveCount(0); }
    }
  }
  async function closurePublic() {
    for (const language of ['en', 'ne']) for (const width of [360, 1440]) for (const theme of ['light', 'dark']) {
      await open('/staff', width, theme, 1); await localeChoice(language);
      await page.goto(new URL('/consultation', page.url()).href, { waitUntil: 'commit' });
      const input = page.locator('[data-date-primary][aria-label^="Preferred Date"]').filter({ visible: true }), root = input.locator('xpath=ancestor::*[@data-slot="bs-date-field"]');
      await expect(input).toHaveCount(1);
      await expect(root).toHaveAttribute('data-calendar-system', language === 'ne' ? 'bs' : 'ad'); await expect.poll(() => input.evaluate(e => Object.keys(e).some(k => k.startsWith('__reactProps$')))).toBe(true); await applyTheme();
      await input.scrollIntoViewIfNeeded(); await expect(input).toBeInViewport();
      await expect.poll(() => input.evaluate(e => { let opacity = 1; for (let n = e; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity); return opacity; })).toBe(1);
      await input.fill(language === 'ne' ? '२०८३-०७-०३' : '2026-10-20'); await expect(root).toHaveAttribute('data-ad-date', '2026-10-20'); await expect(root.locator('[data-date-conversion]')).toHaveValue(language === 'en' ? '2083-07-03' : '2026-10-20');
      await root.locator('.locale-date-trigger').click(); const popup = page.locator('[data-calendar-popover]'); await expect(popup).toContainText(language === 'en' ? 'October 2026' : 'कार्तिक २०८३'); await expect(popup.locator('[data-date="2026-10-20"]')).toBeFocused(); await page.keyboard.press('ArrowRight'); await expect(popup.locator('[data-date="2026-10-21"]')).toBeFocused(); await page.keyboard.press('Enter'); await expect(root).toHaveAttribute('data-ad-date', '2026-10-21');
      await input.fill(language === 'ne' ? '२०८२-०१-३२' : '2026-02-30'); assert.equal(await input.evaluate(e => e.checkValidity()), false); await input.fill(language === 'ne' ? '२०८३-०७-०३' : '2026-10-20'); assert(await input.evaluate(e => e.checkValidity()));
      assert.equal((await geometry()).overflow, 0); await scan('Closure Public hydration ' + language + width + theme, '[data-slot="bs-date-field"]');
      if ((width === 360 && theme === 'dark') || (width === 1440 && theme === 'light')) { await input.scrollIntoViewIfNeeded(); await expect(input).toBeInViewport(); await capture('closure-public-' + language + '-' + width + '-' + theme); }
      pass('Cold Public hydration / persisted locale / real picker / validity / same API day', { language, width, theme });
    }
  }
  async function sameRowShell() {
    if (process.argv.includes('--same-row-resume')) { const prior = JSON.parse(fs.readFileSync(out + '/same-row-shell-evidence.json', 'utf8')); assert.equal(prior.errors.length, 0); results.push(...prior.results); }
    for (const [role, path, action] of [["staff", "/staff/appointments", "New Appointment"], ["admin", "/admin/appointments", "Book Appointment"], ["client", "/client/booking", null]]) for (const width of [360, 1440]) {
      if (results.some(r => r.role === role && r.width === width)) continue;
      await open(path, width, width === 360 ? "dark" : "light", 1, role);
      if (action) await page.getByRole("button", { name: action, exact: true }).first().click();
      await page.locator('[data-date-primary]').filter({ visible: true }).first().waitFor(); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(200);
      const measured = await geometry(); console.log('SHELL ' + JSON.stringify({ role, width, measured }));
      if (measured.bodyRange) fs.writeFileSync(out + '/same-row-scroll-diagnostic.json', JSON.stringify(await page.evaluate(() => {
        const selectors = ['html', 'body', '[data-client-shell]', '.client-shell-frame', '#client-main-content', '.client-skip-link'];
        const info = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return { tag: e.tagName, className: String(e.className), top: r.top, bottom: r.bottom, height: r.height, scrollHeight: e.scrollHeight, overflow: s.overflow, position: s.position, margin: s.margin, padding: s.padding }; };
        return { base: selectors.map(selector => ({ selector, nodes: [...document.querySelectorAll(selector)].map(info) })), bodyChildren: [...document.body.children].map(info), fixed: [...document.querySelectorAll('*')].filter(e => ['absolute', 'fixed'].includes(getComputedStyle(e).position) && e.getBoundingClientRect().bottom > innerHeight).map(info).slice(0, 30) };
      }), null, 2));
      if (role === "client") await capture('same-row-client-shell-' + width);
      assert.equal(measured.overflow, 0); assert.equal(measured.bodyRange, 0);
      if (role === "staff") { assert.equal(measured.mainPosition, "relative"); assert.equal(measured.staffPrimary, 12); assert.equal(measured.bottomBar, false); assert.equal(measured.shellRange, 0); }
      pass("Final date-pair shell / no outer scroll / portal isolation", { role, width, geometry: measured });
    }
  }
  async function sameRowZoom() {
    for (const language of ["en", "ne"]) {
      await open('/client/booking', 1440, 'dark', 1, 'client'); await localeChoice(language);
      const input = page.locator('#client-booking-bs-date'), root = input.locator('xpath=ancestor::*[@data-slot="bs-date-field"]');
      await input.fill(language === 'ne' ? '२०८३-०७-०३' : '2026-10-20');
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      for (const width of [360, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 }); await input.scrollIntoViewIfNeeded();
        const measure = await root.evaluate(e => {
          const a = e.querySelector('[data-date-primary]'), b = e.querySelector('[data-date-conversion]');
          const fits = n => { const s = getComputedStyle(n), c = document.createElement('canvas').getContext('2d'); c.font = s.fontWeight + " " + s.fontSize + " " + s.fontFamily; return c.measureText(n.value).width <= n.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) + 1; };
          return { available: e.clientWidth, threshold: parseFloat(getComputedStyle(document.documentElement).fontSize) * 17, sameRow: Math.abs(a.getBoundingClientRect().y - b.getBoundingClientRect().y) <= 1, readable: fits(a) && fits(b), overflow: e.scrollWidth - e.clientWidth };
        });
        assert.equal(measure.sameRow, measure.available >= measure.threshold); assert(measure.readable && measure.overflow <= 1, JSON.stringify(measure));
        await root.locator('.locale-date-trigger').evaluate(e => e.scrollIntoView({ block: 'center' })); await capture('same-row-zoom-diagnostic-' + width + '-' + language); await root.locator('.locale-date-trigger').click(); const popup = page.locator('[data-calendar-popover]'); await expect(popup).toBeVisible(); const box = await popup.boundingBox(); assert(box.x >= 0 && box.x + box.width <= width + 1); await page.keyboard.press('Escape');
        await scan('Same-row 200% text ' + width + language, '[data-slot="bs-date-field"]');
        if (width === 390) await capture('same-row-zoom-390-' + language);
        pass('200% text / honest narrow fallback / readable values / usable picker', { language, width, measure });
      }
    }
  }
  async function sameRowConsumers() {
    if (process.argv.includes("--same-row-resume") && fs.existsSync(out + "/same-row-consumers-evidence.json")) {
      const prior = JSON.parse(fs.readFileSync(out + "/same-row-consumers-evidence.json", "utf8")); assert.equal(prior.errors.length, 0); assert(prior.scans.every(s => !s.violations.length)); results.push(...prior.results); scans.push(...prior.scans); writes.push(...prior.writes);
    }
    const plans = [
      ["case-hearing-staff", "/staff/cases/" + caseId, "staff"], ["case-hearing-admin", "/admin/cases/" + caseId, "admin"],
      ["case-task-staff", "/staff/cases/" + caseId, "staff"], ["case-task-admin", "/admin/cases/" + caseId, "admin"],
      ["case-create-admin", "/admin/cases", "admin"], ["task-edit", "/staff/tasks", "staff"],
      ["hearing-adjourn", "/staff/hearings", "staff"], ["appointment-reschedule", "/staff/appointments", "staff"],
      ["admin-reschedule", "/admin/appointments", "admin"], ["admin-filters", "/admin/appointments", "admin"],
      ["appointment-list", "/staff/appointments", "staff"], ["staff-crm", "/staff/crm", "staff"], ["admin-crm", "/admin/crm", "admin"],
      ["document-signing", "/staff/documents", "staff"], ["content-news", "/staff/content/write?type=news", "staff"],
      ["hr-range", "/staff/hr", "staff"],
      ["admin-hr", "/admin/hr", "admin"], ["admin-user", "/admin/users", "admin"],
      ["cms-news", "/admin/cms/news", "admin"], ["cms-resource", "/admin/cms/resources", "admin"], ["cms-team", "/admin/cms/team", "admin"],
    ];
    for (const [label, path, role] of plans.filter(([label]) => !process.argv.includes('--closure-narrow') || ['cms-team', 'hearing-adjourn'].includes(label))) for (const language of ["en", "ne"]) {
      if (results.filter(r => r.label === label && r.language === language).length >= 2) continue;
      console.log("OPEN consumer " + label + " " + language);
      await open(path, 1440, "light", 1, role); await localeChoice(language);
      if (["admin-user", "cms-team"].includes(label)) {
        await page.route("**/api/v1/**", async route => {
          if (route.request().method() === "GET" && ["/api/v1/users", "/api/v1/cms/team"].includes(new URL(route.request().url()).pathname)) return route.fulfill({ json: { data: [{ ...user, _id: user.id, role: "associate", name: "Synthetic date editor", isActive: true, isPublicFacing: true, barCouncilExpiry: "2026-10-20" }] } });
          return route.fallback();
        }); await page.reload({ waitUntil: "commit" }); await page.getByText("Synthetic date editor", { exact: true }).filter({ visible: true }).first().waitFor();
      }
      if (label.startsWith("case-hearing")) { await page.getByRole("tab", { name: "Hearings", exact: true }).click(); await page.getByRole("button", { name: "Schedule hearing", exact: true }).click(); }
      else if (label.startsWith("case-task")) await page.getByRole("tab", { name: "Tasks & SOPs", exact: true }).click();
      else if (label === "case-create-admin") await page.getByRole("button", { name: /new case|create case/i }).first().click();
      else if (label === "task-edit") await page.getByText("Pagination task 1", { exact: true }).first().click();
      else if (label === "hearing-adjourn") { await page.getByRole("button", { name: "Update Result", exact: true }).first().click(); await page.locator("#hearing-update-status").selectOption("adjourned"); }
      else if (label === "appointment-reschedule") { await page.locator(".staff-appointments-row").first().click(); await page.getByRole("button", { name: "Reschedule", exact: true }).filter({ visible: true }).first().click(); }
      else if (label === "admin-reschedule") await page.getByRole("button", { name: "Reschedule", exact: true }).first().click();
      else if (label === "staff-crm") { await page.getByRole("button", { name: "Edit", exact: true }).first().click(); await page.getByRole("button", { name: "Schedule consultation", exact: true }).click(); }
      else if (label === "admin-crm") { await page.getByText("Pagination lead 1", { exact: true }).first().click(); await page.getByRole("button", { name: /Schedule consultation/i }).first().click(); }
      else if (label === "hr-range") await page.getByRole("button", { name: "Request Leave", exact: true }).first().click();
      else if (label === "document-signing") { await page.locator(".staff-docs-name").first().click(); await page.getByRole("button", { name: "Create Envelope", exact: true }).filter({ visible: true }).first().click(); }
      else if (label === "admin-user") await page.getByText("Synthetic date editor", { exact: true }).filter({ visible: true }).first().click();
      else if (label === "cms-news") await page.getByRole("button", { name: "New Item", exact: true }).click();
      else if (label === "cms-resource") await page.getByRole("button", { name: "Upload Resource", exact: true }).click();
      else if (label === "cms-team") { await page.getByRole("button", { name: "Edit", exact: true }).filter({ visible: true }).first().click(); await page.getByRole("button", { name: /Professional/ }).first().click(); }
      const roots = page.locator('[data-slot="bs-date-field"]').filter({ visible: true }); await expect(roots.first()).toBeVisible();
      for (const root of await roots.all()) { const input = root.locator('[data-date-primary]'); if (!await input.getAttribute('readonly') && await input.isEnabled()) await input.fill(language === "ne" ? "२०८३-०७-०३" : "2026-10-20"); }
      for (const width of [360, 1440]) {
        if (results.some(r => r.label === label && r.language === language && r.width === width)) continue;
        await page.setViewportSize({ width, height: 900 }); currentTheme = width === 360 ? "dark" : "light"; capturedTheme = currentTheme; await applyTheme();
        const fields = [];
        for (const root of await roots.all()) {
          const input = root.locator('[data-date-primary]'); await input.scrollIntoViewIfNeeded();
          const m = await root.evaluate(e => {
            const a = e.querySelector('[data-date-primary]'), b = e.querySelector('[data-date-conversion]');
            const fit = n => { const s = getComputedStyle(n), c = document.createElement('canvas').getContext('2d'); c.font = s.fontWeight + " " + s.fontSize + " " + s.fontFamily; return c.measureText(n.value).width <= n.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) + 1; };
            const style = getComputedStyle(e);
            return { id: a.id, available: e.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), clientWidth: e.clientWidth, padding: style.padding, fontSize: style.fontSize, columns: getComputedStyle(e.querySelector('.locale-date-pair')).gridTemplateColumns, sameRow: Math.abs(a.getBoundingClientRect().y - b.getBoundingClientRect().y) <= 1, readable: fit(a) && fit(b), heightDifference: Math.abs(a.getBoundingClientRect().height - b.getBoundingClientRect().height), overflow: e.scrollWidth - e.clientWidth };
          });
          assert.equal(m.sameRow, m.available >= 272, JSON.stringify({ label, width, language, m })); assert(m.readable && m.heightDifference <= 1 && m.overflow <= 1, JSON.stringify({ label, width, m })); fields.push(m);
        }
        assert.equal((await geometry()).overflow, 0, label + " outer overflow");
        if (width === 360) await scan("Same-row consumer " + label + language, '[data-slot="bs-date-field"]');
        await capture("same-row-consumer-" + label + "-" + width + "-" + language);
        pass("Actual consumer date-pair layout", { label, path, language, width, fields });
      }
    }
  }
  async function sameRowForms() {
    const before = process.argv.includes("--same-row-before");
    if (process.argv.includes("--same-row-resume")) {
      const prior = JSON.parse(fs.readFileSync(out + (before ? "/same-row-before-evidence.json" : "/same-row-evidence.json"), "utf8"));
      assert.equal(prior.errors.length, 0); assert(prior.scans.every(s => !s.violations.length)); results.push(...prior.results); scans.push(...prior.scans); writes.push(...prior.writes);
    }
    const forms = [
      ["/staff/cases", "staff", "case", "#case-filing-date-bs", /new case|create case/i],
      ["/staff/hearings", "staff", "hearing", "#hearing-create-date", /add hearing|new hearing/i],
      ["/staff/tasks", "staff", "task", "#create-due-bs", /^(New Task|नयाँ कार्य)$/],
      ["/staff/appointments", "staff", "appointment", "#appointment-date", /^New Appointment$/],
      ["/staff/hr", "staff", "hr", "#staff-hr-from", /^Request Leave$/],
      ["/admin/appointments", "admin", "admin", '[data-date-primary][aria-label^="Appointment date"]', /^Book Appointment$/],
      ["/client/booking", "client", "client-booking", "#client-booking-bs-date", null],
      ["/consultation", "staff", "public", '[data-date-primary][aria-label^="Preferred Date"]', null],
    ];
    for (const [path, role, label, selector, button] of forms) for (const language of ["en", "ne"]) {
      if (results.filter(r => r.label === label && r.language === language).length >= (before ? 6 : 12)) continue;
      await open(label === "public" ? "/staff" : path, 1440, "light", 1, role); await localeChoice(language);
      if (label === "public") { await page.goto(new URL(path, page.url()).href, { waitUntil: "commit" }); await page.locator(selector).waitFor(); }
      if (button) await page.getByRole("button", { name: button }).first().click();
      const input = page.locator(selector).first(), root = input.locator('xpath=ancestor::*[@data-slot="bs-date-field"]');
      await expect.poll(() => input.evaluate(e => Object.keys(e).some(key => key.startsWith("__reactProps$")))).toBe(true);
      await input.fill(language === "ne" ? "२०८३-०७-०३" : "2026-10-20");
      for (const width of [360, 390, 768, 1024, 1280, 1440]) for (const theme of before ? ["light"] : ["light", "dark"]) {
        if (results.some(r => r.label === label && r.language === language && r.width === width && r.theme === theme)) continue;
        await page.setViewportSize({ width, height: 900 }); currentTheme = theme; capturedTheme = theme; await applyTheme();
        await input.scrollIntoViewIfNeeded(); await page.waitForTimeout(80);
        const measure = await root.evaluate(e => {
          const a = e.querySelector('[data-date-primary]'), b = e.querySelector('[data-date-conversion]'), t = e.querySelector('.locale-date-trigger');
          const rect = n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
          const textFits = n => { const s = getComputedStyle(n), c = document.createElement('canvas').getContext('2d'); c.font = s.fontWeight + " " + s.fontSize + " " + s.fontFamily; return { text: c.measureText(n.value).width, space: n.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight), font: s.fontSize }; };
          return { available: e.clientWidth, primary: rect(a), conversion: rect(b), trigger: rect(t), primaryText: textFits(a), conversionText: textFits(b), columns: getComputedStyle(e.querySelector('.locale-date-pair') || e).gridTemplateColumns, sameRow: Math.abs(a.getBoundingClientRect().y - b.getBoundingClientRect().y) <= 1, rootOverflow: e.scrollWidth - e.clientWidth, primaryLabels: a.labels?.length || 0, conversionLabels: b.labels?.length || 0 };
        });
        if (!before) {
          const suitable = measure.available >= 272;
          assert.equal(measure.sameRow, suitable, JSON.stringify({ label, width, theme, language, measure }));
          assert(measure.primaryText.text <= measure.primaryText.space + 1 && measure.conversionText.text <= measure.conversionText.space + 1, JSON.stringify(measure));
          assert.equal(Math.round(measure.primary.height), Math.round(measure.conversion.height));
          assert(measure.primaryLabels && measure.conversionLabels); assert(measure.rootOverflow <= 1);
          assert(measure.trigger.width >= 44 && measure.trigger.height >= 44); assert.equal((await geometry()).overflow, 0);
          await expect(root.locator('[data-date-conversion]')).toHaveValue(language === "en" ? "2083-07-03" : "2026-10-20");
          if ([390, 1440].includes(width) && theme === (width === 390 ? "dark" : "light")) {
            await root.locator('.locale-date-trigger').click(); const popup = page.locator('[data-calendar-popover]'); await expect(popup).toBeVisible();
            const r = await popup.boundingBox(); assert(r.x >= 0 && r.x + r.width <= width + 1); assert(r.y >= 0 && r.y + r.height <= 901);
            await popup.locator('[data-date="2026-10-20"]').click(); await expect(root).toHaveAttribute('data-ad-date', '2026-10-20');
            await root.locator('.locale-date-trigger').focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await expect(root.locator('.locale-date-trigger')).toBeFocused();
            await scan('Same-row ' + label + width + theme + language, '[data-slot="bs-date-field"]');
          }
        }
        if ([390, 1440].includes(width) && (before || theme === (width === 390 ? "dark" : "light"))) await capture('same-row-' + (before ? 'before-' : 'after-') + label + '-' + width + '-' + theme + '-' + language);
        pass(before ? 'Before stacked date-pair measurement' : 'Actual same-row form / readable values / matched height / picker / containment', { label, language, width, theme, measure });
      }
    }
  }
  async function localeForms() {
    if (process.argv.includes("--locale-resume")) {
      const prior = JSON.parse(fs.readFileSync(out + "/locale-forms-evidence.json", "utf8"));
      assert.equal(prior.errors.length, 0); assert(prior.scans.every(scan => !scan.violations.length));
      results.push(...prior.results); scans.push(...prior.scans); writes.push(...prior.writes);
    }
    const forms = [
      ["/staff/cases", "staff", "case", "#case-filing-date-bs", /new case|create case/i],
      ["/staff/hearings", "staff", "hearing", "#hearing-create-date", /add hearing|new hearing/i],
      ["/staff/tasks", "staff", "task", "#create-due-bs", /^(New Task|नयाँ कार्य)$/],
      ["/staff/appointments", "staff", "appointment", "#appointment-date", /^New Appointment$/],
      ["/staff/hr", "staff", "hr", "#staff-hr-from", /^Request Leave$/],
      ["/admin/appointments", "admin", "admin", '[data-date-primary][aria-label^="Appointment date"]', /^Book Appointment$/],
      ["/client/booking", "client", "client-booking", "#client-booking-bs-date", null],
      ["/consultation", "staff", "public", '[data-date-primary][aria-label^="Preferred Date"]', null],
    ];
    for (const [path, role, label, selector, button] of forms.filter(([, , label]) => !process.argv.includes("--same-row-commands") || ["task", "hearing"].includes(label))) for (const language of ["en", "ne"]) {
      const completed = results.filter(r => r.label === label && r.language === language);
      if (completed.length >= (["hearing", "task"].includes(label) ? 2 : 1)) continue;
      await open(label === "public" ? "/staff" : path, language === "en" ? 1440 : 390, language === "en" ? "light" : "dark", 1, role);
      await localeChoice(language);
      if (label === "public") { await page.goto(new URL(path, page.url()).href, { waitUntil: "commit" }); await page.locator(selector).waitFor(); await applyTheme(); }
      if (button) await page.getByRole("button", { name: button }).first().click();
      await localePicker(selector, language, label);
      if (label === "hearing" || label === "task") {
        const requests = [], api = label === "hearing" ? "/api/v1/hearings" : "/api/v1/tasks";
        await page.route("**" + api, async route => {
          if (route.request().method() !== "POST") return route.fallback();
          const payload = route.request().postDataJSON(); requests.push(payload);
          writes.push({ path: api, method: "POST", intercepted: true, dateFixture: true, payload });
          await route.fulfill({ json: { data: { id: "synthetic-locale-date", ...payload } } });
        });
        if (label === "hearing") {
          await page.locator("#hearing-create-case").selectOption(caseId); await page.locator("#hearing-create-time").fill("10:30");
          await page.getByRole("button", { name: "Schedule Hearing", exact: true }).click();
        } else {
          await page.locator("#create-task-title").fill("Synthetic locale task"); await page.getByRole("button", { name: "Create Task", exact: true }).click();
        }
        await expect.poll(() => requests.length).toBe(1);
        assert.equal(requests[0][label === "hearing" ? "dateGregorian" : "dueDate"], "2026-10-20");
        assert.match(requests[0][label === "hearing" ? "dateBs" : "dueDateBs"], /3.*2083/);
        pass("Actual locale form / unchanged A.D. payload / intercepted write", { label, language });
      }
    }
    await open("/client/booking", 390, "light", 1, "client");
    await page.locator("#client-booking-bs-date").fill("2026-10-21"); await localeChoice("ne");
    await expect(page.locator("#client-booking-bs-date")).toHaveValue("२०८३-०७-०४");
    await localeChoice("en"); await expect(page.locator("#client-booking-bs-date")).toHaveValue("2026-10-21");
    pass("Actual global language switch preserves the selected real date both directions");
  }
  async function localeCalendars() {
    if (process.argv.includes("--locale-resume")) {
      const prior = JSON.parse(fs.readFileSync(out + "/locale-calendars-evidence.json", "utf8"));
      assert.equal(prior.errors.length, 0); assert(prior.scans.every(scan => !scan.violations.length));
      results.push(...prior.results); scans.push(...prior.scans); writes.push(...prior.writes);
    }
    if (!process.argv.includes("--locale-admin-only")) for (const width of [360, 390, 768, 1024, 1280, 1440]) for (const theme of ["light", "dark"]) for (const module of ["hearings", "tasks", "appointments"]) {
      if (results.filter(r => r.module === module && r.width === width && r.theme === theme).length >= 2) continue;
      await open("/staff/" + module, width, theme, 1);
      if (module !== "appointments") await page.getByRole("button", { name: module === "hearings" ? "Calendar Grid" : "Calendar", exact: true }).click();
      else {
        const mobile = page.getByRole("button", { name: "Calendar", exact: true });
        if (await mobile.isVisible()) await mobile.click();
        await page.getByRole("button", { name: "Month", exact: true }).click();
      }
      const root = page.locator(module === "hearings" ? ".staff-hearings-calendar-section" : module === "tasks" ? ".staff-task-calendar" : ".staff-appointments-calendar");
      const numberSelector = module === "hearings" ? ".staff-hearings-day-number" : module === "tasks" ? ".text-xs.font-bold" : ".staff-appointments-date-number";
      for (const language of ["en", "ne"]) {
        await localeChoice(language);
        await expect(root).toContainText(language === "ne" ? "कार्तिक २०८३ वि.सं." : "October 2026");
        const cell = root.locator('[data-date="2026-10-20"]');
        assert.equal(await cell.locator(numberSelector).first().evaluate(e => e.firstChild.textContent.trim()), language === "ne" ? "३" : "20");
        await expect(cell).not.toContainText(/A\.D\.|B\.S\.|वि\.सं\./);
        if (module === "appointments") await expect(cell).toHaveAttribute("aria-label", /1 appointments/);
        else await expect(cell.locator("button")).toHaveCount(1);
        assert.equal((await geometry()).overflow, 0); assert.equal((await geometry()).bodyRange, 0);
        if ([390, 1440].includes(width)) await scan("Locale " + module + " " + width + " " + theme + " " + language, module === "hearings" ? ".staff-hearings-calendar" : module === "tasks" ? ".staff-task-calendar" : ".staff-appointments-date-grid");
        if ((width === 1440 && theme === "light") || (width === 390 && theme === "dark")) {
          await root.scrollIntoViewIfNeeded(); await capture("locale-" + module + "-month-" + width + "-" + theme + "-" + language);
        }
        pass("Locale month / one date per cell / same event key/count / scroll containment", { module, width, theme, language });
      }
    }
    for (let i = results.length - 1; i >= 0; i--) if (results[i].check === "Admin locale calendar / preserved event date") results.splice(i, 1);
    for (const width of [360, 390, 768, 1024, 1280, 1440]) for (const theme of ["light", "dark"]) {
      await open("/admin/appointments", width, theme, 1, "admin");
      await page.getByRole("button", { name: "Calendar", exact: true }).click();
      for (const language of ["en", "ne"]) {
      await localeChoice(language);
      const cell = page.locator('[data-date="2026-10-20"]');
      await expect(cell).toContainText(language === "ne" ? "३" : "20");
      await expect(cell).not.toContainText(/A\.D\.|B\.S\.|वि\.सं\./);
      assert.equal((await geometry()).overflow, 0);
      if ([390, 1440].includes(width)) await scan("Admin month " + width + theme + language, ".grid-cols-7.bg-background");
      if ((width === 390 && theme === "dark") || (width === 1440 && theme === "light")) await capture("locale-admin-month-" + width + "-" + theme + "-" + language);
      pass("Admin locale calendar / preserved event date", { width, theme, language });
      }
    }
  }
  async function localeExtra() {
    if (process.argv.includes("--locale-resume")) {
      const prior = JSON.parse(fs.readFileSync(out + "/locale-extra-evidence.json", "utf8"));
      assert.equal(prior.errors.length, 0); assert(prior.scans.every(scan => !scan.violations.length));
      results.push(...prior.results); scans.push(...prior.scans); writes.push(...prior.writes);
    }
    for (const language of ["en", "ne"]) {
      if (results.some(r => r.check === "Independent new-year fixtures / year selectors / Tab / outside close" && r.language === language)) continue;
      await open("/staff/cases", 390, "dark", 1); await localeChoice(language);
      await page.getByRole("button", { name: /new case|create case/i }).first().click();
      const input = page.locator("#case-filing-date-bs"), root = input.locator('xpath=ancestor::*[@data-slot="bs-date-field"]');
      await root.locator(".locale-date-trigger").click(); const popup = page.locator("[data-calendar-popover]");
      await popup.locator("select").nth(1).selectOption(language === "en" ? "2025" : "2082");
      await popup.locator("select").first().selectOption(language === "en" ? "4" : "1");
      await popup.locator('[data-date="2025-04-14"]').click();
      await expect(input).toHaveValue(language === "en" ? "2025-04-14" : "२०८२-०१-०१");
      await expect(root.locator("[data-date-conversion]")).toHaveValue(language === "en" ? "2082-01-01" : "2025-04-14");
      await root.locator(".locale-date-trigger").click();
      await popup.locator("select").nth(1).selectOption(language === "en" ? "2026" : "2082");
      await popup.locator("select").first().selectOption("12");
      await popup.getByRole("button", { name: language === "en" ? "Next month" : "अर्को महिना", exact: true }).click();
      await expect(popup.locator("strong")).toHaveText(language === "en" ? "January 2027" : "बैशाख २०८३ वि.सं.");
      await popup.locator("select").nth(1).selectOption(language === "en" ? "2027" : "2083");
      await popup.locator("select").first().selectOption(language === "en" ? "1" : "10");
      await popup.locator('[data-date="2027-01-15"]').click();
      await expect(root).toHaveAttribute("data-ad-date", "2027-01-15");
      await expect(root.locator("[data-date-conversion]")).toHaveValue(language === "en" ? "2083-10-01" : "2027-01-15");
      await root.locator(".locale-date-trigger").click(); await page.keyboard.press("Tab");
      await expect(popup).toHaveCount(0); await expect(input).toBeVisible();
      await root.locator(".locale-date-trigger").click();
      await page.getByRole("heading", { name: "Create New Case", exact: true }).click();
      await expect(popup).toHaveCount(0); await expect(input).toBeVisible();
      await capture("locale-boundaries-" + language + "-390-dark");
      pass("Independent new-year fixtures / year selectors / Tab / outside close", { language });
    }
    for (const width of [360, 390, 768, 1024, 1280, 1440]) for (const theme of ["light", "dark"]) {
      if (results.filter(r => r.check === "Populated appointment card / details / long text / no overlap" && r.width === width && r.theme === theme).length === 2) continue;
      await open("/staff/appointments", width, theme, 1);
      await page.route("**/api/v1/appointments**", async route => {
        if (route.request().method() !== "GET" || new URL(route.request().url()).pathname !== "/api/v1/appointments") return route.fallback();
        const record = { id: "74000000-0000-4000-8000-000000000001", _id: "74000000-0000-4000-8000-000000000001", clientName: "Synthetic extended client consultation name", clientPhone: "9800000000", clientEmail: "synthetic@example.invalid", date: "2026-10-20", timeSlot: "10:00 AM", practiceArea: "Property, inheritance and cross-border corporate consultation", status: "confirmed", assignedLawyerId: id, createdAt: stamp, updatedAt: stamp };
        await route.fulfill({ json: { data: [record] } });
      });
      await page.reload({ waitUntil: "commit" }); await page.locator(".staff-appointments-row").first().waitFor(); await applyTheme();
      for (const language of ["en", "ne"]) {
        await localeChoice(language);
        const row = page.locator(".staff-appointments-row").first(); await expect(row).toBeVisible();
        const date = row.locator(".staff-appointments-row-copy > small");
        await expect(date).toContainText(language === "en" ? "20 Oct 2026 A.D." : "३ कार्तिक २०८३ वि.सं.");
        const rects = await row.evaluate(e => Array.from(e.children).filter(c => c.getBoundingClientRect().width > 0).map(c => ({ left: c.getBoundingClientRect().left, right: c.getBoundingClientRect().right, top: c.getBoundingClientRect().top, bottom: c.getBoundingClientRect().bottom, overflow: c.scrollWidth - c.clientWidth })));
        assert(rects.every(r => r.overflow <= 1));
        assert(rects.every((r, i) => rects.slice(i + 1).every(other => Math.min(r.right, other.right) <= Math.max(r.left, other.left) + 1 || Math.min(r.bottom, other.bottom) <= Math.max(r.top, other.top) + 1)));
        await row.click(); await expect(page.locator(".staff-appointments-details-body").filter({ visible: true }).first()).toContainText(language === "en" ? "20 Oct 2026 A.D." : "३ कार्तिक २०८३ वि.सं.");
        assert.equal((await geometry()).overflow, 0);
        if ([390, 1440].includes(width)) {
          await scan("Appointment selected date " + width + theme + language, ".staff-appointments-facts");
          await capture("locale-appointment-details-" + width + "-" + theme + "-" + language);
        }
        const dialog = page.getByRole("dialog").filter({ visible: true }); if (await dialog.count()) await page.keyboard.press("Escape");
        pass("Populated appointment card / details / long text / no overlap", { width, theme, language });
      }
    }
  }
  async function localeAdminActions() {
    for (const language of ["en", "ne"]) {
      await open("/admin/appointments", 390, "dark", 1, "admin"); await localeChoice(language);
      await page.getByRole("button", { name: "Calendar", exact: true }).click();
      let cell = page.locator('[data-date="2026-10-20"]');
      const day = cell.getByRole("button").first(); await day.focus(); await page.keyboard.press("Enter");
      await expect(page.locator('[data-slot="bs-date-field"][data-ad-date="2026-10-20"]')).toHaveCount(2);
      await page.getByRole("button", { name: "Calendar", exact: true }).click();
      cell = page.locator('[data-date="2026-10-20"]');
      await cell.getByRole("button", { name: "Book on 2026-10-20", exact: true }).focus(); await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: "Book New Appointment", exact: true }); await expect(dialog).toBeVisible();
      await expect(dialog.locator('[data-slot="bs-date-field"]')).toHaveAttribute("data-ad-date", "2026-10-20");
      await scan("Admin booking date keyboard " + language, '[aria-labelledby="admin-book-appointment-title"] [data-slot="bs-date-field"]');
      await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);
      pass("Admin calendar sibling day/book keyboard actions preserve civil date", { language });
    }
  }
  async function localeRetention() {
    for (const [language, width, theme] of [["en", 1440, "light"], ["ne", 390, "dark"], ["en", 360, "dark"], ["ne", 360, "dark"]].filter(([language, width]) => !process.argv.includes('--closure-retention') || (language === 'en' && width === 1440) || (language === 'ne' && width === 360))) {
      await open("/staff/documents", width, theme, 1); await localeChoice(language);
      let policy = "Original policy", attempts = 0;
      const recorded = "2026-10-19T19:10:00.000Z";
      const doc = () => ({ id: "doc-1", _id: "doc-1", title: "Synthetic retention document.pdf", fileName: "Synthetic retention document.pdf", type: "other", category: "other", size: 1024, _creationTime: Date.parse(stamp), fileSize: 1024, mimeType: "application/pdf", uploadedBy: id, caseId, retentionPolicy: policy, retentionUntil: recorded, createdAt: stamp, updatedAt: stamp, uploadStatus: "clean" });
      await page.route("**/api/v1/documents**", async route => {
        const path = new URL(route.request().url()).pathname, method = route.request().method();
        if (method === "GET" && ["/api/v1/documents", "/api/v1/documents/recent", "/api/v1/documents/search"].includes(path)) return route.fulfill({ json: { data: [doc()] } });
        if (method === "PATCH" && path === "/api/v1/documents/doc-1") {
          const payload = route.request().postDataJSON(); attempts++;
          assert.deepEqual(Object.keys(payload), ["retentionPolicy"]);
          writes.push({ path, method, intercepted: true, dateFixture: true, payload });
          if (attempts === 1) return route.fulfill({ status: 403, json: { error: { code: "FORBIDDEN", message: "Synthetic permission denial" } } });
          policy = payload.retentionPolicy; return route.fulfill({ json: { data: doc() } });
        }
        return route.fallback();
      });
      await page.reload({ waitUntil: "commit" }); await page.getByText("Synthetic retention document.pdf", { exact: true }).first().waitFor(); await applyTheme();
      await page.getByText("Synthetic retention document.pdf", { exact: true }).first().click();
      await page.getByRole("button", { name: "Retention", exact: true }).first().click();
      const dialog = page.getByRole("dialog", { name: "Document retention", exact: true }); await expect(dialog).toBeVisible();
      await expect(page.getByRole("dialog").filter({ visible: true })).toHaveCount(1);
      await expect(dialog.locator("#staff-docs-retention-date")).toHaveAttribute("readonly", "");
      await expect(dialog.locator("#staff-docs-retention-date")).toHaveValue(language === "en" ? "2026-10-20" : "२०८३-०७-०३");
      await expect(dialog.locator("[data-date-conversion]")).toHaveValue(language === "en" ? "2083-07-03" : "2026-10-20");
      await expect(dialog.locator(".locale-date-trigger")).toBeDisabled();
      const layout = await dialog.locator('[data-slot="bs-date-field"]').evaluate(e => {
        const a = e.querySelector('[data-date-primary]').getBoundingClientRect(), b = e.querySelector('[data-date-conversion]').getBoundingClientRect();
        return { available: e.clientWidth, sameRow: Math.abs(a.y - b.y) <= 1, primaryHeight: a.height, conversionHeight: b.height };
      });
      assert.equal(layout.sameRow, layout.available >= 272); assert.equal(layout.primaryHeight, layout.conversionHeight);
      await dialog.locator("#staff-docs-retention-policy").fill("Reviewed policy");
      await dialog.getByRole("button", { name: "Save policy", exact: true }).click();
      await expect(dialog.getByRole("alert")).toBeVisible(); await expect(dialog.locator("#staff-docs-retention-policy")).toHaveValue("Reviewed policy");
      await scan("Read-only retention date / policy error " + language, '[aria-labelledby="staff-docs-retention-title"]');
      await capture("locale-retention-" + language + "-" + width + "-" + theme);
      await dialog.getByRole("button", { name: "Save policy", exact: true }).click(); await expect(dialog).toHaveCount(0);
      assert.equal(attempts, 2); assert.equal(recorded, doc().retentionUntil); assert.equal((await geometry()).overflow, 0);
      pass("Owner-authorized retention read-only date / policy-only payload / denial / retry", { language, width, theme, layout });
    }
  }
  async function appointmentResponsive() {
    for (const [width, theme] of [[360, "dark"], [390, "light"]]) {
      await open("/staff/appointments", width, theme, 1);
      await page.getByRole("button", { name: "Calendar", exact: true }).click();
      await page.getByRole("button", { name: "Month", exact: true }).click();
      const grid = page.locator(".staff-appointments-date-grid");
      await grid.scrollIntoViewIfNeeded();
      assert.equal((await geometry()).overflow, 0);
      assert(await grid.locator("button").evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth + 1)));
      await scan("Mobile B.S./A.D. date grid " + width, ".staff-appointments-date-grid");
      await capture("final-staff-appointment-month-" + width + "-" + theme);
      pass("Mobile month date hierarchy / unclipped cells / no horizontal overflow", { width, theme });
    }
  }
  try {
    if (process.argv.includes('--closure-case') || process.argv.includes('--closure-case-before')) await closureCase();
    else if (process.argv.includes('--closure-public')) await closurePublic();
    else if (process.argv.includes("--same-row-shell")) await sameRowShell();
    else if (process.argv.includes("--same-row-zoom")) await sameRowZoom();
    else if (process.argv.includes("--same-row-consumers") || process.argv.includes('--closure-narrow')) await sameRowConsumers();
    else if (process.argv.includes("--same-row") || process.argv.includes("--same-row-before")) await sameRowForms();
    else if (process.argv.includes("--locale-forms") || process.argv.includes("--same-row-commands")) await localeForms();
    else if (process.argv.includes("--locale-calendars")) await localeCalendars();
    else if (process.argv.includes("--locale-extra")) await localeExtra();
    else if (process.argv.includes("--locale-retention") || process.argv.includes('--closure-retention')) await localeRetention();
    else if (process.argv.includes("--locale-admin-actions")) await localeAdminActions();
    else if (process.argv.includes("--appointment-responsive")) await appointmentResponsive();
    else if (process.argv.includes("--date-consistency")) await dateConsistency();
    else if (process.argv.includes("--client-locale")) await clientLocale();
    else if (process.argv.includes("--public-dates")) await publicDates();
    else if (process.argv.includes("--captures")) await finalCaptures();
    else if (process.argv.includes("--timezones")) await timezones();
    else if (process.argv.includes("--extra")) await extra();
    else if (process.argv.includes("--forms")) { await forms(); await calendars(); }
    else await routes();
  } finally {
    fs.writeFileSync(out + (process.argv.includes("--appointment-responsive") ? "/appointment-responsive-evidence.json" : process.argv.includes("--date-consistency") ? "/date-consistency-evidence.json" : process.argv.includes("--client-locale") ? "/client-locale-evidence.json" : process.argv.includes("--public-dates") ? "/public-dates-evidence.json" : process.argv.includes("--captures") ? "/final-captures-evidence.json" : process.argv.includes("--timezones") ? "/timezone-evidence.json" : process.argv.includes("--extra") ? "/extra-evidence.json" : process.argv.includes("--forms") ? "/forms-evidence.json" : process.argv.includes("--locale-forms") ? "/locale-forms-evidence.json" : process.argv.includes("--locale-admin-only") ? "/locale-admin-evidence.json" : process.argv.includes("--locale-calendars") ? "/locale-calendars-evidence.json" : process.argv.includes("--locale-extra") ? "/locale-extra-evidence.json" : process.argv.includes("--locale-retention") ? "/locale-retention-evidence.json" : process.argv.includes("--locale-admin-actions") ? "/locale-admin-actions-evidence.json" : process.argv.includes("--same-row-before") ? "/same-row-before-evidence.json" : process.argv.includes("--same-row") ? "/same-row-evidence.json" : process.argv.includes("--same-row-consumers") ? "/same-row-consumers-evidence.json" : process.argv.includes("--same-row-zoom") ? "/same-row-zoom-evidence.json" : process.argv.includes("--same-row-commands") ? "/same-row-commands-evidence.json" : process.argv.includes("--same-row-shell") ? "/same-row-shell-evidence.json" : process.argv.includes("--closure-case-before") ? "/closure-case-before-evidence.json" : process.argv.includes("--closure-case") ? "/closure-case-evidence.json" : process.argv.includes("--closure-public") ? "/closure-public-evidence.json" : process.argv.includes("--closure-narrow") ? "/closure-narrow-evidence.json" : process.argv.includes("--closure-retention") ? "/closure-retention-evidence.json" : "/routes-evidence.json"), JSON.stringify({ results, scans, errors, writes, liveMutations: 0 }, null, 2));
    await browser.close();
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert(writes.every(w => w.intercepted && (w.dateFixture || /\/(?:messages|threads\/[^/]+)\/read$/.test(w.path))), "Unexpected mutation");
  assert(scans.every(s => !s.violations.length), JSON.stringify(scans.filter(s => s.violations.length)));
  console.log(JSON.stringify({ checks: results.length, scans: scans.length, exceptions: errors.length, writes: writes.length, liveMutations: 0 }));
}
await dateAudit();
`;
const worker = out + "/date-worker.mjs";
fs.writeFileSync(worker, shared.slice(0, boundary).replace('const out = ".local/qa/session-17a";', `const out = "${out}";`).replace('timezoneId: "Asia/Kathmandu"', 'timezoneId: process.env.DATE_QA_TIMEZONE || "Asia/Kathmandu"') + fixtures + checks);
process.exitCode = spawnSync(process.execPath, [worker, ...process.argv.slice(2)], { stdio: "inherit" }).status ?? 1;
