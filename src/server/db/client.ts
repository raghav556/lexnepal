import "server-only";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";
import * as schema from "../../../db/schema";
import { getServerEnvironment } from "@/server/env";

type Database = MySql2Database<typeof schema>;

let sqlClient: Pool | undefined;
let database: Database | undefined;

export function getDatabase(): Database {
  if (database) return database;
  const environment = getServerEnvironment();
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required for database access");
  sqlClient = createPool({
    uri: environment.DATABASE_URL,
    connectionLimit: environment.NODE_ENV === "production" ? 10 : 2,
    waitForConnections: true,
    charset: "utf8mb4",
    timezone: "Z",
    flags: ["FOUND_ROWS"],
    enableKeepAlive: true,
  });
  database = drizzle(sqlClient, { schema, mode: "default" });
  return database;
}

export async function closeDatabase(): Promise<void> {
  if (sqlClient) await sqlClient.end();
  sqlClient = undefined;
  database = undefined;
}
