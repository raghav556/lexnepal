"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useCmsSettings } from "@/client/queries/cms";

const PublicCmsSettingsContext = createContext<Record<string, unknown> | undefined>(undefined);

export function PublicCmsSettingsProvider({
  initialSettings,
  children,
}: {
  initialSettings: Record<string, unknown>;
  children: ReactNode;
}) {
  return (
    <PublicCmsSettingsContext.Provider value={initialSettings}>
      {children}
    </PublicCmsSettingsContext.Provider>
  );
}

/** Public site settings — seeded from SSR layout, refreshed via React Query. */
export function usePublicCmsSettings() {
  const initialSettings = useContext(PublicCmsSettingsContext);
  return useCmsSettings("public", initialSettings);
}
