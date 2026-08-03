import "server-only";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../../db/schema";

type Database = PostgresJsDatabase<typeof schema>;
type TransactionCallback<T> = Parameters<Database["transaction"]>[0] extends (
  transaction: infer Transaction,
) => Promise<unknown>
  ? (transaction: Transaction) => Promise<T>
  : never;

/** Required boundary for invoice, payment, trust, expense and time-entry mutations. */
export function runFinancialTransaction<T>(
  database: Database,
  operation: TransactionCallback<T>,
): Promise<T> {
  return database.transaction(operation as Parameters<Database["transaction"]>[0]) as Promise<T>;
}
