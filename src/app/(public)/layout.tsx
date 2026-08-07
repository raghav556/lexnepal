import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getCmsService } from "@/server/services/cms-service";
import { PublicLayoutShell, type PublicNavEntry } from "./public-layout-shell";

async function loadNav(location: string): Promise<PublicNavEntry[]> {
  try {
    return (await getCmsService().listPublic(
      "navigation",
      new URLSearchParams({ location }),
    )) as PublicNavEntry[];
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getCmsService().getPublicSettings();
    const firmName = String(settings.firmName || "Srimar Law");
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
      ...(favicon ? { icons: { icon: favicon } } : {}),
    };
  } catch {
    return {
      title: "Srimar Law",
      description: "Legal practice in Nepal",
    };
  }
}

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [initialHeaderNav, initialFooterCol1, initialFooterCol2] = await Promise.all([
    loadNav("header"),
    loadNav("footer_col_1"),
    loadNav("footer_col_2"),
  ]);

  return (
    <PublicLayoutShell
      initialHeaderNav={initialHeaderNav}
      initialFooterCol1={initialFooterCol1}
      initialFooterCol2={initialFooterCol2}
    >
      {children}
    </PublicLayoutShell>
  );
}
