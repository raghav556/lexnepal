import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import StaffLayout from "@/app/(staff)/layout";
import StaffAppointmentsPage from "@/views/staff/StaffAppointmentsPage";
import AdminAppointmentsPage from "@/views/admin/AdminAppointmentsPage";
import ClientBookingPage from "@/views/client/ClientBookingPage";
import { I18nProvider } from "@/lib/i18n-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});
const root = createRoot(document.getElementById("root")!);
declare global {
  interface Window {
    renderAppointmentsFixture: (surface?: string) => void;
    resetAppointmentsFixture: () => void;
  }
}
window.resetAppointmentsFixture = () => {
  queryClient.clear();
  window.renderAppointmentsFixture();
};
window.renderAppointmentsFixture = (surface = "staff") => {
  root.render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        {surface === "admin" ? (
          <AdminAppointmentsPage />
        ) : surface === "client" ? (
          <ClientBookingPage />
        ) : (
          <StaffLayout>
            <StaffAppointmentsPage />
          </StaffLayout>
        )}
        <Toaster richColors position="top-right" />
      </I18nProvider>
    </QueryClientProvider>,
  );
};
window.renderAppointmentsFixture();
