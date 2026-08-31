import { describe, expect, it } from "vitest";
import { contrastRatio } from "../../src/lib/color-utils";
import { buildPortalBrandingCssVars } from "../../src/lib/portal-branding";

describe("portal branding accessibility", () => {
  it("makes a dark CMS brand readable throughout dark dashboards", () => {
    const palette = buildPortalBrandingCssVars("#3b0764", "dark") as Record<string, string>;
    expect(contrastRatio(palette["--dashboard-primary"], "#141d31")).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(palette["--dashboard-primary"], palette["--dashboard-primary-soft"]),
    ).toBeGreaterThanOrEqual(4.5);
    for (const token of [
      "--dashboard-primary",
      "--dashboard-primary-hover",
      "--dashboard-primary-pressed",
    ]) {
      expect(
        contrastRatio(palette[token], palette["--dashboard-primary-foreground"]),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("makes a light CMS brand safe for light dashboard controls", () => {
    const palette = buildPortalBrandingCssVars("#f5d96b", "light") as Record<string, string>;
    expect(contrastRatio(palette["--dashboard-primary"], "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(palette["--dashboard-primary"], palette["--dashboard-primary-foreground"]),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
