/**
 * CUI-03 master Client shell contract.
 * Shell only: nav mapping, vocabulary, CMS palette isolation, footer claims.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CLIENT_CONTEXTUAL_MATTER_PATHS,
  CLIENT_DESKTOP_NAV,
  CLIENT_DESKTOP_PRIMARY,
  CLIENT_DESKTOP_SECONDARY,
  CLIENT_MOBILE_PRIMARY,
  CLIENT_UNSUPPORTED_FOOTER_CLAIMS,
  isClientDesktopNavActive,
  isClientPortalPath,
  resolveClientDesktopNav,
  resolveClientMobileNav,
} from "@/lib/client-shell-nav";
import { resolvePortalPaletteCssVars } from "@/lib/portal-branding";

function readSrc(path: string): string {
  return readFileSync(path, "utf8");
}

const ACTIVE_MATRIX: Array<{
  route: string;
  desktop: ReturnType<typeof resolveClientDesktopNav>;
  mobile: ReturnType<typeof resolveClientMobileNav>;
}> = [
  { route: "/client", desktop: "home", mobile: "home" },
  { route: "/client/cases", desktop: "my-matters", mobile: "matters" },
  { route: "/client/cases/preview-matter-id", desktop: "my-matters", mobile: "matters" },
  { route: "/client/hearings", desktop: "my-matters", mobile: "matters" },
  { route: "/client/checklist", desktop: "my-matters", mobile: "matters" },
  { route: "/client/documents", desktop: "documents", mobile: "documents" },
  { route: "/client/messages", desktop: "messages", mobile: "messages" },
  { route: "/client/booking", desktop: "appointments", mobile: "more" },
  { route: "/client/kyc", desktop: "identity-verification", mobile: "more" },
  { route: "/client/signatures", desktop: "sign-documents", mobile: "more" },
  { route: "/client/notifications", desktop: "notifications", mobile: "more" },
  { route: "/client/profile", desktop: "profile", mobile: "more" },
];

describe("CUI-03 client shell contract", () => {
  it("locks the desktop information hierarchy", () => {
    expect(CLIENT_DESKTOP_PRIMARY.map((item) => item.label)).toEqual([
      "Home",
      "My Matters",
      "Documents",
      "Messages",
      "Appointments",
    ]);
    expect(CLIENT_DESKTOP_SECONDARY.map((item) => item.label)).toEqual([
      "Identity Verification",
      "Sign Documents",
      "Notifications",
      "Profile",
    ]);
    expect(CLIENT_DESKTOP_NAV.map((item) => item.href)).not.toContain("/client/hearings");
    expect(CLIENT_DESKTOP_NAV.map((item) => item.href)).not.toContain("/client/checklist");
    expect(CLIENT_CONTEXTUAL_MATTER_PATHS).toEqual(["/client/hearings", "/client/checklist"]);
  });

  it("locks mobile primary items including visible More", () => {
    expect(CLIENT_MOBILE_PRIMARY.map((item) => item.label)).toEqual([
      "Home",
      "Matters",
      "Documents",
      "Messages",
    ]);
  });

  it("maps every required Client route to the locked desktop and mobile owners", () => {
    for (const row of ACTIVE_MATRIX) {
      expect(resolveClientDesktopNav(row.route), row.route).toBe(row.desktop);
      expect(resolveClientMobileNav(row.route), row.route).toBe(row.mobile);
    }
    expect(resolveClientDesktopNav("/client/hearings")).toBe("my-matters");
    expect(resolveClientDesktopNav("/client/hearings")).not.toBe("appointments");
    expect(isClientDesktopNavActive("/client/hearings", "/client/booking")).toBe(false);
    expect(isClientDesktopNavActive("/client/hearings", "/client/cases")).toBe(true);
    expect(isClientDesktopNavActive("/client/checklist", "/client/cases")).toBe(true);
    expect(isClientDesktopNavActive("/client", "/client")).toBe(true);
    expect(isClientDesktopNavActive("/client/cases", "/client")).toBe(false);
  });

  it("does not treat public or staff paths as Client portal paths", () => {
    expect(isClientPortalPath("/sign-in/client")).toBe(false);
    expect(isClientPortalPath("/staff")).toBe(false);
    expect(isClientPortalPath("/client")).toBe(true);
    expect(isClientPortalPath("/client/cases")).toBe(true);
  });

  it("keeps CMS primaryColor from overriding locked Client shell tokens", () => {
    const isolated = resolvePortalPaletteCssVars("#7c3aed", "light", false) as Record<
      string,
      string
    >;
    expect(isolated).toEqual({});
    const staff = resolvePortalPaletteCssVars("#7c3aed", "light", true) as Record<string, string>;
    expect(staff["--dashboard-primary"]).toBeTruthy();
    expect(staff["--dashboard-primary"]).not.toBe("#0b2846");
    expect(staff["--dashboard-focus"]).toBeTruthy();
    expect(staff["--dashboard-hero-end"]).toBeTruthy();

    const unset = resolvePortalPaletteCssVars(undefined, "light", true);
    expect(unset).toEqual({});
  });

  it("isolates Client branding injection in shell architecture", () => {
    const layout = readSrc("src/app/(client)/layout.tsx");
    const provider = readSrc("src/components/dashboard/portal-branding-context.tsx");
    const pageShell = readSrc("src/components/dashboard/portal-page-shell.tsx");
    const theme = readSrc("src/app/theme-engine.tsx");
    const staffLayout = readSrc("src/app/(staff)/layout.tsx");
    const adminLayout = readSrc("src/app/(admin)/layout.tsx");

    expect(layout).toMatch(/applyPalette=\{false\}/);
    expect(provider).toMatch(/applyPalette = true/);
    expect(pageShell).toMatch(/portal === "client" \? undefined : cssVars/);
    expect(theme).toMatch(/isClientPortalPath/);
    expect(staffLayout).not.toMatch(/applyPalette=\{false\}/);
    expect(adminLayout).not.toMatch(/applyPalette=\{false\}/);
  });

  it("uses explicit mapping instead of generic startsWith active rules", () => {
    const layout = readSrc("src/app/(client)/layout.tsx");
    expect(layout).toMatch(/isClientDesktopNavActive/);
    expect(layout).toMatch(/resolveClientMobileNav/);
    expect(layout).not.toMatch(/pathname\.startsWith\(`\$\{href\}\/`\)/);
    expect(layout).not.toMatch(/label: "Hearings"/);
    expect(layout).not.toMatch(/label: "Checklist"/);
    expect(layout).not.toMatch(/My Cases/);
    expect(layout).not.toMatch(/i18nKey: "nav.dashboard"/);
    expect(layout).toMatch(/Message Legal Team|client\.support_action/);
    expect(layout).toMatch(/nav\.more/);
    expect(layout).toMatch(/type="button"/);
    expect(layout).toMatch(/aria-expanded=\{open\}/);
  });

  it("simplifies Client topbar without removing Staff/Admin chrome", () => {
    const topbar = readSrc("src/components/dashboard/portal-topbar.tsx");
    const staff = readSrc("src/app/(staff)/layout.tsx");
    expect(topbar).toMatch(/accountSlot/);
    expect(topbar).toMatch(/isClient \? null/);
    expect(topbar).not.toMatch(/isClient \? "Quick Action"/);
    expect(topbar).not.toMatch(/Upload Document/);
    expect(topbar).toMatch(/Search your matters, documents or messages/);
    expect(topbar).toMatch(/Create/);
    expect(staff).toMatch(/onOpenCommandCenter/);
  });

  it("removes unsupported Client footer claims while leaving Staff/Admin copy", () => {
    const footer = readSrc("src/components/dashboard/portal-footer.tsx");
    const clientStart = footer.indexOf("if (isClient)");
    const staffStart = footer.lastIndexOf("return (");
    const clientBranch = footer.slice(clientStart, staffStart);
    for (const claim of CLIENT_UNSUPPORTED_FOOTER_CLAIMS) {
      expect(clientBranch).not.toMatch(new RegExp(claim, "i"));
    }
    expect(footer).toMatch(/256-bit AES Encrypted/);
    expect(footer).toMatch(/Privacy Policy/);
    expect(footer).toMatch(/Terms of Service/);
    expect(footer).toMatch(/Contact Us/);
  });

  it("extends mobile nav additively for More without replacing the engine", () => {
    const mobile = readSrc("src/components/dashboard/portal-mobile-nav.tsx");
    const staff = readSrc("src/app/(staff)/layout.tsx");
    expect(mobile).toMatch(/PortalMobileNavControls/);
    expect(mobile).toMatch(/typeof bottomBar === "function"/);
    expect(staff).toMatch(/bottomBar=\{bottomBar\}/);
    expect(staff).not.toMatch(/openMenu/);
  });

  it("keeps Client search on Client-permitted destinations", () => {
    const search = readSrc("src/components/dashboard/global-search-palette.tsx");
    expect(search).toMatch(/CLIENT_SEARCH_PAGES/);
    expect(search).toMatch(/portal === "client"/);
    expect(search).toMatch(/useClients\(\{ enabled: !isClientPortal \}\)/);
    expect(search).not.toMatch(/\/client\/billing/);
    expect(search).toMatch(/Conflict Checker/);
    expect(search).toMatch(/portal === "admin" \? "\/admin\/cases" : "\/staff\/cases"/);
  });
});
