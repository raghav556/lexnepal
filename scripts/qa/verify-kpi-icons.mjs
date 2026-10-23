import fs from "node:fs";
import { spawnSync } from "node:child_process";

// Reuse the committed, fully intercepted actual-route fixture harness.
// The generated worker is ignored evidence, never a production route/component.
async function measureKpis() {
  return page.locator('main [data-slot="metric-card"]').evaluateAll((cards) =>
    cards.map((card) => {
      const icon = card.querySelector('[data-slot="metric-card-icon"]'),
        glyph = icon?.querySelector("svg");
      const rect = (e) => e?.getBoundingClientRect().toJSON();
      const s = icon && getComputedStyle(icon),
        c = getComputedStyle(card);
      return {
        label: card.querySelector('[data-slot="metric-card-label"]')?.textContent,
        value: card.querySelector('[data-slot="metric-card-value"]')?.textContent,
        tone: card.dataset.tone,
        density: card.dataset.density,
        state: card.dataset.state,
        href: card.closest("a")?.getAttribute("href") ?? null,
        card: rect(card),
        icon: rect(icon),
        glyph: rect(glyph),
        radius: s?.borderRadius,
        background: s?.backgroundColor,
        color: s?.color,
        shadow: s?.boxShadow,
        glyphHidden: glyph?.getAttribute("aria-hidden"),
        cardBackground: c.backgroundColor,
      };
    }),
  );
}
function glyphContrast(foreground, background) {
  const lum = (color) => {
    const channels = color
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number)
      .map((v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = lum(foreground),
    b = lum(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
async function prepareKpiRoute(role, path, width, theme) {
  await setup(role, width, theme);
  // The endpoint's existing DTO; no invented analytics or live business writes.
  await page.route("**/api/v1/analytics/dashboard", (r) =>
    r.fulfill({
      json: {
        data: {
          activeCases: 0,
          totalCases: 0,
          activeClients: 0,
          activeStaff: 0,
          openLeads: 0,
          openTasks: 0,
          upcomingHearings: 0,
          mattersByPractice: {},
          casesByStatus: {},
          tasksByStatus: {},
          hearingsByMonth: [],
        },
      },
    }),
  );
  await page.goto(origin + path, { waitUntil: "domcontentloaded" });
  const count = path === "/admin" ? 6 : path === "/admin/appointments" ? 3 : 4;
  await expect(page.locator('main [data-slot="metric-card-icon"]')).toHaveCount(count);
  await applyTheme();
  await page.waitForTimeout(250);
}
async function runKpiAudit() {
  if (process.argv.includes("--interaction-only")) {
    try {
      for (const role of ["staff", "admin", "client"]) {
        await prepareKpiRoute(role, `/${role}`, 1440, "light");
        const links = page.locator('main a:has([data-slot="metric-card"])');
        assert((await links.count()) >= 2);
        const first = links.first(),
          second = links.nth(1);
        const href = await first.getAttribute("href");
        await first.focus();
        await page.keyboard.press("Tab");
        await expect(second).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(first).toBeFocused();
        const focus = await first.evaluate((e) => {
          const s = getComputedStyle(e);
          return { visible: e.matches(":focus-visible"), outline: s.outline, shadow: s.boxShadow };
        });
        assert(focus.visible);
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(origin + href);
        results.push({
          role,
          check: "metric keyboard order / focus / existing link activation",
          href,
          focus,
        });
      }
      assert.equal(errors.length, 0);
      assert(writes.every((w) => w.intercepted && !w.unexpected));
    } finally {
      fs.writeFileSync(
        out + "/interaction-evidence.json",
        JSON.stringify({ results, errors, writes, liveMutations: 0 }, null, 2),
      );
      await browser.close();
    }
    console.log(
      JSON.stringify({
        keyboardChecks: results.length,
        errors: errors.length,
        interceptedWrites: writes.length,
      }),
    );
    return;
  }
  const before = process.argv.includes("--before");
  const baselinePath = out + "/before-evidence.json";
  const baseline = before ? null : JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  if (!before && process.argv.includes("--resume")) {
    const prior = JSON.parse(fs.readFileSync(out + "/evidence.json", "utf8"));
    assert.equal(prior.errors.length, 0);
    assert(prior.scans.every((s) => s.violations.length === 0));
    assert(prior.writes.every((w) => w.intercepted && !w.unexpected));
    results.push(...prior.results);
    scans.push(...prior.scans);
    writes.push(...prior.writes);
  }
  const staff = [
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
  const admin = [
    "/admin",
    "/admin/users",
    "/admin/appointments",
    "/admin/hr",
    "/admin/analytics",
    "/admin/audit",
  ];
  const sizes = [360, 390, 768, 1024, 1280, 1440],
    themes = ["light", "dark"];
  const cases = [];
  if (before) {
    for (const path of [
      "/staff",
      "/staff/tasks",
      "/staff/hearings",
      "/staff/hr",
      "/admin",
      "/admin/hr",
    ])
      for (const [width, theme] of [
        [1440, "light"],
        [360, "dark"],
      ])
        cases.push({ role: path.startsWith("/admin") ? "admin" : "staff", path, width, theme });
  } else {
    for (const [role, routes] of [
      ["staff", staff],
      ["admin", admin],
    ])
      for (const path of routes)
        for (const width of [360, 1440])
          for (const theme of themes) cases.push({ role, path, width, theme });
    for (const path of ["/staff", "/staff/tasks", "/staff/hr", "/admin"])
      for (const width of sizes.filter((w) => ![360, 1440].includes(w)))
        for (const theme of themes)
          cases.push({ role: path.startsWith("/admin") ? "admin" : "staff", path, width, theme });
  }
  for (const width of sizes)
    for (const theme of themes) cases.push({ role: "client", path: "/client", width, theme });
  try {
    for (const item of cases) {
      const { role, path, width, theme } = item;
      if (
        results.some(
          (r) => r.role === role && r.path === path && r.width === width && r.theme === theme,
        )
      )
        continue;
      await prepareKpiRoute(role, path, width, theme);
      const cards = await measureKpis(),
        g = await geometry();
      assert.equal(g.overflow, 0, JSON.stringify(item));
      for (const card of cards) {
        assert(card.icon && card.glyph, "Every existing metric keeps its icon");
        assert.equal(card.glyphHidden, "true");
        if (!before && role !== "client") {
          assert(Math.abs(card.icon.width - card.icon.height) < 0.1, JSON.stringify(card));
          assert.equal(card.radius, "50%", JSON.stringify(card));
          assert(!card.background.includes("0, 0, 0, 0"));
          assert.notEqual(card.shadow, "none");
          assert(glyphContrast(card.color, card.background) >= 3, JSON.stringify(card));
          assert(Math.abs(card.glyph.width / card.icon.width - 0.5) < 0.01, JSON.stringify(card));
          const size =
            card.density === "compact" ? (width <= 767 ? 32 : 40) : width <= 767 ? 36 : 44;
          assert.equal(card.icon.width, size, JSON.stringify(card));
          assert(
            card.icon.x >= card.card.x &&
              card.icon.right <= card.card.right &&
              card.icon.y >= card.card.y &&
              card.icon.bottom <= card.card.bottom,
            JSON.stringify(card),
          );
        }
      }
      const old = baseline?.results.find(
        (r) => r.path === path && r.width === width && r.theme === theme,
      );
      if (old) {
        const data = (rows) =>
          rows.map(({ label, value, tone, density, state, href }) => ({
            label,
            value,
            tone,
            density,
            state,
            href,
          }));
        assert.deepEqual(data(cards), data(old.cards), "KPI data/meaning/action changed");
        if (role === "client") {
          const paint = (rows) =>
            rows.map((c) => ({
              background: c.background,
              color: c.color,
              radius: c.radius,
              shadow: c.shadow,
              cardSize: [c.card.width, c.card.height],
              iconSize: [c.icon.width, c.icon.height],
              glyphSize: [c.glyph.width, c.glyph.height],
            }));
          assert.deepEqual(
            paint(cards),
            paint(old.cards),
            "Frozen Client geometry or paint changed",
          );
        }
      }
      results.push({ ...item, cards, geometry: g });
      const representative = ["/staff", "/staff/tasks", "/staff/hr", "/admin", "/client"].includes(
        path,
      );
      if (before || (representative && [360, 768, 1440].includes(width)))
        await shot(
          `${before ? "before" : "after"}-${path.slice(1).replaceAll("/", "-")}-${width}-${theme}`,
        );
      if (!before && width === 1440 && theme === "light") {
        const scan = await new AxeBuilder({ page })
          .include('main [data-slot="metric-card"]')
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        scans.push({
          ...item,
          violations: scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
          })),
        });
      }
    }
    if (!before) await checkMetricVariants();
    assert.equal(errors.length, 0, JSON.stringify(errors));
    assert(writes.every((w) => w.intercepted && !w.unexpected));
    assert(
      scans.every((s) => s.violations.length === 0),
      JSON.stringify(scans.filter((s) => s.violations.length)),
    );
  } finally {
    fs.writeFileSync(
      before ? baselinePath : out + "/evidence.json",
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
      mode: before ? "before" : "after",
      cases: results.length,
      scans: scans.length,
      errors: errors.length,
      interceptedWrites: writes.length,
      liveMutations: 0,
    }),
  );
}

async function checkMetricVariants() {
  const html = fs.readFileSync(out + "/component-fixture.html", "utf8");
  for (const role of ["staff", "admin"])
    for (const width of [360, 1440])
      for (const theme of ["light", "dark"]) {
        await prepareKpiRoute(role, role === "staff" ? "/staff/hr" : "/admin/hr", width, theme);
        // Next development mode can install styles through <style> tags.
        // Copy the loaded CSSOM, rather than assuming link-based production CSS.
        const css = await page.evaluate(() =>
          Array.from(document.styleSheets, (sheet) =>
            Array.from(sheet.cssRules, (rule) => rule.cssText).join("\n"),
          ).join("\n"),
        );
        const fixture = await context.newPage();
        await fixture.setViewportSize({ width, height: 900 });
        fixture.on("pageerror", (e) => errors.push({ scope: "SSR variants", message: e.message }));
        await fixture.route("**/*", (r) => {
          if (["GET", "HEAD"].includes(r.request().method())) return r.continue();
          writes.push({ path: r.request().url(), intercepted: true, unexpected: true });
          return r.abort();
        });
        await fixture.setContent(
          `<html class="${theme === "dark" ? "dark" : ""}"><head></head><body><main class="dashboard-theme dashboard-${role}">${html}</main></body></html>`,
        );
        await fixture.addStyleTag({ content: css });
        await fixture.evaluate(() => document.fonts.ready);
        const cards = await fixture.locator('[data-slot="metric-card"]').evaluateAll((es) =>
          es.map((e) => {
            const i = e.querySelector('[data-slot="metric-card-icon"]'),
              g = i.querySelector("svg"),
              s = getComputedStyle(i);
            return {
              tone: e.dataset.tone,
              density: e.dataset.density,
              state: e.dataset.state,
              width: i.getBoundingClientRect().width,
              height: i.getBoundingClientRect().height,
              glyph: g.getBoundingClientRect().width,
              radius: s.borderRadius,
              background: s.backgroundColor,
              color: s.color,
              shadow: s.boxShadow,
            };
          }),
        );
        assert.equal(cards.length, 48);
        for (const c of cards) {
          const size = c.density === "compact" ? (width <= 767 ? 32 : 40) : width <= 767 ? 36 : 44;
          assert.equal(c.width, size, JSON.stringify({ role, width, theme, c }));
          assert.equal(c.height, size);
          assert.equal(c.radius, "50%");
          assert.equal(c.glyph, size / 2);
          assert(glyphContrast(c.color, c.background) >= 3, JSON.stringify({ role, theme, c }));
          assert.notEqual(c.shadow, "none");
        }
        assert.equal(
          await fixture.evaluate(() => document.documentElement.scrollWidth - innerWidth),
          0,
        );
        const scan = await new AxeBuilder({ page: fixture })
          .include("main")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        scans.push({
          role,
          width,
          theme,
          scope: "48 actual-component SSR variants",
          violations: scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
          })),
        });
        if (width === 360)
          await fixture.screenshot({ path: `${out}/variants-${role}-${width}-${theme}.png` });
        results.push({
          role,
          width,
          theme,
          check: "all tones / both densities / loading / empty / error / long content",
          variants: cards,
        });
        await fixture.close();
      }
}

// Worker bootstrap: source extraction shares fixture interception, not product UI.
const target = ".local/qa/session-17b";
fs.mkdirSync(target, { recursive: true });
const shared = fs.readFileSync("scripts/qa/verify-account-profile.mjs", "utf8");
const marker = "if (publicContrastOnly) {\n  assert.equal(prior.results.length";
const normalized = shared.replaceAll("\r\n", "\n");
const cut = normalized.indexOf(marker);
if (cut < 0) throw new Error("Shared QA harness boundary changed; review before running");
const prefix = normalized
  .slice(0, cut)
  .replace('const out = ".local/qa/session-17a";', 'const out = ".local/qa/session-17b";');
const self = fs.readFileSync(import.meta.filename, "utf8");
const checks = self.slice(
  self.indexOf("async function measureKpis"),
  self.indexOf("// Worker bootstrap"),
);
const worker = target + "/worker.mjs";
fs.writeFileSync(worker, prefix + "\n" + checks + "\nawait " + runKpiAudit.name + "();\n");
const result = spawnSync(process.execPath, [worker, ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exitCode = result.status ?? 1;
