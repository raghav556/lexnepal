/**
 * R4.2 proof: shadow-read Convex fixtures against Postgres for identity, matters, financial.
 * Does not serve Next as authority — compares export → migrated PG rows only.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { closeDatabase } from "../../src/server/db/client";
import {
  migrateIdentityExport,
  shadowReadIdentityExport,
} from "../../src/server/services/identity-migration";
import {
  migrateMattersExport,
  shadowReadMattersExport,
} from "../../src/server/services/matters-migration";
import {
  migrateFinancialExport,
  shadowReadFinancialExport,
} from "../../src/server/services/financial-migration";
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";

const firmA = "61000000-0000-4000-8000-000000000001";
const firmMapPath = path.resolve("tests/fixtures/convex-identity-firm-map.json");

try {
  const firmMap = JSON.parse(await fs.readFile(firmMapPath, "utf8")) as Record<string, string>;

  await migrateIdentityExport({
    exportPath: path.resolve("tests/fixtures/convex-identity-export"),
    firmMap,
  });
  await migrateMattersExport({
    exportPath: path.resolve("tests/fixtures/convex-matters-export"),
    firmMap,
    orphanFirmId: firmA,
  });
  await migrateFinancialExport({
    exportPath: path.resolve("tests/fixtures/convex-financial-export"),
    firmMap,
    orphanFirmId: firmA,
  });

  const identity = await shadowReadIdentityExport({
    exportPath: path.resolve("tests/fixtures/convex-identity-export"),
    firmMap,
  });
  const matters = await shadowReadMattersExport({
    exportPath: path.resolve("tests/fixtures/convex-matters-export"),
    firmMap,
    orphanFirmId: firmA,
  });
  const financial = await shadowReadFinancialExport({
    exportPath: path.resolve("tests/fixtures/convex-financial-export"),
    firmMap,
    orphanFirmId: firmA,
  });

  const passed = identity.passed && matters.passed && financial.passed;
  const report: DomainMigrationReport = {
    source: {
      identityUsers: identity.checkedUsers,
      mattersClients: matters.checkedClients,
      mattersCases: matters.checkedCases,
      financialInvoices: financial.checkedInvoices,
    },
    migrated: {
      identityUsers: identity.checkedUsers,
      mattersClients: matters.checkedClients,
      mattersCases: matters.checkedCases,
      financialInvoices: financial.checkedInvoices,
    },
    exceptions: [
      ...identity.mismatches.map((m) => ({
        table: m.table,
        id: m.id,
        reason: `${m.field}: ${JSON.stringify(m.source)} vs ${JSON.stringify(m.target)}`,
      })),
      ...matters.mismatches.map((m) => ({
        table: m.table,
        id: m.id,
        reason: `${m.field}: ${JSON.stringify(m.source)} vs ${JSON.stringify(m.target)}`,
      })),
      ...financial.mismatches.map((m) => ({
        table: m.table,
        id: m.id,
        reason: `${m.field}: ${JSON.stringify(m.source)} vs ${JSON.stringify(m.target)}`,
      })),
    ],
    reconciliation: {
      passed,
      checks: {
        identity: { source: 1, target: identity.passed ? 1 : 0 },
        matters: { source: 1, target: matters.passed ? 1 : 0 },
        financial: { source: 1, target: financial.passed ? 1 : 0 },
      },
    },
  };

  await appendReconciliationReport({
    domain: "r4.2",
    command: "prove-shadow",
    report,
    notes: [
      "R4.2 shadow reads: Convex export vs Postgres (Next not served as authority).",
      `identity.passed=${identity.passed} mismatches=${identity.mismatches.length}`,
      `matters.passed=${matters.passed} mismatches=${matters.mismatches.length}`,
      `financial.passed=${financial.passed} mismatches=${financial.mismatches.length}`,
    ],
  });

  console.log(
    JSON.stringify(
      {
        passed,
        identity: { passed: identity.passed, mismatches: identity.mismatches.length },
        matters: { passed: matters.passed, mismatches: matters.mismatches.length },
        financial: { passed: financial.passed, mismatches: financial.mismatches.length },
      },
      null,
      2,
    ),
  );
  if (!passed) {
    process.exitCode = 1;
    console.error("migration:prove-shadow failed");
  } else {
    console.log("migration:prove-shadow passed");
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
