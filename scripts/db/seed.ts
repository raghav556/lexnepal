import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { firms, users } from "../../db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required; refusing to seed an unknown database");

const sql = postgres(databaseUrl, { max: 1, prepare: false });
const db = drizzle(sql);

try {
  await db.transaction(async (transaction) => {
    const [firm] = await transaction
      .insert(firms)
      .values({ name: "Srimar Law", slug: "lexnepal", legacyConvexId: "seed_default_firm" })
      .onConflictDoUpdate({
        target: firms.slug,
        set: { name: "Srimar Law", updatedAt: new Date() },
      })
      .returning({ id: firms.id });

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
      .onConflictDoNothing({ target: users.tokenIdentifier });
  });
  console.log(
    "Seed completed. The placeholder administrator remains pending and cannot authenticate.",
  );
} finally {
  await sql.end();
}
