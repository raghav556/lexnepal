import type { CSSProperties } from "react";
import { ensureHexContrast, isValidHexColor, mixHex } from "@/lib/color-utils";

export type PortalBranding = {
  firmName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  heroImageUrl?: string;
  primaryColor?: string;
};

export type PortalAppearance = "light" | "dark";

export function resolvePortalPaletteCssVars(
  primaryColor?: string | null,
  appearance: PortalAppearance = "light",
  applyPalette = true,
): CSSProperties {
  if (!applyPalette) return {};
  return buildPortalBrandingCssVars(primaryColor, appearance);
}

export function buildPortalBrandingCssVars(
  primaryColor?: string | null,
  appearance: PortalAppearance = "light",
): CSSProperties {
  if (!isValidHexColor(primaryColor)) return {};
  const requestedPrimary = primaryColor.trim();
  const dark = appearance === "dark";
  const panel = dark ? "#141d31" : "#ffffff";
  const primaryForeground = dark ? "#0c1222" : "#ffffff";
  const contrastTarget = dark ? "#ffffff" : "#000000";
  let primary = ensureHexContrast(requestedPrimary, panel, contrastTarget);
  primary = ensureHexContrast(primary, primaryForeground, contrastTarget);
  const hover = dark ? mixHex(primary, "#ffffff", 0.08) : mixHex(primary, "#000000", 0.12);
  const pressed = dark ? mixHex(primary, "#000000", 0.06) : mixHex(primary, "#000000", 0.22);
  const primarySoft = dark
    ? ensureHexContrast(mixHex(primary, "#0c1222", 0.82), primary, "#000000")
    : mixHex(primary, "#ffffff", 0.86);
  // Layouts currently pin their branding appearance. Keep focus usable on both
  // light and dark control surfaces without adding a second theme mechanism.
  const lightFocus = ensureHexContrast(mixHex(primary, "#c99523", 0.35), "#eef2f6", "#000000", 3);
  const focus = ensureHexContrast(lightFocus, "#263247", "#ffffff", 3);
  return {
    "--dashboard-primary": primary,
    "--dashboard-primary-hover": ensureHexContrast(hover, primaryForeground, contrastTarget),
    "--dashboard-primary-pressed": ensureHexContrast(pressed, primaryForeground, contrastTarget),
    "--dashboard-primary-foreground": primaryForeground,
    "--dashboard-primary-soft": primarySoft,
    "--dashboard-focus": focus,
    // Hero supporting copy is 80% white; 7:1 opaque white retains AA after compositing.
    "--dashboard-hero-end": ensureHexContrast(
      mixHex(primary, "#0c1222", 0.55),
      "#ffffff",
      "#000000",
      7,
    ),
    "--dashboard-hero-border": mixHex(primary, "#c99523", 0.25),
  } as CSSProperties;
}

export function pickPortalBranding(settings?: Record<string, unknown> | null): PortalBranding {
  if (!settings) return {};
  return {
    firmName: String(settings.firmName || "").trim() || undefined,
    logoUrl: String(settings.logoUrl || "").trim() || undefined,
    faviconUrl: String(settings.faviconUrl || "").trim() || undefined,
    heroImageUrl: String(settings.heroImageUrl || "").trim() || undefined,
    primaryColor: isValidHexColor(String(settings.primaryColor || ""))
      ? String(settings.primaryColor).trim()
      : undefined,
  };
}
