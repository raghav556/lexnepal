import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import { hashPassword } from "better-auth/crypto";
import { authAccounts, authUsers, clients, firms, users } from "../../db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required; refusing to seed an unknown database");

const seedPassword = process.env.SEED_PASSWORD?.trim().length
  ? process.env.SEED_PASSWORD!.trim()
  : "SrimarSeed123!";
if (seedPassword.length < 12)
  throw new Error(`SEED_PASSWORD must be at least 12 characters (got ${seedPassword.length})`);

// ---------------------------------------------------------------------------
// Default seed accounts for the firm.  Override via SEED_ADMIN_* / SEED_STAFF_* /
// SEED_CLIENT_* env vars (useful on shared hosts where .env.local is shared).
// ---------------------------------------------------------------------------
const allowedStaffRoles = new Set([
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
  "intern",
] as const);
type SeedRole =
  "admin" | "client" | "partner" | "senior_associate" | "associate" | "paralegal" | "intern";
const seedAccounts: Array<{ key: string; name: string; email: string; role: SeedRole }> = [
  {
    key: "admin",
    name: process.env.SEED_ADMIN_NAME?.trim() || "Srimar Admin",
    email: (process.env.SEED_ADMIN_EMAIL?.trim() || "admin@srimarlaw.com.np").toLowerCase(),
    role: "admin",
  },
  {
    key: "staff",
    name: process.env.SEED_STAFF_NAME?.trim() || "Srimar Associate",
    email: (process.env.SEED_STAFF_EMAIL?.trim() || "staff@srimarlaw.com.np").toLowerCase(),
    role: (process.env.SEED_STAFF_ROLE?.trim() as SeedRole | undefined) || "associate",
  },
  {
    key: "client",
    name: process.env.SEED_CLIENT_NAME?.trim() || "Srimar Client",
    email: (process.env.SEED_CLIENT_EMAIL?.trim() || "client@srimarlaw.com.np").toLowerCase(),
    role: "client",
  },
];

for (const account of seedAccounts) {
  if (account.role !== "admin" && account.role !== "client" && !allowedStaffRoles.has(account.role))
    throw new Error(`Unsupported seed role for ${account.key}: ${account.role}`);
}

const pool = createPool({
  uri: databaseUrl,
  connectionLimit: 1,
  charset: "utf8mb4",
  timezone: "Z",
  flags: ["FOUND_ROWS"],
});
const db = drizzle(pool);

async function upsertFirmId() {
  await db
    .insert(firms)
    .values({ name: "Srimar Law", slug: "srimar-law", legacyConvexId: "seed_default_firm" })
    .onDuplicateKeyUpdate({ set: { name: "Srimar Law", updatedAt: new Date() } });
  const [firm] = await db
    .select({ id: firms.id })
    .from(firms)
    .where(eq(firms.slug, "srimar-law"))
    .limit(1);
  if (!firm) throw new Error("Seed firm upsert did not produce a row");
  return firm.id;
}

async function upsertUser(firmId: string, account: (typeof seedAccounts)[number]) {
  await db
    .insert(users)
    .values({
      firmId,
      tokenIdentifier: `seed:${account.key}`,
      name: account.name,
      email: account.email,
      role: account.role,
      isActive: true,
      isPublicFacing: false,
      isPending: false,
      legacyConvexId: `seed_${account.key}`,
    })
    .onDuplicateKeyUpdate({
      set: {
        name: account.name,
        role: account.role,
        isActive: true,
        isPending: false,
        updatedAt: new Date(),
      },
    });

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(eq(users.firmId, firmId), eq(users.email, account.email)))
    .limit(1);
  if (!user || !user.email) throw new Error(`Seed user upsert failed for ${account.email}`);
  return { id: user.id, name: account.name, email: user.email };
}

async function provisionIdentity(user: { id: string; name: string; email: string }) {
  // Re-key the seed accounts deterministically: drop any prior auth link for this
  // email so re-running the seeder reconstructs a consistent identity.
  const [prior] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, user.email))
    .limit(1);
  if (prior) {
    await db.delete(authUsers).where(eq(authUsers.id, prior.id));
  }

  const authUserId = randomUUID();
  await db.insert(authUsers).values({
    id: authUserId,
    lexnepalUserId: user.id,
    name: user.name,
    email: user.email,
    emailVerified: true,
    role: "user",
  });

  const password = await hashPassword(seedPassword);
  await db.insert(authAccounts).values({
    id: randomUUID(),
    accountId: authUserId,
    providerId: "credential",
    issuer: "local:credential",
    userId: authUserId,
    password,
  });

  await db
    .update(users)
    .set({ tokenIdentifier: `local:${authUserId}`, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return authUserId;
}

async function ensureClientRecord(
  firmId: string,
  user: { id: string; name: string; email: string },
  role: string,
) {
  if (role !== "client") return;
  await db
    .insert(clients)
    .values({
      firmId,
      userId: user.id,
      type: "individual",
      fullName: user.name,
      email: user.email,
      kycStatus: "pending",
      isActive: true,
    })
    .onDuplicateKeyUpdate({
      set: { fullName: user.name, email: user.email, updatedAt: new Date() },
    });
}

try {
  const firmId = await upsertFirmId();
  const results: Array<{ key: string; role: string; email: string; authUserId: string }> = [];

  for (const account of seedAccounts) {
    const user = await upsertUser(firmId, account);
    await ensureClientRecord(firmId, user, account.role);
    const authUserId = await provisionIdentity(user);
    results.push({ key: account.key, role: account.role, email: user.email, authUserId });
  }

  process.stdout.write(
    `${JSON.stringify({
      firm: { slug: "srimar-law" },
      seeded: results.map((r) => ({ key: r.key, role: r.role, email: r.email })),
      password: seedPassword,
    })}\n`,
  );
  console.log(
    "Seed completed. All accounts are active and can sign in with the printed email + password.",
  );
  console.log("Change the password after first sign-in (or reset SEED_PASSWORD for a clean seed).");
} finally {
  await pool.end();
}
