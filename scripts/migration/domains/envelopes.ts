import { migrateEnvelopeExport } from "../../../src/server/services/envelope-migration";
import { signatureEnvelopes, signatureRecipients } from "../../../src/server/db/schema";
import {
  registerExportDomain,
  readLegacyIdsFromExport,
  softDeleteByLegacyIds,
} from "./create-export-domain";

registerExportDomain({
  name: "envelopes",
  tables: ["signatureEnvelopes", "signatureRecipients"],
  migrate: async ({ exportPath, firmMap, orphanFirmId }) =>
    migrateEnvelopeExport({ exportPath, firmMap, orphanFirmId }),
  rollback: async ({ exportPath, isDryRun, log }) => {
    for (const [tableName, table] of [
      ["signatureRecipients", signatureRecipients],
      ["signatureEnvelopes", signatureEnvelopes],
    ] as const) {
      const ids = await readLegacyIdsFromExport(exportPath, tableName);
      await softDeleteByLegacyIds({ tableName, table, legacyIds: ids, isDryRun, log });
    }
  },
});
