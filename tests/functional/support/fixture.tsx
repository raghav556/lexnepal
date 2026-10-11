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
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { I18nProvider } from "@/lib/i18n-context";
import { setFunctionalFixture, fixtureApi, functionalFetch } from "./adapters";
import { Toaster } from "sonner";
import type { FixtureOptions } from "./adapters";

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
    renderClientFunctional: (route: string, options?: FixtureOptions) => void;
    clientFunctional: typeof fixtureApi;
  }
}
window.clientFunctional = fixtureApi;
window.fetch = functionalFetch;
window.renderClientFunctional = (route, options = {}) => {
  setFunctionalFixture(route, options);
  const View = routeViews[route] ? views[routeViews[route]] : null;
  root.render(
    <I18nProvider>
      <Layout key={++sequence}>
        {options.sharedChat ? (
          <MatterChatPanel caseId="matter-1" mode="staff" appearance="default" />
        ) : View ? (
          <View />
        ) : (
          <Profile variant={options.profileVariant ?? "client"} />
        )}
      </Layout>
      <Toaster />
    </I18nProvider>,
  );
};
