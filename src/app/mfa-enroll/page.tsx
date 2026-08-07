"use client";

import { Suspense } from "react";
import MfaEnrollmentPage from "@/views/auth/MfaEnrollmentPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MfaEnrollmentPage />
    </Suspense>
  );
}
