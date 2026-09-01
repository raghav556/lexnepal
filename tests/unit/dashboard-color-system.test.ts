import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { contrastRatio } from "../../src/lib/color-utils";
import {
  DASHBOARD_CHART_COLORS,
  DASHBOARD_CHART_THEME,
  DASHBOARD_METRIC_TONES,
  getDashboardStatusTone,
} from "../../src/lib/dashboard-semantics";

describe("dashboard color system", () => {
  it("keeps every admin sidebar text state readable", () => {
    const css = readFileSync("src/index.css", "utf8");
    const start = css.indexOf(".dashboard-theme.dashboard-admin {");
    const block = css.slice(start, css.indexOf("\n}", start));
    const color = (token: string) => {
      const value = block.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
      expect(value, `${token} must be a six-digit hex color`).toBeDefined();
      return value!;
    };

    for (const surface of [
      color("--dashboard-sidebar-bg-from"),
      color("--dashboard-sidebar-bg-to"),
    ]) {
      expect(
        contrastRatio(color("--dashboard-sidebar-foreground"), surface),
      ).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(color("--dashboard-sidebar-muted"), surface)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrastRatio(color("--dashboard-sidebar-heading"), surface)).toBeGreaterThanOrEqual(
        4.5,
      );
    }
    expect(
      contrastRatio(
        color("--dashboard-sidebar-active-foreground"),
        color("--dashboard-sidebar-active"),
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(color("--dashboard-sidebar-brand-icon"), color("--dashboard-sidebar-brand-bg")),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrastRatio(
        color("--dashboard-sidebar-brand-border"),
        color("--dashboard-sidebar-brand-bg"),
      ),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrastRatio(color("--dashboard-sidebar-border"), color("--dashboard-sidebar-bg-from")),
    ).toBeGreaterThanOrEqual(3);
  });

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
