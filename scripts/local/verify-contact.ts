/**
 * Contact page verify (CT-3):
 * - /contact page 200
 * - Seeded firm contact + hero settings present in public settings
 * - POST public contact lead (website) succeeds with practice area
 * - Sitemap includes /contact
 *
 * Prerequisites: server on :3001
 */
import { closeDatabase } from "../../src/server/db/client";
import { seedCmsSmoke } from "../e2e/seed-cms-smoke";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";

async function main() {
  console.log(`\n=== Contact verify — ${BASE} ===\n`);
  await seedCmsSmoke();

  const page = await fetch(`${BASE}/contact`);
  if (!page.ok) throw new Error(`/contact failed: ${page.status}`);
  console.log("1. /contact page 200");

  const settingsRes = await fetch(`${BASE}/api/v1/public/cms/settings`);
  if (!settingsRes.ok) throw new Error(`Settings failed: ${settingsRes.status}`);
  const settingsBody = (await settingsRes.json()) as { data: Record<string, unknown> };
  const settings = settingsBody.data || {};
  for (const key of [
    "phone",
    "email",
    "address",
    "businessHoursText",
    "contactHeroTitle",
    "contactHeroSubtitle",
  ]) {
    if (!settings[key]) throw new Error(`Missing seeded setting: ${key}`);
  }
  console.log("2. Contact chrome settings present");

  const leadRes = await fetch(`${BASE}/api/v1/public/leads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fullName: "Verify Contact Form",
      email: "verify-contact@example.invalid",
      phone: "+977-9800000011",
      message: "verify:contact smoke message for CRM mapping.",
      practiceAreaInterest: "Corporate Law",
      source: "website",
    }),
  });
  if (!leadRes.ok) {
    throw new Error(`Public contact lead failed: ${leadRes.status} ${await leadRes.text()}`);
  }
  const leadBody = (await leadRes.json()) as { data: Record<string, unknown> };
  if (leadBody.data?.source !== "website") {
    throw new Error(`Expected source website, got ${leadBody.data?.source}`);
  }
  if (leadBody.data?.practiceAreaInterest !== "Corporate Law") {
    throw new Error("practiceAreaInterest not stored");
  }
  if (leadBody.data?.resourceId) {
    throw new Error("Contact form lead should not have resourceId");
  }
  console.log("3. Public contact lead → CRM OK");

  const weak = await fetch(`${BASE}/api/v1/public/leads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fullName: "Incomplete",
      source: "website",
    }),
  });
  if (weak.status !== 400 && weak.status !== 422) {
    throw new Error(`Expected validation failure for incomplete lead, got ${weak.status}`);
  }
  console.log("4. Incomplete contact payload rejected");

  const sitemap = await fetch(`${BASE}/sitemap.xml`);
  if (!sitemap.ok) throw new Error(`Sitemap failed: ${sitemap.status}`);
  const xml = await sitemap.text();
  if (!xml.includes("/contact")) throw new Error("Sitemap missing /contact");
  console.log("5. Sitemap OK");

  console.log("\n✅ verify:contact passed\n");
}

main()
  .catch((error) => {
    console.error("\n❌ verify:contact failed\n", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
