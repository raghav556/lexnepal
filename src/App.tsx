import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import { I18nProvider } from "./lib/i18n-context.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import AccountSetupPage from "./pages/auth/AccountSetupPage.tsx";
import NotFound from "./pages/NotFound.tsx";

import PublicLayout from "./pages/public/PublicLayout.tsx";
import HomePage from "./pages/public/HomePage.tsx";
import PracticeAreasPage from "./pages/public/PracticeAreasPage.tsx";
import LawyerDirectoryPage from "./pages/public/LawyerDirectoryPage.tsx";
import ConsultationPage from "./pages/public/ConsultationPage.tsx";
import ContactPage from "./pages/public/ContactPage.tsx";
import BlogPage from "./pages/public/BlogPage.tsx";
import BlogPostPage from "./pages/public/BlogPostPage.tsx";
import IntakeFormPage from "./pages/public/IntakeFormPage.tsx";
import AboutPage from "./pages/public/AboutPage.tsx";
import PublicLawyerProfilePage from "./pages/public/PublicLawyerProfilePage.tsx";
import CareersPage from "./pages/public/CareersPage.tsx";
import ResourcesPage from "./pages/public/ResourcesPage.tsx";
import NewsPage from "./pages/public/NewsPage.tsx";
import LegalPage from "./pages/public/LegalPage.tsx";

import ClientLayout from "./pages/client/ClientLayout.tsx";
import ClientDashboard from "./pages/client/ClientDashboard.tsx";
import ClientCasesPage from "./pages/client/ClientCasesPage.tsx";
import ClientDocumentsPage from "./pages/client/ClientDocumentsPage.tsx";
import ClientMessagesPage from "./pages/client/ClientMessagesPage.tsx";
import ClientBillingPage from "./pages/client/ClientBillingPage.tsx";
import ClientBookingPage from "./pages/client/ClientBookingPage.tsx";
import ClientKYCOnboarding from "./pages/client/ClientKYCOnboarding.tsx";
import ClientSignaturesPage from "./pages/client/ClientSignaturesPage.tsx";
import ClientChecklistPage from "./pages/client/ClientChecklistPage.tsx";

import StaffLayout from "./pages/staff/StaffLayout.tsx";
import StaffDashboard from "./pages/staff/StaffDashboard.tsx";
import StaffCasesPage from "./pages/staff/StaffCasesPage.tsx";
import StaffCaseDetailPage from "./pages/staff/StaffCaseDetailPage.tsx";
import StaffHearingsPage from "./pages/staff/StaffHearingsPage.tsx";
import StaffDocumentsPage from "./pages/staff/StaffDocumentsPage.tsx";
import StaffTasksPage from "./pages/staff/StaffTasksPage.tsx";
import StaffTimeTrackerPage from "./pages/staff/StaffTimeTrackerPage.tsx";
import StaffClientsPage from "./pages/staff/StaffClientsPage.tsx";
import StaffAppointmentsPage from "./pages/staff/StaffAppointmentsPage.tsx";
import StaffResearchPage from "./pages/staff/StaffResearchPage.tsx";

import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminUsersPage from "./pages/admin/AdminUsersPage.tsx";
import AdminHRPage from "./pages/admin/AdminHRPage.tsx";
import AdminFinancePage from "./pages/admin/AdminFinancePage.tsx";
import AdminCRMPage from "./pages/admin/AdminCRMPage.tsx";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage.tsx";
import AdminAuditPage from "./pages/admin/AdminAuditPage.tsx";
import AdminCMSDashboard from "./pages/admin/AdminCMSDashboard.tsx";
import AdminCMSPracticeAreas from "./pages/admin/AdminCMSPracticeAreas.tsx";
import AdminCMSTestimonials from "./pages/admin/AdminCMSTestimonials.tsx";
import AdminCMSTeam from "./pages/admin/AdminCMSTeam.tsx";
import AdminCMSBlog from "./pages/admin/AdminCMSBlog.tsx";
import AdminCMSNavigation from "./pages/admin/AdminCMSNavigation.tsx";
import AdminAppointmentsPage from "./pages/admin/AdminAppointmentsPage.tsx";
import AdminTemplatesPage from "./pages/admin/AdminTemplatesPage.tsx";
import AdminExpensesPage from "./pages/admin/AdminExpensesPage.tsx";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage.tsx";
import AdminConflictChecker from "./pages/admin/AdminConflictChecker.tsx";
import AdminDocumentGenerator from "./pages/admin/AdminDocumentGenerator.tsx";
import AdminCMSCareers from "./pages/admin/AdminCMSCareers.tsx";
import AdminCMSResources from "./pages/admin/AdminCMSResources.tsx";
import AdminCMSNews from "./pages/admin/AdminCMSNews.tsx";
import AdminCMSAbout from "./pages/admin/AdminCMSAbout.tsx";

