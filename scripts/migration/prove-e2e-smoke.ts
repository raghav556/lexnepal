/**
 * R5.7 proof: browser E2E smoke — login, matter, document, invoice, signature, CMS public.
 *
 * Requires DATABASE_URL and a Next server on E2E_BASE_URL (default http://127.0.0.1:3001).
 * Offline gate: smoke matrix paths exist under src/app.
 * Set E2E_START_SERVER=1 to spawn `npm run start` via Playwright (needs prior `npm run build`).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { closeDatabase } from "../../src/server/db/client";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";
import { seedE2eUsers, E2E_USERS } from "../e2e/seed-e2e-users";

const ROOT = process.cwd();
const MATRIX = path.join(ROOT, "doc/migration/ui-e2e-smoke-matrix.csv");
const BASE_URL =
  process.env.E2E_BASE_URL ?? process.env.NEXT_PROOF_BASE_URL ?? "http://127.0.0.1:3001";

const SMOKE_ROUTES = [
  { area: "cms", path: "/", nextFile: "src/app/(public)/page.tsx" },
  { area: "cms", path: "/blog", nextFile: "src/app/(public)/blog/page.tsx" },
  { area: "cms", path: "/practice-areas", nextFile: "src/app/(public)/practice-areas/page.tsx" },
  { area: "cms", path: "/about-us", nextFile: "src/app/(public)/about-us/page.tsx" },
  { area: "cms", path: "/contact", nextFile: "src/app/(public)/contact/page.tsx" },
  { area: "login", path: "/sign-in", nextFile: "src/app/sign-in/page.tsx" },
  { area: "matter", path: "/staff/cases", nextFile: "src/app/(staff)/staff/cases/page.tsx" },
  {
    area: "document",
    path: "/staff/documents",
    nextFile: "src/app/(staff)/staff/documents/page.tsx",
  },
  { area: "invoice", path: "/admin/finance", nextFile: "src/app/(admin)/admin/finance/page.tsx" },
  {
    area: "invoice",
    path: "/client/billing",
    nextFile: "src/app/(client)/client/billing/page.tsx",
  },
  {
    area: "signature",
    path: "/client/signatures",
    nextFile: "src/app/(client)/client/signatures/page.tsx",
  },
] as const;

function run(
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...env },
      // Never use shell:true with absolute node paths on Windows (spaces → `C:\Program` breaks).
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    child.stdout?.on("data", (c) => {
      stdout += String(c);
      process.stdout.write(c);
    });
    child.stderr?.on("data", (c) => {
      stdout += String(c);
      process.stderr.write(c);
    });
    child.on("close", (code) => resolve({ code: code ?? 1, stdout }));
  });
}

async function assertOfflineMatrix() {
  const missing: string[] = [];
  for (const row of SMOKE_ROUTES) {
    const file = path.join(ROOT, row.nextFile);
    try {
      await fs.access(file);
    } catch {
      missing.push(`${row.path} → ${row.nextFile}`);
    }
  }
  if (missing.length) {
    throw new Error(`R5.7 offline gate: missing Next pages:\n${missing.join("\n")}`);
  }

  const header = "area,path,nextFile,proof\n";
  const body = SMOKE_ROUTES.map(
    (r) => `${r.area},${r.path},${r.nextFile},playwright+filesystem`,
  ).join("\n");
  await fs.mkdir(path.dirname(MATRIX), { recursive: true });
  await fs.writeFile(MATRIX, `${header}${body}\n`, "utf8");
}

async function assertServerReachable() {
  if (process.env.E2E_START_SERVER === "1") return;
  try {
    const res = await fetch(new URL("/sign-in", BASE_URL), { redirect: "manual" });
    if (res.status >= 500) {
      throw new Error(`E2E server at ${BASE_URL} returned ${res.status}`);
    }
  } catch (error) {
    throw new Error(
      `R5.7 needs Next at ${BASE_URL}. Start with \`npm run start\` or \`npm run dev:next\`, ` +
        `or set E2E_START_SERVER=1 (after build). ${error instanceof Error ? error.message : error}`,
    );
  }
}

try {
  await assertOfflineMatrix();
  const seeded = await seedE2eUsers();
  await assertServerReachable();

  const pw = await run(
    process.execPath,
    ["./node_modules/@playwright/test/cli.js", "test", "--config", "playwright.config.ts"],
    { E2E_BASE_URL: BASE_URL },
  );
  if (pw.code !== 0) throw new Error("R5.7 Playwright smoke failed");

  const areas = [...new Set(SMOKE_ROUTES.map((r) => r.area))];
  const report: DomainMigrationReport = {
    source: { routes: SMOKE_ROUTES.length, areas: areas.length },
    migrated: { routes: SMOKE_ROUTES.length, areas: areas.length },
    exceptions: [],
    reconciliation: {
      passed: true,
      checks: Object.fromEntries(
        areas.map((area) => [
          area,
          {
            source: SMOKE_ROUTES.filter((r) => r.area === area).length,
            target: SMOKE_ROUTES.filter((r) => r.area === area).length,
          },
        ]),
      ),
    },
  };

  await appendReconciliationReport({
    domain: "r5.7",
    command: "prove-e2e-smoke",
    report,
    notes: [
      "R5.7 E2E smoke: CMS public + login + matter/document/invoice/signature portal pages.",
      `baseUrl=${BASE_URL}`,
      `seeded=${Object.values(E2E_USERS)
        .map((u) => u.email)
        .join(",")}`,
      `firmId=${seeded.firmId}`,
      `matrix=${path.relative(ROOT, MATRIX).replace(/\\/g, "/")}`,
    ],
  });

  console.log(
    JSON.stringify(
      {
        passed: true,
        r57: {
          baseUrl: BASE_URL,
          routes: SMOKE_ROUTES.length,
          areas,
          users: Object.values(E2E_USERS).map((u) => u.email),
        },
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
