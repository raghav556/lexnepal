"use client";

import { useEffect } from "react";
import { useCmsSettings } from "@/client/queries/cms";

export function ThemeEngine() {
  const settings = useCmsSettings("public");

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
