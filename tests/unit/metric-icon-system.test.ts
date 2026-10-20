import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { CheckCircle2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import {
  MetricCard,
  type DashboardDensity,
  type DashboardState,
} from "@/components/dashboard/dashboard-primitives";
import { DASHBOARD_TONE_FILL_CLASSES, type DashboardTone } from "@/lib/dashboard-semantics";

const tones: DashboardTone[] = [
  "primary",
  "neutral",
  "information",
  "success",
  "warning",
  "danger",
];
const densities: DashboardDensity[] = ["default", "compact"];
const states: DashboardState[] = ["default", "loading", "empty", "error"];
const css = readFileSync("src/index.css", "utf8");
const block = css.slice(
  css.indexOf("/* Shared KPI badge geometry."),
  css.indexOf(".dashboard-theme.dashboard-staff .staff-admin-topbar .staff-header-create"),
);

describe("Shared metric icon contract", () => {
  it.each(tones)("preserves the existing %s semantic fill", (tone) => {
    const html = renderToStaticMarkup(
      React.createElement(MetricCard, {
        label: "Real label",
        value: "123",
        helperText: "Existing helper",
        tone,
        icon: CheckCircle2,
      }),
    );
    expect(html).toContain("dashboard-metric-icon");
    expect(html).toContain(DASHBOARD_TONE_FILL_CLASSES[tone]);
    expect(html).toContain(`data-tone="${tone}"`);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("Real label");
    expect(html).toContain("123");
    expect(html).toContain("Existing helper");
  });
  it.each(densities)("retains %s density hooks and frozen default classes", (density) => {
    const html = renderToStaticMarkup(
      React.createElement(MetricCard, {
        label: "Long existing KPI label",
        value: "1234567890",
        density,
        icon: CheckCircle2,
      }),
    );
    expect(html).toContain(`data-density="${density}"`);
    expect(html).toContain(density === "compact" ? "size-10 rounded-xl" : "size-11 rounded-xl");
    expect(html).toContain('data-slot="metric-card-value"');
  });
  it.each(states)("preserves %s state and unavailable content", (state) => {
    const element = MetricCard({ label: "Availability", value: "—", state, icon: CheckCircle2 });
    expect(element.props["data-state"]).toBe(state);
    expect(element.props["aria-busy"]).toBe(state === "loading" ? true : undefined);
    expect(renderToStaticMarkup(element)).toContain("—");
  });
  it("keeps caller interactions, accessibility and iconless metrics intact", () => {
    const onClick = vi.fn();
    const element = MetricCard({
      label: "Action",
      value: 0,
      onClick,
      tabIndex: 0,
      "aria-label": "Existing card action",
      chevron: true,
    });
    expect(element.props.onClick).toBe(onClick);
    expect(element.props.tabIndex).toBe(0);
    expect(element.props["aria-label"]).toBe("Existing card action");
    expect(renderToStaticMarkup(element)).not.toContain('data-slot="metric-card-icon"');
  });
  it("scopes circular geometry to Staff/Admin with shared token sizing", () => {
    expect(block).toContain("border-radius: 50%");
    expect(block).toContain("aspect-ratio: 1");
    expect(block).toContain("flex-shrink: 0");
    expect(block).toContain("--dashboard-metric-icon-size: 2.75rem");
    expect(block).toContain("--dashboard-metric-icon-size: 2.5rem");
    expect(block).toContain("--dashboard-metric-icon-size: 2.25rem");
    expect(block).toContain("--dashboard-metric-icon-size: 2rem");
    expect(block).toContain("width: 50%");
  });
  it("introduces no palette, Client/public override, or alternate tone map", () => {
    expect(block).not.toMatch(/#[0-9a-f]{3,8}|rgb\(|dashboard-client|public-account/);
    expect(block).toContain("var(--dashboard-panel)");
    expect(block).toContain("var(--dashboard-canvas)");
    expect(block).not.toContain("background:");
  });
});

// Optional actual-component SSR fixture for isolated browser geometry/state QA.
// Normal unit runs do not write evidence or change application data.
if (process.env.KPI_ICON_QA_FIXTURES === "1") {
  const cards = tones.flatMap((tone) =>
    densities.flatMap((density) =>
      states.map((state) =>
        React.createElement(MetricCard, {
          key: `${tone}-${density}-${state}`,
          label: `${tone} existing long summary label`,
          value: state === "loading" ? "…" : state === "error" ? "—" : "1234567890",
          tone,
          density,
          state,
          icon: CheckCircle2,
        }),
      ),
    ),
  );
  mkdirSync(".local/qa/session-17b", { recursive: true });
  writeFileSync(
    ".local/qa/session-17b/component-fixture.html",
    renderToStaticMarkup(
      React.createElement(
        "section",
        {
          "aria-label": "Synthetic metric variants",
          className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4",
        },
        ...cards,
      ),
    ),
  );
}
