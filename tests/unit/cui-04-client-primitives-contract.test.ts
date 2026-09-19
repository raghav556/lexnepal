/**
 * CUI-04 shared Client primitive contract.
 * Presentation vocabulary only — no page composition, no data fetching.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSrc(path: string): string {
  return readFileSync(path, "utf8");
}

const css = readSrc("src/index.css");
const primitives = readSrc("src/components/dashboard/dashboard-primitives.tsx");
const clientPrimitives = readSrc("src/components/dashboard/client-primitives.tsx");
const pageShell = readSrc("src/components/dashboard/portal-page-shell.tsx");
const table = readSrc("src/components/dashboard/dashboard-table.tsx");
const barrel = readSrc("src/components/dashboard/index.ts");
const nepalHero = readSrc("src/components/dashboard/nepal-decorated-hero.tsx");

function clientPrimitiveCss(): string {
  const start = css.indexOf("CUI-04 Client primitive vocabulary");
  expect(start).toBeGreaterThanOrEqual(0);
  const end = css.indexOf(".dashboard-theme {", start);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe("CUI-04 client primitives contract", () => {
  it("extends the existing dashboard system instead of creating a parallel one", () => {
    expect(barrel).toContain('export * from "./client-primitives"');
    expect(barrel).toContain('export * from "./dashboard-primitives"');
    expect(clientPrimitives).toContain("@/components/dashboard/dashboard-primitives");
    expect(clientPrimitives).not.toMatch(/from ["']@\/client\//);
    expect(clientPrimitives).not.toMatch(/from ["']@\/server\//);
  });

  it("keeps Client legal primitives presentation-only", () => {
    expect(clientPrimitives).not.toMatch(/useQuery|useMutation|useInfiniteQuery/);
    expect(clientPrimitives).not.toMatch(/from ["']@\/client\/queries/);
    expect(clientPrimitives).not.toMatch(/from ["']@\/client\/mutations/);
    expect(clientPrimitives).not.toMatch(/from ["']@\/server\/repositories/);
    expect(clientPrimitives).not.toMatch(/from ["']@\/lib\/auth/);
    expect(clientPrimitives).toContain("export function ClientMatterSummary");
    expect(clientPrimitives).toContain("export function ClientHearingSummary");
    expect(clientPrimitives).toContain("export function ClientDocumentItem");
    expect(clientPrimitives).toContain("export function ClientActionItem");
    expect(clientPrimitives).toContain("export function ClientTimelineItem");
    expect(clientPrimitives).toContain("export function ClientMetadataRow");
    expect(clientPrimitives).toContain("export function ClientPanel");
    expect(clientPrimitives).toContain("export function ClientSegmentedControl");
    expect(clientPrimitives).toContain("export function ClientStatePanel");
  });

  it("does not introduce isClient or premium appearance props on shared primitives", () => {
    expect(primitives).not.toMatch(/\bisClient\b/);
    expect(primitives).not.toMatch(/clientMode|premium|newStyle|compactClient|useReferenceStyle/);
    expect(pageShell).not.toMatch(/isClient\?:/);
  });

  it("exposes stable semantic hooks without changing Staff/Admin default classes", () => {
    expect(primitives).toContain('data-slot="dashboard-status-badge"');
    expect(primitives).toContain('data-tone={tone ?? "neutral"}');
    expect(primitives).toContain('data-slot="dashboard-hero-ornament"');
    expect(primitives).toContain('data-slot="metric-card-icon"');
    expect(primitives).toContain('data-variant={variant ?? "primary"}');
    expect(primitives).toContain('data-size={size ?? "md"}');
    expect(primitives).toContain("hover:-translate-y-1");
    expect(primitives).toContain("group-hover:scale-105");
    expect(primitives).toContain("rounded-2xl");
    expect(primitives).toContain("shadow-xl");
    expect(primitives).toContain("hover:scale-110");
    expect(primitives).toContain("border-blue-200 bg-blue-50 text-blue-700");
    expect(table).toContain("hover:-translate-y-0.5");
    expect(table).toContain('data-slot="dashboard-list-row"');
    expect(table).toContain('data-slot="dashboard-filter-bar"');
    expect(table).toContain("text-[11px]");
  });

  it("scopes Client visual treatment to dashboard-client selectors and CUI-02 tokens", () => {
    const scoped = clientPrimitiveCss();
    expect(scoped).toContain('.dashboard-theme.dashboard-client [data-slot="metric-card"]');
    expect(scoped).toContain("transform: none");
    expect(scoped).toContain("box-shadow: var(--dashboard-shadow-card)");
    expect(scoped).toContain("var(--dashboard-primary)");
    expect(scoped).toContain("var(--dashboard-success)");
    expect(scoped).toContain("var(--dashboard-warning)");
    expect(scoped).toContain("var(--dashboard-danger)");
    expect(scoped).toContain("var(--dashboard-information)");
    expect(scoped).toContain("var(--dashboard-radius-card)");
    expect(scoped).toContain("var(--dashboard-font-sans)");
    expect(scoped).not.toContain("text-blue-");
    expect(scoped).not.toContain("bg-emerald-");
    expect(scoped).not.toContain("bg-rose-");
    expect(scoped).toContain('[data-slot="dashboard-hero-ornament"]');
    expect(scoped).toContain("display: none");
    expect(css).not.toMatch(
      /\.dashboard-theme\.dashboard-staff \[data-slot="metric-card"\][\s\S]*transform: none/,
    );
    expect(css).not.toMatch(
      /\.dashboard-theme\.dashboard-admin \[data-slot="metric-card"\][\s\S]*transform: none/,
    );
  });

  it("makes PortalPageShell consume measured gutter and section tokens", () => {
    expect(pageShell).toContain("p-[var(--dashboard-content-gutter-compact)]");
    expect(pageShell).toContain("sm:p-[var(--dashboard-content-gutter)]");
    expect(pageShell).toContain("space-y-[var(--dashboard-section-gap)]");
    expect(pageShell).toContain('data-slot="portal-page-shell"');
    expect(pageShell).not.toMatch(/space-y-6 p-4 sm:p-6/);
    const baseTheme = css.slice(
      css.indexOf("Shared geometry & density foundation"),
      css.indexOf(".dashboard-theme.dashboard-admin {"),
    );
    expect(baseTheme).toContain("--dashboard-content-gutter: 1.5rem");
    expect(baseTheme).toContain("--dashboard-content-gutter-compact: 1rem");
    expect(baseTheme).toContain("--dashboard-section-gap: 1.5rem");
    const client = css.slice(
      css.indexOf(".dashboard-theme.dashboard-client {"),
      css.indexOf(".dark.dashboard-theme,"),
    );
    expect(client).toContain("--dashboard-content-gutter: 2rem");
    expect(client).toContain("--dashboard-content-gutter-compact: 1.25rem");
    expect(client).toContain("--dashboard-section-gap: 1.5rem");
  });

  it("keeps operational Client typography on Inter and metadata at the 12px floor", () => {
    const scoped = clientPrimitiveCss();
    expect(scoped).toContain('[data-slot="dashboard-section-title"]');
    expect(scoped).toContain("var(--dashboard-font-sans)");
    expect(scoped).toContain("var(--dashboard-text-meta-size)");
    expect(scoped).toContain("max(var(--dashboard-text-meta-size), 0.75rem)");
    expect(clientPrimitives).not.toMatch(/text-\[10px\]|text-\[11px\]/);
    expect(clientPrimitives).toContain("font-sans");
    expect(nepalHero).toContain('data-slot="dashboard-hero-photo"');
  });

  it("provides an accessible segmented control without page rewrites", () => {
    expect(primitives).toContain("export function DashboardSegmentedControl");
    expect(primitives).toContain('role="tablist"');
    expect(primitives).toContain('role="tab"');
    expect(primitives).toContain("aria-selected={selected}");
    expect(primitives).toContain('data-slot="dashboard-segmented"');
    expect(clientPrimitives).toContain("export function ClientSegmentedControl");
  });

  it("exposes loading empty and error presentation through existing state primitives", () => {
    expect(clientPrimitives).toContain('state: "loading" | "empty" | "error"');
    expect(clientPrimitives).toContain('aria-busy={state === "loading" || undefined}');
    expect(clientPrimitives).toContain("EmptyState");
    expect(pageShell).toContain('data-slot="dashboard-list-skeleton"');
    expect(primitives).toContain('data-slot="dashboard-empty-state"');
  });
});
