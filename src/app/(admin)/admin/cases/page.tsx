"use client";

import { CasesWorkspace } from "@/components/cases/cases-workspace";

export default function AdminCasesPage() {
  return <CasesWorkspace basePath="/admin/cases" portal="admin" />;
}
