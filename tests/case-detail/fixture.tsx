import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import StaffLayout from "@/app/(staff)/layout";
import AdminLayout from "@/app/(admin)/layout";
import StaffCaseDetailPage from "@/views/staff/StaffCaseDetailPage";
import { I18nProvider, useI18n } from "@/lib/i18n-context";
import { setIdentityRole } from "../navigation/adapters";
import { queryKeys } from "@/client/queries/query-keys";
import {
  setDetailState,
  evidence,
  rejectNextCommand,
  setIntentStatus,
  useCaseQuery,
  setDetailLongConversation,
  type DetailState,
} from "./adapters";
declare global {
  interface Window {
    renderCaseDetail: (role: "staff" | "admin", state: DetailState, brand?: string) => void;
    detailEvidence: () => typeof evidence;
    rejectDetailCommand: () => void;
    setDetailIntent: (status: string) => void;
    setDetailLanguage: (language: "en" | "ne") => void;
    setDetailLongConversation: (enabled: boolean) => void;
  }
}
const root = createRoot(document.getElementById("root")!),
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Detail({ role }: { role: "staff" | "admin" }) {
  const { setLanguage } = useI18n();
  const detail = useCaseQuery();
  useEffect(() => {
    // Mirror the real query cache for the Staff breadcrumb without network requests.
    queryClient.setQueryData(
      [...queryKeys.cases.detail("synthetic-case-detail"), false],
      detail.data ?? null,
    );
  }, [detail.data]);
  useEffect(() => {
    window.setDetailLanguage = setLanguage;
  }, [setLanguage]);
  const Layout = role === "staff" ? StaffLayout : AdminLayout;
  return (
    <Layout>
      <StaffCaseDetailPage />
    </Layout>
  );
}
window.detailEvidence = () => evidence;
window.rejectDetailCommand = rejectNextCommand;
window.setDetailIntent = setIntentStatus;
window.setDetailLongConversation = setDetailLongConversation;
window.renderCaseDetail = (role, state, brand) => {
  setIdentityRole(role);
  setDetailState(state, brand);
  root.render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Detail role={role} />
        <Toaster richColors position="top-right" />
      </I18nProvider>
    </QueryClientProvider>,
  );
};
