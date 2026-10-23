import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import StaffLayout from "@/app/(staff)/layout";
import AdminLayout from "@/app/(admin)/layout";
import { CasesWorkspace } from "@/components/cases/cases-workspace";
import { I18nProvider, useI18n } from "@/lib/i18n-context";
import { setIdentityRole } from "../navigation/adapters";
import { setCasesState, createAttempts, retryCount, type CasesFixtureState } from "./adapters";

declare global {
  interface Window {
    renderStaffCases: (role: "staff" | "admin", state: CasesFixtureState, brand?: string) => void;
    casesFixtureEvidence: () => { attempts: Record<string, unknown>[]; retries: number };
    setCasesLanguage: (language: "en" | "ne") => void;
  }
}
const root = createRoot(document.getElementById("root")!);
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Cases({ role }: { role: "staff" | "admin" }) {
  const { setLanguage } = useI18n();
  useEffect(() => {
    window.setCasesLanguage = setLanguage;
  }, [setLanguage]);
  const Layout = role === "staff" ? StaffLayout : AdminLayout;
  return (
    <Layout>
      <CasesWorkspace portal={role} basePath={role === "staff" ? "/staff/cases" : "/admin/cases"} />
    </Layout>
  );
}
window.casesFixtureEvidence = () => ({ attempts: createAttempts, retries: retryCount });
window.renderStaffCases = (role, state, brand) => {
  setIdentityRole(role);
  setCasesState(state, brand);
  root.render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Cases role={role} />
        <Toaster richColors position="top-right" />
      </I18nProvider>
    </QueryClientProvider>,
  );
};
