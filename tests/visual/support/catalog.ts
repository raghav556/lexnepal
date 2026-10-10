export const visualRoutes = [
  { id: "01-home", route: "/client", view: "ClientDashboard" },
  { id: "02-my-matters", route: "/client/cases", view: "ClientCasesPage" },
  { id: "03-matter-details", route: "/client/cases/matter-1", view: "ClientCaseDetailPage" },
  { id: "04-hearings", route: "/client/hearings", view: "ClientHearingsPage" },
  { id: "05-checklist", route: "/client/checklist", view: "ClientChecklistPage" },
  { id: "06-documents", route: "/client/documents", view: "ClientDocumentsPage" },
  { id: "07-messages", route: "/client/messages", view: "ClientMessagesPage" },
  { id: "08-appointments", route: "/client/booking", view: "ClientBookingPage" },
  { id: "09-identity-verification", route: "/client/kyc", view: "ClientKYCOnboarding" },
  { id: "10-sign-documents", route: "/client/signatures", view: "ClientSignaturesPage" },
  { id: "11-notifications", route: "/client/notifications", view: "ClientNotificationsPage" },
  { id: "12-profile", route: "/client/profile", view: "SharedProfilePage" },
] as const;

export const visualViewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 900 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
] as const;

export const visualStates = [
  "healthy",
  "loading",
  "empty",
  "error",
  "partial",
  "long-text",
  "high-volume",
  "no-upcoming",
  "complete",
] as const;
export type VisualState = (typeof visualStates)[number];
export const visualClock = "2026-09-18T04:15:00.000Z";
