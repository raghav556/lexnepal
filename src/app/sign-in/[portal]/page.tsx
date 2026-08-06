"use client";

import { Suspense } from "react";
import SignInPage from "@/views/auth/SignInPage";

export default function SignInPortalPage() {
  return (
    <Suspense fallback={null}>
      <SignInPage />
    </Suspense>
  );
}
