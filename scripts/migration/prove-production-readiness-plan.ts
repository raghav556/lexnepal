/**
 * R7 planning gate: production-readiness artifacts exist and every R7.n row is tracked.
 * Does **not** claim production readiness — fails if any row is marked complete without evidence.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";
import { DOC_MIGRATION_DIR } from "./types";

const REQUIRED_FILES = [
  "production-readiness.md",
  "production-readiness.csv",
  "incident-contacts.md",
  "cutover-runbook.md",
  "rollback-runbook.md",
] as const;

const REQUIRED_ITEMS = ["R7.1", "R7.2", "R7.3", "R7.4", "R7.5", "R7.6", "R7.7", "R7.8"] as const;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === "," && !q) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

try {
  const missingFiles: string[] = [];
  for (const name of REQUIRED_FILES) {
    try {
      await fs.access(path.join(DOC_MIGRATION_DIR, name));
    } catch {
      missingFiles.push(name);
    }
  }
  if (missingFiles.length) {
    throw new Error(`R7 planning artifacts missing: ${missingFiles.join(", ")}`);
  }

  const csvPath = path.join(DOC_MIGRATION_DIR, "production-readiness.csv");
  const text = await fs.readFile(csvPath, "utf8");
  const rows = text.trim().split(/\r?\n/).slice(1).filter(Boolean).map(parseCsvLine);

  const byItem = new Map(rows.map((r) => [r[0], r]));
  const missingItems = REQUIRED_ITEMS.filter((id) => !byItem.has(id));
  if (missingItems.length) {
    throw new Error(`production-readiness.csv missing rows: ${missingItems.join(", ")}`);
  }

  const illegallyComplete: string[] = [];
  const deferOk: string[] = [];
  for (const id of REQUIRED_ITEMS) {
    const row = byItem.get(id)!;
    const status = (row[5] ?? "").trim();
    const evidence = (row[6] ?? "").trim();
    if (/^(complete|passed|done)$/i.test(status) && !evidence) {
      illegallyComplete.push(`${id} status=${status} without evidence`);
    }
    if (status === "DEFER_PROD" || status === "planned" || status === "open") {
      deferOk.push(id);
    }
  }
  if (illegallyComplete.length) {
    throw new Error(
      `R7 rows marked complete without evidence (localhost is not enough): ${illegallyComplete.join("; ")}`,
    );
  }

  const contacts = await fs.readFile(path.join(DOC_MIGRATION_DIR, "incident-contacts.md"), "utf8");
  const contactsStillTemplate = /Incident commander \| TBD/i.test(contacts);

  const report: DomainMigrationReport = {
    source: Object.fromEntries(REQUIRED_ITEMS.map((id) => [id, 1])),
    migrated: Object.fromEntries(REQUIRED_ITEMS.map((id) => [id, 1])),
    exceptions: [],
    reconciliation: {
      passed: true,
      checks: Object.fromEntries(REQUIRED_ITEMS.map((id) => [id, { source: 1, target: 1 }])),
    },
  };

  await appendReconciliationReport({
    domain: "r7",
    command: "prove-production-readiness-plan",
    report,
    notes: [
      "R7 planning artifacts present; production cutover remains DEFER_PROD.",
      `tracked=${REQUIRED_ITEMS.join(",")}`,
      `statusDeferOrOpen=${deferOk.length}/${REQUIRED_ITEMS.length}`,
      `incidentContactsTemplate=${contactsStillTemplate}`,
      "Do not set production-readiness.csv status=complete without evidence + owner.",
    ],
  });

  console.log(
    JSON.stringify(
      {
        passed: true,
        r7: {
          planningComplete: true,
          productionReady: false,
          deferProd: true,
          items: REQUIRED_ITEMS.map((id) => ({
            item: id,
            status: byItem.get(id)?.[5] ?? "",
          })),
          incidentContactsNeedOwners: contactsStillTemplate,
        },
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
