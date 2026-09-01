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

  useEffect(() => {
    const selector = 'link[data-dynamic-firm-favicon="true"]';
    const existing = document.head.querySelector<HTMLLinkElement>(selector);
    if (!branding.faviconUrl) {
      existing?.remove();
      return;
    }

    const favicon = existing ?? document.createElement("link");
    favicon.rel = "icon";
    favicon.href = branding.faviconUrl;
    favicon.dataset.dynamicFirmFavicon = "true";
    if (!existing) document.head.appendChild(favicon);
  }, [branding.faviconUrl]);

  return null;
}
