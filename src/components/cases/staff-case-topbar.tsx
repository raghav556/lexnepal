"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { PortalTopbar, type PortalTopbarProps } from "@/components/dashboard/portal-topbar";
import { queryKeys } from "@/client/queries/query-keys";
import type { CaseDto } from "@/shared/contracts/domains";

type StaffTopbarProps = Omit<PortalTopbarProps, "portal" | "currentPageLabel">;

/** Observe the detail query's existing cache entry; never register a query or fetch. */
function CaseRecordTopbar({ recordId, ...props }: StaffTopbarProps & { recordId: string }) {
  const queryClient = useQueryClient();
  const subscribe = useCallback(
    (notify: () => void) => queryClient.getQueryCache().subscribe(notify),
    [queryClient],
  );
  const getLabel = useCallback(() => {
    // The existing useCaseQuery(caseId) stores its default `details=false` in the key.
    const data = queryClient.getQueryData<Pick<CaseDto, "caseNumber" | "title">>([
      ...queryKeys.cases.detail(recordId),
      false,
    ]);
    return data?.caseNumber?.trim() || data?.title?.trim() || "Case details";
  }, [queryClient, recordId]);
  const currentPageLabel = useSyncExternalStore(subscribe, getLabel, () => "Case details");
  return <PortalTopbar {...props} portal="staff" currentPageLabel={currentPageLabel} />;
}

export function StaffCaseTopbar(props: StaffTopbarProps) {
  const recordId = /^\/staff\/cases\/([^/]+)$/.exec(usePathname())?.[1];
  // Other Staff screens retain the original topbar and require no query-cache consumer.
  return recordId ? (
    <CaseRecordTopbar {...props} recordId={recordId} />
  ) : (
    <PortalTopbar {...props} portal="staff" />
  );
}
