import "server-only";
import { APPLICATION_NAME } from "@/shared/constants/application";
import type { ReadinessResponse } from "@/shared/contracts/operations";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { getServerEnvironment } from "@/server/env";

async function databaseIsReachable(): Promise<boolean> {
  try {
    await Promise.race([
      getDatabase().execute(sql`select 1 as ready`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database readiness timeout")), 2_000),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function evaluateReadiness(
  now = new Date(),
): Promise<{ ready: boolean; body: ReadinessResponse }> {
  const environment = getServerEnvironment();
  const databaseRequired = environment.READINESS_REQUIRE_DATABASE;
  const databaseConfigured = Boolean(environment.DATABASE_URL);
  const databaseReachable =
    databaseRequired && databaseConfigured ? await databaseIsReachable() : false;
  const ready = !databaseRequired || databaseReachable;

  return {
    ready,
    body: {
      status: ready ? "ok" : "degraded",
      service: APPLICATION_NAME,
      mode: databaseRequired ? "database" : "foundation",
      checks: {
        environment: "ok",
        database: databaseRequired
          ? !databaseConfigured
            ? "missing DATABASE_URL"
            : databaseReachable
              ? "reachable"
              : "unreachable"
          : "not required in foundation mode",
      },
      timestamp: now.toISOString(),
    },
  };
}
