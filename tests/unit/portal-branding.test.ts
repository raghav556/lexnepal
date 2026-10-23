import { describe, expect, it } from "vitest";
import { contrastRatio } from "../../src/lib/color-utils";
import { buildPortalBrandingCssVars } from "../../src/lib/portal-branding";
import { compositeCssColor } from "../support/css-color";

describe("portal branding accessibility", () => {
  for (const appearance of ["light", "dark"] as const) {
    for (const requested of ["#ffffff", "#000000", "#f5d96b", "#3b0764", "#487fff", "#00ff00"]) {
      it(`preserves AA actions and visible focus for ${requested} in ${appearance}`, () => {
        const palette = buildPortalBrandingCssVars(requested, appearance) as Record<string, string>;
        const panel = appearance === "dark" ? "#141d31" : "#ffffff";
        for (const state of ["primary", "primary-hover", "primary-pressed"]) {
          expect(
            contrastRatio(
              palette[`--dashboard-${state}`],
              palette["--dashboard-primary-foreground"],
            ),
          ).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrastRatio(palette["--dashboard-focus"], panel)).toBeGreaterThanOrEqual(3);
        for (const surface of ["#eef2f6", "#263247"]) {
          expect(contrastRatio(palette["--dashboard-focus"], surface)).toBeGreaterThanOrEqual(3);
        }
        const hero = palette["--dashboard-hero-end"];
        expect(contrastRatio("#ffffff", hero)).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(compositeCssColor("rgba(255, 255, 255, 0.8)", hero), hero),
        ).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
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
