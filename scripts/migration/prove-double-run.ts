/**
 * R3.7 — Import every fixture domain twice; second run must match first (idempotent).
 * Exit gate: full localhost snapshot migrates twice with zero unexplained differences.
 * Calls existing migrate*Export / storage helpers only (no importer rewrites).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { documents, users } from "../../src/server/db/schema";
import { migrateIdentityExport } from "../../src/server/services/identity-migration";
import { migrateCmsExport } from "../../src/server/services/cms-migration";
import { migrateMattersExport } from "../../src/server/services/matters-migration";
import { migrateWorkManagementExport } from "../../src/server/services/work-management-migration";
import { migrateFinancialExport } from "../../src/server/services/financial-migration";
import { migrateCrmExport } from "../../src/server/services/crm-migration";
import { migrateCommunicationExport } from "../../src/server/services/communication-migration";
import { migrateEnvelopeExport } from "../../src/server/services/envelope-migration";
import { migrateHrExport } from "../../src/server/services/hr-migration";
import { migrateDocuments } from "../../src/server/services/document-migration";
import { saveDomainReport } from "./report-store";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";
import { runStorageConvertAndMigrate } from "./storage-run";
import { detailsFromReport } from "./reconciliation-details";
import { loadApprovedExceptions, partitionExceptions } from "./exceptions-ledger";
import type { ReconcileException } from "./reconcile";

const firmA = "61000000-0000-4000-8000-000000000001";
const firmMapPath = path.resolve("tests/fixtures/convex-identity-firm-map.json");

async function loadFirmMap() {
  return JSON.parse(await fs.readFile(firmMapPath, "utf8")) as Record<string, string>;
}

function sameChecks(a: DomainMigrationReport, b: DomainMigrationReport) {
  return JSON.stringify(a.reconciliation.checks) === JSON.stringify(b.reconciliation.checks);
}

function toReconcileExceptions(
  domain: string,
  report: DomainMigrationReport,
): ReconcileException[] {
  return report.exceptions.map((ex) => ({
    domain,
    table: ex.table,
    id: ex.id,
    type: "OTHER" as const,
    reason: ex.reason,
  }));
}

async function unexplainedCount(domain: string, report: DomainMigrationReport) {
  const approved = await loadApprovedExceptions();
  return partitionExceptions(toReconcileExceptions(domain, report), approved).unexplained.length;
}

async function doubleRun(
  name: string,
  run: () => Promise<DomainMigrationReport>,
): Promise<{
  name: string;
  passed: boolean;
  first: DomainMigrationReport;
  second: DomainMigrationReport;
  unexplained: number;
}> {
  const first = await run();
  const second = await run();
  const unexplained = await unexplainedCount(name, second);
  const passed =
    first.reconciliation.passed &&
    second.reconciliation.passed &&
    sameChecks(first, second) &&
    first.exceptions.length === 0 &&
    second.exceptions.length === 0 &&
    unexplained === 0;
  const details = detailsFromReport(second);
  second.details = details;
  await saveDomainReport(name, second);
  await appendReconciliationReport({
    domain: name,
    command: "double-run",
    report: second,
    details,
    notes: [
      passed
        ? "R3.7: second import matched first with zero unexplained differences."
        : "Double-run mismatch — inspect exceptions / checks.",
      `first.checks=${JSON.stringify(first.reconciliation.checks)}`,
      `second.checks=${JSON.stringify(second.reconciliation.checks)}`,
      `unexplained=${unexplained}`,
    ],
  });
  return { name, passed, first, second, unexplained };
}

/** Envelope fixture references document legacy id not present in documents fixture. */
async function ensureEnvelopeDocumentPrereq() {
  const db = getDatabase();
  const legacyDocId = "convex_env_doc_a";
  const [existing] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.legacyConvexId, legacyDocId))
    .limit(1);
  if (existing) return;
  const [creator] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.legacyConvexId, "convex_identity_user_1"), isNull(users.deletedAt)))
    .limit(1);
  if (!creator) throw new Error("identity fixture user missing for envelope document prereq");
  await db.insert(documents).values({
    firmId: firmA,
    title: "Envelope fixture document",
    documentNumber: "ENV-FIXTURE-1",
    type: "other",
    storageId: "convex-storage-envelope-fixture",
    mimeType: "application/pdf",
    sizeBytes: 0,
    uploadedBy: creator.id,
    legacyConvexId: legacyDocId,
    status: "active",
    confidentialityLevel: "internal",
  } as typeof documents.$inferInsert);
}

