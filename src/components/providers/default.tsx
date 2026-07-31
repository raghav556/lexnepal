import type { ReactNode, ComponentType } from "react";
import * as ConvexReact from "convex/react";
import { Toaster } from "sonner";

const useMock = import.meta.env.VITE_USE_MOCK === "true";
const convexUrl = (import.meta.env.VITE_CONVEX_URL as string | undefined) || "";

const { ConvexProvider, ConvexReactClient } = ConvexReact;
const PreviewProvider =
  ((ConvexReact as any).PreviewProvider as ComponentType<{ children: ReactNode }> | undefined) ||
  (({ children }: { children: ReactNode }) => <>{children}</>);

const convex = new ConvexReactClient(useMock ? convexUrl || "https://mock.local" : convexUrl);

export function DefaultProviders({ children }: { children: ReactNode }) {
  return (
    <PreviewProvider>
      <ConvexProvider client={convex}>
        {children}
        <Toaster richColors position="top-right" />
      </ConvexProvider>
    </PreviewProvider>
  );
}
