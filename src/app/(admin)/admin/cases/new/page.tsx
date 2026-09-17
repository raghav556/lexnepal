import { redirect } from "next/navigation";

export default function AdminCasesNewPage() {
  redirect("/admin/cases?create=1");
}
