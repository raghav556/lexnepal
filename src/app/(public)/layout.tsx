import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getCmsService } from "@/server/services/cms-service";
import { PublicLayoutShell, type PublicNavEntry } from "./public-layout-shell";

import {
  DEFAULT_PUBLIC_HEADER_NAV,
  DEFAULT_FOOTER_NAV_COL1,
  DEFAULT_FOOTER_NAV_COL2,
} from "@/shared/public-routes";

/** ISR revalidation cache: keeps responses fast while reflecting CMS updates within 60 seconds. */
export const revalidate = 60;

const DEFAULT_PUBLIC_SETTINGS: Record<string, unknown> = {
  firmName: "Srimar Law",
  tagline: "Advocates & Legal Consultants",
  businessHoursText: "Office Hours: Sun-Fri 9AM-6PM",
};

async function loadNav(location: string): Promise<PublicNavEntry[]> {
  try {
    const list = (await getCmsService().listPublic(
      "navigation",
      new URLSearchParams({ location }),
    )) as PublicNavEntry[];
    if (list && list.length > 0) return list;
  } catch {
    // Graceful fallback below
  }
  if (location === "header") return DEFAULT_PUBLIC_HEADER_NAV as PublicNavEntry[];
  if (location === "footer_col_1") return DEFAULT_FOOTER_NAV_COL1 as PublicNavEntry[];
  if (location === "footer_col_2") return DEFAULT_FOOTER_NAV_COL2 as PublicNavEntry[];
  return [];
}

async function loadSettings(): Promise<Record<string, unknown>> {
  try {
    const settings = (await getCmsService().getPublicSettings()) as Record<string, unknown>;
    return { ...DEFAULT_PUBLIC_SETTINGS, ...settings };
  } catch {
    return DEFAULT_PUBLIC_SETTINGS;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await loadSettings();
    const firmName = String(settings.firmName || "Law Firm");
    const format = typeof settings.seoTitleFormat === "string" ? settings.seoTitleFormat : "";
    const template = format.includes("%s") ? format : `%s | ${firmName}`;
    const description =
      typeof settings.seoMetaDescription === "string" && settings.seoMetaDescription
        ? settings.seoMetaDescription
        : `${firmName} — legal practice in Nepal.`;
    const favicon = typeof settings.faviconUrl === "string" ? settings.faviconUrl : undefined;
    return {
      title: { default: firmName, template },
      description,
      icons: { icon: favicon || "/favicon.ico" },
    };
  } catch {
    return {
      title: "Law Firm",
      description: "Legal practice in Nepal",
      icons: { icon: "/favicon.ico" },
    };
  }
}

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [initialHeaderNav, initialFooterCol1, initialFooterCol2, initialSettings] =
    await Promise.all([
      loadNav("header"),
      loadNav("footer_col_1"),
      loadNav("footer_col_2"),
      loadSettings(),
    ]);

  return (
    <PublicLayoutShell
      initialHeaderNav={initialHeaderNav}
      initialFooterCol1={initialFooterCol1}
      initialFooterCol2={initialFooterCol2}
      initialSettings={initialSettings}
    >
      {children}
    </PublicLayoutShell>
  );
}
