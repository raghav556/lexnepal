import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import NotFound from "./pages/NotFound.tsx";

import PublicLayout from "./pages/public/PublicLayout.tsx";
import HomePage from "./pages/public/HomePage.tsx";
import PracticeAreasPage from "./pages/public/PracticeAreasPage.tsx";
import LawyerDirectoryPage from "./pages/public/LawyerDirectoryPage.tsx";
import ConsultationPage from "./pages/public/ConsultationPage.tsx";
import ContactPage from "./pages/public/ContactPage.tsx";
import BlogPage from "./pages/public/BlogPage.tsx";

import ClientLayout from "./pages/client/ClientLayout.tsx";
import ClientDashboard from "./pages/client/ClientDashboard.tsx";
import ClientCasesPage from "./pages/client/ClientCasesPage.tsx";
import ClientDocumentsPage from "./pages/client/ClientDocumentsPage.tsx";
import ClientMessagesPage from "./pages/client/ClientMessagesPage.tsx";
import ClientBillingPage from "./pages/client/ClientBillingPage.tsx";

import StaffLayout from "./pages/staff/StaffLayout.tsx";
import StaffDashboard from "./pages/staff/StaffDashboard.tsx";
import StaffCasesPage from "./pages/staff/StaffCasesPage.tsx";
import StaffCaseDetailPage from "./pages/staff/StaffCaseDetailPage.tsx";
import StaffHearingsPage from "./pages/staff/StaffHearingsPage.tsx";
import StaffDocumentsPage from "./pages/staff/StaffDocumentsPage.tsx";
import StaffTasksPage from "./pages/staff/StaffTasksPage.tsx";
import StaffTimeTrackerPage from "./pages/staff/StaffTimeTrackerPage.tsx";
import StaffClientsPage from "./pages/staff/StaffClientsPage.tsx";

import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminUsersPage from "./pages/admin/AdminUsersPage.tsx";
import AdminHRPage from "./pages/admin/AdminHRPage.tsx";
import AdminFinancePage from "./pages/admin/AdminFinancePage.tsx";
import AdminCRMPage from "./pages/admin/AdminCRMPage.tsx";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage.tsx";
import AdminAuditPage from "./pages/admin/AdminAuditPage.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/practice-areas" element={<PracticeAreasPage />} />
            <Route path="/lawyers" element={<LawyerDirectoryPage />} />
            <Route path="/consultation" element={<ConsultationPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/blog" element={<BlogPage />} />
          </Route>

          <Route path="/client" element={<ClientLayout />}>
            <Route index element={<ClientDashboard />} />
            <Route path="cases" element={<ClientCasesPage />} />
            <Route path="documents" element={<ClientDocumentsPage />} />
            <Route path="messages" element={<ClientMessagesPage />} />
            <Route path="billing" element={<ClientBillingPage />} />
          </Route>

          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<StaffDashboard />} />
            <Route path="cases" element={<StaffCasesPage />} />
            <Route path="cases/:caseId" element={<StaffCaseDetailPage />} />
            <Route path="hearings" element={<StaffHearingsPage />} />
            <Route path="documents" element={<StaffDocumentsPage />} />
            <Route path="tasks" element={<StaffTasksPage />} />
            <Route path="time" element={<StaffTimeTrackerPage />} />
            <Route path="clients" element={<StaffClientsPage />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="hr" element={<AdminHRPage />} />
            <Route path="finance" element={<AdminFinancePage />} />
            <Route path="crm" element={<AdminCRMPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