import SharedProfilePage from "./pages/shared/SharedProfilePage.tsx";
import SharedDocumentPage from "./pages/public/SharedDocumentPage.tsx";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

function ThemeAndSEOEngine() {
  const settings = useQuery(api.cms.getSettings);
  
  useEffect(() => {
    if (settings) {
      // SEO
      if (settings.seoMetaDescription) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'description');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', settings.seoMetaDescription);
      }
      if (settings.seoTitleFormat) {
        document.title = settings.seoTitleFormat.replace("%s", "Home"); // simple placeholder
      }

      // Theme Color
      if (settings.primaryColor) {
        document.documentElement.style.setProperty('--primary', settings.primaryColor);
        // also set ring to match
        document.documentElement.style.setProperty('--ring', settings.primaryColor);
      }
    }
  }, [JSON.stringify(settings)]);

  return null;
}

export default function App() {
  return (
    <DefaultProviders>
      <I18nProvider>
        <ThemeAndSEOEngine />
        <BrowserRouter>
          <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/setup-account" element={<AccountSetupPage />} />
          <Route path="/intake/:token" element={<IntakeFormPage />} />
          <Route path="/share/:token" element={<SharedDocumentPage />} />

          <Route path="/" element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="practice-areas" element={<PracticeAreasPage />} />
            <Route path="about-us" element={<AboutPage />} />
            <Route path="lawyers" element={<LawyerDirectoryPage />} />
            <Route path="lawyers/:id" element={<PublicLawyerProfilePage />} />
            <Route path="consultation" element={<ConsultationPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="blog/:slug" element={<BlogPostPage />} />
            <Route path="careers" element={<CareersPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="privacy-policy" element={<LegalPage />} />
            <Route path="terms" element={<LegalPage />} />
          </Route>

          <Route path="/client" element={<ClientLayout />}>
            <Route index element={<ClientDashboard />} />
            <Route path="cases" element={<ClientCasesPage />} />
            <Route path="documents" element={<ClientDocumentsPage />} />
            <Route path="messages" element={<ClientMessagesPage />} />
            <Route path="billing" element={<ClientBillingPage />} />
            <Route path="booking" element={<ClientBookingPage />} />
            <Route path="kyc" element={<ClientKYCOnboarding />} />
            <Route path="signatures" element={<ClientSignaturesPage />} />
            <Route path="checklist" element={<ClientChecklistPage />} />
            <Route path="profile" element={<SharedProfilePage />} />
          </Route>

          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<StaffDashboard />} />
            <Route path="cases" element={<StaffCasesPage />} />
            <Route path="cases/:id" element={<StaffCaseDetailPage />} />
            <Route path="hearings" element={<StaffHearingsPage />} />
            <Route path="documents" element={<StaffDocumentsPage />} />
            <Route path="tasks" element={<StaffTasksPage />} />
            <Route path="time" element={<StaffTimeTrackerPage />} />
            <Route path="clients" element={<StaffClientsPage />} />
            <Route path="appointments" element={<StaffAppointmentsPage />} />
            <Route path="research" element={<StaffResearchPage />} />
            <Route path="profile" element={<SharedProfilePage />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="hr" element={<AdminHRPage />} />
            <Route path="finance" element={<AdminFinancePage />} />
            <Route path="expenses" element={<AdminExpensesPage />} />
            <Route path="crm" element={<AdminCRMPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
            <Route path="cms">
              <Route index element={<AdminCMSDashboard />} />
              <Route path="navigation" element={<AdminCMSNavigation />} />
              <Route path="practice-areas" element={<AdminCMSPracticeAreas />} />
              <Route path="testimonials" element={<AdminCMSTestimonials />} />
              <Route path="team" element={<AdminCMSTeam />} />
              <Route path="blog" element={<AdminCMSBlog />} />
              <Route path="news" element={<AdminCMSNews />} />
              <Route path="careers" element={<AdminCMSCareers />} />
              <Route path="resources" element={<AdminCMSResources />} />
              <Route path="about" element={<AdminCMSAbout />} />
            </Route>
            <Route path="conflict-checker" element={<AdminConflictChecker />} />
            <Route path="document-generator" element={<AdminDocumentGenerator />} />
            <Route path="appointments" element={<AdminAppointmentsPage />} />
            <Route path="templates" element={<AdminTemplatesPage />} />
            <Route path="profile" element={<SharedProfilePage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </I18nProvider>
    </DefaultProviders>
  );
}
