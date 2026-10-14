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

// Same offline actual-component architecture as the retained navigation/Client fixtures.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const phase = process.argv[2];
assert(["before", "after"].includes(phase), "Use before or after");
const artifacts = path.resolve(
  process.env.STAFF_HOME_ARTIFACT_DIR ?? path.join(root, ".local/qa/session-04", phase),
);
assert(
  artifacts.startsWith(path.join(root, ".local/qa") + path.sep),
  "Staff Home artifacts must stay in the ignored local QA directory",
);
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
const bundle = await build({
  entryPoints: [path.join(root, "tests/staff-home/fixture.tsx")],
  absWorkingDir: root,
  bundle: true,
  write: false,
  outdir: artifacts,
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"test"', "process.env": "{}" },
  plugins: [
    {
      name: "isolated-staff-home",
      setup(builder) {
        builder.onResolve({ filter: /^(?:react|react-dom)(?:\/.*)?$/ }, (args) => ({
          path: require.resolve(args.path),
        }));
        builder.onResolve({ filter: /^(?:@\/|next\/)/ }, (args) => {
          const key = args.path.replace(/\.(tsx?|jsx?)$/, "");
          if (replacements.has(key) || key.startsWith("@/client/queries/"))
            return { path: path.join(root, "tests/staff-home/adapters.tsx") };
          if (key === "next/dynamic") return { path: key, namespace: "fixture-dynamic" };
          if (key.startsWith("@/server/") || key.startsWith("@/db/"))
            throw new Error("Server import forbidden");
          if (phase === "before" && key === "@/views/staff/StaffDashboard")
            return { path: path.join(root, ".local/qa/session-04/starting/StaffDashboard.tsx") };
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
            "import React from 'react'; export default load => { const C = React.lazy(() => load().then(m => ({default:m.default ?? m}))); return p => React.createElement(React.Suspense,{fallback:null},React.createElement(C,p)); };",
          loader: "js",
        }));
      },
    },
  ],
});
assert.equal(bundle.warnings.length, 0);
const cssFile = path.join(
  root,
  phase === "before" ? ".local/qa/session-04/starting/index.css" : "src/index.css",
);
const compiled = await postcss([tailwind({ base: root, optimize: false })]).process(
  fs.readFileSync(cssFile, "utf8"),
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
const fontCss = `@font-face{font-family:StaffQAPinned;src:url(data:font/ttf;base64,${font.toString("base64")}) format('truetype');font-display:block}.dashboard-staff{--font-sans:StaffQAPinned;--font-serif:StaffQAPinned;font-family:StaffQAPinned,sans-serif}`;
const js = bundle.outputFiles.find((file) => file.path.endsWith(".js")).text;
const style =
  // Embed the existing decorative asset only in this offline test bundle.
  // Production still uses the actual local public asset and optional CMS image.
  css
    .toString()
    .replaceAll(
      "/images/staff-home-nepal.jpg",
      `data:image/jpeg;base64,${fs.readFileSync(path.join(root, "public/images/staff-home-nepal.jpg")).toString("base64")}`,
    ) +
  (bundle.outputFiles.find((file) => file.path.endsWith(".css"))?.text ?? "") +
  fontCss;
fs.writeFileSync(path.join(artifacts, "fixture.js"), js);
fs.writeFileSync(path.join(artifacts, "fixture.css"), style);
if (process.argv.includes("--build-only")) process.exit(0);

const browser = await chromium.launch({ headless: true });
const results = [],
  errors = [],
  requests = [];
const sections = [
  "My Day",
  "Priority Tasks",
  "My Cases",
  "Upcoming Hearings",
  "Messages & Team Updates",
  "Recent Documents",
  "Team Workload",
];
const kpis = ["Active cases", "Hearings this week", "Tasks due today", "Unread messages"];
const destinations = ["/staff/cases", "/staff/hearings", "/staff/tasks", "/staff/messages"];
const clock = "2026-09-18T04:15:00Z";
async function mount(page, state, dark, brand) {
  await page.goto("https://staff-home.invalid/staff");
  await page.clock.setFixedTime(new Date(clock));
  await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), dark);
  await page.addStyleTag({ content: style });
  await page.addScriptTag({ content: js });
  await page.evaluate(({ state, brand }) => window.renderStaffHome(state, brand), { state, brand });
  await page.getByRole("heading", { level: 1, name: "Good morning, Aarav" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
}
try {
  for (const dark of [false, true])
    for (const width of [1440, 1024, 768, 390, 360])
      for (const state of ["populated", "loading", "empty"]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
          locale: "en-GB",
          timezoneId: "Asia/Kathmandu",
        });
        await context.route("**/*", (route) => {
          if (
            new URL(route.request().url()).origin === "https://staff-home.invalid" &&
            route.request().isNavigationRequest()
          )
            return route.fulfill({
              contentType: "text/html",
              body: '<!doctype html><html lang="en"><head><title>Isolated actual-component Staff Home</title></head><body><div id="root"></div></body></html>',
            });
          requests.push(route.request().url());
          return route.abort();
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(error.message));
        await mount(page, state, dark);
        const home = page.locator('[data-slot="portal-page-shell"]');
        const row = { width, dark, state, checks: [], defects: [] };
        results.push(row);
        row.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        if (phase === "after") assert.equal(row.overflow, false, `Overflow ${width} ${state}`);
        if (phase === "after" && width >= 768) {
          const topbar = page.locator(".staff-admin-topbar");
          const boxes = await topbar.locator("button").evaluateAll((nodes) =>
            nodes.map((node) => {
              const box = node.getBoundingClientRect();
              return { left: box.left, right: box.right };
            }),
          );
          assert(
            boxes.every((box) => box.left >= 248 && box.right <= width),
            "Clipped topbar control",
          );
          const search = await topbar
            .getByRole("button", { name: "Open search", exact: true })
            .boundingBox();
          const breadcrumb = await topbar
            .getByRole("navigation", { name: "Breadcrumb" })
            .boundingBox();
          assert(search.x >= breadcrumb.x + breadcrumb.width, "Search overlaps breadcrumb");
        }
        if (state !== "loading") {
          const metrics = home.locator('[data-slot="metric-card"]');
          await expect(metrics).toHaveCount(4);
          for (let i = 0; i < 4; i++) {
            await expect(metrics.nth(i).locator('[data-slot="metric-card-label"]')).toHaveText(
              kpis[i],
            );
            await expect(metrics.nth(i).locator('[data-slot="metric-card-value"]')).toHaveText(
              state === "empty" ? "0" : ["4", "4", "2", "7"][i],
            );
            assert.equal(await metrics.nth(i).locator("..").getAttribute("href"), destinations[i]);
          }
          for (const title of sections)
            await expect(home.getByRole("heading", { name: title, exact: true })).toBeVisible();
          row.sections = await home
            .locator('[data-slot="dashboard-section-title"]')
            .allTextContents();
          row.destinations = [
            ...new Set(
              await home
                .locator("a[href]")
                .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href"))),
            ),
          ].sort();
          if (state === "populated") {
            assert.deepEqual(
              await home
                .locator('.staff-home-priorities [data-slot="dashboard-list-row"] p:first-child')
                .allTextContents(),
              phase === "after"
                ? [
                    "File final submissions",
                    "Confirm witness attendance",
                    "Review lease annexures and supporting evidence",
                    "Prepare estate inventory",
                    "Organise settlement documents",
                  ]
                : [],
            );
            await expect(home.getByText("2 overdue", { exact: true }).first()).toBeVisible();
            const timeline = home.getByRole("list");
            assert.deepEqual(
              await timeline
                .locator("li")
                .evaluateAll((nodes) =>
                  nodes.map((n) => n.textContent.match(/\d+:\d+ [AP]M/)?.[0]),
                ),
              ["9:00 AM", "11:30 AM", "2:00 PM"],
            );
            await expect(home.getByText("Cancelled synthetic appointment")).toHaveCount(0);
            await expect(home.getByText("Completed synthetic task")).toHaveCount(0);
            await expect(home.getByText("Completed synthetic matter")).toHaveCount(0);
            await expect(home.getByText("PDF", { exact: true })).toBeVisible();
            row.checks.push(
              "real filters, KPI values/helpers/hrefs, time/priority order, separate matter/team messages, documents/workload",
            );
          } else {
            await expect(home.locator('[data-slot="dashboard-empty-state"]')).toHaveCount(7);
            row.checks.push("all seven empty states and zero KPIs");
          }
          if (phase === "after") {
            assert.deepEqual(row.sections, sections);
            await expect(home.locator("[data-hero-chips]")).toHaveCount(0);
            // Every original destination remains available, including each of the six quick workspaces.
            const before = JSON.parse(
              fs.readFileSync(path.join(root, ".local/qa/session-04/before/results.json"), "utf8"),
            );
            const previous = before.results.find(
              (r) => r.width === width && r.dark === dark && r.state === state,
            );
            assert.deepEqual(row.destinations, previous.destinations);
            const axe = await new AxeBuilder({ page })
              .include('[data-slot="portal-page-shell"]')
              .analyze();
            row.axe = axe.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes.map((n) => n.target),
            }));
            assert.equal(
              row.axe.filter((v) => ["serious", "critical"].includes(v.impact)).length,
              0,
              JSON.stringify(row.axe),
            );
            const links = home.locator("a[href]");
            // Real Tab order, visible focus and keyboard activation, then actual browser history return.
            await home.getByRole("link", { name: /Review today/ }).focus();
            for (let i = 0; i < 6; i++) {
              const focus = await page.evaluate(() => {
                const n = document.activeElement,
                  s = getComputedStyle(n);
                return {
                  inside: !!n.closest('[data-slot="portal-page-shell"]'),
                  ring: s.boxShadow,
                  outline: s.outlineStyle,
                };
              });
              assert(focus.inside && (focus.ring !== "none" || focus.outline !== "none"));
              await page.keyboard.press("Tab");
            }
            await links
              .filter({ has: page.locator('[data-slot="metric-card"]') })
              .nth(0)
              .focus();
            await page.keyboard.press("Enter");
            await expect(page).toHaveURL(/\/staff\/cases$/);
            await page.goBack();
            await expect(page).toHaveURL(/\/staff$/);
            row.checks.push(
              "Axe, keyboard traversal/Enter/focus/history, destination preservation",
            );
            const bounds = await home.locator("a[href]").evaluateAll((nodes) =>
              nodes.map((node) => {
                const box = node.getBoundingClientRect();
                const main = document.getElementById("staff-main-canvas").getBoundingClientRect();
                return {
                  left: box.left,
                  right: box.right,
                  mainLeft: main.left,
                  mainRight: main.right,
                };
              }),
            );
            assert(
              bounds.every((box) => box.left >= box.mainLeft - 1 && box.right <= box.mainRight + 1),
              "Clipped navigation control",
            );
          }
        } else {
          await expect(home.locator('[aria-busy="true"]')).toBeVisible();
          await expect(home.locator('[data-slot="metric-card"]')).toHaveCount(0);
          row.checks.push("loading labelled busy, no invented values");
        }
        await page.evaluate(() => {
          document.activeElement?.blur();
          document.getElementById("staff-main-canvas").scrollTop = 0;
        });
        await page.screenshot({
          path: path.join(artifacts, `staff-${dark ? "dark" : "light"}-${width}-${state}.png`),
          fullPage: true,
          animations: "disabled",
        });
        // A separate full-content review capture expands only the shell scroll containers.
        // Viewport/overflow/focus assertions above always run with the actual shell sizing.
        await page.evaluate(() => {
          let node = document.getElementById("staff-main-canvas");
          while (node && node !== document.body) {
            node.style.setProperty("height", "auto", "important");
            node.style.setProperty("overflow", "visible", "important");
            node.style.setProperty("flex-shrink", "0", "important");
            if (getComputedStyle(node).position === "fixed") node.style.position = "relative";
            node = node.parentElement;
          }
          document.body.style.height = "auto";
          // Full-content evidence must not obscure the agenda with a fixed viewport bar.
          // The preceding viewport capture and interactive preview keep it intact.
          const bottomBar = document.querySelector(".staff-mobile-primary");
          if (bottomBar) bottomBar.style.visibility = "hidden";
        });
        await page.screenshot({
          path: path.join(
            artifacts,
            `staff-${dark ? "dark" : "light"}-${width}-${state}-content.png`,
          ),
          fullPage: true,
          animations: "disabled",
        });
        if (phase === "after" && width === 1440 && state !== "loading") {
          const fullAxe = await new AxeBuilder({ page })
            .include('[data-slot="portal-page-shell"]')
            .analyze();
          row.fullContentAxe = fullAxe.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          }));
          assert.equal(
            row.fullContentAxe.filter((v) => ["serious", "critical"].includes(v.impact)).length,
            0,
            JSON.stringify(row.fullContentAxe),
          );
        }
        if (phase === "after" && width === 390 && state === "populated") {
          const date = home.locator('[data-slot="dashboard-hero"] .tabular-nums');
          await expect(date).toContainText("18 Sept 2026");
          await page.evaluate(() => window.setStaffHomeLanguage("ne"));
          await expect(home).toHaveAttribute("lang", "ne");
          assert(/[०-९]/.test(await date.textContent()));
          await expect(date).toContainText("18 Sept 2026");
          await page.screenshot({
            path: path.join(artifacts, `staff-${dark ? "dark" : "light"}-390-nepali-content.png`),
            fullPage: true,
            animations: "disabled",
          });
          row.checks.push("existing dual-date formatter, Nepali digits and Gregorian companion");
        }
        await context.close();
      }
  if (phase === "after") {
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
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          locale: "en-GB",
          timezoneId: "Asia/Kathmandu",
          reducedMotion: "reduce",
        });
        await context.route("**/*", (route) =>
          route.request().isNavigationRequest() &&
          new URL(route.request().url()).origin === "https://staff-home.invalid"
            ? route.fulfill({
                contentType: "text/html",
                body: '<!doctype html><html lang="en"><head><title>Brand QA</title></head><body><div id="root"></div></body></html>',
              })
            : route.abort(),
        );
        const page = await context.newPage();
        await mount(page, "populated", dark, brand);
        const home = page.locator('[data-slot="portal-page-shell"]');
        const measured = await home.evaluate((node) => {
          const s = getComputedStyle(node),
            canvas = document.createElement("canvas"),
            ctx = canvas.getContext("2d");
          canvas.width = canvas.height = 1;
          const rgb = (color) => {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 1, 1);
            return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
          };
          const luminance = (color) =>
            rgb(color)
              .map((c) => {
                const v = c / 255;
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
              })
              .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
          const ratio = (a, b) => {
            const x = luminance(a),
              y = luminance(b);
            return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
          };
          const panel = s.getPropertyValue("--dashboard-panel"),
            accent = getComputedStyle(node.querySelector('[data-variant="ghost"]')).color;
          const button = getComputedStyle(node.querySelector('[data-variant="primary"]'));
          return {
            accent: ratio(accent, panel),
            primary: ratio(button.color, button.backgroundColor),
            focus: ratio(s.getPropertyValue("--dashboard-focus"), panel),
            muted: ratio(s.getPropertyValue("--muted-foreground"), panel),
          };
        });
        assert(
          measured.accent >= 4.5 &&
            measured.primary >= 4.5 &&
            measured.muted >= 4.5 &&
            measured.focus >= 3,
          JSON.stringify({ dark, brand, measured }),
        );
        results.push({
          kind: "CMS computed Staff Home paint",
          dark,
          brand: brand ?? "default",
          measured,
        });
        await context.close();
      }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  fs.writeFileSync(
    path.join(artifacts, "results.json"),
    JSON.stringify(
      {
        phase,
        clock,
        preview: "Isolated actual-component fixture preview",
        results,
        errors,
        requests,
      },
      null,
      2,
    ),
  );
  console.log(`${phase}: ${results.length} Staff Home cells passed; no network/database contact.`);
} finally {
  await browser.close();
}
