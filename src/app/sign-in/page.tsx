"use client";

import { Suspense } from "react";
import SignInPage from "@/views/auth/SignInPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignInPage />
    </Suspense>
  );
}
