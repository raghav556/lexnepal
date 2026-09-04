import "server-only";
import { APPLICATION_NAME } from "@/shared/constants/application";
import type { ReadinessResponse } from "@/shared/contracts/operations";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { firms } from "@/server/db/schema";
import { getServerEnvironment } from "@/server/env";

type ReadinessDependencies = {
  databaseIsReachable: () => Promise<boolean>;
  publicFirmIsConfigured: (slug: string) => Promise<boolean>;
};

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

async function publicFirmIsConfigured(slug: string): Promise<boolean> {
  try {
    const query = getDatabase()
      .select({ id: firms.id })
      .from(firms)
      .where(and(eq(firms.slug, slug), eq(firms.isActive, true), isNull(firms.deletedAt)))
      .limit(1);
    const result = await Promise.race([
      query,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Public firm readiness timeout")), 2_000),
      ),
    ]);
    return Boolean(result[0]?.id);
  } catch {
    return false;
  }
}

export async function evaluateReadiness(
  now = new Date(),
  dependencies: ReadinessDependencies = { databaseIsReachable, publicFirmIsConfigured },
): Promise<{ ready: boolean; body: ReadinessResponse }> {
  const environment = getServerEnvironment();
  const databaseRequired = environment.READINESS_REQUIRE_DATABASE;
  const databaseConfigured = Boolean(environment.DATABASE_URL);
  const databaseReachable =
    databaseRequired && databaseConfigured ? await dependencies.databaseIsReachable() : false;
  const publicFirmConfigured =
    databaseRequired && databaseReachable
      ? await dependencies.publicFirmIsConfigured(environment.PUBLIC_FIRM_SLUG)
      : false;
  const ready = !databaseRequired || (databaseReachable && publicFirmConfigured);

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
        publicFirm: databaseRequired
          ? !databaseConfigured
            ? "not checked because DATABASE_URL is missing"
            : !databaseReachable
              ? "not checked because database is unreachable"
              : publicFirmConfigured
                ? "configured"
                : "missing, inactive, or deleted"
          : "not required in foundation mode",
      },
      timestamp: now.toISOString(),
    },
  };
}
