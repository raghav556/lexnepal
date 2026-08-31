/**
 * Practice Areas verify (PA-5):
 * - Public list/detail for active areas
 * - Inactive slug → 404
 * - Team filter by practice area title
 * - Slug rename writes urlRedirects cache entry
 *
 * Prerequisites: server on :3001
 *   npm run e2e:seed:cms
 *   npm run verify:practice-areas
 */
import { and, eq, isNull } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { firms, practiceAreas, users } from "../../db/schema";
import { PostgresCmsRepository } from "../../src/server/repositories/cms-repository";
import { readCmsRedirectsCache } from "../../src/server/cms/redirect-cache";
import { seedCmsSmoke } from "../e2e/seed-cms-smoke";
import {
  normalizePracticeAreaKey,
  resolvePracticeAreaTitleFromParam,
} from "../../src/shared/practice-areas-visibility";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function main() {
  console.log(`\n=== Practice areas verify — ${BASE} ===\n`);

  const seed = await seedCmsSmoke();
  console.log(`1. Seeded firm ${seed.firmSlug} (${seed.practiceAreaIds.length} practice areas)`);

  const listRes = await fetch(`${BASE}/api/v1/public/cms/practice-areas`);
  if (!listRes.ok) throw new Error(`Public list failed: ${listRes.status}`);
  const listBody = (await listRes.json()) as {
    data: Array<{ title: string; slug: string; isActive?: boolean }>;
  };
  const areas = listBody.data || [];
  if (areas.length < 1) throw new Error("Expected at least one public practice area");
  console.log(`2. Public list OK (${areas.length})`);

  const sample = areas[0]!;
  const detailRes = await fetch(`${BASE}/api/v1/public/cms/practice-areas/${sample.slug}`);
  if (!detailRes.ok) throw new Error(`Detail failed for ${sample.slug}: ${detailRes.status}`);
  console.log(`3. Detail OK — ${sample.title}`);

  const missing = await fetch(`${BASE}/api/v1/public/cms/practice-areas/does-not-exist-pa`);
  if (missing.status !== 404)
    throw new Error(`Expected 404 for missing slug, got ${missing.status}`);
  console.log("4. Missing slug → 404");

  const db = getDatabase();
  const [firm] = await db.select().from(firms).where(eq(firms.slug, seed.firmSlug)).limit(1);
  if (!firm) throw new Error("Firm missing after seed");

  const [row] = await db
    .select()
    .from(practiceAreas)
    .where(
      and(
        eq(practiceAreas.firmId, firm.id),
        eq(practiceAreas.slug, sample.slug),
        isNull(practiceAreas.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Sample PA row missing");

  await db
    .update(practiceAreas)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(practiceAreas.id, row.id));

  const inactiveRes = await fetch(`${BASE}/api/v1/public/cms/practice-areas/${sample.slug}`);
  if (inactiveRes.status !== 404) {
    await db
      .update(practiceAreas)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(practiceAreas.id, row.id));
    throw new Error(`Expected inactive slug 404, got ${inactiveRes.status}`);
  }
  await db
    .update(practiceAreas)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(practiceAreas.id, row.id));
  console.log("5. Inactive slug → 404 (restored)");

  const teamRes = await fetch(
    `${BASE}/api/v1/public/cms/team?practiceArea=${encodeURIComponent(sample.title)}`,
  );
  if (!teamRes.ok) throw new Error(`Team filter failed: ${teamRes.status}`);
  const teamBody = (await teamRes.json()) as { data: unknown[] };
  if (!Array.isArray(teamBody.data)) throw new Error("Team filter did not return array");
  console.log(`6. Team filter OK (${teamBody.data.length} matches for “${sample.title}”)`);

  const resolved = resolvePracticeAreaTitleFromParam(sample.slug, areas);
  if (resolved !== sample.title) {
    throw new Error(`Slug→title resolve failed: ${sample.slug} → ${resolved}`);
  }
  if (normalizePracticeAreaKey(sample.title) !== normalizePracticeAreaKey(resolved!)) {
    throw new Error("normalizePracticeAreaKey mismatch");
  }
  console.log("7. Consultation param resolve (slug→title) OK");

  const repo = new PostgresCmsRepository();
  const oldSlug = sample.slug;
  const newSlug = `${oldSlug}-renamed-verify`;
  const [actor] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.firmId, firm.id), isNull(users.deletedAt)))
    .limit(1);
  if (!actor) throw new Error("No firm user available for audit actor");
  const audit = {
    actorId: actor.id,
    firmId: firm.id,
    ipAddress: "127.0.0.1",
    requestId: "verify-practice-areas",
    occurredAt: new Date(),
  };
  await repo.updatePracticeArea(firm.id, row.id, { slug: newSlug }, audit);
  const redirects = readCmsRedirectsCache();
  const hit = redirects.find(
    (r) => r.from === `/practice-areas/${oldSlug}` && r.to === `/practice-areas/${newSlug}`,
  );
  if (!hit) {
    await repo.updatePracticeArea(firm.id, row.id, { slug: oldSlug }, audit);
    throw new Error("Slug rename did not write urlRedirects cache entry");
  }
  // restore original slug
  await repo.updatePracticeArea(firm.id, row.id, { slug: oldSlug }, audit);
  console.log("8. Slug rename → urlRedirects OK (restored)");

  const pageRes = await fetch(`${BASE}/practice-areas`);
  if (!pageRes.ok) throw new Error(`/practice-areas page failed: ${pageRes.status}`);
  const detailPage = await fetch(`${BASE}/practice-areas/${oldSlug}`);
  if (!detailPage.ok) throw new Error(`Detail page failed: ${detailPage.status}`);
  console.log("9. Public pages render OK");

  console.log("\nPASS — practice areas mapping + public APIs\n");
}

main()
  .catch((err) => {
    console.error("\nFAIL —", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
