import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { compositeCssColor } from "../support/css-color";
import { contrastRatio } from "../../src/lib/color-utils";
import {
  DASHBOARD_CHART_COLORS,
  DASHBOARD_CHART_THEME,
  DASHBOARD_METRIC_TONES,
  getDashboardStatusTone,
} from "../../src/lib/dashboard-semantics";

describe("dashboard color system", () => {
  for (const portal of ["admin", "staff"] as const) {
    for (const dark of [false, true]) {
      it(`keeps ${portal} sidebar text and focus readable in ${dark ? "dark" : "light"} mode`, () => {
        const css = readFileSync("src/index.css", "utf8");
        const block = (selector: string) => {
          const start = css.indexOf(selector + " {");
          return css.slice(start, css.indexOf("\n}", start));
        };
        const tokens = Object.fromEntries(
          [
            ...(
              block(".dashboard-theme") +
              block(`.dashboard-theme.dashboard-${portal}`) +
              (dark
                ? block(".dark .dashboard-theme") +
                  block(`.dark .dashboard-theme.dashboard-${portal}`)
                : "")
            ).matchAll(/(--dashboard-sidebar-[a-z-]+):\s*(#[0-9a-f]{6}|rgba\([^;]+\));/gi),
          ].map(([, name, value]) => [name, value]),
        );
        const color = (token: string) => {
          expect(tokens[token], `${token} must resolve`).toBeDefined();
          return tokens[token];
        };
        for (const surface of [
          color("--dashboard-sidebar-bg-from"),
          color("--dashboard-sidebar-bg-to"),
        ]) {
          const active = compositeCssColor(color("--dashboard-sidebar-active"), surface);
          for (const token of ["foreground", "muted", "heading"]) {
            expect(
              contrastRatio(color(`--dashboard-sidebar-${token}`), surface),
            ).toBeGreaterThanOrEqual(4.5);
          }
          expect(
            contrastRatio(color("--dashboard-sidebar-active-foreground"), active),
          ).toBeGreaterThanOrEqual(4.5);
          for (const background of [surface, active]) {
            expect(
              contrastRatio(color("--dashboard-sidebar-focus"), background),
            ).toBeGreaterThanOrEqual(3);
          }
        }
        expect(
          contrastRatio(
            color("--dashboard-sidebar-brand-icon"),
            color("--dashboard-sidebar-brand-bg"),
          ),
        ).toBeGreaterThanOrEqual(3);
        // Brand frames and section separators are decorative. Actual navigation focus
        // and readable selected-state text above retain the 3:1 / 4.5:1 guarantees.
      });
    }
  }

  it("maps operational states to stable semantic tones", () => {
    expect(getDashboardStatusTone("active")).toBe("information");
    expect(getDashboardStatusTone("in-progress")).toBe("information");
    expect(getDashboardStatusTone("paid")).toBe("success");
    expect(getDashboardStatusTone("pending review")).toBe("warning");
    expect(getDashboardStatusTone("overdue")).toBe("danger");
    expect(getDashboardStatusTone("signed")).toBe("success");
    expect(getDashboardStatusTone("submitted")).toBe("information");
    expect(getDashboardStatusTone("voided")).toBe("danger");
    expect(getDashboardStatusTone("contract")).toBe("primary");
    expect(getDashboardStatusTone("evidence")).toBe("success");
    expect(getDashboardStatusTone("pleading")).toBe("information");
    expect(getDashboardStatusTone("closed")).toBe("neutral");
    expect(getDashboardStatusTone("closed_won")).toBe("neutral");
    expect(getDashboardStatusTone("closed_lost")).toBe("neutral");
    expect(getDashboardStatusTone("unknown-state")).toBe("neutral");
    expect(getDashboardStatusTone(null)).toBe("neutral");
  });

  it("uses named CSS variables for every chart role", () => {
    for (const value of Object.values(DASHBOARD_CHART_COLORS)) {
      expect(value).toMatch(/^var\(--dashboard-chart-[1-5]\)$/);
    }
    for (const value of Object.values(DASHBOARD_CHART_THEME)) {
      expect(value).toMatch(/^var\(--dashboard-[a-z-]+\)$/);
    }
  });

  it("assigns each dashboard metric a semantic tone", () => {
    expect(DASHBOARD_METRIC_TONES).toEqual({
      cases: "information",
      people: "primary",
      hearings: "warning",
      tasks: "success",
      signatures: "warning",
      messages: "success",
      documents: "information",
    });
  });
});
