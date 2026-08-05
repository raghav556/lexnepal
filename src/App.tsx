import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import { I18nProvider } from "./lib/i18n-context.tsx";
import AuthCallback from "./legacy-pages/auth/Callback.tsx";
import AccountSetupPage from "./legacy-pages/auth/AccountSetupPage.tsx";
import SignInPage from "./legacy-pages/auth/SignInPage.tsx";
import MfaEnrollmentPage from "./legacy-pages/auth/MfaEnrollmentPage.tsx";
import NotFound from "./legacy-pages/NotFound.tsx";

import PublicLayout from "./legacy-pages/public/PublicLayout.tsx";
import HomePage from "./legacy-pages/public/HomePage.tsx";
import PracticeAreasPage from "./legacy-pages/public/PracticeAreasPage.tsx";
import LawyerDirectoryPage from "./legacy-pages/public/LawyerDirectoryPage.tsx";
import ConsultationPage from "./legacy-pages/public/ConsultationPage.tsx";
import ContactPage from "./legacy-pages/public/ContactPage.tsx";
import BlogPage from "./legacy-pages/public/BlogPage.tsx";
import BlogPostPage from "./legacy-pages/public/BlogPostPage.tsx";
import IntakeFormPage from "./legacy-pages/public/IntakeFormPage.tsx";
import AboutPage from "./legacy-pages/public/AboutPage.tsx";
import PublicLawyerProfilePage from "./legacy-pages/public/PublicLawyerProfilePage.tsx";
import CareersPage from "./legacy-pages/public/CareersPage.tsx";
import ResourcesPage from "./legacy-pages/public/ResourcesPage.tsx";
import NewsPage from "./legacy-pages/public/NewsPage.tsx";
import LegalPage from "./legacy-pages/public/LegalPage.tsx";

import ClientLayout from "./legacy-pages/client/ClientLayout.tsx";
import ClientDashboard from "./legacy-pages/client/ClientDashboard.tsx";
import ClientCasesPage from "./legacy-pages/client/ClientCasesPage.tsx";
import ClientDocumentsPage from "./legacy-pages/client/ClientDocumentsPage.tsx";
import ClientMessagesPage from "./legacy-pages/client/ClientMessagesPage.tsx";
import ClientBillingPage from "./legacy-pages/client/ClientBillingPage.tsx";
import ClientBookingPage from "./legacy-pages/client/ClientBookingPage.tsx";
import ClientKYCOnboarding from "./legacy-pages/client/ClientKYCOnboarding.tsx";
import ClientSignaturesPage from "./legacy-pages/client/ClientSignaturesPage.tsx";
import ClientChecklistPage from "./legacy-pages/client/ClientChecklistPage.tsx";

import StaffLayout from "./legacy-pages/staff/StaffLayout.tsx";
import StaffDashboard from "./legacy-pages/staff/StaffDashboard.tsx";
import StaffCasesPage from "./legacy-pages/staff/StaffCasesPage.tsx";
import StaffCaseDetailPage from "./legacy-pages/staff/StaffCaseDetailPage.tsx";
import StaffHearingsPage from "./legacy-pages/staff/StaffHearingsPage.tsx";
import StaffDocumentsPage from "./legacy-pages/staff/StaffDocumentsPage.tsx";
import StaffTasksPage from "./legacy-pages/staff/StaffTasksPage.tsx";
import StaffTimeTrackerPage from "./legacy-pages/staff/StaffTimeTrackerPage.tsx";
import StaffClientsPage from "./legacy-pages/staff/StaffClientsPage.tsx";
import StaffAppointmentsPage from "./legacy-pages/staff/StaffAppointmentsPage.tsx";
import StaffResearchPage from "./legacy-pages/staff/StaffResearchPage.tsx";

import AdminLayout from "./legacy-pages/admin/AdminLayout.tsx";
import AdminDashboard from "./legacy-pages/admin/AdminDashboard.tsx";
import AdminUsersPage from "./legacy-pages/admin/AdminUsersPage.tsx";
import AdminHRPage from "./legacy-pages/admin/AdminHRPage.tsx";
import AdminFinancePage from "./legacy-pages/admin/AdminFinancePage.tsx";
import AdminCRMPage from "./legacy-pages/admin/AdminCRMPage.tsx";
import AdminSettingsPage from "./legacy-pages/admin/AdminSettingsPage.tsx";
import AdminAuditPage from "./legacy-pages/admin/AdminAuditPage.tsx";
import AdminCMSDashboard from "./legacy-pages/admin/AdminCMSDashboard.tsx";
import AdminCMSPracticeAreas from "./legacy-pages/admin/AdminCMSPracticeAreas.tsx";
import AdminCMSTestimonials from "./legacy-pages/admin/AdminCMSTestimonials.tsx";
import AdminCMSTeam from "./legacy-pages/admin/AdminCMSTeam.tsx";
import AdminCMSBlog from "./legacy-pages/admin/AdminCMSBlog.tsx";
import AdminCMSNavigation from "./legacy-pages/admin/AdminCMSNavigation.tsx";
import AdminAppointmentsPage from "./legacy-pages/admin/AdminAppointmentsPage.tsx";
import AdminTemplatesPage from "./legacy-pages/admin/AdminTemplatesPage.tsx";
import AdminExpensesPage from "./legacy-pages/admin/AdminExpensesPage.tsx";
import AdminAnalyticsPage from "./legacy-pages/admin/AdminAnalyticsPage.tsx";
import AdminConflictChecker from "./legacy-pages/admin/AdminConflictChecker.tsx";
import AdminDocumentGenerator from "./legacy-pages/admin/AdminDocumentGenerator.tsx";
import AdminCMSCareers from "./legacy-pages/admin/AdminCMSCareers.tsx";
import AdminCMSResources from "./legacy-pages/admin/AdminCMSResources.tsx";
import AdminCMSNews from "./legacy-pages/admin/AdminCMSNews.tsx";
import AdminCMSAbout from "./legacy-pages/admin/AdminCMSAbout.tsx";
import AdminCMSGovernance from "./legacy-pages/admin/AdminCMSGovernance.tsx";

import SharedProfilePage from "./legacy-pages/shared/SharedProfilePage.tsx";
import SharedDocumentPage from "./legacy-pages/public/SharedDocumentPage.tsx";

import { useEffect } from "react";
import { useCmsSettings } from "@/client/queries/cms";

function ThemeAndSEOEngine() {
  const settings = useCmsSettings("public");
  
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
          <Route path="/reset-password" element={<AccountSetupPage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/mfa-enroll" element={<MfaEnrollmentPage />} />
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
              <Route path="governance" element={<AdminCMSGovernance />} />
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
