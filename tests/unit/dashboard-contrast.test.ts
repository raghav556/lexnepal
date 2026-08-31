import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Theme = Record<string, string>;

const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

function declarations(selector: string): Theme {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  if (!match) throw new Error(`Missing dashboard selector: ${selector}`);

  return Object.fromEntries(
    [...match[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)].map(([, name, value]) => [
      name,
      value.toLowerCase(),
    ]),
  );
}

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first: string, second: string): number {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const base = declarations(".dashboard-theme");
const darkBase = declarations(".dark .dashboard-theme");
const portals = ["admin", "staff", "client"] as const;

function portalTheme(portal: (typeof portals)[number], dark: boolean): Theme {
  return {
    ...base,
    ...declarations(`.dashboard-theme.dashboard-${portal}`),
    ...(dark ? darkBase : {}),
    ...(dark ? declarations(`.dark .dashboard-theme.dashboard-${portal}`) : {}),
  };
}

function expectPair(theme: Theme, foreground: string, background: string, minimum: number) {
  expect(theme[foreground], foreground).toMatch(/^#[0-9a-f]{6}$/);
  expect(theme[background], background).toMatch(/^#[0-9a-f]{6}$/);
  expect(
    contrast(theme[foreground], theme[background]),
    `${foreground} on ${background}`,
  ).toBeGreaterThanOrEqual(minimum);
}

describe("dashboard WCAG contrast contract", () => {
  it("supports dark mode when theme and dark classes share the portal shell element", () => {
    expect(css).toContain(".dark.dashboard-theme,");
    expect(css).toContain(".dark.dashboard-theme.dashboard-admin,");
    expect(css).toContain(".dark.dashboard-theme.dashboard-staff,");
  });

  for (const portal of ["admin", "staff"] as const) {
    it(`keeps legacy ${portal} CRUD surfaces aligned with its accessible premium palette`, () => {
      const theme = declarations(`.dark .dashboard-theme.dashboard-${portal}`);
      for (const [foreground, background] of [
        ["foreground", "background"],
        ["card-foreground", "card"],
        ["popover-foreground", "popover"],
        ["primary-foreground", "primary"],
        ["secondary-foreground", "secondary"],
        ["muted-foreground", "muted"],
        ["accent-foreground", "accent"],
        ["sidebar-foreground", "sidebar"],
        ["sidebar-primary-foreground", "sidebar-primary"],
        ["sidebar-accent-foreground", "sidebar-accent"],
      ]) {
        expectPair(theme, foreground, background, 4.5);
      }
      expectPair(theme, "border", "card", 3);
      expectPair(theme, "ring", "background", 3);
    });
  }

  for (const portal of portals) {
    for (const mode of ["light", "dark"] as const) {
      it(`${portal} ${mode} keeps text and controls readable`, () => {
        const theme = portalTheme(portal, mode === "dark");

        for (const surface of [
          "dashboard-primary",
          "dashboard-primary-hover",
          "dashboard-primary-pressed",
        ]) {
          expectPair(theme, "dashboard-primary-foreground", surface, 4.5);
        }
        for (const surface of [
          "dashboard-secondary",
          "dashboard-secondary-hover",
          "dashboard-secondary-pressed",
        ]) {
          expectPair(theme, "dashboard-secondary-foreground", surface, 4.5);
        }
        expectPair(theme, "dashboard-accent-foreground", "dashboard-accent-soft", 4.5);
        expectPair(theme, "dashboard-tooltip-foreground", "dashboard-tooltip", 4.5);
        expectPair(theme, "dashboard-chart-label", "dashboard-panel", 4.5);

        for (const heroSurface of ["dashboard-hero-start", "dashboard-hero-end"]) {
          expectPair(theme, "dashboard-hero-foreground", heroSurface, 4.5);
          expectPair(theme, "dashboard-hero-muted", heroSurface, 4.5);
        }
        for (const tone of ["success", "information", "warning", "danger", "neutral"]) {
          expectPair(theme, `dashboard-${tone}-foreground`, `dashboard-${tone}-soft`, 4.5);
        }
      });

      it(`${portal} ${mode} keeps boundaries, focus, and chart series distinguishable`, () => {
        const theme = portalTheme(portal, mode === "dark");
        expectPair(theme, "dashboard-border", "dashboard-panel", 3);
        expectPair(theme, "dashboard-focus", "dashboard-canvas", 3);
        for (let index = 1; index <= 5; index += 1) {
          expectPair(theme, `dashboard-chart-${index}`, "dashboard-panel", 3);
        }
      });
    }
  }

  it("keeps the dashboard palette scoped away from public pages", () => {
    const walk = (directory: string): string[] =>
      readdirSync(directory).flatMap((entry) => {
        const path = resolve(directory, entry);
        return statSync(path).isDirectory() ? walk(path) : [path];
      });
    const publicFiles = [
      resolve(process.cwd(), "src/app/(public)"),
      resolve(process.cwd(), "src/views/public"),
    ]
      .flatMap(walk)
      .filter((file) => /\.(?:ts|tsx|css)$/.test(file));

    for (const file of publicFiles) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(
        /dashboard-(?:theme|admin|staff|client|canvas|panel|primary|accent|success|warning|danger|information)/,
      );
    }
  });

  it("rejects pure black and unapproved one-off colors in dashboard UI source", () => {
    const dashboardFiles = [
      "src/views/admin/AdminDashboard.tsx",
      "src/views/staff/StaffDashboard.tsx",
      "src/views/client/ClientDashboard.tsx",
      "src/app/(admin)/layout.tsx",
      "src/app/(staff)/layout.tsx",
      "src/app/(client)/layout.tsx",
      "src/components/dashboard/dashboard-primitives.tsx",
      "src/lib/dashboard-semantics.ts",
    ];
    const rawPalette =
      /(?:bg|text|border|from|via|to)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-|#[0-9a-f]{3,8}|oklch\(/i;

    for (const file of dashboardFiles) {
      expect(readFileSync(resolve(process.cwd(), file), "utf8"), file).not.toMatch(rawPalette);
    }
    expect(css).not.toMatch(/--dashboard-[a-z0-9-]+:\s*#(?:000|000000);/i);
  });
});
