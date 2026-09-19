"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { isClientPortalPath } from "@/lib/client-shell-nav";
import { pickPortalBranding } from "@/lib/portal-branding";

export function ThemeEngine() {
  const settings = usePublicCmsSettings();
  const branding = pickPortalBranding(settings);
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const root = document.documentElement;
    if (isClientPortalPath(pathname) || !branding.primaryColor) {
      if (isClientPortalPath(pathname)) {
        root.style.removeProperty("--primary");
        root.style.removeProperty("--ring");
      }
      return;
    }
    root.style.setProperty("--primary", branding.primaryColor);
    root.style.setProperty("--ring", branding.primaryColor);
  }, [branding.primaryColor, pathname]);

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
