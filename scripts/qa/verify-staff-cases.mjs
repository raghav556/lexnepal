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

// Retained actual-component fixture architecture. No server, auth or database access.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const artifacts = path.resolve(
  process.env.STAFF_CASES_ARTIFACT_DIR ?? path.join(root, ".local/qa/session-05/component"),
);
assert(artifacts.startsWith(path.join(root, ".local/qa") + path.sep));
fs.mkdirSync(artifacts, { recursive: true });
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
async function bundle(phase) {
  const old = new Map([
    ["@/components/cases/cases-workspace", "cases-workspace.tsx"],
    ["@/components/cases/case-identity", "case-identity.tsx"],
    ["@/components/cases/case-create-dialog", "case-create-dialog.tsx"],
    ["@/components/ui/pagination", "pagination.tsx"],
  ]);
  const output = await build({
    entryPoints: [path.join(root, "tests/staff-cases/fixture.tsx")],
    absWorkingDir: root,
    bundle: true,
    write: false,
    outdir: artifacts,
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"test"', "process.env": "{}" },
    plugins: [
      {
        name: "isolated-staff-cases",
        setup(builder) {
          builder.onResolve({ filter: /^\.\/button\.tsx$/ }, (args) =>
            args.importer === path.join(root, ".local/qa/session-05/starting/pagination.tsx")
              ? { path: path.join(root, "src/components/ui/button.tsx") }
              : undefined,
          );
          builder.onResolve({ filter: /^(?:react|react-dom)(?:\/.*)?$/ }, (args) => ({
            path: require.resolve(args.path),
          }));
          builder.onResolve({ filter: /^(?:@\/|next\/)/ }, (args) => {
            const key = args.path.replace(/\.(tsx?|jsx?)$/, "");
            if (phase === "before" && old.has(key))
              return { path: path.join(root, ".local/qa/session-05/starting", old.get(key)) };
            if (
              replacements.has(key) ||
              (key.startsWith("@/client/queries/") && key !== "@/client/queries/case-query-error")
            )
              return { path: path.join(root, "tests/staff-cases/adapters.tsx") };
            if (key === "next/dynamic") return { path: key, namespace: "fixture-dynamic" };
            if (key.startsWith("@/server/") || key.startsWith("@/db/"))
              throw new Error("Server import forbidden");
            if (key.startsWith("@/")) {
              const base = path.join(root, "src", args.path.slice(2));
              return {
                path: [
                  base,
                  base + ".ts",
                  base + ".tsx",
                  base + "/index.ts",
                  base + "/index.tsx",
                ].find((file) => fs.existsSync(file) && fs.statSync(file).isFile()),
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
  assert.equal(output.warnings.length, 0);
  const cssSource =
    phase === "before" ? ".local/qa/session-05/starting/index.css" : "src/index.css";
  const compiled = await postcss([tailwind({ base: root, optimize: false })]).process(
    fs.readFileSync(path.join(root, cssSource), "utf8"),
    { from: path.join(root, "src/index.css") },
  );
  const css = postcss.parse(compiled.css);
  css.walkAtRules("import", (rule) => {
    if (rule.params.startsWith("url(")) rule.remove();
  });
  const font = fs.readFileSync(
    path.join(
      path.dirname(require.resolve("next/package.json")),
      "dist/compiled/@vercel/og/Geist-Regular.ttf",
    ),
  );
  const fontCss = `@font-face{font-family:CasesQAPinned;src:url(data:font/ttf;base64,${font.toString("base64")})}.dashboard-theme{--font-sans:CasesQAPinned;--font-serif:CasesQAPinned;font-family:CasesQAPinned,sans-serif}`;
  const image = fs
    .readFileSync(path.join(root, "public/images/staff-home-nepal.jpg"))
    .toString("base64");
  return {
    js: output.outputFiles.find((file) => file.path.endsWith(".js")).text,
    css:
      css.toString().replaceAll("/images/staff-home-nepal.jpg", `data:image/jpeg;base64,${image}`) +
      (output.outputFiles.find((file) => file.path.endsWith(".css"))?.text ?? "") +
      fontCss,
  };
}
const bundles = { after: await bundle("after") };
if (fs.existsSync(path.join(root, ".local/qa/session-05/starting/cases-workspace.tsx")))
  bundles.before = await bundle("before");
for (const [phase, result] of Object.entries(bundles))
  for (const [type, content] of Object.entries(result))
    fs.writeFileSync(path.join(artifacts, `${phase}.${type}`), content);
if (process.argv.includes("--build-only")) process.exit(0);
const browser = await chromium.launch({ headless: true }),
  results = [],
  errors = [],
  requests = [];
async function mount(role, width, dark, state = "populated", brand, phase = "after") {
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 1000 },
    timezoneId: "Asia/Kathmandu",
    locale: "en-GB",
    reducedMotion: "reduce",
  });
  await context.route("**/*", (route) =>
    route.request().isNavigationRequest() &&
    new URL(route.request().url()).origin === "https://staff-cases.invalid"
      ? route.fulfill({
          contentType: "text/html",
          body: '<!doctype html><html lang="en"><head><title>Isolated actual-component cases</title></head><body><div id="root"></div></body></html>',
        })
      : (requests.push(route.request().url()), route.abort()),
  );
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`https://staff-cases.invalid/${role}/cases`);
  await page.clock.setFixedTime(new Date("2026-10-14T11:30:00Z"));
  await page.evaluate((d) => document.documentElement.classList.toggle("dark", d), dark);
  await page.addStyleTag({
    content:
      bundles[phase].css +
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
  await page.addScriptTag({ content: bundles[phase].js });
  await page.evaluate(({ role, state, brand }) => window.renderStaffCases(role, state, brand), {
    role,
    state,
    brand,
  });
  await page.locator('[data-slot="portal-page-shell"]').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { context, page, main: page.locator(`#${role}-main-canvas`) };
}
const pictureHash = (buffer) => awaitableHash(buffer);
function awaitableHash(buffer) {
  return require("node:crypto").createHash("sha256").update(buffer).digest("hex");
}
try {
  for (const dark of [false, true])
    for (const width of [1440, 1024, 768, 390, 360]) {
      const { context, page, main } = await mount("staff", width, dark);
      const home = main.locator(".staff-cases-workspace");
      await expect(home.locator('[data-slot="metric-card-value"]')).toHaveText([
        "23",
        "5",
        "6",
        "7",
      ]);
      const search = page.getByRole("textbox", {
        name: "Search cases by case number, title, client or lawyer",
      });
      for (const [query, count] of [
        ["TEST-2083-001", 1],
        ["construction dispute", 1],
        ["Synthetic Ravi", 12],
        ["Sita Adhikari", 12],
      ]) {
        await search.fill(query);
        await expect(page.getByText(`${count} matching matters`, { exact: true })).toBeVisible();
      }
      await search.fill("");
      const group = page.getByRole("group", { name: "Case status", exact: true });
      for (const [label, count] of [
        ["Inquiry", 5],
        ["Active", 5],
        ["On hold", 6],
        ["Closed", 7],
        ["All", 23],
      ]) {
        const button = group.getByRole("button", { name: new RegExp(`^${label}\\s*${count}$`) });
        await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByText(`${count} matching matters`, { exact: true })).toBeVisible();
      }
      const pagination = page.getByRole("navigation", { name: "Case pagination" });
      await pagination.getByRole("button", { name: "3", exact: true }).click();
      await expect(pagination.getByRole("button", { name: "3", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(home.locator("tbody tr")).toHaveCount(3);
      await expect(home.getByText("Won", { exact: true })).toBeVisible();
      await expect(home.getByText("Lost", { exact: true })).toBeVisible();
      await search.fill("construction");
      await expect(home.locator("tbody tr")).toHaveCount(1);
      await expect(pagination).toHaveCount(0);
      await search.fill("");
      await expect(home.locator("tbody tr")).toHaveCount(10);
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
      const axe = await new AxeBuilder({ page }).include("#staff-main-canvas").analyze();
      assert.equal(
        axe.violations.length,
        0,
        JSON.stringify(
          axe.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
        ),
      );
      await page.screenshot({
        path: path.join(artifacts, `staff-${dark ? "dark" : "light"}-${width}-populated.png`),
      });
      const allLinks = [
        ...new Set(
          await home
            .locator('a[href^="/staff/cases/"]')
            .evaluateAll((ns) => ns.map((n) => n.getAttribute("href"))),
        ),
      ];
      await page.getByRole("button", { name: "By status", exact: true }).click();
      await expect(page.getByRole("button", { name: "By status", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      assert.equal(await home.locator(".staff-cases-board > div").count(), 4);
      assert.equal(await home.locator('a[href^="/staff/cases/"]').count(), 23);
      const board = home.locator(".staff-cases-board");
      await page.keyboard.press("Tab");
      await expect(board).toBeFocused();
      assert(
        await board.evaluate(
          (n) =>
            n.matches(":focus-visible") &&
            getComputedStyle(n).outlineStyle === "none" &&
            [...n.children].every(
              (column) => getComputedStyle(column.firstElementChild).boxShadow !== "none",
            ),
        ),
        "Board keyboard focus must be visible at the column headings",
      );
      if (width < 768) {
        await page.keyboard.press("ArrowRight");
        await expect.poll(() => board.evaluate((n) => n.scrollLeft)).toBeGreaterThan(0);
      }
      if (width === 1440 && !dark) {
        await page.emulateMedia({ forcedColors: "active" });
        assert(
          await board.evaluate((n) => getComputedStyle(n).outlineStyle !== "none"),
          "Forced-colors mode retains a system-color board focus outline",
        );
        await page.emulateMedia({ forcedColors: "none" });
      }
      const caseLink = board.locator('a[href^="/staff/cases/"]').first();
      await caseLink.focus();
      assert(
        await caseLink.evaluate(
          (n) => n.matches(":focus-visible") && getComputedStyle(n).outlineStyle !== "none",
        ),
        "Case links retain individual visible focus",
      );
      await board.evaluate((n) => (n.scrollLeft = n.scrollWidth));
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
      await page.screenshot({
        path: path.join(artifacts, `staff-${dark ? "dark" : "light"}-${width}-board.png`),
      });
      await page.getByRole("button", { name: "List View", exact: true }).click();
      await search.fill("no-such-synthetic-case");
      await expect(home.getByText("No matching cases", { exact: true })).toBeVisible();
      await search.fill("");
      const newCase = page.getByRole("button", { name: "New case", exact: true });
      await newCase.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: "Create New Case", exact: true });
      await expect(dialog.getByLabel("Case Number")).toBeFocused();
      await dialog.getByLabel("Case Title").fill("Unsaved focus check");
      await expect(dialog.getByLabel("Case Title")).toBeFocused();
      await page.keyboard.press("Tab");
      assert(await dialog.evaluate((n) => n.contains(document.activeElement)));
      await dialog.getByRole("button", { name: "Create Case", exact: true }).click();
      assert.equal((await page.evaluate(() => window.casesFixtureEvidence())).attempts.length, 0);
      await page.keyboard.press("Escape");
      await expect(newCase).toBeFocused();
      await main.locator('a[href^="/staff/cases/"]').first().focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/staff\/cases\/synthetic-case-1$/);
      await page.goBack();
      await page.evaluate(() => window.setCasesLanguage("ne"));
      await expect(home).toHaveAttribute("lang", "ne");
      assert(/[०-९]/.test(await home.innerText()));
      results.push({
        kind: "Staff populated interactions",
        width,
        dark,
        summary: [23, 5, 6, 7],
        casesPerPage: 10,
        allLinks,
        axeViolations: 0,
      });
      await context.close();
      console.log(
        `PASS fixture Staff ${width}px ${dark ? "dark" : "light"}: search/filter/page/board/dialog/dates`,
      );
    }
  for (const dark of [false, true])
    for (const state of ["loading", "empty", "error", "forbidden"]) {
      const { context, page, main } = await mount("staff", 390, dark, state);
      if (state === "loading") {
        await expect(main.getByText("Loading matters…", { exact: true })).toBeVisible();
        await expect(main.locator('[data-slot="metric-card"]')).toHaveCount(0);
      }
      if (state === "empty") {
        await expect(main.getByText("No cases on file", { exact: true })).toBeVisible();
        await expect(main.locator('[data-slot="metric-card-value"]')).toHaveText([
          "0",
          "0",
          "0",
          "0",
        ]);
      }
      if (state === "error" || state === "forbidden") {
        await expect(
          main.getByRole("heading", {
            level: 1,
            name: state === "error" ? "Could not load cases" : "Access denied",
          }),
        ).toBeVisible();
        await page.screenshot({
          path: path.join(artifacts, `staff-${dark ? "dark" : "light"}-390-${state}.png`),
        });
        await main.getByRole("button", { name: "Try again" }).click();
        await expect(main.getByRole("heading", { name: "Matter list", exact: true })).toBeVisible();
        assert.equal((await page.evaluate(() => window.casesFixtureEvidence())).retries, 1);
      }
      await page.screenshot({
        path: path.join(
          artifacts,
          `staff-${dark ? "dark" : "light"}-390-${state}${state === "error" || state === "forbidden" ? "-recovered" : ""}.png`,
        ),
      });
      results.push({ kind: "Staff state", state, dark });
      await context.close();
    }
  // Actual creation component, mocked writes only. No owner records are created.
  {
    const { context, page } = await mount("staff", 390, false);
    await page.getByRole("button", { name: "New case", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Create New Case" });
    await dialog.getByLabel("Case Number").fill("TEST-CREATE");
    await dialog.getByLabel("Case Title").fill("Synthetic rejected creation");
    await dialog.getByRole("combobox", { name: "Client", exact: false }).click();
    await page.getByRole("option", { name: "Synthetic Ravi Sharma", exact: true }).click();
    await dialog.getByRole("combobox", { name: "Responsible Lawyer", exact: false }).click();
    await expect(page.getByRole("option", { name: "Excluded Client User" })).toHaveCount(0);
    await page.getByRole("option", { name: "Synthetic Sita Adhikari", exact: true }).click();
    await dialog.getByLabel("Internal Case Description").fill("Synthetic internal description");
    await dialog.getByLabel("Client-visible Summary").fill("Synthetic separate client summary");
    await dialog.getByRole("button", { name: "Create Case", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Create Case", exact: true })).toBeEnabled();
    await expect(page.getByText("Synthetic creation rejected", { exact: true })).toBeVisible();
    assert.equal((await page.evaluate(() => window.casesFixtureEvidence())).attempts.length, 1);
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Case Title").fill("Synthetic successful creation");
    await dialog.getByRole("button", { name: "Create Case", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/staff\/cases\/synthetic-created-case$/);
    const evidence = await page.evaluate(() => window.casesFixtureEvidence());
    assert.equal(evidence.attempts.length, 2);
    const payload = evidence.attempts[1];
    assert.equal(payload.description, "Synthetic internal description");
    assert.equal(payload.clientSummary, "Synthetic separate client summary");
    assert.equal(payload.status, "active");
    assert.equal(payload.closureOutcome, null);
    assert.deepEqual(payload.teamMemberIds, ["lawyer-a"]);
    assert.equal(payload.filingDate, "2026-10-14");
    results.push({
      kind: "Mocked creation",
      validation: true,
      failureRetainsForm: true,
      retry: true,
      leadInTeam: true,
      separateDescriptions: true,
      roleScopedNavigation: true,
    });
    await context.close();
  }
  // CMS-customized colors: selected text/boundaries and focus stay meaningful.
  for (const dark of [false, true])
    for (const brand of [
      undefined,
      "#ffffff",
      "#000000",
      "#f5d96b",
      "#3b0764",
      "#487fff",
      "#00ff00",
    ]) {
      const { context, page, main } = await mount("staff", 1440, dark, "populated", brand);
      await page.getByRole("button", { name: "By status", exact: true }).click();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("region", { name: "Cases by lifecycle status" })).toBeFocused();
      const measurements = await main.locator(".staff-cases-workspace").evaluate((home) => {
        const selected = home.querySelector('button[aria-pressed="true"]');
        const panel = getComputedStyle(
          home.querySelector('[data-slot="dashboard-section"]'),
        ).backgroundColor;
        const button = getComputedStyle(selected);
        const focusMarker = document.createElement("span");
        focusMarker.style.color = "var(--dashboard-focus)";
        home.append(focusMarker);
        const focus = getComputedStyle(focusMarker).color;
        focusMarker.remove();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d");
        const paint = (...colors) => {
          ctx.clearRect(0, 0, 1, 1);
          for (const color of colors) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 1, 1);
          }
          return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
        };
        const lum = (rgb) =>
          rgb
            .map((c) => {
              const v = c / 255;
              return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
            })
            .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
        const contrast = (a, b) => {
          const x = lum(a),
            y = lum(b);
          return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
        };
        const bg = paint(panel, button.backgroundColor);
        const board = home.querySelector(".staff-cases-board");
        const column = board.firstElementChild;
        const heading = column.firstElementChild;
        const headingLayers = [
          getComputedStyle(home).backgroundColor,
          getComputedStyle(column).backgroundColor,
          getComputedStyle(heading).backgroundColor,
        ];
        return {
          selectedText: contrast(paint(panel, button.backgroundColor, button.color), bg),
          selectedBorder: contrast(paint(panel, button.backgroundColor, button.borderColor), bg),
          focus: contrast(paint(panel, focus), paint(panel)),
          boardHeaderFocus: contrast(paint(...headingLayers, focus), paint(...headingLayers)),
        };
      });
      assert(
        measurements.selectedText >= 4.5 &&
          measurements.selectedBorder >= 3 &&
          measurements.focus >= 3 &&
          measurements.boardHeaderFocus >= 3,
        JSON.stringify({ dark, brand, measurements }),
      );
      results.push({ kind: "CMS contrast", dark, brand: brand ?? "default", measurements });
      await context.close();
    }
  // Settled, pinned-font reference/candidate pairs avoid inherited live animations.
  if (bundles.before)
    for (const dark of [false, true])
      for (const width of [1440, 1024, 768, 390, 360]) {
        const captures = [];
        for (const phase of ["before", "after"]) {
          const { context, page, main } = await mount(
            "admin",
            width,
            dark,
            "populated",
            undefined,
            phase,
          );
          await page.getByRole("heading", { name: "Matter list", exact: true }).waitFor();
          await main.evaluate((n) => n.scrollTo({ top: 0, behavior: "instant" }));
          const modes = {};
          modes.list = pictureHash(
            await page.screenshot({
              path: path.join(
                artifacts,
                `admin-${phase}-${dark ? "dark" : "light"}-${width}-list.png`,
              ),
            }),
          );
          await page.getByRole("button", { name: "By status", exact: true }).click();
          modes.board = pictureHash(
            await page.screenshot({
              path: path.join(
                artifacts,
                `admin-${phase}-${dark ? "dark" : "light"}-${width}-board.png`,
              ),
            }),
          );
          await page.getByRole("button", { name: "New case", exact: true }).click();
          await expect(page.getByRole("dialog")).toBeVisible();
          modes.dialog = pictureHash(
            await page.screenshot({
              path: path.join(
                artifacts,
                `admin-${phase}-${dark ? "dark" : "light"}-${width}-dialog.png`,
              ),
            }),
          );
          captures.push(modes);
          await context.close();
        }
        assert.deepEqual(captures[0], captures[1], `Admin pixels changed ${width} ${dark}`);
        results.push({ kind: "Admin settled pixels", width, dark, modes: 3, identical: true });
        console.log(
          `PASS Admin settled pixels: ${width} ${dark ? "dark" : "light"} list/board/dialog`,
        );
      }
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  fs.writeFileSync(
    path.join(artifacts, "results.json"),
    JSON.stringify(
      { preview: "Isolated actual-component test fixture", results, errors, requests },
      null,
      2,
    ),
  );
  console.log(`PASS ${results.length} Staff Cases fixture cells; no network/database access.`);
} finally {
  await browser.close();
}
