"use client";

import { Suspense } from "react";
import StaffClientsWorkspace from "@/views/staff/StaffClientsWorkspace";

export default function StaffClientsRoute() {
  return (
    <Suspense fallback={null}>
      <StaffClientsWorkspace />
    </Suspense>
  );
}
