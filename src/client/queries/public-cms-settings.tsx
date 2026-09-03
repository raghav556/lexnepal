"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCmsSettings } from "@/client/queries/cms";
import { queryKeys } from "@/client/queries/query-keys";
import { subscribeToCmsSettingsUpdates } from "@/lib/cms-settings-sync";

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
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToCmsSettingsUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cms.settings("public") });
    });
  }, [queryClient]);

  return useCmsSettings("public", initialSettings);
}
