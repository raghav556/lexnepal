import React from "react";
import { createRoot } from "react-dom/client";
import Layout from "@/app/(client)/layout";
import Home from "@/views/client/ClientDashboard";
import Cases from "@/views/client/ClientCasesPage";
import Detail from "@/views/client/ClientCaseDetailPage";
import Hearings from "@/views/client/ClientHearingsPage";
import Checklist from "@/views/client/ClientChecklistPage";
import Documents from "@/views/client/ClientDocumentsPage";
import Messages from "@/views/client/ClientMessagesPage";
import Booking from "@/views/client/ClientBookingPage";
import Identity from "@/views/client/ClientKYCOnboarding";
import Signatures from "@/views/client/ClientSignaturesPage";
import Notifications from "@/views/client/ClientNotificationsPage";
import Profile from "@/views/shared/SharedProfilePage";
import { I18nProvider } from "@/lib/i18n-context";
import { setVisualFixture } from "./adapters";
import type { VisualState } from "./catalog";

const views = {
  Home,
  Cases,
  Detail,
  Hearings,
  Checklist,
  Documents,
  Messages,
  Booking,
  Identity,
  Signatures,
  Notifications,
};
const routeViews: Record<string, keyof typeof views> = {
  "/client": "Home",
  "/client/cases": "Cases",
  "/client/cases/matter-1": "Detail",
  "/client/hearings": "Hearings",
  "/client/checklist": "Checklist",
  "/client/documents": "Documents",
  "/client/messages": "Messages",
  "/client/booking": "Booking",
  "/client/kyc": "Identity",
  "/client/signatures": "Signatures",
  "/client/notifications": "Notifications",
};
const root = createRoot(document.getElementById("root")!);
let sequence = 0;
declare global {
  interface Window {
    renderClientVisual: (route: string, state: VisualState) => void;
  }
}
window.renderClientVisual = (route, state) => {
  setVisualFixture(route, state);
  const View = routeViews[route] ? views[routeViews[route]] : null;
  root.render(
    <I18nProvider>
      <Layout key={++sequence}>{View ? <View /> : <Profile variant="client" />}</Layout>
    </I18nProvider>,
  );
};
