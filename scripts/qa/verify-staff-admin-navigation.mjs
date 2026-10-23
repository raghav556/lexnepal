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
import { verifyPortalSearch } from "./verify-portal-search.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const phase = process.argv[2];
const searchOnly = process.argv.includes("--search-only");
assert(
  ["before", "after"].includes(phase),
  "Use before or after; no live application is contacted",
);
const qaRoot = path.join(root, ".local/qa");
const artifactRoot = path.resolve(
  process.env.STAFF_ADMIN_NAV_ARTIFACT_DIR ?? path.join(qaRoot, "session-2/navigation"),
);
const relative = path.relative(qaRoot, artifactRoot);
assert(
  relative && !relative.startsWith("..") && !path.isAbsolute(relative),
  "Navigation evidence must stay in a dedicated ignored QA directory",
);
const artifacts = path.join(artifactRoot, phase);
fs.mkdirSync(artifacts, { recursive: true });
const require = createRequire(path.join(root, "package.json"));
const adapters = path.join(root, "tests/navigation/adapters.tsx");
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
  entryPoints: [path.join(root, "tests/navigation/fixture.tsx")],
  absWorkingDir: root,
  bundle: true,
  write: false,
  outdir: path.join(artifacts, "bundle"),
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"test"', "process.env": "{}" },
  plugins: [
    {
      name: "isolated-navigation",
      setup(builder) {
        builder.onResolve({ filter: /^(?:react|react-dom)(?:\/.*)?$/ }, (args) => ({
          path: require.resolve(args.path),
        }));
        builder.onResolve({ filter: /^(?:@\/|next\/)/ }, (args) => {
          const key = args.path.replace(/\.(tsx?|jsx?)$/, "");
          if (
            searchOnly &&
            phase === "before" &&
            key === "@/components/dashboard/global-search-palette"
          )
            return {
              path: path.join(
                root,
                ".local/qa/session-3/starting/src/components/dashboard/global-search-palette.tsx",
              ),
            };
          if (replacements.has(key) || key.startsWith("@/client/queries/"))
            return { path: adapters };
          if (key === "next/dynamic") return { path: key, namespace: "navigation-dynamic" };
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
        builder.onLoad({ filter: /.*/, namespace: "navigation-dynamic" }, () => ({
          contents:
            "import React from 'react'; export default load => { const Component = React.lazy(() => load().then(value => ({default: value.default ?? value}))); return props => React.createElement(React.Suspense, {fallback:null}, React.createElement(Component, props)); };",
          loader: "js",
        }));
      },
    },
  ],
});
assert.equal(bundle.warnings.length, 0);
const compiled = await postcss([tailwind({ base: root, optimize: false })]).process(
  fs.readFileSync(path.join(root, "src/index.css"), "utf8"),
  { from: path.join(root, "src/index.css") },
);
const css = postcss.parse(compiled.css);
css.walkAtRules("import", (rule) => {
  if (rule.params.startsWith("url(")) rule.remove();
});
const js = bundle.outputFiles.find((file) => file.path.endsWith(".js")).text;
css.append(bundle.outputFiles.find((file) => file.path.endsWith(".css")).text);
fs.writeFileSync(path.join(artifacts, "fixture.js"), js);
fs.writeFileSync(path.join(artifacts, "fixture.css"), css.toString());
if (process.argv.includes("--build-only")) {
  console.log("Built the isolated current component bundle; no live application contacted.");
  process.exit(0);
}
const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];
const requests = [];
const html =
  '<!doctype html><html lang="en"><head><title>Isolated navigation QA</title></head><body><div id="root"></div></body></html>';
