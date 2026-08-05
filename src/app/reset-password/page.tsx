"use client";

import { Suspense } from "react";
import AccountSetupPage from "@/views/auth/AccountSetupPage";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <AccountSetupPage />
    </Suspense>
  );
}
