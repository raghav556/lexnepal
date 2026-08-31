"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import {
  buildPortalBrandingCssVars,
  pickPortalBranding,
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
}: {
  children: ReactNode;
  appearance?: PortalAppearance;
}) {
  const settings = usePublicCmsSettings();
  const value = useMemo<PortalBrandingContextValue>(() => {
    const branding = pickPortalBranding(settings);
    return {
      ...branding,
      cssVars: buildPortalBrandingCssVars(branding.primaryColor, appearance),
      ready: settings !== undefined,
    };
  }, [appearance, settings]);

  return <PortalBrandingContext.Provider value={value}>{children}</PortalBrandingContext.Provider>;
}

export function usePortalBranding() {
  return useContext(PortalBrandingContext);
}
