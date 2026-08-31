/**
 * News & Awards verify (NW-5):
 * - Public list published-only; pending hidden
 * - Detail by slug; pending 404
 * - UUID detail URL redirects to slug
 * - Sitemap includes published slugs only
 * - Approve → public smoke
 * - Listing / detail pages 200
 *
 * Prerequisites: migrate 0024, server on :3001
 */
import { and, eq, isNull } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { firms, newsAndAwards } from "../../db/schema";
import { seedCmsSmoke } from "../e2e/seed-cms-smoke";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function main() {
  console.log(`\n=== News verify — ${BASE} ===\n`);
  const seeded = await seedCmsSmoke();

  const listRes = await fetch(`${BASE}/api/v1/public/cms/news`);
  if (!listRes.ok) throw new Error(`Public news list failed: ${listRes.status}`);
  const listBody = (await listRes.json()) as { data: Array<Record<string, unknown>> };
  const list = listBody.data || [];
  console.log(`1. Public list OK (${list.length})`);

  for (const item of list) {
    if (item.status && item.status !== "published") {
      throw new Error(`Non-published news leaked: ${item.slug} (${item.status})`);
    }
  }
  if (list.some((n) => n.slug === "pending-review-regional-expansion")) {
    throw new Error("Pending news leaked into public list");
  }
  console.log("2. Pending/draft hidden");

  const published = list.find((n) => n.slug === "lexnepal-named-top-corporate-law-firm-2026");
  if (!published) throw new Error("Expected seeded published award missing");

  const detail = await fetch(
    `${BASE}/api/v1/public/cms/news/by-slug/lexnepal-named-top-corporate-law-firm-2026`,
  );
  if (!detail.ok) throw new Error(`Detail by slug failed: ${detail.status}`);
  const detailBody = (await detail.json()) as { data: Record<string, unknown> };
  if (!String(detailBody.data?.content || "").includes("##")) {
    console.log("   (markdown markers present check soft)");
  }
  console.log("3. Detail by slug OK");

  const pendingDetail = await fetch(
    `${BASE}/api/v1/public/cms/news/by-slug/pending-review-regional-expansion`,
  );
  if (pendingDetail.status !== 404) {
    throw new Error(`Expected pending detail 404, got ${pendingDetail.status}`);
  }
  console.log("4. Pending detail → 404");

  const page = await fetch(`${BASE}/news`);
  if (!page.ok) throw new Error(`/news failed: ${page.status}`);
  const detailPage = await fetch(`${BASE}/news/lexnepal-named-top-corporate-law-firm-2026`);
  if (!detailPage.ok) throw new Error(`News detail page failed: ${detailPage.status}`);
  console.log("5. Public pages render");

  const uuidRedirect = await fetch(`${BASE}/news/${seeded.newsId}`, { redirect: "manual" });
  if (uuidRedirect.status !== 307 && uuidRedirect.status !== 308 && uuidRedirect.status !== 302) {
    throw new Error(`Expected UUID redirect, got ${uuidRedirect.status}`);
  }
  const location = uuidRedirect.headers.get("location") || "";
  if (!location.includes("/news/lexnepal-named-top-corporate-law-firm-2026")) {
    throw new Error(`UUID redirect location unexpected: ${location}`);
  }
  console.log("6. UUID → slug redirect OK");

  const sitemap = await fetch(`${BASE}/sitemap.xml`);
  if (!sitemap.ok) throw new Error(`Sitemap failed: ${sitemap.status}`);
  const xml = await sitemap.text();
  if (!xml.includes("/news/lexnepal-named-top-corporate-law-firm-2026")) {
    throw new Error("Sitemap missing published news slug");
  }
  if (xml.includes("/news/pending-review-regional-expansion")) {
    throw new Error("Sitemap includes pending news");
  }
  console.log("7. Sitemap OK");

  const db = getDatabase();
  const slug = process.env.PUBLIC_FIRM_SLUG || "phase-6-firm-a";
  const [firm] = await db.select().from(firms).where(eq(firms.slug, slug)).limit(1);
  if (!firm) throw new Error("Firm missing");

  const [pending] = await db
    .select()
    .from(newsAndAwards)
    .where(
      and(
        eq(newsAndAwards.firmId, firm.id),
        eq(newsAndAwards.slug, "pending-review-regional-expansion"),
        isNull(newsAndAwards.deletedAt),
      ),
    )
    .limit(1);
  if (!pending || pending.status !== "pending_review") {
    throw new Error("Seed pending news missing in DB");
  }

  await db
    .update(newsAndAwards)
    .set({
      status: "published",
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(newsAndAwards.id, pending.id));

  const afterApprove = await fetch(
    `${BASE}/api/v1/public/cms/news/by-slug/pending-review-regional-expansion`,
  );
  if (!afterApprove.ok) {
    throw new Error(`After approve, detail should be public, got ${afterApprove.status}`);
  }
  console.log("8. Approve → public OK");

  await db
    .update(newsAndAwards)
    .set({ status: "pending_review", updatedAt: new Date() })
    .where(eq(newsAndAwards.id, pending.id));

  console.log("\n✅ verify:news passed\n");
}

main()
  .catch((error) => {
    console.error("\n❌ verify:news failed\n", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
