import { returningInsert } from "@/server/db/mysql-returning";
import { returningUpsert } from "@/server/db/mysql-returning";
/**
 * Deterministic Better Auth users for R5.7 browser smoke.
 * Local/dev DBs only (`example.invalid` emails).
 */
import { eq, inArray } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { authUsers, firms, users } from "../../db/schema";
import { E2E_PASSWORD, E2E_USERS } from "./fixtures";

export { E2E_PASSWORD, E2E_USERS };

async function ensureFirmId(): Promise<string> {
  const db = getDatabase();
  const fixtureEmails = Object.values(E2E_USERS).map((fixture) => fixture.email);
  const existingFixtureUsers = await db
    .select({ firmId: users.firmId })
    .from(users)
    .where(inArray(users.email, fixtureEmails));
  const existingFirmIds = [...new Set(existingFixtureUsers.map((user) => user.firmId))];
  if (existingFirmIds.length > 1) {
    throw new Error("E2E fixture users are split across firms; repair the local test data first");
  }
  if (existingFirmIds[0]) return existingFirmIds[0];

  const publicFirmSlug = process.env.PUBLIC_FIRM_SLUG?.trim();
  if (publicFirmSlug) {
    const [publicFirm] = await db
      .select({ id: firms.id })
      .from(firms)
      .where(eq(firms.slug, publicFirmSlug))
      .limit(1);
    if (!publicFirm) {
      throw new Error(`PUBLIC_FIRM_SLUG=${publicFirmSlug} does not identify a local firm`);
    }
    return publicFirm.id;
  }

  const [existing] = await db.select({ id: firms.id }).from(firms).limit(1);
  if (existing) return existing.id;
  const [created] = await returningInsert(
    db
      .insert(firms)
      .values({ name: "LexNepal E2E", slug: "lexnepal-e2e", legacyConvexId: "e2e_firm" })
      .$returningId(),
    (id) => db.select().from(firms).where(eq(firms.id, id)).limit(1),
  );
  return created!.id;
}

async function deleteAuthUserForEmail(email: string, lexnepalUserId: string) {
  const db = getDatabase();
  const [byLex] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.lexnepalUserId, lexnepalUserId))
    .limit(1);
  if (byLex) await db.delete(authUsers).where(eq(authUsers.id, byLex.id));
  const [byEmail] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1);
  if (byEmail) await db.delete(authUsers).where(eq(authUsers.id, byEmail.id));
}

export async function seedE2eUsers() {
  const db = getDatabase();
  const firmId = await ensureFirmId();
  const auth = getLocalAuth();

  for (const fixture of Object.values(E2E_USERS)) {
    const [lexUser] = await returningUpsert(
      db
        .insert(users)
        .values({
          firmId,
          tokenIdentifier: `e2e:${fixture.email}`,
          email: fixture.email,
          name: fixture.name,
          role: fixture.role,
          isActive: true,
          isPending: false,
        })
        .onDuplicateKeyUpdate({
          set: {
            isActive: true,
            isPending: false,
            deletedAt: null,
            role: fixture.role,
            name: fixture.name,
            updatedAt: new Date(),
          },
        }),
      () => db.select().from(users).where(eq(users.email, fixture.email)).limit(1),
    );

    await deleteAuthUserForEmail(fixture.email, lexUser!.id);

    const created = await auth.api.createUser({
      body: {
        name: fixture.name,
        email: fixture.email,
        password: E2E_PASSWORD,
        role: "user",
        data: { lexnepalUserId: lexUser!.id },
      },
    });
    await db
      .update(authUsers)
      .set({ emailVerified: true })
      .where(eq(authUsers.id, created.user.id));
  }

  return { firmId, password: E2E_PASSWORD, users: E2E_USERS };
}

const invokedDirectly = process.argv[1]
  ?.replace(/\\/g, "/")
  .endsWith("/scripts/e2e/seed-e2e-users.ts");
if (invokedDirectly) {
  try {
    const result = await seedE2eUsers();
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    await closeDatabase();
  }
}
