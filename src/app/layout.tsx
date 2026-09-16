import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../index.css";
import { Providers } from "./providers";

/*
 * Keep the universal shell independent of the database. Public routes provide
 * CMS-driven metadata in their nested layout; authenticated and auth routes
 * should not wait on public CMS settings before they can render.
 */
export const metadata: Metadata = {
  title: "LexNepal",
  description: "Secure legal practice management",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
