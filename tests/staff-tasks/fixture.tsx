import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import StaffLayout from "@/app/(staff)/layout";
import StaffTasksPage from "@/views/staff/StaffTasksPage";
import { I18nProvider } from "@/lib/i18n-context";
import { setIdentityRole } from "../navigation/adapters";
import { attempts, failNextTaskCommand, setTaskState, taskFixtureRecords } from "./adapters";

declare global {
  interface Window {
    renderStaffTasks: (state?: string, brand?: string) => void;
    taskFixtureEvidence: () => typeof attempts;
    failNextTaskCommand: () => void;
    taskFixtureRecords: typeof taskFixtureRecords;
  }
}
const root = createRoot(document.getElementById("root")!);
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
window.taskFixtureEvidence = () => attempts;
window.failNextTaskCommand = failNextTaskCommand;
window.taskFixtureRecords = taskFixtureRecords;
window.renderStaffTasks = (state, brand) => {
  setIdentityRole("staff");
  setTaskState(state, brand);
  root.render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <StaffLayout>
          <StaffTasksPage />
        </StaffLayout>
        <Toaster richColors position="top-right" />
      </I18nProvider>
    </QueryClientProvider>,
  );
};
