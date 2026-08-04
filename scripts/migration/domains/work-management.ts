import { migrateWorkManagementExport } from "../../../src/server/services/work-management-migration";
import {
  hearings,
  researchNotes,
  sopTemplateTasks,
  sopTemplates,
  taskComments,
  tasks,
  taskWatchers,
} from "../../../src/server/db/schema";
import {
  registerExportDomain,
  readLegacyIdsFromExport,
  softDeleteByLegacyIds,
} from "./create-export-domain";

registerExportDomain({
  name: "work-management",
  tables: [
    "tasks",
    "taskComments",
    "taskWatchers",
    "hearings",
    "researchNotes",
    "sopTemplates",
    "sopTemplateTasks",
  ],
  migrate: async ({ exportPath, firmMap, orphanFirmId }) =>
    migrateWorkManagementExport({ exportPath, firmMap, orphanFirmId }),
  rollback: async ({ exportPath, isDryRun, log }) => {
    for (const [tableName, table] of [
      ["sopTemplateTasks", sopTemplateTasks],
      ["sopTemplates", sopTemplates],
      ["taskWatchers", taskWatchers],
      ["taskComments", taskComments],
      ["hearings", hearings],
      ["researchNotes", researchNotes],
      ["tasks", tasks],
    ] as const) {
      const ids = await readLegacyIdsFromExport(exportPath, tableName);
      await softDeleteByLegacyIds({ tableName, table, legacyIds: ids, isDryRun, log });
    }
  },
});
