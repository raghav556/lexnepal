import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../index.css";
import { Providers } from "./providers";
import { getCmsService } from "@/server/services/cms-service";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getCmsService().getPublicSettings();
    const firmName = String(settings.firmName || "Law Firm");
    const description = String(
      settings.seoMetaDescription || `${firmName} — trusted legal counsel in Nepal`,
    );
    const favicon = typeof settings.faviconUrl === "string" ? settings.faviconUrl : undefined;
    return {
      title: firmName,
      description,
      icons: { icon: favicon || "/favicon.ico" },
    };
  } catch {
    return {
      title: "Law Firm",
      description: "Trusted legal counsel in Nepal",
      icons: { icon: "/favicon.ico" },
    };
  }
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
