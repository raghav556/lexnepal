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
  process.env.CASE_DETAIL_ARTIFACT_DIR ?? path.join(root, ".local/qa/session-06/component"),
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
    ["@/views/staff/StaffCaseDetailPage", "StaffCaseDetailPage.tsx"],
    ["@/components/cases/case-hearing-dialog", "case-hearing-dialog.tsx"],
    ["@/app/(staff)/layout", "layout.tsx"],
    ["@/components/messages/MatterChatPanel", "MatterChatPanel.tsx"],
    ["@/components/cases/case-parties-editor", "case-parties-editor.tsx"],
    ["@/components/ui/confirm-dialog", "confirm-dialog.tsx"],
  ]);
  const output = await build({
    entryPoints: [path.join(root, "tests/case-detail/fixture.tsx")],
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
          if (phase === "before") {
            builder.onResolve({ filter: /^\.\/portal-topbar(?:\.tsx)?$/ }, (args) =>
              args.importer === path.join(root, "src/components/dashboard/index.ts")
                ? {
                    path: path.join(
                      root,
                      ".local/qa/session-06/fidelity/starting/src/components/dashboard/portal-topbar.tsx",
                    ),
                  }
                : undefined,
            );
          }
          builder.onResolve({ filter: /^\.\/button\.tsx$/ }, (args) =>
            args.importer === path.join(root, ".local/qa/session-06/starting/pagination.tsx")
              ? { path: path.join(root, "src/components/ui/button.tsx") }
              : undefined,
          );
          builder.onResolve({ filter: /^(?:react|react-dom)(?:\/.*)?$/ }, (args) => ({
            path: require.resolve(args.path),
          }));
          builder.onResolve({ filter: /^(?:@\/|next\/)/ }, (args) => {
            const key = args.path.replace(/\.(tsx?|jsx?)$/, "");
            if (phase === "before" && old.has(key))
              return { path: path.join(root, ".local/qa/session-06/starting", old.get(key)) };
            if (
              replacements.has(key) ||
              (key.startsWith("@/client/queries/") &&
                !["@/client/queries/case-query-error", "@/client/queries/query-keys"].includes(key))
            )
              return { path: path.join(root, "tests/case-detail/adapters.tsx") };
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
    phase === "before" ? ".local/qa/session-06/starting/index.css" : "src/index.css";
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
if (fs.existsSync(path.join(root, ".local/qa/session-06/starting/StaffCaseDetailPage.tsx")))
  bundles.before = await bundle("before");
// Diagnostic replay uses the same original bundle twice; it does not verify current UI.
const baselineReplay = process.argv.includes("--admin-baseline-replay");
if (baselineReplay) {
  assert(bundles.before, "Baseline snapshot required for baseline-only replay");
  bundles.after = bundles.before;
}
for (const [phase, result] of Object.entries(bundles))
  for (const [type, content] of Object.entries(result))
    fs.writeFileSync(path.join(artifacts, `${phase}.${type}`), content);
if (process.argv.includes("--build-only")) process.exit(0);

const browser = await chromium.launch({
    headless: true,
    args: ["--disable-gpu", "--force-color-profile=srgb"],
  }),
  results = [],
  errors = [],
  requests = [];
const tabs = [
  "Overview",
  "Tasks & SOPs",
  "Hearings",
  "Messages",
  "Digital Misl (Files)",
  "Parties & Counsel",
  "Timeline",
];
const commandsOnly = process.argv.includes("--commands-only");
const adminOnly = process.argv.includes("--admin-only");
const adminReview = process.argv.includes("--admin-review");
async function mount(role, width, dark, state = "populated", phase = "after", query = "", brand) {
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 1000 },
    locale: "en-GB",
    timezoneId: "Asia/Kathmandu",
    reducedMotion: "reduce",
  });
  await context.route("**/*", (r) =>
    r.request().isNavigationRequest() &&
    new URL(r.request().url()).origin === "https://case-detail.invalid"
      ? r.fulfill({
          contentType: "text/html",
          body: '<!doctype html><html lang="en"><head><title>Isolated actual Case Details</title></head><body><div id="root"></div></body></html>',
        })
      : (requests.push(r.request().url()), r.abort()),
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`https://case-detail.invalid/${role}/cases/synthetic-case-detail${query}`);
  await page.clock.setFixedTime(new Date("2026-10-14T04:00:00Z"));
  await page.evaluate((d) => document.documentElement.classList.toggle("dark", d), dark);
  await page.addStyleTag({
    content:
      bundles[phase].css +
      "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}",
  });
  await page.addScriptTag({ content: bundles[phase].js });
  await page.evaluate(({ role, state, brand }) => window.renderCaseDetail(role, state, brand), {
    role,
    state,
    brand,
  });
  await page.locator(`[data-portal="${role}"]`).first().waitFor();
  if (role === "staff" && phase === "after" && state === "populated")
    await expect(page.locator('[aria-label="Breadcrumb"] [aria-current="page"]')).toHaveText(
      "TEST-MATTER-006",
    );
  await page.evaluate(() => document.fonts.ready);
  return { context, page, main: page.locator(`#${role}-main-canvas`) };
}
async function picture(page, name) {
  await page.mouse.move(0, 0);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const capture = async () =>
    require("node:crypto")
      .createHash("sha256")
      .update(await page.screenshot({ path: path.join(artifacts, name + ".png") }))
      .digest("hex");
  let previous = await capture();
  for (let attempt = 0; attempt < 10; attempt++) {
    await page.waitForTimeout(100);
    const current = await capture();
    if (current === previous) return current;
    previous = current;
  }
  assert.fail(`Screenshot did not settle: ${name}`);
}
async function openTab(page, name) {
  await page.getByRole("tab", { name, exact: true }).click();
  await expect(page.getByRole("tabpanel")).toBeVisible();
}
async function presentation(page, main) {
  return main.evaluate((root) =>
    Array.from(root.querySelectorAll("*"))
      .filter((node) => node.getClientRects().length)
      .map((node) => {
        const style = getComputedStyle(node),
          rect = node.getBoundingClientRect();
        return {
          tag: node.tagName,
          text: node.childElementCount ? undefined : node.textContent?.replace(/\s+/g, " ").trim(),
          rect: [rect.x, rect.y, rect.width, rect.height],
          style: Object.fromEntries(
            [
              "color",
              "backgroundColor",
              "borderColor",
              "borderWidth",
              "borderRadius",
              "fontFamily",
              "fontSize",
              "fontWeight",
              "lineHeight",
              "letterSpacing",
              "padding",
              "margin",
              "opacity",
              "outline",
              "boxShadow",
              "display",
            ].map((property) => [property, style[property]]),
          ),
        };
      }),
  );
}
async function compareAdminImages(before, after, page) {
  if (before.hash === after.hash) return { changedPixels: 0, maxDelta: 0 };
  const result = await page.evaluate(
    async (images) => {
      const decode = async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        return {
          width: image.width,
          height: image.height,
          pixels: context.getImageData(0, 0, image.width, image.height).data,
        };
      };
      const [a, b] = await Promise.all(images.slice(0, 2).map(decode));
      let changedPixels = 0,
        outsideRoundedCorners = 0,
        maxDelta = 0,
        alphaDelta = 0;
      for (let i = 0; i < a.pixels.length; i += 4) {
        let changed = false;
        for (let channel = 0; channel < 4; channel++) {
          const delta = Math.abs(a.pixels[i + channel] - b.pixels[i + channel]);
          changed ||= delta !== 0;
          if (channel === 3) alphaDelta = Math.max(alphaDelta, delta);
          else maxDelta = Math.max(maxDelta, delta);
        }
        if (changed) {
          changedPixels++;
          const x = (i / 4) % a.width,
            y = Math.floor(i / 4 / a.width);
          const withinCorner = images[2].some(({ rect, radius }) => {
            const [left, top, width, height] = rect;
            const right = left + width,
              bottom = top + height,
              inset = radius + 4;
            return (
              ((x >= left - 4 && x <= left + inset) || (x >= right - inset && x <= right + 4)) &&
              ((y >= top - 4 && y <= top + inset) || (y >= bottom - inset && y <= bottom + 4))
            );
          });
          if (!withinCorner) outsideRoundedCorners++;
        }
      }
      return {
        size: [a.width, a.height],
        otherSize: [b.width, b.height],
        changedPixels,
        outsideRoundedCorners,
        maxDelta,
        alphaDelta,
      };
    },
    [
      ...[before, after].map(
        ({ name }) =>
          "data:image/png;base64," +
          fs.readFileSync(path.join(artifacts, name + ".png")).toString("base64"),
      ),
      before.presentation
        .filter((item) => parseFloat(item.style.borderRadius) > 0)
        .map((item) => ({
          rect: item.rect,
          radius: Math.min(parseFloat(item.style.borderRadius), item.rect[2] / 2, item.rect[3] / 2),
        })),
    ],
  );
  assert.deepEqual(result.size, result.otherSize);
  // Replaying 110 unchanged baseline frames produces up to two RGB rounding steps at
  // form corners. Require exact computed layout/styles above and restrict this
  // measured browser variance to <= 2/255 RGB only at existing rounded corners.
  // Every other pixel and all alpha must match exactly. No
  // text, geometry, theme or accessibility threshold is relaxed.
  assert(
    result.alphaDelta === 0 && result.maxDelta <= 2 && result.outsideRoundedCorners === 0,
    `Admin image differs: ${JSON.stringify(result)}`,
  );
  return result;
}
async function dismiss(page, opener, title) {
  await opener.click();
  const dialog = page.getByRole("dialog", { name: title, exact: true });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press("Tab");
    assert(await dialog.evaluate((n) => n.contains(document.activeElement)));
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
}
try {
  if (!commandsOnly && !adminOnly) {
    for (const dark of [false, true])
      for (const width of [1440, 1024, 768, 390, 360]) {
        const { context, page, main } = await mount("staff", width, dark);
        const tablist = page.getByRole("tablist", { name: "Case sections" });
        await expect(tablist.getByRole("tab")).toHaveCount(7);
        await page.getByRole("tab", { name: "Overview", exact: true }).focus();
        for (let i = 1; i < 7; i++) {
          await page.keyboard.press("ArrowRight");
          await expect(page.getByRole("tab", { name: tabs[i], exact: true })).toBeFocused();
          await expect(page.getByRole("tab", { name: tabs[i], exact: true })).toHaveAttribute(
            "aria-selected",
            "true",
          );
        }
        await page.keyboard.press("Home");
        await expect(page.getByRole("tab", { name: "Overview", exact: true })).toBeFocused();
        await page.keyboard.press("End");
        await expect(page.getByRole("tab", { name: "Timeline", exact: true })).toBeFocused();
        for (const name of tabs) {
          await openTab(page, name);
          assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
          const violations = (
            await new AxeBuilder({ page }).include("#staff-main-canvas").analyze()
          ).violations;
          assert.equal(
            violations.length,
            0,
            JSON.stringify({
              width,
              dark,
              name,
              violations: violations.map((v) => ({
                id: v.id,
                targets: v.nodes.map((n) => n.target),
              })),
            }),
          );
          await picture(
            page,
            `staff-${dark ? "dark" : "light"}-${width}-${name.replaceAll(/[^a-z]+/gi, "-").toLowerCase()}`,
          );
        }
        await openTab(page, "Overview");
        await expect(main.getByText("Synthetic opposing counsel", { exact: true })).toBeVisible();
        await expect(
          main.getByText("Synthetic client summary of the next procedural step.", { exact: true }),
        ).toBeVisible();
        await main.getByRole("button", { name: "Edit details", exact: true }).click();
        await page.getByLabel("Court", { exact: true }).fill("Unsaved synthetic court");
        await expect(page.getByLabel("Court", { exact: true })).toBeFocused();
        await main.getByRole("button", { name: "Cancel", exact: true }).click();
        await openTab(page, "Tasks & SOPs");
        await expect(
          page.getByRole("checkbox", { name: /Completion: Synthetic prepare/ }),
        ).not.toBeChecked();
        await expect(
          page.getByRole("checkbox", { name: /Completion: Synthetic completed/ }),
        ).toBeChecked();
        await expect(
          page.getByRole("checkbox", { name: /Completion: Synthetic cancelled/ }),
        ).toBeDisabled();
        await openTab(page, "Hearings");
        await dismiss(
          page,
          main.getByRole("button", { name: "Schedule hearing", exact: true }),
          "Schedule hearing",
        );
        await openTab(page, "Messages");
        await main.getByRole("button", { name: "Case Team", exact: true }).click();
        await expect(main.getByRole("button", { name: "Case Team", exact: true })).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await expect(page.getByRole("log")).toContainText("Synthetic private team strategy");
        await expect(page.getByRole("log")).not.toContainText(
          "Synthetic client-visible procedural update",
        );
        await main.getByRole("button", { name: "Client", exact: true }).click();
        await expect(page.getByRole("log")).toContainText(
          "Synthetic client-visible procedural update",
        );
        await openTab(page, "Digital Misl (Files)");
        const binder = main.getByRole("button", { name: /Pleadings \(Firad\/Pratiuttar\)/ });
        await expect(binder).toHaveAttribute("aria-expanded", "true");
        await binder.focus();
        await page.keyboard.press("Space");
        await expect(binder).toHaveAttribute("aria-expanded", "false");
        await page.keyboard.press("Enter");
        await expect(binder).toHaveAttribute("aria-expanded", "true");
        await dismiss(
          page,
          main.getByRole("button", { name: "Upload File", exact: true }),
          "Upload to Digital Misl",
        );
        await openTab(page, "Parties & Counsel");
        await expect(main.getByText("client@example.test", { exact: false })).toBeVisible();
        await dismiss(
          page,
          main.getByRole("button", { name: "Add Party", exact: true }),
          "Add party",
        );
        await page.evaluate(() => window.setDetailLanguage("ne"));
        await expect.poll(() => main.innerText()).toMatch(/[०-९]/);
        results.push({
          kind: "Staff seven-tab interactions",
          width,
          dark,
          tabs: 7,
          axeScans: 7,
          dialogChecks: 3,
        });
        await context.close();
        console.log(
          `PASS Staff details ${width} ${dark ? "dark" : "light"}: seven tabs/keyboard/Axe/dialogs/streams/binders`,
        );
      }
    // Unavailable states use test adapters only.
    for (const dark of [false, true])
      for (const state of ["empty", "loading", "error", "forbidden", "missing"]) {
        const { context, page, main } = await mount("staff", 390, dark, state);
        if (state === "loading")
          await expect(main.getByText("Loading matter…", { exact: true })).toBeVisible();
        if (state === "empty") {
          for (const name of tabs) {
            await openTab(page, name);
            await picture(
              page,
              `staff-${dark ? "dark" : "light"}-empty-${name.replaceAll(/[^a-z]+/gi, "-")}`,
            );
          }
          await expect(main.getByText("Case Registered", { exact: true })).toBeVisible();
        }
        if (state === "error" || state === "forbidden") {
          await expect(
            main.getByRole("heading", {
              name: state === "error" ? "Could not load this case" : "Access denied",
              level: 1,
              exact: true,
            }),
          ).toBeVisible();
          await main.getByRole("button", { name: "Try again" }).click();
          await expect(page.getByRole("tab", { name: "Overview", exact: true })).toBeVisible();
        }
        if (state === "missing")
          await expect(
            main.getByRole("heading", { name: "Case not found", exact: true, level: 1 }),
          ).toBeVisible();
        await picture(page, `staff-${dark ? "dark" : "light"}-390-${state}`);
        results.push({ kind: "Staff query state", state, dark });
        await context.close();
      }
    for (const value of [
      "overview",
      "tasks",
      "hearings",
      "messages",
      "misl",
      "parties",
      "timeline",
    ]) {
      const { context, page } = await mount(
        "staff",
        390,
        false,
        "populated",
        "after",
        `?tab=${value}${value === "messages" ? "&mode=team" : ""}`,
      );
      const selected = page.getByRole("tab", { selected: true });
      assert.equal(
        await selected.innerText(),
        tabs[
          ["overview", "tasks", "hearings", "messages", "misl", "parties", "timeline"].indexOf(
            value,
          )
        ],
      );
      if (value === "messages")
        await expect(page.getByRole("log")).toContainText("Synthetic private team strategy");
      results.push({ kind: "URL tab/mode", value });
      await context.close();
    }
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
        const { context, page, main } = await mount(
          "staff",
          1440,
          dark,
          "populated",
          "after",
          "",
          brand,
        );
        const active = page.getByRole("tab", { selected: true });
        await active.focus();
        const ratios = await main.evaluate((n) => {
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
          const lum = (a) =>
            a
              .map((c) => {
                const v = c / 255;
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
              })
              .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
          const ratio = (a, b) =>
            (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
          const t = n.querySelector("[role=tab][aria-selected=true]"),
            s = getComputedStyle(t),
            panel = getComputedStyle(t.parentElement).backgroundColor;
          const marker = document.createElement("span");
          marker.style.color = "var(--dashboard-focus)";
          n.append(marker);
          const focus = getComputedStyle(marker).color;
          marker.remove();
          return {
            selectedText: ratio(
              paint(panel, s.backgroundColor, s.color),
              paint(panel, s.backgroundColor),
            ),
            focus: ratio(paint(panel, s.backgroundColor, focus), paint(panel, s.backgroundColor)),
          };
        });
        assert(
          ratios.selectedText >= 4.5 && ratios.focus >= 3,
          JSON.stringify({ brand, dark, ratios }),
        );
        await openTab(page, "Messages");
        assert.equal(
          (await new AxeBuilder({ page }).include("#staff-main-canvas").analyze()).violations
            .length,
          0,
        );
        results.push({ kind: "CMS contrast", brand: brand ?? "default", dark, ratios });
        await context.close();
      }
  }
  // Real components and callbacks, in-memory commands only. No owner data writes.
  for (const role of adminOnly ? [] : ["staff", "admin"]) {
    const { context, page, main } = await mount(role, 390, false);
    const commands = (kind) =>
      page.evaluate(
        (k) =>
          window
            .detailEvidence()
            .filter((e) => e.kind === k)
            .map((e) => e.args),
        kind,
      );
    await main.getByRole("button", { name: "Edit details", exact: true }).click();
    const editor = main
      .locator('[data-slot="dashboard-section"]')
      .filter({ has: page.getByRole("heading", { name: "Quick editor", exact: true }) });
    const court = editor.locator('input:not([type="checkbox"])').first();
    await court.fill("Synthetic saved court");
    await page
      .getByLabel("Internal Case Description", { exact: true })
      .fill("Synthetic changed internal note");
    await page
      .getByLabel("Client-visible Summary", { exact: true })
      .fill("Synthetic separate client note");
    await page.getByRole("combobox", { name: "Status", exact: true }).click();
    await page.getByRole("option", { name: "Closed", exact: true }).click();
    await page.getByRole("combobox", { name: "Closure outcome", exact: true }).click();
    await page.getByRole("option", { name: "Won", exact: true }).click();
    await page.getByRole("combobox", { name: "Responsible Lawyer", exact: true }).click();
    await expect(
      page.getByRole("option", { name: "Excluded Client User", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("option", { name: "Synthetic Nabin Shrestha", exact: true }).click();
    await page.evaluate(() => window.rejectDetailCommand());
    await main.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Synthetic command rejected", { exact: true })).toBeVisible();
    await expect(editor).toBeVisible();
    await main.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor).toHaveCount(0);
    const updates = await commands("case-update");
    assert.equal(updates.length, 2);
    assert.equal(updates[1].input.status, "closed");
    assert.equal(updates[1].input.closureOutcome, "won");
    assert.equal(updates[1].input.description, "Synthetic changed internal note");
    assert.equal(updates[1].input.clientSummary, "Synthetic separate client note");
    assert.deepEqual(
      new Set(updates[1].input.teamMemberIds),
      new Set(["synthetic-lawyer", "synthetic-paralegal"]),
    );
    await openTab(page, "Tasks & SOPs");
    const taskTitle =
      role === "staff"
        ? page.getByRole("textbox", { name: "New task title" })
        : main.getByPlaceholder("Quick add ad-hoc task...");
    await taskTitle.fill("  Synthetic new task  ");
    await page.getByLabel("Due Date (AD)").fill("2026-11-06");
    const taskBs = await page.getByLabel("Due Date (BS)").inputValue();
    assert(taskBs.length > 0);
    await main.getByRole("button", { name: "Add", exact: true }).click();
    await expect(taskTitle).toHaveValue("");
    const created = (await commands("task-create"))[0];
    assert.equal(created.title, "Synthetic new task");
    assert.equal(created.dueDate, "2026-11-06");
    assert.equal(created.dueDateBs, taskBs);
    assert.equal(created.priority, "medium");
    assert.equal(created.caseId, "synthetic-case-detail");
    assert.equal(created.assignedTo, "navigation-fixture");
    const completion = main.locator('input[type="checkbox"]').first();
    await completion.click();
    await expect(completion).toBeChecked();
    await completion.click();
    await expect(completion).not.toBeChecked();
    assert.deepEqual(
      (await commands("task-update")).map((c) => c.status),
      ["done", "in_progress"],
    );
    await main.getByRole("button", { name: /Synthetic litigation preparation/ }).click();
    await expect(
      main.getByRole("button", { name: /Synthetic litigation preparation/ }),
    ).toBeEnabled();
    assert.deepEqual((await commands("sop"))[0], [
      "synthetic-sop",
      "synthetic-case-detail",
      "navigation-fixture",
    ]);
    await openTab(page, "Hearings");
    const schedule = main.getByRole("button", { name: "Schedule hearing", exact: true });
    await schedule.click();
    let dialog = page.getByRole("dialog", { name: "Schedule hearing", exact: true });
    await dialog.getByLabel("Date (AD)").fill("2026-11-06");
    const hearingBs = await dialog.getByLabel("Date (BS)").inputValue();
    await dialog.getByLabel("Time", { exact: true }).fill("09:30");
    await dialog.getByLabel("Purpose").fill("Synthetic review hearing");
    await page.evaluate(() => window.rejectDetailCommand());
    await dialog.getByRole("button", { name: "Schedule hearing", exact: true }).click();
    await expect(
      dialog.getByRole("button", { name: "Schedule hearing", exact: true }),
    ).toBeEnabled();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Schedule hearing", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    assert.equal((await commands("hearing-create"))[1].dateBs, hearingBs);
    assert.equal((await commands("hearing-create"))[1].time, "09:30");
    await expect(schedule).toBeFocused();
    await openTab(page, "Messages");
    const message = page.getByRole("textbox", { name: "Message", exact: true }),
      send = page.getByRole("button", { name: "Send message", exact: true });
    await main.getByRole("button", { name: "Case Team", exact: true }).click();
    await message.fill("Synthetic private message");
    await page.evaluate(() => window.rejectDetailCommand());
    await send.click();
    await expect(send).toBeEnabled();
    await expect(message).toHaveValue("Synthetic private message");
    await message.press("Enter");
    await expect(message).toHaveValue("");
    await main.getByRole("button", { name: "Client", exact: true }).click();
    await message.fill("Synthetic public message");
    await send.click();
    await expect(message).toHaveValue("");
    assert.deepEqual(
      (await commands("message-send")).map((m) => m.isInternal),
      [true, true, false],
    );
    await openTab(page, "Digital Misl (Files)");
    await main.getByRole("button", { name: "Upload File", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Upload to Digital Misl", exact: true });
    await dialog.getByLabel("File", { exact: true }).evaluate((n) => {
      const data = new DataTransfer();
      data.items.add(
        new File([new ArrayBuffer(50 * 1024 * 1024 + 1)], "synthetic-too-large.pdf", {
          type: "application/pdf",
        }),
      );
      n.files = data.files;
      n.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await dialog.getByRole("button", { name: "Upload", exact: true }).click();
    await expect(page.getByText("Files cannot exceed 50 MB.", { exact: true })).toBeVisible();
    assert.equal((await commands("document-upload")).length, 0);
    await dialog.getByLabel("File", { exact: true }).setInputFiles({
      name: "Synthetic scanned upload.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF Synthetic QA"),
    });
    await dialog.getByLabel("Title", { exact: true }).fill("Synthetic scanned upload.pdf");
    await dialog.getByRole("button", { name: "Upload", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(main.getByText("Scanning — not on this Misl yet", { exact: true })).toBeVisible();
    const pending = main
      .getByText("Synthetic scanned upload.pdf", { exact: true })
      .locator("xpath=../..");
    await expect(pending.getByRole("button")).toHaveCount(0);
    await page.evaluate(() => window.setDetailIntent("rejected"));
    await expect(main.getByText("Rejected during scanning", { exact: true })).toBeVisible();
    await expect(pending.getByRole("button")).toHaveCount(0);
    await page.evaluate(() => window.setDetailIntent("promoted"));
    await expect(main.getByText("Scanning — not on this Misl yet", { exact: true })).toHaveCount(0);
    await expect(main.getByText("Synthetic scanned upload.pdf", { exact: true })).toBeVisible();
    await page.evaluate(() => {
      window.qaOpened = [];
      window.open = (...args) => {
        window.qaOpened.push(args);
        return null;
      };
    });
    const view =
      role === "staff"
        ? main.getByRole("button", {
            name: "View Synthetic complaint petition with a long legal document filename.pdf",
            exact: true,
          })
        : main.getByRole("button", { name: "View", exact: true }).first();
    await view.click();
    await expect.poll(() => commands("document-open")).toHaveLength(1);
    await expect.poll(() => page.evaluate(() => window.qaOpened.length)).toBe(1);
    assert.deepEqual(await page.evaluate(() => window.qaOpened[0]), [
      "https://document.invalid/synthetic-download",
      "_blank",
      "noopener,noreferrer",
    ]);
    await openTab(page, "Parties & Counsel");
    await main.getByRole("button", { name: "Add Party", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Add party", exact: true });
    await dialog.getByLabel("Name", { exact: false }).fill("Synthetic created party");
    await dialog.getByRole("checkbox", { name: "Visible to client", exact: true }).check();
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const party = (await commands("party-create"))[0];
    assert.equal(party.input.clientId, null);
    assert.equal(party.input.side, "other");
    assert.equal(party.input.partyType, "person");
    assert.equal(party.input.clientVisible, true);
    let partyRow = main
      .getByText("Synthetic created party", { exact: true })
      .locator("xpath=../..");
    await partyRow.getByRole("button", { name: "Edit", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Edit party", exact: true });
    await dialog.getByLabel("Role label").fill("Synthetic witness");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    assert.equal((await commands("party-update"))[0][2].roleLabel, "Synthetic witness");
    await partyRow.getByRole("button", { name: "Remove", exact: true }).click();
    const removeDialog = () =>
      role === "staff"
        ? page.getByRole("dialog", { name: "Remove party", exact: true })
        : page
            .getByRole("dialog")
            .filter({ has: page.getByRole("heading", { name: "Remove party", exact: true }) });
    dialog = removeDialog();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal((await commands("party-remove")).length, 0);
    await partyRow.getByRole("button", { name: "Remove", exact: true }).click();
    await removeDialog().getByRole("button", { name: "Remove", exact: true }).click();
    await expect(main.getByText("Synthetic created party", { exact: true })).toHaveCount(0);
    assert.equal((await commands("party-remove")).length, 1);
    if (role === "staff")
      await expect(main.getByRole("button", { name: "Add Party", exact: true })).toBeFocused();
    results.push({
      kind: "Mocked command workflows",
      role,
      caseUpdate: true,
      taskCreateAndToggle: true,
      sop: true,
      hearing: true,
      separateMessageStreams: true,
      uploadLimitAndScan: true,
      documentOpen: true,
      parties: true,
    });
    await context.close();
    console.log(`PASS ${role} mocked commands: case/tasks/SOP/hearing/messages/scan/parties`);
  }
  // Admin defaults: settled baseline/current presentation, all tabs and edit/dialogs.
  if (!commandsOnly && bundles.before)
    for (const dark of [false, true])
      for (const width of [1440, 1024, 768, 390, 360]) {
        if (adminReview && !((width === 1440 && !dark) || (width === 360 && dark))) continue;
        const captures = [];
        for (const phase of ["before", "after"]) {
          const { context, page, main } = await mount("admin", width, dark, "populated", phase);
          const frames = {};
          const frame = async (key, name) => {
            frames[key] = {
              name,
              hash: await picture(page, name),
              presentation: await presentation(page, main),
            };
          };
          for (const name of tabs) {
            await openTab(page, name);
            await page.waitForTimeout(150);
            await page
              .getByRole("tabpanel")
              .evaluate((n) => n.scrollIntoView({ block: "start", behavior: "instant" }));
            await page.waitForTimeout(100);
            await frame(
              name,
              `admin-${phase}-${dark ? "dark" : "light"}-${width}-${name.replaceAll(/[^a-z]+/gi, "-")}`,
            );
          }
          await openTab(page, "Overview");
          await main.getByRole("button", { name: "Edit details", exact: true }).click();
          await frame("editor", `admin-${phase}-${dark ? "dark" : "light"}-${width}-editor`);
          await main.getByRole("button", { name: "Cancel", exact: true }).click();
          for (const [tab, action, title] of [
            ["Hearings", "Schedule hearing", "Schedule hearing"],
            ["Digital Misl (Files)", "Upload File", "Upload to Digital Misl"],
            ["Parties & Counsel", "Add Party", "Add party"],
          ]) {
            await openTab(page, tab);
            await main.getByRole("button", { name: action, exact: true }).click();
            const dialog = page.getByRole("dialog", { name: title, exact: true });
            await expect(dialog).toBeVisible();
            const firstField = dialog.locator("input, textarea, select").first();
            await firstField.focus();
            await page.keyboard.press("Tab");
            await page.keyboard.press("Shift+Tab");
            await expect(firstField).toBeFocused();
            // Opener focus may scroll the inherited Admin canvas. Compare the
            // dialog against the same settled underlay in both source versions.
            await main.evaluate((n) => n.scrollTo({ top: 0, behavior: "instant" }));
            await expect.poll(() => main.evaluate((n) => n.scrollTop)).toBe(0);
            await page.waitForTimeout(100);
            await frame(
              action,
              `admin-${phase}-${dark ? "dark" : "light"}-${width}-${action.replaceAll(" ", "-")}`,
            );
            await page.keyboard.press("Escape");
          }
          captures.push(frames);
          await context.close();
        }
        const decoder = await browser.newPage();
        const comparisons = [];
        try {
          for (const key of Object.keys(captures[0])) {
            assert.deepEqual(
              captures[0][key].presentation,
              captures[1][key].presentation,
              `Admin layout/styles/content changed ${width} ${dark} ${key}`,
            );
          }
          fs.writeFileSync(
            path.join(artifacts, `admin-computed-${width}-${dark ? "dark" : "light"}.json`),
            JSON.stringify(
              {
                baselineReplay,
                width,
                dark,
                exactLayoutStylesContent: true,
                frames: Object.keys(captures[0]),
              },
              null,
              2,
            ),
          );
          for (const key of Object.keys(captures[0])) {
            try {
              comparisons.push({
                frame: key,
                ...(await compareAdminImages(captures[0][key], captures[1][key], decoder)),
              });
            } catch (error) {
              fs.writeFileSync(
                path.join(artifacts, "admin-image-failure.json"),
                JSON.stringify(
                  { baselineReplay, width, dark, frame: key, message: error.message },
                  null,
                  2,
                ),
              );
              error.message = `${width} ${dark ? "dark" : "light"} ${key}: ${error.message}`;
              throw error;
            }
          }
        } finally {
          await decoder.close();
        }
        results.push({
          kind: "Admin pixels",
          width,
          dark,
          pairs: 11,
          exactLayoutStylesContent: true,
          comparisons,
        });
        console.log(
          `PASS Admin details ${width} ${dark ? "dark" : "light"}: eleven layout/style/image comparisons`,
        );
      }
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  fs.writeFileSync(
    path.join(artifacts, "results.json"),
    JSON.stringify(
      {
        preview: baselineReplay
          ? "Baseline-only replay; not current implementation"
          : "Isolated actual-component fixture",
        results,
        errors,
        requests,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS ${results.length} Case Details cells; no external requests or database access.`,
  );
} finally {
  await browser.close();
}