async function mount(page, portal, dark) {
  await page.goto(`https://navigation.invalid/${portal}`);
  await page.clock.setFixedTime(new Date("2026-09-18T04:15:00.000Z"));
  await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), dark);
  await page.addStyleTag({ content: css.toString() });
  await page.addScriptTag({ content: js });
  await page.evaluate((portal) => window.renderNavigationFixture(portal), portal);
  await page.locator(`#${portal}-main-canvas`).waitFor();
}
async function expandAll(scope) {
  const buttons = scope.locator('button[aria-expanded="false"][aria-controls]');
  while (await buttons.count()) await buttons.first().click();
}
async function destinations(scope) {
  return [
    ...new Set(
      await scope
        .locator("a[href]")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))),
    ),
  ].sort();
}
try {
  for (const portal of searchOnly ? [] : ["staff", "admin"])
    for (const dark of [false, true])
      for (const width of [360, 390, 768, 1024, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 844 },
          reducedMotion: "reduce",
          locale: "en-GB",
          timezoneId: "Asia/Kathmandu",
        });
        await context.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if (url.origin === "https://navigation.invalid" && route.request().isNavigationRequest())
            return route.fulfill({ contentType: "text/html", body: html });
          requests.push(route.request().url());
          return route.abort();
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => errors.push(error.message));
        const name = `${portal}-${dark ? "dark" : "light"}-${width}`;
        const row = { portal, dark, width, checks: [], defects: [] };
        results.push(row);
        try {
          await mount(page, portal, dark);
          await page.screenshot({ path: path.join(artifacts, name + "-closed.png") });
          const toggle = page.getByRole("button", {
            name:
              phase === "after"
                ? new RegExp(`^(Open|Close) ${portal === "staff" ? "Staff" : "Admin"} navigation$`)
                : /^(Toggle menu|(Open|Close) (Staff|Admin) navigation)$/,
            exact: true,
          });
          if (width < 768) {
            if (portal === "staff") {
              const bar =
                phase === "after"
                  ? page.getByRole("navigation", { name: "Staff primary navigation" })
                  : page.locator("nav.fixed.bottom-0");
              const labels = await bar.locator("a").allTextContents();
              row.primaryLabels = labels.map((text) => text.trim());
              if (phase === "after") {
                assert(row.primaryLabels.every(Boolean));
                await expect(bar.locator('a[aria-current="page"]')).toHaveCount(1);
                const sizes = await bar.locator("a").evaluateAll((nodes) =>
                  nodes.map((node) => ({
                    width: node.getBoundingClientRect().width,
                    height: node.getBoundingClientRect().height,
                    overflow: node.scrollWidth > node.clientWidth,
                  })),
                );
                assert(
                  sizes.every((size) => size.width >= 44 && size.height >= 44 && !size.overflow),
                );
                row.checks.push("labelled primary links, current page, touch sizes");
              } else if (
                !row.primaryLabels.every(Boolean) ||
                !(await bar.locator('a[aria-current="page"]').count())
              ) {
                row.defects.push("unlabelled primary links or missing aria-current");
              }
            }
            await toggle.focus();
            await page.keyboard.press("Enter");
            await expect(toggle).toHaveAttribute("aria-expanded", "true");
            const drawer =
              phase === "after"
                ? page.getByRole("dialog", {
                    name: `${portal === "staff" ? "Staff" : "Admin"} navigation`,
                    exact: true,
                  })
                : page.locator(`#${await toggle.getAttribute("aria-controls")}`);
            await drawer.waitFor();
            if (phase === "after") {
              await expect
                .poll(() => drawer.evaluate((node) => node.contains(document.activeElement)))
                .toBe(true);
              if (portal === "admin") {
                assert((await drawer.locator("button[aria-controls][aria-expanded]").count()) >= 4);
                const branch = drawer.getByRole("button", { name: "Website Pages", exact: true });
                await branch.click();
                await expect(branch).toHaveAttribute("aria-expanded", "true");
                await drawer.locator('a[href="/admin/cms/navigation"]').click();
                await expect(drawer).toHaveCount(0);
                await toggle.click();
                await expect(
                  drawer.getByRole("button", { name: "Website Pages", exact: true }),
                ).toHaveAttribute("aria-expanded", "true");
                await expect(drawer.locator('a[href="/admin/cms/navigation"]')).toHaveAttribute(
                  "aria-current",
                  "page",
                );
                await page.goBack();
                await expect(drawer).toHaveCount(0);
                await toggle.click();
                row.checks.push("group expansion, deep active branch, browser back closes drawer");
              }
              await page.screenshot({ path: path.join(artifacts, name + "-hierarchy.png") });
              await expandAll(drawer.locator("nav"));
              const labels = await drawer.locator("nav .truncate").evaluateAll((nodes) =>
                nodes
                  .filter((node) => node.textContent.length > 16)
                  .map((node) => ({
                    space: getComputedStyle(node).whiteSpace,
                    overflow: node.scrollWidth > node.clientWidth + 1,
                  })),
              );
              assert(
                labels.every((label) => label.space === "normal" && !label.overflow),
                "Long navigation labels must wrap",
              );
              const first = drawer.getByRole("button", { name: "Close dialog", exact: true });
              const last = drawer.locator("button").last();
              await last.focus();
              await page.keyboard.press("Tab");
              await expect(first).toBeFocused();
              await page.keyboard.press("Shift+Tab");
              await expect(last).toBeFocused();
              const bounds = await last.evaluate((node) => ({
                bottom: node.getBoundingClientRect().bottom,
                paneBottom: node.closest('[role="dialog"]').getBoundingClientRect().bottom,
              }));
              assert(bounds.bottom <= bounds.paneBottom + 1);
              row.checks.push(
                "initial focus, forward/reverse focus trap, scroll reaches account controls",
              );
            } else {
              if ((await drawer.getAttribute("role")) !== "dialog")
                row.defects.push("non-modal drawer has no focus entry or trap");
              if (
                portal === "admin" &&
                !(await drawer.locator("button[aria-controls][aria-expanded]").count())
              )
                row.defects.push("flat mobile menu omits branch controls");
            }
            row.destinations = await destinations(drawer);
            await page.screenshot({ path: path.join(artifacts, name + "-drawer.png") });
            await page.keyboard.press("Escape");
            await expect(toggle).toHaveAttribute("aria-expanded", "false");
            if (phase === "after") {
              await expect(toggle).toBeFocused();
              await toggle.click();
              await drawer.locator(`nav a[href="/${portal}/cases"]`).click();
              await expect(drawer).toHaveCount(0);
              await expect(page).toHaveURL(new RegExp(`/${portal}/cases$`));
              if (portal === "staff")
                await expect(
                  page
                    .getByRole("navigation", { name: "Staff primary navigation" })
                    .locator('a[href="/staff/cases"]'),
                ).toHaveAttribute("aria-current", "page");
              await toggle.click();
              await page.goBack();
              await expect(drawer).toHaveCount(0);
              await toggle.click();
              await page.setViewportSize({ width: 768, height: 844 });
              await expect(drawer).toHaveCount(0);
              await expect(page.locator(`#${portal}-main-canvas`)).toBeFocused();
              await page.setViewportSize({ width, height: 844 });
              await expect(toggle).toHaveAttribute("aria-expanded", "false");
              await toggle.click();
              await drawer.getByRole("button", { name: "Close dialog", exact: true }).click();
              await expect(toggle).toBeFocused();
              row.checks.push("Escape/close focus return, route selection, responsive dismissal");
              await toggle.click();
              await page.keyboard.press("Control+k");
              await expect(drawer).toHaveCount(0);
              const search = page.getByRole("dialog", {
                name: "Global Search and Command Palette",
                exact: true,
              });
              await expect(search).toBeVisible();
              await expect(
                search.getByRole("combobox", { name: "Search query", exact: true }),
              ).toBeFocused();
              await page.keyboard.press("Tab");
              assert(
                await search.evaluate((node) => node.contains(document.activeElement)),
                "Search must retain keyboard focus after drawer closes",
              );
              await page.keyboard.press("Escape");
              await expect(search).toHaveCount(0);
              row.checks.push("existing search shortcut closes drawer and retains palette focus");
              const headerAudit = await new AxeBuilder({ page })
                .include(".portal-operational-header")
                .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
                .analyze();
              row.headerAxe = headerAudit.violations.map((v) => ({
                id: v.id,
                impact: v.impact,
                targets: v.nodes.map((n) => n.target),
              }));
              assert.equal(
                row.headerAxe.filter((v) => ["serious", "critical"].includes(v.impact)).length,
                0,
                JSON.stringify(row.headerAxe),
              );
              await page
                .getByRole("button", { name: "Switch language to Nepali", exact: true })
                .click();
              if (portal === "staff") {
                const bar = page.getByRole("navigation", { name: "Staff primary navigation" });
                const overflow = await bar
                  .locator("a")
                  .evaluateAll((nodes) =>
                    nodes.some((node) => node.scrollWidth > node.clientWidth),
                  );
                assert(!overflow, "Translated primary labels must fit");
              }
              await page.screenshot({ path: path.join(artifacts, name + "-nepali.png") });
              await page
                .getByRole("button", { name: "Switch language to English", exact: true })
                .click();
              await toggle.click();
              await expandAll(drawer.locator("nav"));
              const analysis = await new AxeBuilder({ page })
                .include(".portal-operational-drawer")
                .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
                .analyze();
              row.axe = analysis.violations.map((v) => ({
                id: v.id,
                impact: v.impact,
                targets: v.nodes.map((n) => n.target),
              }));
              assert.equal(
                row.axe.filter((v) => ["serious", "critical"].includes(v.impact)).length,
                0,
                JSON.stringify(row.axe),
              );
              await page.keyboard.press("Escape");
            }
          } else {
            await expect(toggle).toBeHidden();
            const sidebar = page.locator("aside");
            await expandAll(sidebar.locator("nav"));
            row.destinations = await destinations(sidebar);
            const first = sidebar.locator("nav a").first();
            await first.focus();
            if (phase === "after") {
              const focus = await first.evaluate((node) => ({
                outline: getComputedStyle(node).outlineStyle,
                shadow: getComputedStyle(node).boxShadow,
              }));
              assert(
                focus.outline !== "none" || focus.shadow !== "none",
                "Desktop link focus must be visible",
              );
              const analysis = await new AxeBuilder({ page })
                .include("aside nav")
                .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
                .analyze();
              row.axe = analysis.violations.map((v) => ({
                id: v.id,
                impact: v.impact,
                targets: v.nodes.map((n) => n.target),
              }));
              assert.equal(
                row.axe.filter((v) => ["serious", "critical"].includes(v.impact)).length,
                0,
                JSON.stringify(row.axe),
              );
              row.checks.push("desktop hierarchy and visible keyboard focus");
            }
          }
          assert(
            row.destinations.every(
              (href) => href === `/${portal}` || href.startsWith(`/${portal}/`),
            ),
            "Role navigation boundary",
          );
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          );
          assert(overflow <= 1, `Document overflow: ${overflow}`);
          row.checks.push("role paths preserved, no horizontal page scrolling");
          if (phase === "after") {
            await page.evaluate(
              (portal) => window.renderNavigationFixture(portal, "client"),
              portal,
            );
            await expect(page.locator('[data-portal-gate="wrong-role"]')).toBeVisible();
            await expect(page.locator(`#${portal}-main-canvas`)).toHaveCount(0);
            row.checks.push("real UI role guard denies a mismatched synthetic identity");
          }
          if (phase === "after") {
            const before = JSON.parse(
              fs.readFileSync(path.join(artifactRoot, "before/results.json"), "utf8"),
            );
            const prior = before.find(
              (item) => item.portal === portal && item.dark === dark && item.width === width,
            );
            assert.deepEqual(row.destinations, prior.destinations, "Destination inventory changed");
          }
          row.status = "passed";
        } catch (error) {
          row.status = "failed";
          row.error = error.stack;
          await page.screenshot({ path: path.join(artifacts, name + "-failure.png") });
        } finally {
          await context.close();
        }
        console.log(`${row.status}: ${name}${row.error ? " — " + row.error.split("\n")[0] : ""}`);
      }
  if (searchOnly)
    await verifyPortalSearch({ browser, js, css: css.toString(), artifacts, phase, artifactRoot });
} finally {
  await browser.close();
}
if (!searchOnly) {
  fs.writeFileSync(path.join(artifacts, "results.json"), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(artifacts, "isolation.json"),
    JSON.stringify(
      {
        errors,
        requests,
        authenticated: false,
        queryAdapters: "existing CUI-19 test adapters; browser history transport",
        fonts: "offline fallback; approved fonts not substituted or fetched",
      },
      null,
      2,
    ),
  );
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.equal(requests.length, 0, "Unexpected external network request");
  assert(
    results.every((row) => row.status === "passed"),
    "Navigation matrix has failures; inspect results.json",
  );
  console.log(
    `${results.length} navigation cells verified; phase=${phase}; authenticated E2E remains separate.`,
  );
}
