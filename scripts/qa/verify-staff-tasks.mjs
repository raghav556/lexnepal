import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Same offline actual-component architecture as the retained Cases/Home fixtures.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.resolve(
  process.env.STAFF_TASKS_ARTIFACT_DIR || path.join(root, ".local/qa/session-07/component"),
);
assert(out.startsWith(path.join(root, ".local/qa") + path.sep));
fs.mkdirSync(out, { recursive: true });
const require = createRequire(path.join(root, "package.json"));
const replacements = new Set([
  "@/hooks/use-current-user",
  "@/hooks/use-auth",
  "@/client/auth/auth-provider",
  "@/client/auth/local-auth-client",
  "@/client/api/client",
  "@/client/navigation",
  "@/components/auth/IdleSessionGuard",
  "@/components/ui/CommandCenter",
  "@/lib/pdf-generator",
  "next/link",
  "next/navigation",
]);
const result = await build({
  entryPoints: [path.join(root, "tests/staff-tasks/fixture.tsx")],
  absWorkingDir: root,
  bundle: true,
  write: false,
  outdir: out,
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"test"', "process.env": "{}" },
  plugins: [
    {
      name: "isolated-staff-tasks",
      setup(builder) {
        builder.onResolve({ filter: /^(?:react|react-dom)(?:\/.*)?$/ }, (args) => ({
          path: require.resolve(args.path),
        }));
        builder.onResolve({ filter: /^(?:@\/|next\/)/ }, (args) => {
          const key = args.path.replace(/\.(tsx?|jsx?)$/, "");
          if (
            replacements.has(key) ||
            (key.startsWith("@/client/queries/") &&
              !["@/client/queries/query-keys", "@/client/queries/case-query-error"].includes(key))
          )
            return { path: path.join(root, "tests/staff-tasks/adapters.tsx") };
          if (key === "next/dynamic") return { path: key, namespace: "fixture-dynamic" };
          if (key.startsWith("@/server/") || key.startsWith("@/db/"))
            throw new Error("Server imports forbidden in UI fixture");
          if (key.startsWith("@/")) {
            const base = path.join(root, "src", args.path.slice(2));
            return {
              path: [
                base,
                base + ".ts",
                base + ".tsx",
                base + "/index.ts",
                base + "/index.tsx",
              ].find((f) => fs.existsSync(f) && fs.statSync(f).isFile()),
            };
          }
        });
        builder.onLoad({ filter: /.*/, namespace: "fixture-dynamic" }, () => ({
          contents:
            "import React from 'react';export default load=>{const C=React.lazy(()=>load().then(m=>({default:m.default??m})));return p=>React.createElement(React.Suspense,{fallback:null},React.createElement(C,p));};",
          loader: "js",
        }));
      },
    },
  ],
});
assert.equal(result.warnings.length, 0);
const compiled = await postcss([tailwind({ base: root, optimize: false })]).process(
  fs.readFileSync(path.join(root, "src/index.css"), "utf8"),
  { from: path.join(root, "src/index.css") },
);
const cssTree = postcss.parse(compiled.css);
cssTree.walkAtRules("import", (rule) => {
  if (rule.params.startsWith("url(")) rule.remove();
});
const font = fs.readFileSync(
  path.join(
    path.dirname(require.resolve("next/package.json")),
    "dist/compiled/@vercel/og/Geist-Regular.ttf",
  ),
);
const photo = fs
  .readFileSync(path.join(root, "public/images/staff-home-nepal.jpg"))
  .toString("base64");
const css =
  cssTree.toString().replaceAll("/images/staff-home-nepal.jpg", `data:image/jpeg;base64,${photo}`) +
  `@font-face{font-family:TasksQAPinned;src:url(data:font/ttf;base64,${font.toString("base64")})}.dashboard-theme{--font-sans:TasksQAPinned;--font-serif:TasksQAPinned;font-family:TasksQAPinned,sans-serif}`;
const js = result.outputFiles.find((file) => file.path.endsWith(".js")).text;
fs.writeFileSync(path.join(out, "after.js"), js);
fs.writeFileSync(path.join(out, "after.css"), css);
if (process.argv.includes("--build-only")) process.exit(0);
const commandsOnly = process.argv.includes("--commands-only");
const browser = await chromium.launch({ headless: true }),
  results = [],
  errors = [],
  requests = [];
