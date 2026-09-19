/**
 * CUI-05 Client Home composition contract.
 * Proves locked hierarchy and removal of competing Home concepts.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("src/views/client/ClientDashboard.tsx", "utf8");

describe("CUI-05 client home contract", () => {
  it("locks the Home information hierarchy", () => {
    expect(home).toContain('eyebrow: "Client Portal"');
    expect(home).toContain('"Active Matters"');
    expect(home).toContain('"Upcoming Hearing"');
    expect(home).toContain('"Documents Pending"');
    expect(home).toContain('"Actions Required"');
    expect(home).toContain('title="Your Matters"');
    expect(home).toContain('title="Recent Updates"');
    expect(home).toContain('title="Your Documents"');
    expect(home).toContain('title="Quick Actions"');
    expect(home).toContain("We&apos;re Here for You");
  });

  it("uses CUI-04 primitives instead of a Home-only card system", () => {
    expect(home).toContain("MetricCard");
    expect(home).toContain("ClientDocumentItem");
    expect(home).toContain("ClientTimelineItem");
    expect(home).toContain("ClientStatePanel");
    expect(home).toContain("ClientSoftPanel");
    expect(home).toContain("DashboardStatusLabel");
    expect(home).toContain("client-home-matter");
    expect(home).not.toContain("ClientMatterSummary");
    expect(home).not.toContain("PremiumUniversalLegalCard");
    expect(home).not.toMatch(/from ["']@\/components\/client-v2/);
  });

  it("does not keep competing Home composition labels", () => {
    expect(home).not.toContain("Featured Matter");
    expect(home).not.toContain("Next appointment");
    expect(home).not.toContain("What you need to do");
    expect(home).not.toContain("Secure client access");
    expect(home).not.toContain("Your legal portal");
    expect(home).not.toContain("Welcome back");
    expect(home).not.toContain('title="Upcoming"');
    expect(home).not.toContain("hearings and appointments");
  });

  it("maps locked metrics to live Client queries rather than screenshot values", () => {
    expect(home).toContain("useClientCases");
    expect(home).toContain("useHearings");
    expect(home).toContain("useDocuments");
    expect(home).toContain("useNotifications");
    expect(home).toContain("useTasks");
    expect(home).toContain("useMyClient");
    expect(home).not.toContain("Ravi Sharma");
    expect(home).not.toContain("ABC Construction");
    expect(home).not.toContain("2026-09-18T05:30:00.000Z");
    expect(home).not.toContain("078-C-1234");
    expect(home).toContain("useMyPendingEnvelopeActions");
    expect(home).toContain('item.status === "scheduled"');
    expect(home).not.toContain("useAppointments");
    expect(home).toContain("usePortalBranding");
    expect(home).toContain("heroImageUrl");
    expect(home).toContain("notificationCategory");
    expect(home).toContain("conciseUpdateDetail");
    expect(home).toContain("client-home-help-mark");
    expect(home).not.toContain("client-home-hero.jpg");
    expect(home).not.toContain("/doc/ui-reference");
    expect(home).not.toContain("client-home-hero-quote");
  });

  it("keeps Quick Actions on real routes", () => {
    expect(home).toContain("/client/documents");
    expect(home).toContain("/client/booking");
    expect(home).toContain("/client/messages");
    expect(home).toContain("/client/hearings");
    expect(home).toContain("`/client/cases/${homeMatter._id}`");
  });

  it("consumes the approved hero through CMS branding rather than a hardcoded file", () => {
    const seed = readFileSync("scripts/e2e/seed-cms-assets.ts", "utf8");
    const preview = readFileSync("scripts/e2e/seed-e2e-client-ui-preview.ts", "utf8");
    expect(seed).toContain("SEED_CMS_ASSET_PNG");
    expect(seed).toContain("seedKey");
    expect(seed).toContain("options.bytes ?? SEED_CMS_ASSET_PNG");
    expect(preview).toContain("client-home-hero.jpg");
    expect(preview).toContain("cui-05-client-home-hero");
    expect(preview).toContain('"hero_image"');
    expect(preview).toContain("heroImageUrl");
    expect(preview).toContain("brandingFirmId");
    expect(preview).toContain("PUBLIC_FIRM_SLUG");
    const css = readFileSync("src/index.css", "utf8");
    expect(css).toContain("clamp(3.5rem, 4vw, 4rem)");
    expect(css).toContain("clamp(14rem, 16.7857vw, 16.25rem)");
    expect(css).not.toContain("min(4rem, 4vw)");
  });
});
