"use client";

import { useEffect } from "react";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";

export function ThemeEngine() {
  const settings = usePublicCmsSettings();

  useEffect(() => {
    if (settings) {
      if (settings.primaryColor) {
        document.documentElement.style.setProperty("--primary", settings.primaryColor);
        document.documentElement.style.setProperty("--ring", settings.primaryColor);
      }
    }
  }, [settings]);

  return null;
}
