"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  readBuildBackendFlags,
  type BackendDomain,
  type BackendFlags,
  type BackendKind,
} from "@/client/data/backend-config";

const BackendContext = createContext<BackendFlags | null>(null);

export function DataProvider({ children, flags }: { children: ReactNode; flags?: BackendFlags }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      }),
  );
  const [resolvedFlags] = useState(() => flags ?? readBuildBackendFlags());
  return (
    <BackendContext.Provider value={resolvedFlags}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BackendContext.Provider>
  );
}

export function useDomainBackend(domain: BackendDomain): BackendKind {
  const flags = useContext(BackendContext);
  if (!flags) throw new Error("useDomainBackend must be used inside DataProvider");
  return flags[domain];
}
