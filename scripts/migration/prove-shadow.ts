/** Shadow-read proof for retained identity and matter domains. */
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
import { appendReconciliationReport } from "./report-writer";
import type { DomainMigrationReport } from "./types";

const firmA = "61000000-0000-4000-8000-000000000001";

try {
  const firmMap = JSON.parse(
    await fs.readFile(path.resolve("tests/fixtures/convex-identity-firm-map.json"), "utf8"),
  ) as Record<string, string>;
  await migrateIdentityExport({
    exportPath: path.resolve("tests/fixtures/convex-identity-export"),
    firmMap,
  });
  await migrateMattersExport({
    exportPath: path.resolve("tests/fixtures/convex-matters-export"),
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
  const passed = identity.passed && matters.passed;
  const report: DomainMigrationReport = {
    source: {
      identityUsers: identity.checkedUsers,
      mattersClients: matters.checkedClients,
      mattersCases: matters.checkedCases,
    },
    migrated: {
      identityUsers: identity.checkedUsers,
      mattersClients: matters.checkedClients,
      mattersCases: matters.checkedCases,
    },
    exceptions: [...identity.mismatches, ...matters.mismatches].map((mismatch) => ({
      table: mismatch.table,
      id: mismatch.id,
      reason: `${mismatch.field}: ${JSON.stringify(mismatch.source)} vs ${JSON.stringify(mismatch.target)}`,
    })),
    reconciliation: {
      passed,
      checks: {
        identity: { source: 1, target: identity.passed ? 1 : 0 },
        matters: { source: 1, target: matters.passed ? 1 : 0 },
      },
    },
  };
  await appendReconciliationReport({
    domain: "r4.2",
    command: "prove-shadow",
    report,
    notes: ["Shadow reads cover retained identity and matter domains."],
  });
  console.log(JSON.stringify({ passed, identity, matters }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  await closeDatabase();
}
