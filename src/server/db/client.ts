import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "../../../db/schema";
import { getServerEnvironment } from "@/server/env";

type Database = PostgresJsDatabase<typeof schema>;

let sqlClient: Sql | undefined;
let database: Database | undefined;

export function getDatabase(): Database {
  if (database) return database;
  const environment = getServerEnvironment();
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required for database access");
  sqlClient = postgres(environment.DATABASE_URL, {
    max: environment.NODE_ENV === "production" ? 10 : 2,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  database = drizzle(sqlClient, { schema });
  return database;
}

export async function closeDatabase(): Promise<void> {
  if (sqlClient) await sqlClient.end({ timeout: 5 });
  sqlClient = undefined;
  database = undefined;
}
