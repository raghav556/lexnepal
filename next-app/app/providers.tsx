"use client";

import type { ReactNode } from "react";
import { DataProvider } from "@/client/data/provider";

export function Providers({ children }: { children: ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}
