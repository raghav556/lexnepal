/**
 * Local rehearsal sequence for every registered domain that has a fixture export.
 * Steps per domain: dry-run → import → verify → reconcile (then optional double-run via prove-double-run).
 *
 * Does not rewrite importers — drives the unified CLI domain registry.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { closeDatabase } from "../../src/server/db/client";
import { appendReconciliationReport } from "./report-writer";
import { runCli } from "./run-cli";
import type { DomainMigrationReport } from "./types";

const firmA = "61000000-0000-4000-8000-000000000001";
const firmMap = path.resolve("tests/fixtures/convex-identity-firm-map.json");
const storageFirmMap = path.resolve("tests/fixtures/convex-export/firm-map.json");

interface DomainRehearsal {
  domain: string;
  exportPath: string;
  extraArgs?: string[];
  /** Domains with no Convex rows to import */
  noOp?: boolean;
}

const DOMAINS: DomainRehearsal[] = [
  {
    domain: "identity",
    exportPath: "tests/fixtures/convex-identity-export",
    extraArgs: ["--firm-map", firmMap],
  },
  {
    domain: "cms",
    exportPath: "tests/fixtures/convex-cms-export",
    extraArgs: ["--target-firm", firmA],
  },
  {
    domain: "matters",
    exportPath: "tests/fixtures/convex-matters-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
  },
  {
    domain: "work-management",
    exportPath: "tests/fixtures/convex-work-management-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
  },
  {
    domain: "crm",
    exportPath: "tests/fixtures/convex-crm-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
  },
  {
    domain: "communication",
    exportPath: "tests/fixtures/convex-communication-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
  },
  {
    domain: "documents",
    exportPath: "tests/fixtures/convex-export",
    extraArgs: ["--firm-map", storageFirmMap],
  },
  {
    domain: "envelopes",
    exportPath: "tests/fixtures/convex-envelopes-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
  },
  {
    domain: "hr",
    exportPath: "tests/fixtures/convex-hr-export",
    extraArgs: ["--firm-map", firmMap, "--orphan-firm", firmA],
  },
  {
    domain: "analytics",
    exportPath: "tests/fixtures/convex-identity-export",
    noOp: true,
  },
  {
    domain: "storage",
    exportPath: "tests/fixtures/convex-export",
    extraArgs: ["--firm-map", storageFirmMap],
  },
];

async function ensureExportsMirror() {
  // Plan step 2: place snapshot under exports/ — mirror fixtures for operator path.
  for (const item of DOMAINS) {
    if (item.noOp && item.domain === "analytics") continue;
    const dest = path.resolve("exports", item.domain);
    const src = path.resolve(item.exportPath);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    // Remove previous junction/dir if present
    await fs.rm(dest, { recursive: true, force: true }).catch(() => undefined);
    try {
      await fs.symlink(src, dest, "junction");
    } catch {
      // Fallback: skip mirror if symlink unsupported; rehearsal still uses --export-path
    }
  }
  await fs.copyFile(firmMap, path.resolve("exports", "firm-map.json")).catch(() => undefined);
}

async function ensureEnvelopeDocumentPrereq() {
  const { getDatabase } = await import("../../src/server/db/client");
  const { documents, users } = await import("../../src/server/db/schema");
  const { and, eq, isNull } = await import("drizzle-orm");
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

async function main() {
  await ensureExportsMirror();
  const summary: Array<{
    domain: string;
    dryRun: boolean;
    importOk: boolean;
    verifyOk: boolean;
    reconcileOk: boolean;
    notes?: string;
  }> = [];

  for (const item of DOMAINS) {
    const base = [
      "--domain",
      item.domain,
      "--export-path",
      path.resolve(item.exportPath),
      ...(item.extraArgs ?? []),
    ];

    console.log(`\n=== REHEARSE ${item.domain} ===`);

    const dry = await runCli(["import-mysql", ...base, "--dry-run"]);
    if (dry.code !== 0) {
      summary.push({
        domain: item.domain,
        dryRun: false,
        importOk: false,
        verifyOk: false,
        reconcileOk: false,
        notes: "dry-run failed",
      });
      continue;
    }

    if (item.domain === "envelopes") {
      await ensureEnvelopeDocumentPrereq();
    }

    const real = await runCli(["import-mysql", ...base]);
    if (real.code !== 0) {
      summary.push({
        domain: item.domain,
        dryRun: true,
        importOk: false,
        verifyOk: false,
        reconcileOk: false,
        notes: "import failed — see log / data-exceptions.csv",
      });
      continue;
    }

    const verify = await runCli(["verify", "--domain", item.domain]);
    const reconcile = await runCli(["reconcile", ...base]);

    summary.push({
      domain: item.domain,
      dryRun: true,
      importOk: true,
      verifyOk: verify.code === 0,
      reconcileOk: reconcile.code === 0,
    });
  }

  const report: DomainMigrationReport = {
    source: Object.fromEntries(summary.map((s) => [s.domain, 1])),
    migrated: Object.fromEntries(summary.filter((s) => s.importOk).map((s) => [s.domain, 1])),
    exceptions: summary
      .filter((s) => !s.importOk || !s.verifyOk || !s.reconcileOk)
      .map((s) => ({
        table: s.domain,
        reason: s.notes ?? `verify=${s.verifyOk} reconcile=${s.reconcileOk}`,
      })),
    reconciliation: {
      passed: summary.every((s) => s.importOk && s.verifyOk && s.reconcileOk),
      checks: Object.fromEntries(
        summary.map((s) => [
          s.domain,
          {
            source: 1,
            target: s.importOk && s.verifyOk && s.reconcileOk ? 1 : 0,
          },
        ]),
      ),
    },
  };

  await appendReconciliationReport({
    domain: "_all",
    command: "rehearse-all",
    report,
    notes: [
      "Local rehearsal sequence for every fixture domain.",
      "Flags already switched in Phase R2; this rehearsal proves CLI + importers.",
    ],
  });

  console.log("\n=== REHEARSAL SUMMARY ===");
  console.log(JSON.stringify({ passed: report.reconciliation.passed, summary }, null, 2));
  if (!report.reconciliation.passed) process.exitCode = 1;
  else console.log("migration:rehearse-all passed");
}

try {
  await main();
} finally {
  await closeDatabase();
}
