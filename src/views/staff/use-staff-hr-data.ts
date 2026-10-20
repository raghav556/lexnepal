"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { hashKey, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useAttendance, useLeaveBalances, useLeaveRequests } from "@/client/queries/hr";
import { queryKeys } from "@/client/queries/query-keys";
import type { AttendanceDto, LeaveBalanceDto, LeaveRequestDto } from "@/shared/contracts/hr";

// Existing shared hooks return data only. Observe their existing cache entries
// locally so Staff can distinguish failures from loading without changing Admin.
function useResource<T>(key: QueryKey, data: T | undefined, enabled: boolean) {
  const client = useQueryClient();
  const hash = hashKey(key);
  const stableKey = useMemo(() => JSON.parse(hash) as QueryKey, [hash]);
  const subscribe = useCallback(
    (notify: () => void) =>
      client.getQueryCache().subscribe((event) => {
        if (event.query.queryHash === hash) notify();
      }),
    [client, hash],
  );
  const snapshot = useCallback(() => client.getQueryState<T>(stableKey), [client, stableKey]);
  const state = useSyncExternalStore(subscribe, snapshot, () => undefined);
  return {
    data,
    error: state?.error,
    loading: enabled && (!state || state.status === "pending"),
    ready: enabled && state?.status === "success",
    fetching: state?.fetchStatus === "fetching",
    retry: () => client.refetchQueries({ queryKey: stableKey, exact: true }),
  };
}

export function useStaffHrData(userId: string | undefined, year: number, enabled: boolean) {
  const own = useMemo(() => (userId ? { userId } : undefined), [userId]);
  const balanceFilter = useMemo(() => (userId ? { userId, year } : undefined), [userId, year]);
  const attendance = useAttendance(own, enabled);
  const requests = useLeaveRequests(own, enabled);
  const balances = useLeaveBalances(balanceFilter, enabled);
  return {
    attendance: useResource<AttendanceDto[]>(queryKeys.hr.attendance(own), attendance, enabled),
    requests: useResource<LeaveRequestDto[]>(queryKeys.hr.leaveRequests(own), requests, enabled),
    balances: useResource<LeaveBalanceDto[]>(
      queryKeys.hr.leaveBalances(balanceFilter),
      balances,
      enabled,
    ),
  };
}
