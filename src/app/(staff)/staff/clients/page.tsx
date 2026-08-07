"use client";

import { Suspense } from "react";
import StaffClientsPage from "@/views/staff/StaffClientsPage";

export default function StaffClientsRoute() {
  return (
    <Suspense fallback={null}>
      <StaffClientsPage />
    </Suspense>
  );
}
