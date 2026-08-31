import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getCmsService } from "@/server/services/cms-service";
import { PublicLayoutShell, type PublicNavEntry } from "./public-layout-shell";

/** CMS content must refresh on every request — never bake admin edits into a static shell. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

async function loadSettings(): Promise<Record<string, unknown>> {
  try {
    return (await getCmsService().getPublicSettings()) as Record<string, unknown>;
  } catch {
    return {};
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
      ...(favicon ? { icons: { icon: favicon } } : {}),
    };
  } catch {
    return {
      title: "Law Firm",
      description: "Legal practice in Nepal",
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
