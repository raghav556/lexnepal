import { migrateCrmExport } from "../../../src/server/services/crm-migration";
import { appointments, leads } from "../../../src/server/db/schema";
import {
  registerExportDomain,
  readLegacyIdsFromExport,
  softDeleteByLegacyIds,
} from "./create-export-domain";

registerExportDomain({
  name: "crm",
  tables: ["leads", "appointments"],
  migrate: async ({ exportPath, firmMap, orphanFirmId }) =>
    migrateCrmExport({ exportPath, firmMap, orphanFirmId }),
  rollback: async ({ exportPath, isDryRun, log }) => {
    for (const [tableName, table] of [
      ["appointments", appointments],
      ["leads", leads],
    ] as const) {
      const ids = await readLegacyIdsFromExport(exportPath, tableName);
      await softDeleteByLegacyIds({ tableName, table, legacyIds: ids, isDryRun, log });
    }
  },
});
