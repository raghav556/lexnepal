"use client";

/**
 * Staff CRM — same lead pipeline as Admin CRM (`AdminCRMPage`), with staff deep-links
 * and API self-scoping for users without `clients.manage`.
 */
import AdminCRMPage from "@/views/admin/AdminCRMPage";

export default function StaffCRMPage() {
  return <AdminCRMPage portal="staff" />;
}
