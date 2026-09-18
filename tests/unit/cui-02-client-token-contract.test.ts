import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("src/index.css", "utf8");

function block(startMarker: string, endMarker: string): string {
  const start = css.indexOf(startMarker);
  expect(start, `missing selector ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = css.indexOf(endMarker, start + startMarker.length);
  expect(end, `missing terminator for ${startMarker}`).toBeGreaterThan(start);
  return css.slice(start, end);
}

function token(source: string, name: string): string | undefined {
  return source.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim();
}

const admin = block(".dashboard-theme.dashboard-admin {", ".dashboard-theme.dashboard-staff {");
const staff = block(".dashboard-theme.dashboard-staff {", ".dashboard-theme.dashboard-client {");
const client = block(".dashboard-theme.dashboard-client {", ".dark.dashboard-theme,");
const darkAdmin = block(
  ".dark.dashboard-theme.dashboard-admin,",
  ".dark.dashboard-theme.dashboard-staff,",
);
const darkStaff = block(
  ".dark.dashboard-theme.dashboard-staff,",
  ".dark.dashboard-theme.dashboard-client,",
);
const darkClient = block(
  ".dark.dashboard-theme.dashboard-client,",
  "@media (prefers-reduced-motion: reduce)",
);
const baseTheme = css.slice(
  css.indexOf(".dashboard-theme {"),
  css.indexOf(".dashboard-theme.dashboard-admin {"),
);

describe("CUI-02 client token contract", () => {
  it("keeps the Client selector and measured core tokens", () => {
    expect(client).toContain(".dashboard-theme.dashboard-client {");
    expect(token(client, "--dashboard-primary")).toBe("#0b2846");
    expect(token(client, "--dashboard-sidebar")).toBe("#0b2846");
    expect(token(client, "--dashboard-sidebar-deep")).toBe("#081f38");
    expect(token(client, "--dashboard-sidebar-active")).toBe("#123a66");
    expect(token(client, "--dashboard-canvas")).toBe("#f7f9fc");
    expect(token(client, "--dashboard-panel")).toBe("#ffffff");
    expect(token(client, "--dashboard-border")).toBe("#d7dde6");
    expect(token(client, "--dashboard-accent")).toBe("#c4a064");
    expect(token(client, "--dashboard-success")).toBe("#1f7a54");
    expect(token(client, "--dashboard-danger")).toBe("#c81e4a");
    expect(token(client, "--dashboard-sidebar-width")).toBe("16.25rem");
    expect(token(client, "--dashboard-topbar-height")).toBe("4rem");
    expect(token(client, "--dashboard-content-gutter")).toBe("2rem");
    expect(token(client, "--dashboard-radius-card")).toBe("0.75rem");
    expect(token(client, "--dashboard-font-sans")).toContain("Inter");
    expect(token(client, "--dashboard-font-display")).toContain("Playfair Display");
    expect(token(client, "--dashboard-font-nepali")).toContain("Mukta");
  });

  it("does not drift Staff or Admin selector values", () => {
    expect(token(admin, "--dashboard-primary")).toBe("#487fff");
    expect(token(admin, "--dashboard-sidebar-width")).toBe("17rem");
    expect(token(admin, "--dashboard-sidebar")).toBe("#0f172a");
    expect(token(staff, "--dashboard-primary")).toBe("#6d28d9");
    expect(token(staff, "--dashboard-sidebar")).toBe("#10233f");
    expect(token(staff, "--dashboard-sidebar-width")).toBe("15.5rem");
    expect(token(darkAdmin, "--dashboard-primary")).toBe("#8c8dff");
    expect(token(darkStaff, "--dashboard-primary")).toBe("#8554ea");
    expect(admin).not.toContain("#0b2846");
    expect(staff).not.toContain("#0b2846");
  });

  it("does not rewrite global or shared dashboard base selectors", () => {
    expect(token(baseTheme, "--dashboard-primary")).toBe("#6d28d9");
    expect(token(baseTheme, "--dashboard-sidebar-width")).toBe("14rem");
    expect(token(baseTheme, "--dashboard-canvas")).toBe("#f8fafc");
    const root = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
    expect(root).toContain("--foreground: oklch(0.18 0.015 260);");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(darkClient).toContain("--dashboard-primary: #60a5fa");
  });
});
