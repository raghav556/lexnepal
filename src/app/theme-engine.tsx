"use client";

import { useEffect } from "react";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { pickPortalBranding } from "@/lib/portal-branding";

export function ThemeEngine() {
  const settings = usePublicCmsSettings();
  const branding = pickPortalBranding(settings);

  useEffect(() => {
    const root = document.documentElement;
    if (branding.primaryColor) {
      root.style.setProperty("--primary", branding.primaryColor);
      root.style.setProperty("--ring", branding.primaryColor);
    }
  }, [branding.primaryColor]);

  return null;
}
