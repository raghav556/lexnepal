import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PortalFooter } from "../../src/components/dashboard/portal-footer";

vi.mock("@/components/dashboard/portal-branding-context", () => ({
  usePortalBranding: () => ({ firmName: "Example Legal" }),
}));

describe("portal footer presentation contracts", () => {
  it.each(["staff", "admin"] as const)(
    "%s renders configured identity and truthful shortcuts without unverified claims",
    (portal) => {
      const markup = renderToStaticMarkup(createElement(PortalFooter, { portal }));
      expect(markup).toContain("Example Legal");
      expect(markup).toContain(String(new Date().getFullYear()));
      expect(markup).toContain(portal === "staff" ? "Staff workspace" : "Admin workspace");
      expect(markup).toContain("Search");
      expect(markup).toContain("Ctrl/⌘ K");
      expect(markup).toContain("Close Modals");
      const visibleCopy = markup.replace(/<[^>]*>/g, "");
      expect(visibleCopy).not.toMatch(/AES|encrypted|compliant|All Systems Operational|v2\.4\.0/i);
    },
  );

  it("preserves Client identity, copyright and existing public legal destinations", () => {
    const markup = renderToStaticMarkup(createElement(PortalFooter, { portal: "client" }));
    expect(markup).toContain("Example Legal");
    expect(markup).toContain("All rights reserved.");
    expect(markup).toContain('href="/privacy-policy"');
    expect(markup).toContain('href="/terms"');
    expect(markup).toContain('href="/contact"');
    expect(markup).not.toContain("Staff workspace");
    expect(markup).not.toContain("Admin workspace");
    expect(markup).not.toContain("Ctrl/⌘ K");
  });
});
