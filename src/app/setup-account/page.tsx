"use client";

import { Suspense } from "react";
import AccountSetupPage from "@/views/auth/AccountSetupPage";

export default function SetupAccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountSetupPage />
    </Suspense>
  );
}
