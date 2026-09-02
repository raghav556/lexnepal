import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import { firms } from "../../db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required; refusing to seed an unknown database");

const slug = process.env.PUBLIC_FIRM_SLUG?.trim() || "srimar-law";
const name = process.env.PUBLIC_FIRM_NAME?.trim() || "Srimar Law";

const pool = createPool({
  uri: databaseUrl,
  connectionLimit: 1,
  charset: "utf8mb4",
  timezone: "Z",
  flags: ["FOUND_ROWS"],
});
const db = drizzle(pool);

try {
  await db
    .insert(firms)
    .values({ name, slug, legacyConvexId: `tenant:${slug}`, isActive: true })
    .onDuplicateKeyUpdate({ set: { name, isActive: true, updatedAt: new Date() } });

  const [firm] = await db
    .select({ id: firms.id, name: firms.name, slug: firms.slug })
    .from(firms)
    .where(eq(firms.slug, slug))
    .limit(1);

  if (!firm) throw new Error(`Tenant seed failed for PUBLIC_FIRM_SLUG=${slug}`);
  console.log(`Tenant ready: ${firm.name} (${firm.slug}) id=${firm.id}`);
} finally {
  await pool.end();
}
