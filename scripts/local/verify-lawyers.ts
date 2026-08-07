/**
 * Our Team / Lawyers verify (LW-6):
 * - Public list has no internal email
 * - Cards fields come from CMS (practiceAreas present when set)
 * - GET /team/:id 404 for unknown / inactive
 * - Sitemap includes lawyer profile URLs
 *
 * Prerequisites: migrate 0021, server on :3001
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { firms, users } from "../../db/schema";
import { seedCmsSmoke } from "../e2e/seed-cms-smoke";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function main() {
  console.log(`\n=== Lawyers verify — ${BASE} ===\n`);
  await seedCmsSmoke();

  const listRes = await fetch(`${BASE}/api/v1/public/cms/team`);
  if (!listRes.ok) throw new Error(`Public team list failed: ${listRes.status}`);
  const listBody = (await listRes.json()) as { data: Array<Record<string, unknown>> };
  const team = listBody.data || [];
  console.log(`1. Public team list OK (${team.length})`);

  for (const member of team) {
    if ("email" in member && member.email != null) {
      throw new Error(`Public team leaked internal email for ${member.name}`);
    }
    if ("isPending" in member || "isActive" in member) {
      throw new Error(`Public team leaked status flags for ${member.name}`);
    }
  }
  console.log("2. Privacy OK — no email / status flags");

  const pageRes = await fetch(`${BASE}/lawyers`);
  if (!pageRes.ok) throw new Error(`/lawyers page failed: ${pageRes.status}`);
  const html = await pageRes.text();
  if (html.includes("Civil Rights") && html.includes("getLawyerDetails")) {
    throw new Error("Unexpected fake specialty helper still referenced");
  }
  console.log("3. Directory page renders");

  const missing = await fetch(`${BASE}/api/v1/public/cms/team/00000000-0000-4000-8000-000000000099`);
  if (missing.status !== 404) throw new Error(`Expected 404 for unknown id, got ${missing.status}`);
  console.log("4. Unknown id → 404");

  const db = getDatabase();
  const slug = process.env.PUBLIC_FIRM_SLUG || "phase-6-firm-a";
  const [firm] = await db.select().from(firms).where(eq(firms.slug, slug)).limit(1);
  if (!firm) throw new Error("Firm missing");

  let [featured] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.firmId, firm.id),
        eq(users.isPublicFacing, true),
        eq(users.isActive, true),
        isNull(users.deletedAt),
        sql`${users.role} <> 'client'`,
      ),
    )
    .limit(1);

  if (!featured) {
    const [candidate] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.firmId, firm.id),
          eq(users.isActive, true),
          isNull(users.deletedAt),
          sql`${users.role} <> 'client'`,
        ),
      )
      .limit(1);
    if (!candidate) throw new Error("No staff user available to feature for verify");
    await db
      .update(users)
      .set({
        isPublicFacing: true,
        bio: candidate.bio || "Verify profile bio for public directory.",
        yearsExperience: candidate.yearsExperience ?? 8,
        languages: (candidate.languages as string[] | null)?.length
          ? candidate.languages
          : ["Nepali", "English"],
        displayOrder: 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, candidate.id));
    featured = { ...candidate, isPublicFacing: true };
    console.log(`5a. Featured staff for verify — ${featured.name}`);
  }

  const detail = await fetch(`${BASE}/api/v1/public/cms/team/${featured.id}`);
  if (!detail.ok) throw new Error(`Featured member detail failed: ${detail.status}`);
  const detailBody = (await detail.json()) as { data: Record<string, unknown> };
  if (detailBody.data?.email) throw new Error("Detail leaked email");
  if (!("practiceAreas" in detailBody.data)) throw new Error("Detail missing practiceAreas");
  const profilePage = await fetch(`${BASE}/lawyers/${featured.id}`);
  if (!profilePage.ok) throw new Error(`Profile page failed: ${profilePage.status}`);
  console.log(`5. Featured profile OK — ${featured.name}`);

  await db
    .update(users)
    .set({ isPublicFacing: false, updatedAt: new Date() })
    .where(eq(users.id, featured.id));
  const hidden = await fetch(`${BASE}/api/v1/public/cms/team/${featured.id}`);
  if (hidden.status !== 404) {
    await db
      .update(users)
      .set({ isPublicFacing: true, updatedAt: new Date() })
      .where(eq(users.id, featured.id));
    throw new Error(`Expected hidden member 404, got ${hidden.status}`);
  }
  await db
    .update(users)
    .set({ isPublicFacing: true, updatedAt: new Date() })
    .where(eq(users.id, featured.id));
  console.log("6. Hidden member → 404 (restored)");

  const sitemap = await fetch(`${BASE}/sitemap.xml`);
  if (!sitemap.ok) throw new Error(`Sitemap failed: ${sitemap.status}`);
  const xml = await sitemap.text();
  if (!xml.includes(`/lawyers/${featured.id}`)) {
    throw new Error("Sitemap missing lawyer profile URL");
  }
  console.log("7. Sitemap includes lawyer profile");

  const consult = await fetch(
    `${BASE}/consultation?lawyerId=${encodeURIComponent(featured.id)}`,
  );
  if (!consult.ok) throw new Error(`Consultation page failed: ${consult.status}`);
  console.log("8. Consultation deep-link page OK");

  const listAfter = await fetch(`${BASE}/api/v1/public/cms/team`);
  const listAfterBody = (await listAfter.json()) as { data: unknown[] };
  if (!Array.isArray(listAfterBody.data) || listAfterBody.data.length < 1) {
    throw new Error("Expected at least one public team member after featuring");
  }
  console.log(`9. Public roster non-empty (${listAfterBody.data.length})`);

  console.log("\nPASS — lawyers directory + privacy + profile APIs\n");
}

main()
  .catch((err) => {
    console.error("\nFAIL —", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
