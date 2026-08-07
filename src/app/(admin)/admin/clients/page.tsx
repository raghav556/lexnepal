"use client";

import { Suspense } from "react";
import StaffClientsPage from "@/views/staff/StaffClientsPage";

export default function AdminClientsRoute() {
  return (
    <Suspense fallback={null}>
      <StaffClientsPage />
    </Suspense>
  );
}
