"use client";

import type { ReactNode } from "react";
import { DataProvider } from "@/client/data/provider";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n-context";
import { ThemeEngine } from "./theme-engine";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <DataProvider>
        <ThemeEngine />
        {children}
        <Toaster richColors position="top-right" />
      </DataProvider>
    </I18nProvider>
  );
}
