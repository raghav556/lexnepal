import type { ReactNode } from "react";
import { getCmsService } from "@/server/services/cms-service";
import { PublicLayoutShell, type PublicNavEntry } from "./public-layout-shell";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  let initialHeaderNav: PublicNavEntry[] = [];
  try {
    initialHeaderNav = (await getCmsService().listPublic(
      "navigation",
      new URLSearchParams({ location: "header" }),
    )) as PublicNavEntry[];
  } catch {
    // Client query will retry if server prefetch fails.
  }

  return <PublicLayoutShell initialHeaderNav={initialHeaderNav}>{children}</PublicLayoutShell>;
}
