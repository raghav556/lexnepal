"use client";

import { Suspense } from "react";
import ConsultationPage from "@/views/public/ConsultationPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ConsultationPage />
    </Suspense>
  );
}
