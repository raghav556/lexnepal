import { ConvexProvider, ConvexReactClient, PreviewProvider } from "convex/react";

const convex = new ConvexReactClient("");

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <PreviewProvider>
      <ConvexProvider client={convex}>{children}</ConvexProvider>
    </PreviewProvider>
  );
}
