import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.QA_BASE_URL || "http://localhost:3001";
const OUT = process.env.QA_OUT || path.join(ROOT, ".local/qa/tasks");
fs.mkdirSync(OUT, { recursive: true });
const AXE_PATH = path.join(ROOT, "node_modules/axe-core/axe.min.js");

const EMAIL = process.env.QA_EMAIL || "staff@srimarlaw.com.np";
const PASSWORD = process.env.QA_PASSWORD || "staff@1234";

async function login(page) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": "127.0.2.11" });
  const login = await page.request.post(`${BASE}/api/auth/sign-in/email`, {
    data: { email: EMAIL, password: PASSWORD },
    headers: { "x-forwarded-for": "127.0.2.11" },
  });
  if (!login.ok()) {
    const body = await login.text();
    throw new Error(`Login failed ${login.status()}: ${body}`);
  }
}

async function runAxe(page, tag) {
  await page.addScriptTag({ path: AXE_PATH });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
    }));
  });
  console.log(`AXE[${tag}] violations: ${violations.length}`);
  for (const v of violations) {
    console.log(`  - ${v.id} (${v.impact}) x${v.nodes}: ${v.targets.join(" | ")}`);
  }
  return violations.length;
}

const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
];

const browser = await chromium.launch();
let axeViolations = 0;
try {
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    await login(page);
    await page.goto(`${BASE}/staff/tasks`, { waitUntil: "domcontentloaded" });
    await page.getByText("Active tasks").first().waitFor({ timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `tasks-board-${vp.name}.png`), fullPage: true });
    if (vp.name === "1440") axeViolations += await runAxe(page, `board-${vp.name}`);

    const listBtn = page.getByRole("group", { name: "Task view" }).getByRole("button", {
      name: /list/i,
    });
    await listBtn.waitFor({ state: "visible", timeout: 10000 });
    await listBtn.click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `tasks-list-${vp.name}.png`), fullPage: true });
    if (vp.name === "1440") axeViolations += await runAxe(page, `list-${vp.name}`);

    if (vp.name === "1440") {
      await page
        .getByRole("button", { name: /new task/i })
        .first()
        .click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(OUT, `tasks-create-dialog-${vp.name}.png`) });
      axeViolations += await runAxe(page, `dialog-${vp.name}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
    await context.close();
    console.log(`CAPTURED viewport ${vp.name}`);
  }
} finally {
  await browser.close();
}
console.log(`DONE. Screenshots in ${OUT}. Total axe violations: ${axeViolations}`);
