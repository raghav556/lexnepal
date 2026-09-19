"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import {
  pickPortalBranding,
  resolvePortalPaletteCssVars,
  type PortalAppearance,
  type PortalBranding,
} from "@/lib/portal-branding";

type PortalBrandingContextValue = PortalBranding & {
  cssVars: React.CSSProperties;
  ready: boolean;
};

const PortalBrandingContext = createContext<PortalBrandingContextValue>({
  cssVars: {},
  ready: false,
});

export function PortalBrandingProvider({
  children,
  appearance = "light",
  applyPalette = true,
}: {
  children: ReactNode;
  appearance?: PortalAppearance;
  /** When false, identity assets stay available but CMS primaryColor is not inlined. */
  applyPalette?: boolean;
}) {
  const settings = usePublicCmsSettings();
  const value = useMemo<PortalBrandingContextValue>(() => {
    const branding = pickPortalBranding(settings);
    return {
      ...branding,
      cssVars: resolvePortalPaletteCssVars(branding.primaryColor, appearance, applyPalette),
      ready: settings !== undefined,
    };
  }, [appearance, applyPalette, settings]);

  return <PortalBrandingContext.Provider value={value}>{children}</PortalBrandingContext.Provider>;
}

export function usePortalBranding() {
  return useContext(PortalBrandingContext);
}
