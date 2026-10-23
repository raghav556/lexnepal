import fs from "node:fs";
import { spawnSync } from "node:child_process";

// Reuse the existing authenticated fixture/interception harness; no parallel app.
async function paginationAudit() {
  const before = process.argv.includes("--before");
  const caseId = "72000000-0000-4000-8000-000000000001";
  const clientId = baseUser.firmId;
  let count = 53;
  let emptySecondary = "";
  let readFailure = "",
    readDelay = 0;
  let capturedTheme = "light";
  let historicalAttendance = false,
    hrCurrent = null,
    allowHrCommands = false;
  let auditCount = null,
    auditGate = null;
  const rows = (prefix, make, size = count) =>
    Array.from({ length: size }, (_, i) => ({
      id: `${prefix}-${i + 1}`,
      _id: `${prefix}-${i + 1}`,
      createdAt: stamp,
      updatedAt: stamp,
      ...make(i),
    })).map((row) => ({ ...row, id: row._id }));
  const civil = (offset) =>
    new Date(Date.parse(stamp) + offset * 86400000).toISOString().slice(0, 10);
  async function open(
    path,
    width = process.argv.includes("--mobile-collections") ? 360 : 1440,
    theme = process.argv.includes("--mobile-collections") ? "dark" : "light",
    size = 53,
    role = "staff",
  ) {
    count = size;
    capturedTheme = theme;
    await setup(role, width, theme);
    await page.clock.setFixedTime(new Date(stamp));
    await page.route("**/api/v1/**", async (r) => {
      const req = r.request(),
        u = new URL(req.url()),
        p = u.pathname;
      if (req.method() !== "GET") {
        const expectedHrFixture =
          allowHrCommands && p === "/api/v1/hr/attendance" && req.method() === "POST";
        writes.push({
          path: p,
          method: req.method(),
          intercepted: true,
          expectedHrFixture,
        });
        if (expectedHrFixture) {
          hrCurrent = {
            id: "clock-today",
            _id: "clock-today",
            createdAt: stamp,
            updatedAt: stamp,
            ...hrCurrent,
            ...req.postDataJSON(),
          };
          return r.fulfill({ json: { data: hrCurrent } });
        }
        return r.fulfill({ json: { data: {} } });
      }
      if (readDelay && p === "/api/v1/appointments")
        await new Promise((resolve) => setTimeout(resolve, readDelay));
      if (readFailure && p === readFailure)
        return r.fulfill({
          status: 403,
          json: {
            error: {
              code: "FORBIDDEN",
              message: "Synthetic pagination permission denial",
            },
          },
        });
      if (p === "/api/v1/users/me/audit-events" && auditCount !== null) {
        if (auditGate) await auditGate;
        const entries = Array.from({ length: auditCount }, (_, i) => ({
          id: `capped-audit-${i + 1}`,
          action: `profile.updated_${i + 1}`,
          createdAt: new Date(Date.parse(stamp) - i * 1000).toISOString(),
          ...(role === "client"
            ? {}
            : {
                details: "PRIVATE_SYNTHETIC_AUDIT_DETAILS",
                ipAddress: "192.0.2.123",
              }),
        }));
        return r.fulfill({ json: { data: entries } });
      }
      if (emptySecondary && p === emptySecondary) return r.fulfill({ json: { data: [] } });
      let data;
      if (p === "/api/v1/auth/session")
        data = {
          capabilities:
            role === "client"
              ? []
              : [
                  "cases.view_all",
                  "cases.manage",
                  "tasks.manage",
                  "clients.view_all",
                  "clients.manage",
                  "users.view_directory",
                  "kyc.review",
                ],
        };
      else if (p === "/api/v1/cases" || p.startsWith("/api/v1/cases/")) {
        const matters = rows("matter", (i) => ({
          _id: i === 0 ? caseId : `72000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
          title: `Pagination matter ${String(i + 1).padStart(3, "0")}`,
          caseNumber: `P-${i + 1}`,
          status: "active",
          practiceArea: "Civil Litigation",
          assignedLawyerId: id,
          clientId,
          filingDate: "2026-10-01",
          teamMemberIds: rows("peer", (j) => ({ value: `peer-${j + 1}` })).map((r) => r.value),
          parties: rows("party", (j) => ({
            name: `Synthetic party ${j + 1}`,
            side: "our_side",
            partyType: "person",
            sortOrder: j,
          })),
          description: "Synthetic matter.",
        }));
        data = p === "/api/v1/cases" ? matters : matters[0];
      } else if (p === "/api/v1/clients")
        data = rows("client", (i) => ({
          _id: i === 0 ? clientId : `client-${i + 1}`,
          fullName: `Pagination client ${i + 1}`,
          type: "individual",
          isActive: true,
          kycStatus: "submitted",
          email: `client-${i + 1}@example.invalid`,
        }));
      else if (p === "/api/v1/tasks")
        data = rows("task", (i) => ({
          title: `Pagination task ${i + 1}`,
          status: "todo",
          priority: "medium",
          assignedTo: id,
          caseId,
          hearingId: "hearing-1",
          dueDate: civil(0),
          parentTaskId: u.searchParams.get("parentTaskId"),
        }));
      else if (p.endsWith("/comments"))
        data = rows("comment", (i) => ({
          content: `Pagination comment ${i + 1}`,
          authorId: id,
          authorName: "Synthetic reviewer",
        }));
      else if (p === "/api/v1/tasks/workload")
        data = rows("workload", (i) => ({
          assignedTo: `peer-${i + 1}`,
          total: 1,
          urgent: 0,
          overdue: 0,
        }));
      else if (p === "/api/v1/sop-templates")
        data = rows("sop", (i) => ({
          label: `Synthetic SOP ${i + 1}`,
          practiceArea: "Civil Litigation",
          taskTitles: ["Synthetic action"],
        }));
      else if (p === "/api/v1/hearings")
        data = [
          ...rows("hearing", (i) => ({
            caseId,
            dateGregorian: civil(0),
            dateBs: "2 Kartik 2083",
            time: "10:00",
            court: "Supreme Court",
            purpose: `Pagination hearing ${i + 1}`,
            status: "scheduled",
          })),
          ...rows("past", (i) => ({
            caseId,
            dateGregorian: civil(-i - 1),
            dateBs: "1 Kartik 2083",
            time: "10:00",
            court: "Supreme Court",
            purpose: `Pagination past ${i + 1}`,
            status: "completed",
            outcome: `Synthetic outcome ${i + 1}`,
          })),
        ];
      else if (p === "/api/v1/research")
        data = rows("note", (i) => ({
          title: `Pagination research ${i + 1}`,
          category: "procedure",
          tags: [],
          content: "Synthetic unsaved reading content.\n".repeat(30),
          createdBy: id,
        }));
      else if (p === "/api/v1/appointments")
        data = rows("appointment", (i) => ({
          clientName: `Pagination appointment ${i + 1}`,
          clientId,
          date: civil(u.searchParams.has("leadId") || u.searchParams.has("clientId") ? i : 0),
          timeSlot: "10:00 AM",
          status: "confirmed",
          assignedLawyerId: id,
          practiceArea: "Civil Litigation",
        }));
      else if (p.endsWith("/appointments/slots")) data = ["10:00 AM", "11:00 AM"];
      else if (p === "/api/v1/leads")
        data = rows("lead", (i) => ({
          fullName: `Pagination lead ${i + 1}`,
          assignedTo: id,
          status: "new",
          source: "website",
          practiceArea: "Civil Litigation",
        })).filter(
          (r) =>
            !u.searchParams.get("q") ||
            r.fullName.toLowerCase().includes(u.searchParams.get("q").toLowerCase()),
        );
      else if (
        p === "/api/v1/documents" ||
        p === "/api/v1/documents/search" ||
        p === "/api/v1/documents/recent"
      )
        data = rows(
          "doc",
          (i) => ({
            title: `Pagination document ${i + 1}.pdf`,
            fileName: `document-${i + 1}.pdf`,
            caseId,
            category: "evidence",
            type: "evidence",
            uploadedBy: id,
            mimeType: "application/pdf",
            size: 1000,
            _creationTime: Date.parse(stamp),
          }),
          p.endsWith("/recent") ? Math.min(count, 5) : Math.min(count, 50),
        );
      else if (p.endsWith("/versions"))
        data = rows("version", (i) => ({
          title: `Pagination version ${i + 1}`,
          fileName: `version-${i + 1}.pdf`,
          uploadedBy: id,
          _creationTime: Date.parse(stamp),
          version: count - i,
          mimeType: "application/pdf",
          size: 1000,
        }));
      else if (p.endsWith("/kyc-files"))
        data = rows("kyc", (i) => ({
          docType: "citizenship",
          fileName: `Pagination KYC ${i + 1}`,
          url: "/synthetic-not-downloaded",
        }));
      else if (p.endsWith("/blog-posts") || p.endsWith("/news"))
        data = rows("content", (i) => ({
          title: `Pagination article ${i + 1}`,
          slug: `pagination-${i + 1}`,
          status: "draft",
          category: "General",
          type: "news",
          content: "Synthetic draft.",
          authorId: id,
          submittedBy: id,
        }));
      else if (p === "/api/v1/users/directory")
        data = [
          user,
          ...rows("peer", (i) => ({
            name: `Pagination colleague ${i + 1}`,
            role: "associate",
            email: `peer-${i + 1}@example.invalid`,
          })),
        ];
      else if (p === "/api/v1/dm/threads")
        data = rows("thread", (i) => ({
          peerUserId: `existing-peer-${i + 1}`,
          peerName: `Pagination thread ${i + 1}`,
          unreadCount: 0,
          lastMessage: {
            content: "Synthetic preview",
            senderId: id,
            createdAt: stamp,
          },
        }));
      else if (p === "/api/v1/messages/unread") data = {};
      else if (p === "/api/v1/messages" || /\/dm\/threads\/[^/]+\/messages$/.test(p)) {
        const older = Boolean(u.searchParams.get("cursor")),
          total = Math.min(count, 53);
        const messages = rows(
          "message",
          (i) => ({
            caseId,
            senderId: clientId,
            content: `Pagination message ${i + 1}`,
            createdAt: new Date(Date.parse(stamp) - (total - i) * 60000).toISOString(),
          }),
          total,
        );
        data = {
          page: older ? messages.slice(0, -30) : messages.slice(-30),
          isDone: older || total <= 30,
          continueCursor: older || total <= 30 ? "" : "synthetic-older",
        };
      } else if (p === "/api/v1/hr/attendance")
        data = [
          ...(hrCurrent ? [hrCurrent] : []),
          ...rows(
            "attendance",
            (i) => ({
              userId: id,
              date: civil(-i - (historicalAttendance ? 1 : 0)),
              status: "present",
              clockIn: "09:00 AM",
              clockOut: "05:00 PM",
            }),
            Math.max(0, count - (hrCurrent ? 1 : 0)),
          ),
        ];
      else if (p === "/api/v1/hr/leave-requests")
        data = rows("leave", (i) => ({
          userId: id,
          type: "annual",
          fromDate: civil(i + 1),
          toDate: civil(i + 1),
          reason: "Synthetic leave",
          status: "pending",
        }));
      else if (p === "/api/v1/hr/leave-balances")
        data = [
          {
            id: "annual-balance",
            userId: id,
            year: 2026,
            type: "annual",
            entitledDays: 20,
            usedDays: 3,
            pendingDays: 2,
            remainingDays: 17,
          },
        ];
      else return r.fallback();
      return r.fulfill({ json: { data } });
    });
    await page.goto(origin + path, { waitUntil: "domcontentloaded" });
    await page
      .locator(role === "staff" ? "#staff-main-canvas" : "main")
      .first()
      .waitFor();
    await applyTheme();
    await page.waitForTimeout(350);
  }
  const capture = (name) =>
    shot(
      name
        .replace("1440", String(page.viewportSize().width))
        .replace(/-light$/, `-${capturedTheme}`),
    );
  async function exercise(label) {
    const footer = page.locator(`[data-collection="${label}"]`).first();
    await expect(footer).toBeVisible();
    const rendered = () =>
      footer.evaluate((e) =>
        Array.from(e.parentElement.children)
          .filter((c) => !c.classList.contains("staff-collection-pagination"))
          .map((c) => c.textContent),
      );
    const initial = await rendered();
    await expect(footer.getByRole("button", { name: "Previous page", exact: true })).toBeDisabled();
    await footer.getByRole("button", { name: "Next page", exact: true }).click();
    assert.notDeepEqual(await rendered(), initial, `${label}: records must change`);
    await expect(footer.locator('[aria-current="page"]')).toHaveText("2");
    const last = footer.getByRole("button").filter({ hasText: /^\d+$/ }).last();
    await last.click();
    await expect(footer.getByRole("button", { name: "Next page", exact: true })).toBeDisabled();
    await footer.getByRole("button", { name: "Previous page", exact: true }).click();
    await footer.getByRole("button", { name: "1", exact: true }).click();
    assert.deepEqual(await rendered(), initial, `${label}: first page must restore`);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      0,
      label,
    );
    const bounds = await footer.boundingBox();
    assert(
      bounds.x >= 0 && bounds.x + bounds.width <= page.viewportSize().width + 1,
      `${label}: controls must fit`,
    );
    await footer.getByRole("button", { name: "Next page", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(footer.locator('[aria-current="page"]')).toHaveText("2");
    await footer.getByRole("button", { name: "1", exact: true }).click();
    const scan = await new AxeBuilder({ page })
      .include(`[data-collection="${label}"]`)
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    scans.push({
      label,
      violations: scan.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
    results.push({
      check: "secondary collection / actual records / first-middle-last / keyboard",
      label,
      path: new URL(page.url()).pathname,
    });
  }
  async function incremental(selector) {
    const footer = page.locator(selector).first();
    const label = await footer.getAttribute("data-collection");
    const beforeText = await footer.textContent();
    await footer.getByRole("button", { name: /Show more/ }).click();
    assert.notEqual(await footer.textContent(), beforeText);
    while (await footer.getByRole("button", { name: /Show more/ }).count())
      await footer.getByRole("button", { name: /Show more/ }).click();
    await expect(footer).toContainText("of 53");
    results.push({
      check: "incremental column/directory / all records reachable",
      label,
    });
  }
  async function collections() {
    await open("/staff/hearings");
    await exercise("Upcoming hearings");
    await exercise("Past hearings");
    await exercise("Hearing prep tasks");
    await capture("after-hearings-paged-1440-light");
    await open("/staff/appointments");
    await exercise("Appointment results");
    await open("/staff/appointments?appointment=appointment-51");
    await expect(page.locator("#appointment-appointment-51")).toBeVisible();
    results.push({ check: "deep-linked appointment reveals its result page" });
    await open("/staff/messages");
    await exercise("Matter conversations");
    await page.getByRole("tab", { name: "Case teams", exact: true }).click();
    await exercise("Matter conversations");
    await page.getByRole("tab", { name: "Direct", exact: true }).click();
    await exercise("Direct conversations");
    await incremental('[data-collection="Colleagues"]');
    await open("/staff/tasks");
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await page.getByRole("button", { name: /^View all 53 tasks on/ }).click();
    await exercise("Calendar day tasks");
    await page.getByRole("button", { name: "List", exact: true }).click();
    await page.getByRole("button", { name: "Kanban", exact: true }).click();
    await incremental(".staff-task-board .staff-collection-pagination");
    assert((await page.locator('.staff-task-board [draggable="true"]').count()) > 12);
    await capture("after-tasks-expanded-column-1440-light");
    await open("/staff/cases");
    await page.getByRole("button", { name: /board/i }).click();
    await incremental(".staff-cases-board .staff-collection-pagination");
    await open(`/staff/cases/${caseId}`);
    await exercise("Case team");
    await exercise("Case parties");
    await page.getByRole("tab", { name: /Tasks/ }).click();
    await exercise("Case tasks");
    await exercise("Case SOP templates");
    await page.getByRole("tab", { name: /Hearings/ }).click();
    await exercise("Case hearings");
    await open("/staff/tasks");
    await page.locator(".staff-task-list").getByText("Pagination task 1", { exact: true }).click();
    await exercise("Subtasks");
    await exercise("Task comments");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Workload", exact: true }).click();
    await exercise("Team workload");
    await open("/staff/crm");
    const leadDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV", exact: true }).click();
    await (await leadDownload).saveAs(`${out}/synthetic-leads.csv`);
    assert.equal(
      fs.readFileSync(`${out}/synthetic-leads.csv`, "utf8").trim().split(/\r?\n/).length,
      54,
    );
    results.push({
      check: "CRM export retains full filtered dataset, not the eight-row page",
    });
    await page
      .locator(".staff-crm-row")
      .first()
      .getByRole("button", { name: "View", exact: true })
      .click();
    await exercise("Lead appointments");
    await open("/staff/clients");
    const clientDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV", exact: true }).click();
    await (await clientDownload).saveAs(`${out}/synthetic-clients.csv`);
    assert.equal(
      fs.readFileSync(`${out}/synthetic-clients.csv`, "utf8").trim().split(/\r?\n/).length,
      54,
    );
    results.push({
      check: "Client export retains full filtered dataset, not the ten-row page",
    });
    await page.locator(".staff-clients-person").first().click();
    await page.getByRole("tab", { name: /Matters/ }).click();
    await exercise("Client matters");
    await page.getByRole("tab", { name: /Overview/ }).click();
    await page.getByRole("button", { name: "Review KYC", exact: true }).click();
    await exercise("KYC files");
    await open("/staff/documents");
    const pageSelect = page.getByRole("checkbox", {
      name: /Select all on this page/,
    });
    await pageSelect.check();
    await page.getByRole("button", { name: "Next page", exact: true }).first().click();
    await expect(pageSelect).not.toBeChecked();
    await pageSelect.check();
    await expect(page.locator(".staff-docs-bulk-count")).toContainText("24 selected");
    await page.getByRole("button", { name: "Previous page", exact: true }).first().click();
    await expect(pageSelect).toBeChecked();
    await expect(page.getByText(/Showing a limited set of loaded documents/)).toBeVisible();
    results.push({
      check: "document page identity selection / cross-page bulk scope / real cap warning",
    });
    await page.locator(".staff-docs-name").first().click();
    await exercise("Document versions");
    await capture("after-document-versions-1440-light");
    await hookFixture();
  }
  async function hookFixture() {
    const { build } = await import("esbuild");
    const { resolve } = await import("node:path");
    const entry = `${out}/hook-fixture.tsx`,
      bundle = `${out}/hook-fixture.js`;
    fs.writeFileSync(
      entry,
      `
      import React, {useState} from 'react';import {createRoot} from 'react-dom/client';
      import {usePagination} from '../../../src/hooks/use-pagination';
      import {Pagination} from '../../../src/components/ui/pagination';
      import {StaffPagedCollection} from '../../../src/components/dashboard/staff-paged-collection';
      function Fixture(){const[count,setCount]=useState(53),[filter,setFilter]=useState('all');
      const items=Array.from({length:count},(_,i)=>i+1).filter(i=>filter==='all'||i%2===0);
      const p=usePagination({items,itemsPerPage:8,resetKey:filter});return <main className="dashboard-theme dashboard-staff p-4">
      <div>{[0,1,8,9,53,101].map(n=><button type="button" key={n} onClick={()=>setCount(n)}>Set {n}</button>)}</div>
      <label>Fixture filter<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All</option><option value="even">Even</option></select></label>
      <p data-testid="hook-page">{p.currentPage}</p><div data-testid="hook-records">{p.paginatedItems.join(',')}</div>
      <Pagination ariaLabel="Hook pagination" currentPage={p.currentPage} totalPages={p.totalPages} onPageChange={p.goToPage} onNextPage={p.nextPage} onPrevPage={p.prevPage}/>
      <section><StaffPagedCollection label="Fixture records" resetKey={filter}>{items.map(i=><div data-record key={i}>Long synthetic record label {i}</div>)}</StaffPagedCollection></section>
      </main>};createRoot(document.getElementById('root')!).render(<Fixture/>);`,
    );
    await build({
      entryPoints: [entry],
      outfile: bundle,
      bundle: true,
      platform: "browser",
      jsx: "automatic",
      alias: { "@": resolve("src") },
      define: { "process.env.NODE_ENV": '"test"' },
    });
    const css = await page.evaluate(() =>
      Array.from(document.styleSheets, (s) =>
        Array.from(s.cssRules, (r) => r.cssText).join("\n"),
      ).join("\n"),
    );
    const f = await context.newPage();
    f.on("pageerror", (e) => errors.push({ scope: "actual hook fixture", message: e.message }));
    await f.route("**/*", (r) => r.abort());
    await f.setContent('<html><body><div id="root"></div></body></html>');
    await f.addStyleTag({ content: css });
    await f.addScriptTag({ content: fs.readFileSync(bundle, "utf8") });
    for (const size of [0, 1, 8, 9, 53, 101]) {
      await f.getByRole("button", { name: `Set ${size}`, exact: true }).click();
      await expect(f.locator("[data-record]")).toHaveCount(Math.min(size, 8));
      results.push({ check: "actual shared hook / collection boundary", size });
    }
    const nav = f.getByRole("navigation", { name: "Hook pagination" });
    await f.getByRole("button", { name: "Set 53", exact: true }).click();
    await nav.getByRole("button", { name: "7", exact: true }).click();
    await expect(f.getByTestId("hook-records")).toHaveText("49,50,51,52,53");
    await f.getByRole("button", { name: "Set 9", exact: true }).click();
    await expect(f.getByTestId("hook-page")).toHaveText("2");
    await nav.getByRole("button", { name: "Previous page", exact: true }).click();
    await expect(f.getByTestId("hook-records")).toHaveText("1,2,3,4,5,6,7,8");
    await f.getByRole("button", { name: "Set 53", exact: true }).click();
    await expect(f.getByTestId("hook-page")).toHaveText("1");
    await nav.getByRole("button", { name: "Next page", exact: true }).click();
    await f.getByLabel("Fixture filter").selectOption("even");
    await expect(f.getByTestId("hook-page")).toHaveText("1");
    await expect(f.getByTestId("hook-records")).toHaveText("2,4,6,8,10,12,14,16");
    results.push({
      check:
        "clamp persistence / Previous after shrink / no resurrection / filter-before-slice reset",
    });
    for (const width of [360, 390, 768, 1024, 1280, 1440])
      for (const theme of ["light", "dark"]) {
        await f.setViewportSize({ width, height: 900 });
        await f.evaluate(
          (dark) => document.documentElement.classList.toggle("dark", dark),
          theme === "dark",
        );
        assert.equal(await f.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
        const scan = await new AxeBuilder({ page: f })
          .include(".staff-collection-pagination")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        scans.push({
          scope: "actual shared component fixture",
          width,
          theme,
          violations: scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
        });
        results.push({
          check: "shared collection controls / responsive / contrast",
          width,
          theme,
        });
        if (width === 360 || width === 390 || width === 1440)
          await f.screenshot({
            path: `${out}/collection-controls-${width}-${theme}.png`,
          });
      }
    await f.close();
  }
  async function regressions() {
    for (const path of [
      `/staff/messages?caseId=${caseId}`,
      "/staff/messages?channel=dm&dm=thread-1",
    ]) {
      await open(path);
      const chat = page.locator(".staff-messages-chat"),
        composer = chat.locator("textarea");
      await composer.fill("Unsent pagination regression draft");
      const log = chat.getByRole("log");
      await log.evaluate((e) => {
        e.scrollTop = 0;
      });
      await chat.getByRole("button", { name: "Load earlier messages", exact: true }).click();
      await expect(chat.getByText("Pagination message 1", { exact: true })).toBeAttached();
      await expect(composer).toHaveValue("Unsent pagination regression draft");
      const reading = await log.evaluate((e) => {
        e.scrollTop = 100;
        return e.scrollTop;
      });
      const list = page.getByRole("navigation", {
        name: path.includes("channel=dm")
          ? "Direct conversations pagination"
          : "Matter conversations pagination",
        exact: true,
      });
      await list.getByRole("button", { name: "Next page", exact: true }).click();
      await expect(composer).toHaveValue("Unsent pagination regression draft");
      assert.equal(await log.evaluate((e) => e.scrollTop), reading);
      await expect(page.getByRole("button", { name: "Scroll to top of page" })).toBeHidden();
      results.push({
        check:
          "cursor history / earlier records / composer / reading anchor preserved while paging conversations",
        path,
      });
      await capture(
        `after-message-history-${path.includes("channel=dm") ? "direct" : "matter"}-1440-light`,
      );
    }
    await open("/staff/research", 390, "dark");
    await page.getByRole("button", { name: "New Research Note" }).click();
    const draft = page.locator(".staff-research-canvas"),
      text = "Unsaved pagination draft.\n".repeat(100);
    await draft.fill(text);
    await draft.evaluate((e) => {
      e.scrollTop = 200;
    });
    const reading = await draft.evaluate((e) => e.scrollTop);
    await page
      .locator("#staff-main-canvas")
      .evaluate((e) => e.scrollTo({ top: 100000, behavior: "instant" }));
    const top = page.getByRole("button", { name: "Scroll to top of page" });
    if (await top.isVisible()) await top.click();
    await expect(draft).toHaveValue(text);
    assert.equal(await draft.evaluate((e) => e.scrollTop), reading);
    await capture("after-research-unsaved-390-dark");
    results.push({
      check: "research unsaved editor / independent scroll / page Top",
    });
    page.once("dialog", (d) => d.accept());
    await open("/admin/cases", 1440, "light", 53, "admin");
    await page.getByRole("button", { name: "By status", exact: true }).click();
    await expect(page.locator(".staff-collection-pagination")).toHaveCount(0);
    await expect(page.getByText("Pagination matter 053", { exact: true })).toBeAttached();
    results.push({
      check: "Admin board retains all original cards and opts out of Staff windows",
    });
    await open("/client/cases", 390, "dark", 53, "client");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    await expect(page.locator(".staff-collection-pagination")).toHaveCount(0);
    results.push({ check: "Client scope/layout unchanged; no Staff controls" });
    readDelay = 1200;
    await open("/staff/appointments");
    await expect(page.locator('[data-collection="Appointment results"]')).toHaveCount(0);
    await expect(page.locator('[data-collection="Appointment results"]')).toBeVisible();
    readDelay = 0;
    results.push({
      check: "appointments delayed read resolves to correct paged results",
    });
    readFailure = "/api/v1/appointments";
    await open("/staff/appointments");
    await expect(page.getByRole("button", { name: /Retry/i })).toBeVisible();
    await expect(page.locator('[data-collection="Appointment results"]')).toHaveCount(0);
    readFailure = "";
    await page.getByRole("button", { name: /Retry/i }).click();
    await expect(page.locator('[data-collection="Appointment results"]')).toBeVisible();
    results.push({
      check: "403 error does not fabricate rows/pagination; retry restores results",
    });
  }
  async function existingCollections() {
    for (const [path, prefix, leave] of [
      ["/staff/tasks", "task"],
      ["/staff/cases", "matter"],
      ["/staff/documents", "document"],
      ["/staff/research", "research"],
      ["/staff/crm", "lead"],
      ["/staff/clients", "client"],
      ["/staff/content", "article"],
      ["/staff/content?tab=news", "article"],
      ["/staff/hr", null],
      ["/staff/hr", null, true],
    ]) {
      await open(path);
      if (leave) await page.getByRole("tab", { name: "Leave & Requests", exact: true }).click();
      const nav = page.locator('main [data-slot="pagination"]').first();
      await expect(nav).toBeVisible();
      const content = () =>
        prefix
          ? page
              .locator("main")
              .getByText(new RegExp(`^Pagination ${prefix} \\d`))
              .allTextContents()
          : page
              .locator(leave ? '[data-testid="leave-request-row"]' : "main tbody tr")
              .allTextContents();
      const first = await content();
      assert(first.length > 0);
      await nav.getByRole("button", { name: "Next page", exact: true }).click();
      assert.notDeepEqual(await content(), first, path);
      await expect(nav.locator('[aria-current="page"]')).toHaveText("2");
      await nav.getByRole("button").filter({ hasText: /^\d+$/ }).last().click();
      await expect(nav.getByRole("button", { name: "Next page", exact: true })).toBeDisabled();
      await nav.getByRole("button", { name: "Previous page", exact: true }).click();
      await nav.getByRole("button", { name: "1", exact: true }).click();
      assert.deepEqual(await content(), first);
      if (prefix && !["document", "article"].includes(prefix)) {
        await nav.getByRole("button", { name: "Next page", exact: true }).click();
        const search = page
          .locator("main input")
          .filter({ visible: true })
          .filter({ hasNot: page.locator('[type="checkbox"]') });
        const field = page
          .locator('main input[placeholder*="Search"], main input[placeholder*="search"]')
          .first();
        assert((await search.count()) > 0);
        await field.fill(`Pagination ${prefix} ${prefix === "matter" ? "053" : "53"}`);
        await expect
          .poll(async () =>
            (await nav.count()) ? await nav.locator('[aria-current="page"]').textContent() : "1",
          )
          .toBe("1");
        await field.fill("");
      }
      results.push({
        check: "retained paginator / actual first-middle-last records / existing search reset",
        path,
        view: leave ? "leave" : prefix || "attendance",
      });
    }
  }
  async function finalPresentation() {
    for (const width of [360, 390, 768, 1024, 1280, 1440])
      for (const theme of ["light", "dark"]) {
        await open("/staff/documents", width, theme);
        await page.locator(".staff-docs-name").first().click();
        await exercise("Document versions");
        const footer = page.locator('[data-collection="Document versions"]');
        assert.equal(await footer.evaluate((e) => getComputedStyle(e).display), "block");
        await capture(`final-document-versions-${width}-${theme}`);
      }
    for (const width of [360, 1440])
      for (const theme of ["light", "dark"]) {
        await open("/staff/clients", width, theme);
        await page.locator(".staff-clients-person").first().click();
        await page.getByRole("button", { name: "Review KYC", exact: true }).click();
        await exercise("KYC files");
        assert.equal(
          await page
            .locator('[data-collection="KYC files"]')
            .evaluate((e) => getComputedStyle(e).display),
          "block",
        );
        await capture(`final-client-kyc-${width}-${theme}`);
      }
  }
  async function readStates() {
    const versions = "/api/v1/documents/doc-1/versions",
      kyc = `/api/v1/clients/${clientId}/kyc-files`;
    for (const resource of ["versions", "kyc"]) {
      const path = resource === "versions" ? versions : kyc;
      const enter = async () => {
        await open(resource === "versions" ? "/staff/documents" : "/staff/clients", 390, "dark");
        if (resource === "versions") await page.locator(".staff-docs-name").first().click();
        else {
          await page.locator(".staff-clients-person").first().click();
          await page.getByRole("button", { name: "Review KYC", exact: true }).click();
        }
      };
      emptySecondary = path;
      await enter();
      await expect(
        page.getByText(
          resource === "versions" ? "No version history is available." : "No KYC files on record.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.locator(
          `.staff-collection-pagination[data-collection="${resource === "versions" ? "Document versions" : "KYC files"}"]`,
        ),
      ).toHaveCount(0);
      results.push({
        check: "known empty history does not remain loading or fabricate a page",
        resource,
      });
      emptySecondary = "";
      readFailure = path;
      await enter();
      const retry = page.getByRole("button", {
        name: resource === "versions" ? "Retry versions" : "Retry KYC files",
        exact: true,
      });
      await expect(retry).toBeVisible();
      const scan = await new AxeBuilder({ page })
        .include('[role="alert"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      scans.push({
        resource,
        scope: "new history error/retry feedback",
        width: 390,
        theme: "dark",
        violations: scan.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      });
      readFailure = "";
      await retry.click();
      await expect(
        page.locator(
          `.staff-collection-pagination[data-collection="${resource === "versions" ? "Document versions" : "KYC files"}"]`,
        ),
      ).toBeVisible();
      results.push({
        check: "403 history error / retained dialog / retry / real rows restored",
        resource,
      });
    }
    // Exercise both existing HR history pagers through actual command invalidation.
    // Only these two explicit self-service commands may write to the in-memory fixture.
    historicalAttendance = true;
    hrCurrent = null;
    await open("/staff/hr");
    const historyNav = () => page.locator('main [data-slot="pagination"]').first();
    await historyNav().getByRole("button", { name: "7", exact: true }).click();
    await page.getByRole("tab", { name: "Leave & Requests", exact: true }).click();
    await historyNav().getByRole("button", { name: "7", exact: true }).click();
    count = 9;
    allowHrCommands = true;
    await page.getByRole("button", { name: "Clock In", exact: true }).first().click();
    await expect(page.getByText("Clock-in saved.", { exact: true }).first()).toBeVisible();
    allowHrCommands = false;
    await expect(historyNav().locator('[aria-current="page"]')).toHaveText("2");
    await page.getByRole("tab", { name: "Attendance", exact: true }).click();
    await expect(historyNav().locator('[aria-current="page"]')).toHaveText("2");
    count = 53;
    await page.clock.setFixedTime(new Date(Date.parse(stamp) + 120000));
    await page.getByRole("button", { name: "Clock Out", exact: true }).first().click();
    allowHrCommands = true;
    await page.getByRole("button", { name: "Confirm Clock Out", exact: true }).click();
    await expect(page.getByText("Clock-out saved.", { exact: true }).first()).toBeVisible();
    allowHrCommands = false;
    await expect(historyNav().locator('[aria-current="page"]')).toHaveText("2");
    results.push({
      check:
        "HR attendance 53 → 9 → 53 records retains clamped page 2 after authenticated-command cache refresh",
      intercepted: true,
    });
    await page.getByRole("tab", { name: "Leave & Requests", exact: true }).click();
    await expect(historyNav().locator('[aria-current="page"]')).toHaveText("2");
    results.push({
      check: "HR leave history independently retains clamped page 2 after 53 → 9 → 53 refresh",
      intercepted: true,
    });
  }
  async function auditCounts() {
    for (const role of ["staff", "admin", "client"]) {
      for (const [width, theme] of [
        [1440, "light"],
        [360, "dark"],
      ]) {
        for (const returned of [0, 1, 30]) {
          auditCount = returned;
          await open(`/${role}/profile`, width, theme, 53, role);
          await page.getByRole("tab", { name: "Data & Privacy", exact: true }).click();
          const panel = page.getByRole("tabpanel");
          const badge = panel.getByText(/^\d+ loaded events?$/);
          const records = panel.getByText(
            role === "client" ? /^profile\.updated_\d+$/ : /^Profile Updated \d+$/,
          );
          if (!returned) {
            await expect(panel.getByText("No activity recorded.", { exact: true })).toBeVisible();
            await expect(badge).toHaveCount(0);
            await expect(panel.locator('[data-slot="pagination"]')).toHaveCount(0);
          } else {
            await expect(badge).toHaveText(`${returned} loaded event${returned === 1 ? "" : "s"}`);
            await expect(records).toHaveCount(Math.min(returned, 6));
            if (returned === 30) {
              const nav = panel.locator('[data-slot="pagination"]');
              const action = (n) =>
                role === "client" ? `profile.updated_${n}` : `Profile Updated ${n}`;
              await expect(panel.getByText(action(1), { exact: true })).toBeVisible();
              await nav.getByRole("button", { name: "Next page", exact: true }).click();
              await expect(panel.getByText(action(7), { exact: true })).toBeVisible();
              await expect(panel.getByText(action(1), { exact: true })).toHaveCount(0);
              await nav.getByRole("button", { name: "3", exact: true }).click();
              await expect(panel.getByText(action(13), { exact: true })).toBeVisible();
              await nav.getByRole("button", { name: "5", exact: true }).click();
              await expect(panel.getByText(action(30), { exact: true })).toBeVisible();
              await expect(
                nav.getByRole("button", { name: "Next page", exact: true }),
              ).toBeDisabled();
              await nav.getByRole("button", { name: "Previous page", exact: true }).click();
              await expect(panel.getByText(action(19), { exact: true })).toBeVisible();
              const first = nav.getByRole("button", { name: "1", exact: true });
              await first.focus();
              await page.keyboard.press("Enter");
              await expect(panel.getByText(action(1), { exact: true })).toBeVisible();
              await expect(records).toHaveCount(6);
              await expect(badge).toHaveText("30 loaded events");
            } else await expect(panel.locator('[data-slot="pagination"]')).toHaveCount(0);
          }
          await expect(panel).not.toContainText("total events");
          await expect(panel).not.toContainText("53 loaded");
          if (role === "client") {
            await expect(panel).not.toContainText("PRIVATE_SYNTHETIC_AUDIT_DETAILS");
            await expect(panel).not.toContainText("192.0.2.123");
            await expect(panel.locator("details")).toHaveCount(0);
          }
          const g = await geometry();
          assert.equal(g.overflow, 0, `${role}: horizontal overflow`);
          await page.waitForTimeout(200);
          const scan = await new AxeBuilder({ page })
            .include('[role="tabpanel"][data-state="active"]')
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();
          scans.push({
            role,
            width,
            theme,
            returned,
            scope: "active profile activity panel",
            violations: scan.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => ({
                target: n.target,
                summary: n.failureSummary,
              })),
            })),
          });
          if (returned) {
            await badge.scrollIntoViewIfNeeded();
            await capture(`audit-count-${role}-${returned}-${width}-${theme}`);
          }
          results.push({
            check:
              "loaded audit count / six-event pages / no lifetime total / portal privacy / keyboard",
            role,
            width,
            theme,
            returned,
            syntheticAvailable: 53,
            geometry: g,
          });
        }
      }
      auditCount = 30;
      let release;
      auditGate = new Promise((resolve) => {
        release = resolve;
      });
      try {
        await open(`/${role}/profile`, 390, "light", 53, role);
        await page.getByRole("tab", { name: "Data & Privacy", exact: true }).click();
        const panel = page.getByRole("tabpanel");
        await expect(panel.getByText("Loading...", { exact: true })).toBeVisible();
        await expect(panel.getByText(/^\d+ loaded events?$/)).toHaveCount(0);
      } finally {
        release();
        auditGate = null;
      }
      await expect(page.getByText("30 loaded events", { exact: true })).toBeVisible();
      results.push({
        check: "initial loading has no fabricated count; released response shows loaded count",
        role,
      });
    }
    readFailure = "/api/v1/users/me/audit-events";
    await open("/client/profile", 390, "light", 53, "client");
    await page.getByRole("tab", { name: "Data & Privacy", exact: true }).click();
    await expect(page.getByText("Activity unavailable", { exact: true })).toBeVisible();
    await expect(page.getByText(/^\d+ loaded events?$/)).toHaveCount(0);
    readFailure = "";
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.getByText("30 loaded events", { exact: true })).toBeVisible();
    results.push({
      check: "Client 403 keeps count hidden; retry restores loaded count and redacted events",
    });
    assert.equal(writes.length, 0, "Audit count checks must not issue mutations");
  }
  try {
    if (before) {
      for (const [name, path] of [
        ["hearings", "/staff/hearings"],
        ["appointments", "/staff/appointments"],
        ["messages", "/staff/messages"],
        ["tasks", "/staff/tasks"],
        ["cases", "/staff/cases"],
      ]) {
        await open(path);
        if (name === "tasks")
          await page.getByRole("button", { name: "Kanban", exact: true }).click();
        if (name === "cases") await page.getByRole("button", { name: /board/i }).click();
        await capture(`before-${name}-1440-light`);
        results.push({ path, before: true, geometry: await geometry() });
      }
    } else if (process.argv.includes("--audit-counts")) {
      await auditCounts();
    } else {
      const routes = [
        "/staff",
        "/staff/tasks",
        "/staff/cases",
        "/staff/hearings",
        "/staff/documents",
        "/staff/research",
        "/staff/crm",
        "/staff/clients",
        "/staff/messages",
        "/staff/appointments",
        "/staff/content",
        "/staff/hr",
      ];
      for (const path of process.argv.includes("--collections-only") ||
      process.argv.includes("--regressions-only") ||
      process.argv.includes("--primary-only") ||
      process.argv.includes("--visual-final") ||
      process.argv.includes("--read-states")
        ? []
        : routes) {
        for (const width of process.argv.includes("--smoke")
          ? [1440]
          : [360, 390, 768, 1024, 1280, 1440]) {
          for (const theme of process.argv.includes("--smoke") ? ["light"] : ["light", "dark"]) {
            await open(path, width, theme);
            const g = await geometry();
            assert.equal(g.overflow, 0, JSON.stringify({ path, width, theme, g }));
            assert.equal(g.bodyRange, 0);
            assert.equal(g.shellRange, 0);
            assert.equal(g.mainPosition, "relative");
            assert.equal(g.staffPrimary, 12); // Desktop navigation stays mounted but hidden on mobile.
            assert.equal(g.bottomBar, false);
            const footer = await page.locator(".staff-shell-footer").boundingBox();
            assert(Math.abs(footer.y + footer.height - g.height) < 1);
            results.push({
              path,
              width,
              theme,
              check: "real route / all loaded data / responsive shell",
              geometry: g,
            });
            if ((width === 1440 && theme === "light") || (width === 360 && theme === "dark"))
              await capture(`after-${path.slice(1).replaceAll("/", "-")}-${width}-${theme}`);
          }
        }
      }
      if (
        !process.argv.includes("--matrix-only") &&
        !process.argv.includes("--smoke") &&
        !process.argv.includes("--regressions-only") &&
        !process.argv.includes("--primary-only") &&
        !process.argv.includes("--visual-final") &&
        !process.argv.includes("--read-states")
      )
        await collections();
      if (process.argv.includes("--regressions-only")) await regressions();
      if (process.argv.includes("--primary-only")) await existingCollections();
      if (process.argv.includes("--visual-final")) await finalPresentation();
      if (process.argv.includes("--read-states")) await readStates();
    }
  } finally {
    fs.writeFileSync(
      out +
        (before
          ? "/before-evidence.json"
          : process.argv.includes("--audit-counts")
            ? "/audit-count-evidence.json"
            : process.argv.includes("--collections-only")
              ? process.argv.includes("--mobile-collections")
                ? "/mobile-collections-evidence.json"
                : "/collections-evidence.json"
              : process.argv.includes("--regressions-only")
                ? "/regression-evidence.json"
                : process.argv.includes("--primary-only")
                  ? "/primary-evidence.json"
                  : process.argv.includes("--visual-final")
                    ? "/final-presentation-evidence.json"
                    : process.argv.includes("--read-states")
                      ? "/read-state-evidence.json"
                      : "/evidence.json"),
      JSON.stringify({ results, scans, errors, writes, liveMutations: 0 }, null, 2),
    );
    await browser.close();
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert(
    writes.every(
      (w) =>
        w.intercepted &&
        (w.path === "/api/v1/messages/read" ||
          /^\/api\/v1\/dm\/threads\/[^/]+\/read$/.test(w.path) ||
          (w.expectedHrFixture && w.method === "POST" && w.path === "/api/v1/hr/attendance")),
    ),
    "Paging must not submit a form or issue an unrelated mutation",
  );
  assert(
    scans.every((scan) => scan.violations.length === 0),
    JSON.stringify(scans.filter((scan) => scan.violations.length)),
  );
  console.log(
    JSON.stringify({
      checks: results.length,
      scans: scans.length,
      errors: errors.length,
      interceptedWrites: writes.length,
      liveMutations: 0,
    }),
  );
}

const target = ".local/qa/session-17c";
fs.mkdirSync(target, { recursive: true });
const shared = fs
  .readFileSync("scripts/qa/verify-account-profile.mjs", "utf8")
  .replaceAll("\r\n", "\n");
const boundary = shared.indexOf("if (publicContrastOnly) {\n  assert.equal(prior.results.length");
if (boundary < 0) throw new Error("Review shared QA fixture boundary");
const prefix = shared
  .slice(0, boundary)
  .replace('const out = ".local/qa/session-17a";', `const out = "${target}";`);
const self = fs.readFileSync(import.meta.filename, "utf8");
const worker = `${target}/worker.mjs`;
fs.writeFileSync(
  worker,
  prefix +
    self.slice(self.indexOf("async function paginationAudit"), self.indexOf("const target =")) +
    `\nawait ${paginationAudit.name}();\n`,
);
process.exitCode =
  spawnSync(process.execPath, [worker, ...process.argv.slice(2)], {
    stdio: "inherit",
  }).status ?? 1;
