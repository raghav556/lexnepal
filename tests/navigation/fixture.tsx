import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import StaffLayout from "@/app/(staff)/layout";
import AdminLayout from "@/app/(admin)/layout";
import { I18nProvider } from "@/lib/i18n-context";
import { setIdentityRole, usePathname } from "./adapters";
import { GlobalSearchPalette } from "@/components/dashboard/global-search-palette";
import { buildPortalBrandingCssVars } from "@/lib/portal-branding";

function Fixture({ portal }: { portal: "staff" | "admin" }) {
  const pathname = usePathname();
  const Layout = portal === "staff" ? StaffLayout : AdminLayout;
  return (
    <I18nProvider>
      <Layout>
        <div className="p-4">
          <h1>Navigation review</h1>
          <p>{pathname}</p>
          <button type="button">Workspace focus target</button>
        </div>
      </Layout>
    </I18nProvider>
  );
}

function SearchFixture({ portal }: { portal: "staff" | "admin" | "client" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`dashboard-theme dashboard-${portal}`}>
      <button type="button" onClick={() => setOpen(true)}>
        Open search
      </button>
      <GlobalSearchPalette portal={portal} isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}
declare global {
  interface Window {
    renderNavigationFixture: (portal: "staff" | "admin", identityRole?: string) => void;
    renderSearchFixture: (portal: "staff" | "admin" | "client") => void;
    resolveSearchBrand: typeof buildPortalBrandingCssVars;
  }
}
const root = createRoot(document.getElementById("root")!);
window.renderNavigationFixture = (portal, identityRole = portal) => {
  setIdentityRole(identityRole);
  root.render(<Fixture portal={portal} />);
};
window.renderSearchFixture = (portal) => root.render(<SearchFixture portal={portal} />);
window.resolveSearchBrand = buildPortalBrandingCssVars;
