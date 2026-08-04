import { migrateIdentityExport } from "../../../src/server/services/identity-migration";
import { users, firmSettings, auditLog } from "../../../src/server/db/schema";
import {
  registerExportDomain,
  readLegacyIdsFromExport,
  softDeleteByLegacyIds,
} from "./create-export-domain";

registerExportDomain({
  name: "identity",
  tables: ["users", "firmSettings", "sessions", "auditLog"],
  notes: ["Sessions are retired (not re-imported) by identity-migration."],
  migrate: async ({ exportPath, firmMap }) => migrateIdentityExport({ exportPath, firmMap }),
  rollback: async ({ exportPath, isDryRun, log }) => {
    // Do not hard-delete users (FK hub). Soft-delete migrated audit/settings only;
    // users soft-delete when present in export.
    for (const [tableName, table] of [
      ["auditLog", auditLog],
      ["firmSettings", firmSettings],
      ["users", users],
    ] as const) {
      const ids = await readLegacyIdsFromExport(exportPath, tableName);
      await softDeleteByLegacyIds({ tableName, table, legacyIds: ids, isDryRun, log });
    }
  },
});
