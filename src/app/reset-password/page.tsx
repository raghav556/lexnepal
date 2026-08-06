"use client";

import { Suspense } from "react";
import ResetPasswordPage from "@/views/auth/ResetPasswordPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPage />
    </Suspense>
  );
}