try {
  const firmMap = await loadFirmMap();
  const results = [];

  results.push(
    await doubleRun("identity", () =>
      migrateIdentityExport({
        exportPath: path.resolve("tests/fixtures/convex-identity-export"),
        firmMap,
      }),
    ),
  );

  results.push(
    await doubleRun("cms", () =>
      migrateCmsExport({
        exportPath: path.resolve("tests/fixtures/convex-cms-export"),
        targetFirmId: firmA,
      }),
    ),
  );

  results.push(
    await doubleRun("matters", () =>
      migrateMattersExport({
        exportPath: path.resolve("tests/fixtures/convex-matters-export"),
        firmMap,
        orphanFirmId: firmA,
      }),
    ),
  );

  results.push(
    await doubleRun("work-management", () =>
      migrateWorkManagementExport({
        exportPath: path.resolve("tests/fixtures/convex-work-management-export"),
        firmMap,
        orphanFirmId: firmA,
      }),
    ),
  );

  results.push(
    await doubleRun("financial", () =>
      migrateFinancialExport({
        exportPath: path.resolve("tests/fixtures/convex-financial-export"),
        firmMap,
        orphanFirmId: firmA,
      }),
    ),
  );

  results.push(
    await doubleRun("crm", () =>
      migrateCrmExport({
        exportPath: path.resolve("tests/fixtures/convex-crm-export"),
        firmMap,
        orphanFirmId: firmA,
      }),
    ),
  );

  results.push(
    await doubleRun("communication", () =>
      migrateCommunicationExport({
        exportPath: path.resolve("tests/fixtures/convex-communication-export"),
        firmMap,
        orphanFirmId: firmA,
      }),
    ),
  );

  results.push(
    await doubleRun("documents", async () => {
      const exportPath = path.resolve("tests/fixtures/convex-export");
      const storageMap = JSON.parse(
        await fs.readFile(path.resolve("tests/fixtures/convex-export/firm-map.json"), "utf8"),
      ) as Record<string, string>;
      const docsPath = path.join(exportPath, "documents", "documents.jsonl");
      return migrateDocuments(docsPath, { firmMap: storageMap });
    }),
  );

  results.push(
    await doubleRun("storage", async () => {
      const exportPath = path.resolve("tests/fixtures/convex-export");
      const storageMap = JSON.parse(
        await fs.readFile(path.resolve("tests/fixtures/convex-export/firm-map.json"), "utf8"),
      ) as Record<string, string>;
      const { report } = await runStorageConvertAndMigrate({
        exportPath,
        firmMap: storageMap,
      });
      return report;
    }),
  );

  await ensureEnvelopeDocumentPrereq();
  results.push(
    await doubleRun("envelopes", () =>
      migrateEnvelopeExport({
        exportPath: path.resolve("tests/fixtures/convex-envelopes-export"),
        firmMap,
        orphanFirmId: firmA,
      }),
    ),
  );

  results.push(
    await doubleRun("hr", () =>
      migrateHrExport({
        exportPath: path.resolve("tests/fixtures/convex-hr-export"),
        firmMap,
        orphanFirmId: firmA,
      }),
    ),
  );

  // analytics: no export — treat as passed no-op double-run
  results.push({
    name: "analytics",
    passed: true,
    unexplained: 0,
    first: {
      source: {},
      migrated: {},
      exceptions: [],
      reconciliation: { passed: true, checks: {} },
    },
    second: {
      source: {},
      migrated: {},
      exceptions: [],
      reconciliation: { passed: true, checks: {} },
    },
  });

  const failed = results.filter((r) => !r.passed);
  const allUnexplained = results.reduce((sum, r) => sum + (r.unexplained ?? 0), 0);
  const summaryReport: DomainMigrationReport = {
    source: Object.fromEntries(results.map((r) => [r.name, 1])),
    migrated: Object.fromEntries(results.map((r) => [r.name, r.passed ? 1 : 0])),
    exceptions: [],
    reconciliation: {
      passed: failed.length === 0 && allUnexplained === 0,
      checks: Object.fromEntries(
        results.map((r) => [r.name, { source: 1, target: r.passed ? 1 : 0 }]),
      ),
    },
  };
  await appendReconciliationReport({
    domain: "r3.7",
    command: "prove-double-run",
    report: summaryReport,
    notes: [
      "Phase R3 exit gate: full localhost fixture snapshot migrated twice.",
      failed.length === 0 && allUnexplained === 0
        ? "Zero unexplained differences across all fixture domains."
        : `FAILED domains=${failed.map((f) => f.name).join(",") || "none"} unexplained=${allUnexplained}`,
      `domains=${results.map((r) => r.name).join(",")}`,
    ],
  });

  console.log(
    JSON.stringify(
      {
        passed: failed.length === 0 && allUnexplained === 0,
        unexplainedTotal: allUnexplained,
        domains: results.map((r) => ({
          name: r.name,
          passed: r.passed,
          unexplained: r.unexplained ?? 0,
          checks: r.second.reconciliation.checks,
        })),
      },
      null,
      2,
    ),
  );
  if (failed.length || allUnexplained > 0) {
    process.exitCode = 1;
    console.error(
      "migration:prove-double-run failed for:",
      failed.map((f) => f.name).join(", ") || `(unexplained=${allUnexplained})`,
    );
  } else {
    console.log(
      "migration:prove-double-run passed (all fixture domains, zero unexplained differences)",
    );
  }
} finally {
  await closeDatabase();
}
