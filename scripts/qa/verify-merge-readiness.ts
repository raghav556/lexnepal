/** Isolated Session18B public SSR/API/browser gate. Never seeds the application DB. */
import fs from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createSigningTestDatabase } from "../../tests/support/signing-test-database";

const out = ".local/qa/session-18b";
fs.mkdirSync(out, { recursive: true });
assert(
  fs.existsSync(".next/prerender-manifest.json") && !fs.existsSync(".next/lock"),
  "A completed production build is required; do not overlap this gate with a build",
);
const base = "http://localhost:3002";
const sandbox = await createSigningTestDatabase();
const firm = randomUUID(),
  otherFirm = randomUUID(),
  lawyer = randomUUID();
const hidden = randomUUID(),
  inactive = randomUUID(),
  client = randomUUID(),
  foreign = randomUUID();
let server: ReturnType<typeof spawn> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const log = fs.openSync(`${out}/isolated-server.log`, "w");
const evidence: Record<string, unknown> = {
  database: sandbox.name,
  schemaOnlyClone: true,
  externalDeliveries: 0,
  liveMutations: 0,
  api: [],
  browser: [],
};
const browserOnly = process.argv.includes("--browser-only");
if (browserOnly) {
  evidence.api = JSON.parse(fs.readFileSync(`${out}/public-api-final.json`, "utf8")).api;
  evidence.apiReusedFrom = "public-api-final.json (unchanged API sources)";
}
try {
  await sandbox.admin.execute("INSERT INTO firms (id,name,slug) VALUES (?,?,?),(?,?,?)", [
    firm,
    "Synthetic QA firm",
    `qa-${firm}`,
    otherFirm,
    "Foreign fixture",
    `qa-${otherFirm}`,
  ]);
  for (const [id, tenant, role, published, active] of [
    [lawyer, firm, "partner", true, true],
    [hidden, firm, "partner", false, true],
    [inactive, firm, "partner", true, false],
    [client, firm, "client", true, true],
    [foreign, otherFirm, "partner", true, true],
  ] as const) {
    await sandbox.admin.execute(
      "INSERT INTO users (id,firm_id,token_identifier,name,email,role,is_public_facing,is_active,bio,avatar,public_email,languages,bar_council_expiry) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        id,
        tenant,
        `qa|${id}`,
        id === lawyer ? "Synthetic Review Advocate" : "PRIVATE_UNPUBLISHED_NAME",
        `PRIVATE_INTERNAL_EMAIL-${id}@example.invalid`,
        role,
        published,
        active,
        "Published isolated profile biography",
        id === lawyer ? "missing-fixture-portrait" : null,
        id === lawyer ? "published@example.invalid" : null,
        JSON.stringify(["Nepali", "English"]),
        id === lawyer ? "2027-01-15" : null,
      ],
    );
  }
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", "3002"], {
    windowsHide: true,
    stdio: ["ignore", log, log],
    env: {
      ...process.env,
      NODE_ENV: "production",
      PUBLIC_FIRM_SLUG: `qa-${firm}`,
      APP_PUBLIC_URL: base,
      BETTER_AUTH_URL: base,
      LEXNEPAL_SKIP_SMTP: "1",
      LEXNEPAL_SKIP_LOCAL_CLAMAV: "1",
      READINESS_REQUIRE_DATABASE: "false",
      BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
      STORAGE_DOWNLOAD_TOKEN_SECRET: randomBytes(32).toString("hex"),
    },
  });
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    if (server.exitCode !== null) throw new Error(`Fixture server exited ${server.exitCode}`);
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* bounded startup polling */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert(ready, "Isolated server must start");
  const list = await (await fetch(`${base}/api/v1/public/cms/team`)).json();
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].id, lawyer);
  assert(!JSON.stringify(list).includes("PRIVATE_"));
  const detailResponse = await fetch(`${base}/api/v1/public/cms/team/${lawyer}`);
  assert.equal(detailResponse.status, 200);
  const detail = (await detailResponse.json()).data;
  assert.equal(detail.id, lawyer);
  assert.equal(String(detail.barCouncilExpiry).slice(0, 10), "2027-01-15");
  for (const key of [
    "email",
    "phone",
    "isPending",
    "isActive",
    "passwordHash",
    "totpSecret",
    "baseSalary",
  ]) {
    assert(!Object.hasOwn(detail, key), `Private profile field: ${key}`);
  }
  assert(!JSON.stringify(detail).includes("PRIVATE_"));
  evidence.publicDetailPrivacy =
    "Explicit public detail DTO contains no internal contact, status, salary or credential fields";
  for (const id of [hidden, inactive, client, foreign]) {
    assert.equal((await fetch(`${base}/api/v1/public/cms/team/${id}`)).status, 404);
    assert.equal((await fetch(`${base}/lawyers/${id}`)).status, 404);
  }
  const profile = await fetch(`${base}/lawyers/${lawyer}`);
  assert.equal(profile.status, 200);
  const html = await profile.text();
  assert(html.includes("Synthetic Review Advocate"));
  assert(!html.includes("PRIVATE_"));
  evidence.publication = {
    list: 1,
    positiveSsr: 200,
    unpublishedInactiveClientForeign: "404 for API and SSR",
    privacy: "internal email/status fields absent",
  };

  const inventory = JSON.parse(
    fs.readFileSync(".local/qa/session-18/route-inventory.json", "utf8"),
  );
  if (!browserOnly)
    for (const entry of inventory.apis.filter(
      (entry: { directSessionGuard: boolean }) => !entry.directSessionGuard,
    )) {
      for (const method of entry.methods) {
        if (entry.route.startsWith("/api/auth/")) continue;
        let url = entry.route
          .replaceAll("[collection]", "blog-posts")
          .replaceAll("[slug]", "unpublished-fixture")
          .replaceAll("[...key]", "protected/fixture")
          .replace(/\[[^\]]+\]/g, "10000000-0000-4000-8000-000000000001");
        if (entry.route.includes("/legal-pages/"))
          url = "/api/v1/public/cms/legal-pages/privacy-policy";
        if (url === "/api/v1/public/cms/team") url += "?search=Synthetic";
        const response = await fetch(base + url, {
          method,
          redirect: "manual",
          ...(method === "GET"
            ? {}
            : { headers: { "content-type": "application/json" }, body: "{}" }),
        });
        const expected = entry.route.includes("/storage/objects/")
          ? 403
          : entry.route.includes("/storage/uploads/")
            ? 422
            : entry.route.startsWith("/api/v1/public/cms/") && method === "GET"
              ? [
                  "/api/v1/public/cms/[collection]",
                  "/api/v1/public/cms/team",
                  "/api/v1/public/cms/settings",
                ].includes(entry.route)
                ? 200
                : 404
              : ["/api/v1/health", "/api/v1/readiness", "/api/v1/version"].includes(entry.route)
                ? 200
                : (entry.route.includes("/intake/") && method === "GET") ||
                    entry.route.includes("/document-shares/") ||
                    entry.route.includes("/resources/download/")
                  ? 404
                  : 400;
        (evidence.api as unknown[]).push({
          route: entry.route,
          method,
          status: response.status,
          expected,
          scope: "public/token invalid-input or empty-fixture contract",
        });
        assert.equal(response.status, expected, `${method} ${entry.route}`);
      }
    }
  // Auth is a catch-all adapter: supported paths, not fabricated /[...all] URLs.
  if (!browserOnly)
    for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE"]) {
      const url = method === "POST" ? "/api/auth/sign-in/email" : "/api/auth/get-session";
      const response = await fetch(base + url, {
        method,
        ...(method === "GET"
          ? {}
          : { headers: { "content-type": "application/json", origin: base }, body: "{}" }),
      });
      (evidence.api as unknown[]).push({
        route: "/api/auth/[...all]",
        method,
        url,
        status: response.status,
      });
      assert.equal(response.status, method === "GET" ? 200 : method === "POST" ? 400 : 404);
    }
  if (!browserOnly)
    for (const [route, method, expected] of [
      ["/api/v1/auth/session", "GET", 401],
      ["/api/v1/auth/session", "POST", 400],
      ["/api/v1/auth/session", "DELETE", 200],
      ["/api/v1/users/[userId]/avatar", "GET", 404],
    ] as const) {
      const response = await fetch(base + route.replace("[userId]", foreign), {
        method,
        headers: { origin: base, "content-type": "application/json" },
        ...(method === "GET" ? {} : { body: "{}" }),
      });
      (evidence.api as unknown[]).push({ route, method, status: response.status, expected });
      assert.equal(response.status, expected, `${method} ${route}`);
    }
  browser = await chromium.launch({ headless: true });
  for (const [language, width, dark] of [
    ["en", 1440, false],
    ["ne", 390, true],
  ] as const) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(
      ({ language, dark }) => {
        localStorage.setItem("lexnepal_lang", language);
        localStorage.setItem("theme", dark ? "dark" : "light");
      },
      { language, dark },
    );
    const page = await context.newPage();
    const errors: string[] = [],
      warnings: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (/hydrat/i.test(message.text())) warnings.push(message.text());
    });
    await page.route("**/*", (route) => {
      const request = route.request();
      return request.url().startsWith(base) && ["GET", "HEAD"].includes(request.method())
        ? route.continue()
        : route.abort();
    });
    await page.goto(`${base}/lawyers/${lawyer}`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => {
      const key = Object.keys(document.body).find((key) => key.startsWith("__reactFiber$"));
      if (!key) return false;
      let fiber = (document.body as unknown as Record<string, { return?: unknown }>)[key] as {
        return?: unknown;
        stateNode?: { current?: { memoizedState?: { isDehydrated?: boolean } } };
      };
      while (fiber.return) fiber = fiber.return as typeof fiber;
      return fiber.stateNode?.current?.memoizedState?.isDehydrated === false;
    });
    await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), dark);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await page.waitForTimeout(350);
    await expect(
      page.getByRole("heading", { level: 1, name: "Synthetic Review Advocate" }),
    ).toBeVisible();
    await page.waitForFunction(
      () => !Array.from(document.images).some((image) => image.src.includes("/avatar")),
    );
    await expect(
      page.getByText("Published isolated profile biography", { exact: true }).first(),
    ).toBeVisible();
    assert.equal((await page.locator('a[href^="/consultation?lawyerId="]').count()) > 0, true);
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      language: localStorage.getItem("lexnepal_lang"),
      dark: document.documentElement.classList.contains("dark"),
    }));
    assert(geometry.scroll <= width);
    assert.equal(geometry.language, language);
    assert.equal(geometry.dark, dark);
    const expiry = await page
      .getByText("Licence expiry", { exact: true })
      .locator("..")
      .innerText();
    const dateChecks = (evidence.credentialDates ??= []) as unknown[];
    dateChecks.push({ language, expiry, source: "2027-01-15" });
    assert(
      expiry.includes("15 Jan 2027 A.D."),
      "Licence expiry must use the canonical dual-date display",
    );
    if (language === "ne") {
      assert(expiry.includes("२०८३") && expiry.includes("माघ") && expiry.includes("वि.सं."));
      assert(expiry.indexOf("वि.सं.") < expiry.indexOf("A.D."));
    } else assert(expiry.indexOf("A.D.") < expiry.indexOf("B.S."));
    const hero = page
      .getByRole("heading", { level: 1, name: "Synthetic Review Advocate" })
      .locator("xpath=ancestor::section[1]");
    const heroContrast = [];
    for (const [text, minimum] of [
      ["S", 3],
      ["Partner", 4.5],
    ] as const) {
      const element = hero.getByText(text, { exact: true });
      await expect(element).toBeVisible();
      const measured = await element.evaluate((element) => {
        const ancestors: Element[] = [];
        for (let current: Element | null = element; current; current = current.parentElement)
          ancestors.unshift(current);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Color measurement unavailable");
        context.fillStyle = "white";
        context.fillRect(0, 0, 1, 1);
        for (const ancestor of ancestors) {
          context.fillStyle = getComputedStyle(ancestor).backgroundColor;
          context.fillRect(0, 0, 1, 1);
        }
        const background = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = getComputedStyle(element).color;
        context.fillRect(0, 0, 1, 1);
        const foreground = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
        return {
          foreground,
          background,
          opacity: ancestors.reduce(
            (value, node) => value * Number(getComputedStyle(node).opacity),
            1,
          ),
        };
      });
      const luminance = (color: number[]) => {
        const c = color
          .map((x) => x / 255)
          .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
        return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
      };
      const fg = luminance(measured.foreground),
        bg = luminance(measured.background);
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      assert(measured.opacity >= 0.99, "Hero content must finish its entrance animation");
      assert(ratio >= minimum, `${text} hero contrast ${ratio}`);
      heroContrast.push({ text, minimum, ratio, ...measured });
    }
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    await page.screenshot({ path: `${out}/lawyer-${language}-${width}.png`, fullPage: true });
    (evidence.browser as unknown[]).push({
      language,
      width,
      dark,
      geometry,
      heroContrast,
      errors,
      warnings,
      violations: scan.violations,
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
    assert.deepEqual(scan.violations, []);
    await page.locator('a[href^="/consultation?lawyerId="]').first().focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/consultation\\?lawyerId=${lawyer}`));
    await expect(page.getByText("Synthetic Review Advocate", { exact: true })).toBeVisible();
    evidence.consultationNavigation =
      "EN/NE keyboard navigation retains the verified published lawyerId";
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
    await context.close();
  }
} finally {
  fs.writeFileSync(
    `${out}/isolated-public-evidence.json`,
    JSON.stringify(evidence, null, 2) + "\n",
  );
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise<void>((resolve) => server!.once("exit", () => resolve()));
  }
  fs.closeSync(log);
  await sandbox.dispose(async () => undefined);
}
