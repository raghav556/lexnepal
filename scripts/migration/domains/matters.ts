import { migrateMattersExport } from "../../../src/server/services/matters-migration";
import { cases, clients, conflictChecks } from "../../../src/server/db/schema";
import {
  registerExportDomain,
  readLegacyIdsFromExport,
  softDeleteByLegacyIds,
} from "./create-export-domain";

registerExportDomain({
  name: "matters",
  tables: ["clients", "cases", "conflictChecks"],
  migrate: async ({ exportPath, firmMap, orphanFirmId }) =>
    migrateMattersExport({ exportPath, firmMap, orphanFirmId }),
  rollback: async ({ exportPath, isDryRun, log }) => {
    for (const [tableName, table] of [
      ["conflictChecks", conflictChecks],
      ["cases", cases],
      ["clients", clients],
    ] as const) {
      const ids = await readLegacyIdsFromExport(exportPath, tableName);
      await softDeleteByLegacyIds({ tableName, table, legacyIds: ids, isDryRun, log });
    }
  },
});
