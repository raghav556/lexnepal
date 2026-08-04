import { migrateFinancialExport } from "../../../src/server/services/financial-migration";
import { expenses, invoices, timeEntries, trustTransactions } from "../../../src/server/db/schema";
import {
  registerExportDomain,
  readLegacyIdsFromExport,
  softDeleteByLegacyIds,
} from "./create-export-domain";
import {
  computeFinancialTotals,
  findMissingFinancialIds,
} from "../reconciliation-details";

registerExportDomain({
  name: "financial",
  tables: ["invoices", "timeEntries", "trustTransactions", "expenses"],
  migrate: async ({ exportPath, firmMap, orphanFirmId }) =>
    migrateFinancialExport({ exportPath, firmMap, orphanFirmId }),
  enrichDetails: async ({ exportPath, report, reconciler }) => {
    const financialTotals = await computeFinancialTotals(exportPath);
    const computedMissing = await findMissingFinancialIds(exportPath);
    const missingIds =
      computedMissing.length > 0
        ? computedMissing
        : report.exceptions
            .filter((ex): ex is { table: string; id: string; reason: string } => Boolean(ex.id))
            .map((ex) => ({ table: ex.table, id: ex.id, reason: ex.reason }));

    if (reconciler) {
      for (const row of financialTotals) {
        if (!row.match) {
          reconciler.addException({
            table: row.metric,
            type: "FINANCIAL_MISMATCH",
            reason: `Source ${row.source} != target ${row.target}`,
            sourceValue: row.source,
            targetValue: row.target,
          });
        }
      }
    }

    return { financialTotals, missingIds };
  },
  rollback: async ({ exportPath, isDryRun, log }) => {
    for (const [tableName, table] of [
      ["expenses", expenses],
      ["trustTransactions", trustTransactions],
      ["timeEntries", timeEntries],
      ["invoices", invoices],
    ] as const) {
      const ids = await readLegacyIdsFromExport(exportPath, tableName);
      await softDeleteByLegacyIds({ tableName, table, legacyIds: ids, isDryRun, log });
    }
  },
  notes: ["R3.5 financial totals compared export ↔ Postgres for invoice/expense/trust/time."],
});
