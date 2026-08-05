import type { ReactNode, ComponentType } from "react";
import * as ConvexReact from "@/client/data/convex-bridge.ts";
import { DataProvider } from "@/client/data/provider";
import { readBuildBackendFlags } from "@/client/data/backend-config";
import { convexRuntimeEnabled } from "@/client/data/convex-bridge.ts";
import { Toaster } from "sonner";

const useMock =
  (typeof process !== "undefined" ? process.env.VITE_USE_MOCK : import.meta.env.VITE_USE_MOCK) ===
  "true";
const convexUrl =
  ((typeof process !== "undefined" ? process.env.VITE_CONVEX_URL : import.meta.env.VITE_CONVEX_URL) as
    | string
    | undefined) || "";

const { ConvexProvider, ConvexReactClient } = ConvexReact;
const PreviewProvider =
  ((ConvexReact as { PreviewProvider?: ComponentType<{ children: ReactNode }> }).PreviewProvider as
    | ComponentType<{ children: ReactNode }>
    | undefined) || (({ children }: { children: ReactNode }) => <>{children}</>);

const flags = readBuildBackendFlags();
const needsConvexClient = convexRuntimeEnabled || useMock;
const convex = needsConvexClient
  ? new ConvexReactClient(useMock ? convexUrl || "https://mock.local" : convexUrl)
  : null;

export function DefaultProviders({ children }: { children: ReactNode }) {
  const body = (
    <DataProvider flags={flags}>
      {children}
      <Toaster richColors position="top-right" />
    </DataProvider>
  );

  return (
    <PreviewProvider>
      {convex ? <ConvexProvider client={convex}>{body}</ConvexProvider> : body}
    </PreviewProvider>
  );
}
