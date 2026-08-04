import { migrateHrExport } from "../../../src/server/services/hr-migration";
import { attendance, leaveRequests } from "../../../src/server/db/schema";
import {
  registerExportDomain,
  readLegacyIdsFromExport,
  softDeleteByLegacyIds,
} from "./create-export-domain";

registerExportDomain({
  name: "hr",
  tables: ["attendance", "leaveRequests"],
  notes: ["HR residual domain; CMS careers/jobApplications stay on cms."],
  migrate: async ({ exportPath, firmMap, orphanFirmId }) =>
    migrateHrExport({ exportPath, firmMap, orphanFirmId }),
  rollback: async ({ exportPath, isDryRun, log }) => {
    for (const [tableName, table] of [
      ["leaveRequests", leaveRequests],
      ["attendance", attendance],
    ] as const) {
      const ids = await readLegacyIdsFromExport(exportPath, tableName);
      await softDeleteByLegacyIds({ tableName, table, legacyIds: ids, isDryRun, log });
    }
  },
});
