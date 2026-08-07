/**
 * Resources / Legal Library verify (RS-5):
 * - Published list only; draft hidden
 * - Gated list omits fileUrl
 * - Download after lead for gated; ungated download
 * - Detail 404 for draft slug
 * - Sitemap entries
 *
 * Prerequisites: migrate 0022, server on :3001
 */
import { and, eq, isNull } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { firms, resources } from "../../db/schema";
import { seedCmsSmoke } from "../e2e/seed-cms-smoke";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function main() {
  console.log(`\n=== Resources verify — ${BASE} ===\n`);
  await seedCmsSmoke();

  const listRes = await fetch(`${BASE}/api/v1/public/cms/resources`);
  if (!listRes.ok) throw new Error(`Public resources list failed: ${listRes.status}`);
  const listBody = (await listRes.json()) as { data: Array<Record<string, unknown>> };
  const list = listBody.data || [];
  console.log(`1. Public list OK (${list.length})`);

  const draftInList = list.find((r) => r.slug === "draft-employment-handbook");
  if (draftInList) throw new Error("Draft resource leaked into public list");
  console.log("2. Draft hidden from public list");

  const gated = list.find((r) => r.slug === "fdi-checklist-nepal");
  const ungated = list.find((r) => r.slug === "company-registration-guide");
  if (!gated || !ungated) throw new Error("Expected seeded published resources missing");
  if ("fileUrl" in gated && gated.fileUrl != null) {
    throw new Error("Gated resource leaked fileUrl in public list");
  }
  if (!ungated.fileUrl) throw new Error("Ungated resource missing fileUrl in public list");
  console.log("3. Gated omits fileUrl; ungated includes it");

  const gatedId = String(gated._id || gated.id);
  const ungatedId = String(ungated._id || ungated.id);

  const gatedBlocked = await fetch(`${BASE}/api/v1/public/cms/resources/download/${gatedId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  if (gatedBlocked.status !== 400) {
    throw new Error(`Expected gated download without lead → 400, got ${gatedBlocked.status}`);
  }
  console.log("4. Gated download without lead → 400");

  const gatedOk = await fetch(`${BASE}/api/v1/public/cms/resources/download/${gatedId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fullName: "Verify Lead",
      email: `resource-verify-${Date.now()}@example.com`,
    }),
  });
  if (!gatedOk.ok) throw new Error(`Gated download after lead failed: ${gatedOk.status}`);
  const gatedData = (await gatedOk.json()) as { data: { url?: string } };
  if (!gatedData.data?.url) throw new Error("Gated download missing url");
  console.log("5. Gated download after lead OK");

  const ungatedOk = await fetch(`${BASE}/api/v1/public/cms/resources/download/${ungatedId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!ungatedOk.ok) throw new Error(`Ungated download failed: ${ungatedOk.status}`);
  const ungatedData = (await ungatedOk.json()) as { data: { url?: string; downloads?: number } };
  if (!ungatedData.data?.url) throw new Error("Ungated download missing url");
  console.log("6. Ungated download OK");

  const detail = await fetch(
    `${BASE}/api/v1/public/cms/resources/company-registration-guide`,
  );
  if (!detail.ok) throw new Error(`Detail by slug failed: ${detail.status}`);
  const detailBody = (await detail.json()) as { data: Record<string, unknown> };
  if (detailBody.data?.isGated && detailBody.data?.fileUrl) {
    throw new Error("Detail leaked gated fileUrl");
  }
  console.log("7. Detail by slug OK");

  const draftDetail = await fetch(
    `${BASE}/api/v1/public/cms/resources/draft-employment-handbook`,
  );
  if (draftDetail.status !== 404) {
    throw new Error(`Expected draft detail 404, got ${draftDetail.status}`);
  }
  console.log("8. Draft detail → 404");

  const page = await fetch(`${BASE}/resources`);
  if (!page.ok) throw new Error(`/resources page failed: ${page.status}`);
  const detailPage = await fetch(`${BASE}/resources/company-registration-guide`);
  if (!detailPage.ok) throw new Error(`Detail page failed: ${detailPage.status}`);
  console.log("9. Public pages render");

  const sitemap = await fetch(`${BASE}/sitemap.xml`);
  if (!sitemap.ok) throw new Error(`Sitemap failed: ${sitemap.status}`);
  const xml = await sitemap.text();
  if (!xml.includes("/resources") || !xml.includes("/resources/company-registration-guide")) {
    throw new Error("Sitemap missing resource entries");
  }
  if (xml.includes("/resources/draft-employment-handbook")) {
    throw new Error("Sitemap includes draft resource");
  }
  console.log("10. Sitemap OK");

  const db = getDatabase();
  const slug = process.env.PUBLIC_FIRM_SLUG || "phase-6-firm-a";
  const [firm] = await db.select().from(firms).where(eq(firms.slug, slug)).limit(1);
  if (!firm) throw new Error("Firm missing");
  const published = await db
    .select({ slug: resources.slug })
    .from(resources)
    .where(
      and(
        eq(resources.firmId, firm.id),
        eq(resources.status, "published"),
        isNull(resources.deletedAt),
      ),
    );
  console.log(`11. DB published count ${published.length}`);

  console.log("\n✅ verify:resources passed\n");
}

main()
  .catch((error) => {
    console.error("\n❌ verify:resources failed\n", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