async function mount(width = 1440, dark = false, state = "populated", brand) {
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 1000 },
    timezoneId: "Asia/Kathmandu",
    reducedMotion: "reduce",
  });
  await context.route("**/*", (route) =>
    route.request().isNavigationRequest()
      ? route.fulfill({
          contentType: "text/html",
          body: '<!doctype html><html lang="en"><head><title>Isolated actual Staff Tasks component</title></head><body><div id="root"></div></body></html>',
        })
      : (requests.push(route.request().url()), route.abort()),
  );
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("https://tasks-fixture.invalid/staff/tasks");
  await page.clock.setFixedTime(new Date("2026-10-16T04:00:00Z"));
  await page.evaluate((d) => document.documentElement.classList.toggle("dark", d), dark);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: js });
  await page.evaluate(({ state, brand }) => window.renderStaffTasks(state, brand), {
    state,
    brand,
  });
  const home = page.locator(".staff-tasks-workspace");
  await home.waitFor();
  if (state !== "loading")
    await page.getByRole("group", { name: "Task view", exact: true }).waitFor();
  return { context, page, home };
}
const scopeAll = (page) =>
  page
    .getByRole("group", { name: "Task scope", exact: true })
    .getByRole("button", { name: "All Tasks", exact: true })
    .click();
async function select(page, label, option) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function view(page, icon) {
  const name = {
    "kanban-square": "Kanban",
    "calendar-days": "Calendar",
    users: "Workload",
    list: "List",
  }[icon];
  await page
    .getByRole("group", { name: "Task view", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
}
async function axe(page, selector) {
  const scan = await new AxeBuilder({ page }).include(selector).analyze();
  assert.deepEqual(
    scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    [],
  );
}
try {
  if (!commandsOnly)
    for (const dark of [false, true])
      for (const width of [1440, 1024, 768, 390, 360]) {
        const { context, page, home } = await mount(width, dark);
        await scopeAll(page);
        await expect(home.locator(".staff-task-row")).toHaveCount(12);
        await page.getByRole("button", { name: "2", exact: true }).click();
        await select(page, "Filter by priority", "Urgent");
        await expect(home.locator(".staff-task-row")).toHaveCount(7);
        await page.getByRole("button", { name: "Reset", exact: true }).click();
        await scopeAll(page);
        const search = page.getByRole("textbox", { name: "Search tasks", exact: true });
        for (const term of ["bundle", "supporting material", "TEST-2083-001", "construction"]) {
          await search.fill(term);
          assert((await home.locator(".staff-task-row").count()) > 0);
        }
        await search.fill("unmatched test search");
        await expect(home.getByText("No tasks match these filters", { exact: true })).toBeVisible();
        await search.fill("");
        for (const status of ["To Do", "In Progress", "Done", "Cancelled", "All statuses"]) {
          await select(page, "Filter by status", status);
          assert((await home.locator(".staff-task-row").count()) > 0);
        }
        await select(page, "Filter by case", "[TEST-2083-001] Synthetic construction matter");
        await select(page, "Filter by assignee", "Synthetic Nabin Shrestha");
        await select(page, "Filter by priority", "Urgent");
        await expect(home.locator(".staff-task-row")).toHaveCount(3);
        await page.getByRole("button", { name: /^More Filters/ }).click();
        const advanced = page.getByRole("dialog", { name: "More Filters", exact: true });
        await advanced.getByRole("button", { name: "Overdue", exact: true }).click();
        await expect(home.locator(".staff-task-row")).toHaveCount(1);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("button", { name: /^More Filters/ })).toBeFocused();
        await page.getByRole("button", { name: "Reset", exact: true }).click();
        await scopeAll(page);
        await axe(page, ".staff-tasks-workspace");
        await view(page, "kanban-square");
        await expect(home.locator(".staff-task-board-card")).toHaveCount(20);
        await axe(page, ".staff-tasks-workspace");
        await home.locator(".staff-task-board").focus();
        await page.keyboard.press("ArrowRight");
        await view(page, "calendar-days");
        await page.getByRole("button", { name: "Next month" }).click();
        await page.getByRole("button", { name: "Previous month" }).click();
        await axe(page, ".staff-tasks-workspace");
        await view(page, "users");
        await axe(page, ".staff-tasks-workspace");
        await home
          .getByRole("button", {
            name: "Filter tasks assigned to Synthetic Nabin Shrestha",
            exact: true,
          })
          .focus();
        await page.keyboard.press("Enter");
        await expect(home.locator(".staff-task-row").first()).toBeVisible();
        assert(
          !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)),
          "page overflow",
        );
        await home
          .getByRole("button", { name: /^View task:/ })
          .first()
          .click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await axe(page, ".staff-task-detail-dialog");
        const title = dialog.locator("#edit-task-title");
        await title.fill("Edited fixture title");
        await expect(title).toBeFocused();
        await dialog.locator("#edit-task-category").selectOption("research");
        await dialog
          .getByRole("heading", { name: "Comments", exact: true })
          .scrollIntoViewIfNeeded();
        await page.keyboard.press("Escape");
        if ([1440, 390].includes(width)) {
          await page.screenshot({
            path: path.join(out, `fixture-${dark ? "dark" : "light"}-${width}.png`),
          });
        }
        results.push({
          kind: "Four views/filters/pagination/dialog/keyboard",
          width,
          dark,
          axeViolations: 0,
        });
        await context.close();
      }
  // All writes below target only the reactive in-memory adapters.
  {
    const { context, page, home } = await mount();
    await scopeAll(page);
    const evidence = () => page.evaluate(() => window.taskFixtureEvidence());
    const originalCard = home.locator('[data-task-id="synthetic-task-1"]');
    await originalCard.locator(".staff-task-matter").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(originalCard.locator(".staff-task-title")).toBeFocused();
    await home
      .getByRole("button", { name: /New Task/i })
      .first()
      .click();
    await axe(page, ".staff-task-create-dialog");
    await page.getByRole("button", { name: "Create Task", exact: true }).click();
    assert.equal((await evidence()).length, 0);
    await page.locator("#create-task-title").fill("Synthetic new task");
    await page.locator("#create-task-assignee").selectOption("staff-a");
    await page.locator("#create-task-case").selectOption("matter-a");
    await page.locator("#create-due-ad").fill("2026-10-22");
    await expect(page.locator("#create-due-bs")).not.toHaveValue("");
    await page.getByRole("button", { name: "Create Task", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    assert.equal((await evidence()).at(-1).command, "create");
    await view(page, "kanban-square");
    await page.getByRole("button", { name: /^More Filters/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelled", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(home.locator(".staff-task-board > div")).toHaveCount(4);
    const cancelledColumn = home
      .locator(".staff-task-board > div")
      .filter({ has: page.getByRole("heading", { name: "Cancelled", exact: true }) });
    await expect(cancelledColumn.getByRole("checkbox")).toHaveCount(6);
    for (const checkbox of await cancelledColumn.getByRole("checkbox").all())
      await expect(checkbox).toBeDisabled();
    await page.getByRole("button", { name: /^More Filters/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelled", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(home.locator(".staff-task-board > div")).toHaveCount(3);
    await view(page, "list");
    const complete = home.locator('[data-task-id="synthetic-task-1"]').getByRole("checkbox");
    await complete.focus();
    await page.keyboard.press("Space");
    await expect(complete).toHaveAttribute("aria-checked", "true");
    await complete.click();
    await expect(complete).toHaveAttribute("aria-checked", "false");
    assert.equal((await evidence()).at(-1).input.status, "in_progress");
    await home
      .locator('[data-task-id="synthetic-task-1"]')
      .getByRole("button", { name: /^View task:/ })
      .click();
    const taskDialog = page.getByRole("dialog");
    const saveTask = taskDialog.getByRole("button", { name: "Save", exact: true });
    const scrollLayout = await taskDialog.evaluate((dialog) => {
      const style = getComputedStyle(dialog);
      return {
        overflow: style.overflowY,
        overscroll: style.overscrollBehaviorY,
        gutter: style.scrollbarGutter,
        relatedLists: [...dialog.querySelectorAll(".staff-task-related-list")].map(
          (list) => getComputedStyle(list).overflowY,
        ),
      };
    });
    assert.equal(scrollLayout.overflow, "scroll");
    assert.equal(scrollLayout.overscroll, "contain");
    assert.equal(scrollLayout.gutter, "stable");
    assert.deepEqual(scrollLayout.relatedLists, ["visible", "visible", "visible"]);
    assert.equal(await saveTask.evaluate((button) => button.form?.id), "staff-task-edit-form");
    for (const name of ["Add", "Post"])
      assert.equal(
        await taskDialog
          .getByRole("button", { name, exact: true })
          .evaluate((button) => button.form),
        null,
      );
    assert(
      await taskDialog.evaluate((dialog) => {
        const comments = [...dialog.querySelectorAll("h3")].find((heading) =>
          heading.textContent.includes("Comments"),
        );
        return Boolean(
          comments.compareDocumentPosition(dialog.querySelector(".staff-task-detail-actions")) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        );
      }),
      "Final task actions must follow the independent Comments section",
    );
    const beforeInvalidSave = (await evidence()).length;
    await page.locator("#edit-task-title").fill("");
    await saveTask.click();
    assert.equal(
      await page.locator("#edit-task-title").evaluate((field) => field.validity.valid),
      false,
    );
    assert.equal((await evidence()).length, beforeInvalidSave);
    await page.locator("#edit-task-title").fill("  Updated synthetic task  ");
    await page.locator("#edit-task-description").fill("  Updated note  ");
    await page.locator("#edit-task-category").selectOption("research");
    await page.locator("#edit-task-recurrence").selectOption("monthly");
    await page.locator("#edit-task-reminder").fill("2026-10-20");
    await page
      .getByRole("textbox", { name: "New subtask", exact: true })
      .fill("Unsubmitted subtask");
    await page
      .getByRole("textbox", { name: "New comment", exact: true })
      .fill("Unsubmitted comment");
    await page.evaluate(() => window.failNextTaskCommand());
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByText("Synthetic command failure; retry safely.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator("#task-detail-heading")).toHaveText("Updated synthetic task");
    const update = (await evidence()).at(-1);
    assert.equal(update.command, "update");
    await expect(page.getByRole("textbox", { name: "New subtask", exact: true })).toHaveValue(
      "Unsubmitted subtask",
    );
    await expect(page.getByRole("textbox", { name: "New comment", exact: true })).toHaveValue(
      "Unsubmitted comment",
    );
    assert.deepEqual(update.input, {
      taskId: "synthetic-task-1",
      title: "Updated synthetic task",
      description: "Updated note",
      caseId: "matter-a",
      assignedTo: "staff-b",
      priority: "urgent",
      dueDate: "2026-10-14",
      dueDateBs: await page.locator("#edit-due-bs").inputValue(),
      status: "in_progress",
      hearingId: "hearing-a",
      documentId: "document-a",
      category: "research",
      clientVisible: false,
      isRecurring: true,
      recurrenceRule: "monthly",
      watchers: ["staff-c"],
      reminderAt: "2026-10-20",
    });
    await page
      .getByRole("textbox", { name: "New subtask", exact: true })
      .fill("Synthetic added subtask");
    await page.getByRole("textbox", { name: "New subtask", exact: true }).press("Enter");
    await expect(page.getByText("Synthetic added subtask", { exact: true })).toBeVisible();
    assert.equal((await evidence()).at(-1).input.parentTaskId, "synthetic-task-1");
    await page
      .getByRole("textbox", { name: "New subtask", exact: true })
      .fill("Button-added subtask");
    const beforeSubtaskButton = (await evidence()).length;
    await taskDialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Button-added subtask", { exact: true })).toBeVisible();
    assert.equal((await evidence()).length, beforeSubtaskButton + 1);
    assert.equal((await evidence()).at(-1).command, "create");
    const subtask = page.getByRole("checkbox", { name: "Check document index", exact: true });
    await subtask.check();
    assert.equal((await evidence()).at(-1).input.status, "done");
    await page
      .getByRole("textbox", { name: "New comment", exact: true })
      .fill("  Synthetic comment  ");
    await page.getByRole("textbox", { name: "New comment", exact: true }).press("Enter");
    await expect(page.getByText("Synthetic comment", { exact: true })).toBeVisible();
    assert.deepEqual((await evidence()).at(-1), {
      command: "comment",
      input: { taskId: "synthetic-task-1", content: "Synthetic comment" },
    });
    await page
      .getByRole("textbox", { name: "New comment", exact: true })
      .fill("Button-posted comment");
    const beforeCommentButton = (await evidence()).length;
    await taskDialog.getByRole("button", { name: "Post", exact: true }).click();
    await expect(page.getByText("Button-posted comment", { exact: true })).toBeVisible();
    assert.equal((await evidence()).length, beforeCommentButton + 1);
    assert.deepEqual((await evidence()).at(-1), {
      command: "comment",
      input: { taskId: "synthetic-task-1", content: "Button-posted comment" },
    });
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    assert.notEqual((await evidence()).at(-1).command, "archive");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(home.getByRole("button", { name: /New Task/i }).first()).toBeFocused();
    await page.getByRole("button", { name: /^More Filters/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Archived", exact: true }).click();
    await page.keyboard.press("Escape");
    await home
      .locator('[data-task-id="synthetic-task-1"]')
      .getByRole("button", { name: /^View task:/ })
      .click();
    await page.getByRole("button", { name: "Restore", exact: true }).click();
    assert.equal((await evidence()).at(-1).command, "restore");
    await home
      .locator('[data-task-id="synthetic-task-1"]')
      .getByRole("button", { name: /^View task:/ })
      .click();
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    assert.notEqual((await evidence()).at(-1).command, "delete");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    assert.equal((await evidence()).at(-1).command, "delete");
    await expect(home.getByRole("button", { name: /New Task/i }).first()).toBeFocused();
    await view(page, "kanban-square");
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    const card = home.locator(".staff-task-board-card").first();
    await card.dispatchEvent("dragstart", { dataTransfer: transfer });
    await home
      .locator(".staff-task-board > div")
      .filter({ has: page.getByRole("heading", { name: "Done", exact: true }) })
      .dispatchEvent("drop", { dataTransfer: transfer });
    assert.equal((await evidence()).at(-1).input.status, "done");
    await home.getByRole("button", { name: /Due scan/i }).click();
    assert.equal((await evidence()).at(-1).command, "reminders");
    results.push({
      kind: "Isolated create/edit/validation/failure-retry/completion/AD-BS/subtasks/comments/archive-restore/delete/DnD/reminders",
      commands: (await evidence()).length,
    });
    await context.close();
  }
  if (!commandsOnly)
    for (const state of ["loading", "empty", "restricted"]) {
      const { context, page, home } = await mount(390, true, state);
      if (state === "loading")
        await expect(home.getByLabel("Loading tasks", { exact: true })).toBeVisible();
      else if (state === "empty")
        await expect(home.getByText("No tasks yet", { exact: true })).toBeVisible();
      else
        await expect(
          page.getByRole("group", { name: "Task view", exact: true }).getByRole("button"),
        ).toHaveCount(3);
      await axe(page, ".staff-tasks-workspace");
      await page.screenshot({ path: path.join(out, `fixture-${state}-390.png`) });
      if (state === "empty") {
        await view(page, "users");
        await expect(
          home.getByText("No open tasks to show workload.", { exact: true }),
        ).toBeVisible();
      }
      results.push({ kind: "State/capability", state });
      await context.close();
    }
  if (!commandsOnly)
    for (const dark of [false, true]) {
      for (const brand of [
        "#487fff",
        "#ffffff",
        "#000000",
        "#ffff00",
        "#777777",
        "#ff0000",
        "#00ff00",
      ]) {
        const { context, page, home } = await mount(1440, dark, "populated", brand);
        await axe(page, ".staff-tasks-workspace");
        const contrast = await home.evaluate((element) => {
          const button = element.querySelector('.staff-task-view-toggle [aria-pressed="true"]');
          const style = getComputedStyle(button);
          const ctx = document.createElement("canvas").getContext("2d");
          const luminance = (color) => {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 1, 1);
            const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((value) => {
              const c = value / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
            return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
          };
          const ratio = (a, b) => {
            const x = luminance(a),
              y = luminance(b);
            return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
          };
          const probe = document.createElement("span");
          probe.style.color = "var(--dashboard-focus)";
          element.append(probe);
          const focusColor = getComputedStyle(probe).color;
          probe.remove();
          return {
            selectedText: ratio(style.color, style.backgroundColor),
            focus: ratio(focusColor, getComputedStyle(element).backgroundColor),
          };
        });
        assert(
          contrast.selectedText >= 4.5 && contrast.focus >= 3,
          JSON.stringify({ brand, dark, contrast }),
        );
        results.push({ kind: "CMS contrast", brand, dark, ...contrast, axeViolations: 0 });
        await context.close();
      }
    }
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
} finally {
  fs.writeFileSync(
    path.join(out, "results.json"),
    JSON.stringify(
      {
        method:
          "Isolated actual Staff Tasks components and existing shell; synthetic adapters; zero external requests",
        results,
        errors,
        requests,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
