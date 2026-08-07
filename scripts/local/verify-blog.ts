/**
 * Blog / Legal Insights verify (BL-5):
 * - Public list published-only; pending/draft hidden
 * - Detail 404 for non-published
 * - Sitemap includes published slugs only
 * - Admin approve path smoke via DB status check
 * - Listing page 200
 *
 * Prerequisites: migrate 0023, server on :3001
 */
import { and, eq, isNull } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { blogPosts, firms } from "../../db/schema";
import { seedCmsSmoke } from "../e2e/seed-cms-smoke";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function main() {
  console.log(`\n=== Blog verify — ${BASE} ===\n`);
  await seedCmsSmoke();

  const listRes = await fetch(`${BASE}/api/v1/public/cms/blog-posts`);
  if (!listRes.ok) throw new Error(`Public blog list failed: ${listRes.status}`);
  const listBody = (await listRes.json()) as { data: Array<Record<string, unknown>> };
  const list = listBody.data || [];
  console.log(`1. Public list OK (${list.length})`);

  for (const post of list) {
    if (post.status && post.status !== "published") {
      throw new Error(`Non-published post leaked: ${post.slug} (${post.status})`);
    }
  }
  if (list.some((p) => p.slug === "pending-review-fdi-entry-modes")) {
    throw new Error("Pending post leaked into public list");
  }
  console.log("2. Pending/draft hidden");

  const published = list.find((p) => p.slug === "how-to-register-a-company-in-nepal");
  if (!published) throw new Error("Expected seeded published post missing");

  const detail = await fetch(
    `${BASE}/api/v1/public/cms/blog-posts/how-to-register-a-company-in-nepal`,
  );
  if (!detail.ok) throw new Error(`Detail failed: ${detail.status}`);
  const detailBody = (await detail.json()) as { data: Record<string, unknown> };
  if (!String(detailBody.data?.content || "").includes("##")) {
    console.log("   (markdown markers present check soft)");
  }
  console.log("3. Detail by slug OK");

  const pendingDetail = await fetch(
    `${BASE}/api/v1/public/cms/blog-posts/pending-review-fdi-entry-modes`,
  );
  if (pendingDetail.status !== 404) {
    throw new Error(`Expected pending detail 404, got ${pendingDetail.status}`);
  }
  console.log("4. Pending detail → 404");

  const page = await fetch(`${BASE}/blog`);
  if (!page.ok) throw new Error(`/blog failed: ${page.status}`);
  const detailPage = await fetch(`${BASE}/blog/how-to-register-a-company-in-nepal`);
  if (!detailPage.ok) throw new Error(`Blog detail page failed: ${detailPage.status}`);
  console.log("5. Public pages render");

  const sitemap = await fetch(`${BASE}/sitemap.xml`);
  if (!sitemap.ok) throw new Error(`Sitemap failed: ${sitemap.status}`);
  const xml = await sitemap.text();
  if (!xml.includes("/blog/how-to-register-a-company-in-nepal")) {
    throw new Error("Sitemap missing published blog slug");
  }
  if (xml.includes("/blog/pending-review-fdi-entry-modes")) {
    throw new Error("Sitemap includes pending blog");
  }
  console.log("6. Sitemap OK");

  const db = getDatabase();
  const slug = process.env.PUBLIC_FIRM_SLUG || "phase-6-firm-a";
  const [firm] = await db.select().from(firms).where(eq(firms.slug, slug)).limit(1);
  if (!firm) throw new Error("Firm missing");

  const [pending] = await db
    .select()
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.firmId, firm.id),
        eq(blogPosts.slug, "pending-review-fdi-entry-modes"),
        isNull(blogPosts.deletedAt),
      ),
    )
    .limit(1);
  if (!pending || pending.status !== "pending_review") {
    throw new Error("Seed pending post missing in DB");
  }

  await db
    .update(blogPosts)
    .set({
      status: "published",
      publishDate: new Date(),
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, pending.id));

  const afterApprove = await fetch(
    `${BASE}/api/v1/public/cms/blog-posts/pending-review-fdi-entry-modes`,
  );
  if (!afterApprove.ok) {
    throw new Error(`After approve, detail should be public, got ${afterApprove.status}`);
  }
  console.log("7. Approve → public OK");

  // restore pending for future runs (seed will recreate next time)
  await db
    .update(blogPosts)
    .set({ status: "pending_review", publishDate: null, updatedAt: new Date() })
    .where(eq(blogPosts.id, pending.id));

  console.log("\n✅ verify:blog passed\n");
}

main()
  .catch((error) => {
    console.error("\n❌ verify:blog failed\n", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
