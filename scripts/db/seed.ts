import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import { firms, users } from "../../db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required; refusing to seed an unknown database");

const pool = createPool({
  uri: databaseUrl,
  connectionLimit: 1,
  charset: "utf8mb4",
  timezone: "Z",
  flags: ["FOUND_ROWS"],
});
const db = drizzle(pool);

try {
  await db.transaction(async (transaction) => {
    await transaction
      .insert(firms)
      .values({ name: "Srimar Law", slug: "lexnepal", legacyConvexId: "seed_default_firm" })
      .onDuplicateKeyUpdate({ set: { name: "Srimar Law", updatedAt: new Date() } });
    const [firm] = await transaction
      .select({ id: firms.id })
      .from(firms)
      .where(eq(firms.slug, "lexnepal"))
      .limit(1);
    if (!firm) throw new Error("Seed firm upsert did not produce a row");

    await transaction
      .insert(users)
      .values({
        firmId: firm.id,
        tokenIdentifier: "seed:admin",
        email: "admin@example.invalid",
        name: "Seed Administrator",
        role: "admin",
        isActive: true,
        isPending: true,
        legacyConvexId: "seed_admin",
      })
      .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } });
  });
  console.log(
    "Seed completed. The placeholder administrator remains pending and cannot authenticate.",
  );
} finally {
  await pool.end();
}
