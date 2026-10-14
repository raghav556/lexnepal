import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import StaffLayout from "@/app/(staff)/layout";
import StaffDashboard from "@/views/staff/StaffDashboard";
import { I18nProvider, useI18n } from "@/lib/i18n-context";
import { setStaffHomeState, type StaffHomeState } from "./adapters";

declare global {
  interface Window {
    renderStaffHome: (state: StaffHomeState, brand?: string) => void;
    setStaffHomeLanguage: (language: "en" | "ne") => void;
  }
}
const root = createRoot(document.getElementById("root")!);
function Home() {
  const { setLanguage } = useI18n();
  useEffect(() => {
    window.setStaffHomeLanguage = setLanguage;
  }, [setLanguage]);
  return (
    <StaffLayout>
      <StaffDashboard />
    </StaffLayout>
  );
}
window.renderStaffHome = (state, brand) => {
  setStaffHomeState(state, brand);
  root.render(
    <I18nProvider>
      <Home />
    </I18nProvider>,
  );
};
