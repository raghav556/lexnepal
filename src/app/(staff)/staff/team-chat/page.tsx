"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function StaffTeamChatRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const dm = params.get("dm");
    const caseId = params.get("case");
    const next = new URLSearchParams();
    if (dm) {
      next.set("channel", "dm");
      next.set("dm", dm);
    } else if (caseId) {
      next.set("channel", "team");
      next.set("case", caseId);
    } else {
      next.set("channel", "dm");
    }
    router.replace(`/staff/messages?${next.toString()}`);
  }, [params, router]);

  return null;
}

export default function StaffTeamChatRoute() {
  return (
    <Suspense fallback={null}>
      <StaffTeamChatRedirect />
    </Suspense>
  );
}
