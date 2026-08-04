/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { anyApi as api } from "convex/server";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "@/client/data/convex-bridge";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { useDomainBackend } from "@/client/data/provider";
import { queryKeys } from "@/client/queries/query-keys";
import type {
  AttendanceDto,
  AttendanceUpsertInput,
  LeaveCreateInput,
  LeaveRequestDto,
  PayrollRowDto,
  SetBaseSalaryInput,
} from "@/shared/contracts/hr";

export function useAttendance(filters?: { userId?: string; date?: string }) {
  const backend = useDomainBackend("hr");
  const convex = useConvexQuery(
    (api as any).hr.listAttendance,
    backend === "convex" ? ((filters || {}) as any) : "skip",
  ) as AttendanceDto[] | undefined;
  const next = useQuery({
    queryKey: queryKeys.hr.attendance(filters),
    queryFn: ({ signal }) =>
      apiClient.request<AttendanceDto[]>("/api/v1/hr/attendance", { query: { ...filters }, signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}

export function useLeaveRequests(filters?: { userId?: string; status?: string }) {
  const backend = useDomainBackend("hr");
  const convex = useConvexQuery(
    (api as any).hr.listLeaveRequests,
    backend === "convex" ? ((filters || {}) as any) : "skip",
  ) as LeaveRequestDto[] | undefined;
  const next = useQuery({
    queryKey: queryKeys.hr.leaveRequests(filters),
    queryFn: ({ signal }) =>
      apiClient.request<LeaveRequestDto[]>("/api/v1/hr/leave-requests", {
        query: { ...filters },
        signal,
      }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}

export function usePayroll() {
  const backend = useDomainBackend("hr");
  const convex = useConvexQuery(
    (api as any).hr.generatePayroll,
    backend === "convex" ? {} : "skip",
  ) as PayrollRowDto[] | undefined;
  const next = useQuery({
    queryKey: queryKeys.hr.payroll,
    queryFn: ({ signal }) =>
      apiClient.request<PayrollRowDto[]>("/api/v1/hr/payroll", { signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}

export function useHrCommands() {
  const backend = useDomainBackend("hr");
  const queryClient = useQueryClient();
  const convexUpsert = useConvexMutation((api as any).hr.upsertAttendance);
  const convexReview = useConvexMutation((api as any).hr.reviewLeaveRequest);
  const convexCreateLeave = useConvexMutation((api as any).hr.createLeaveRequest);
  const convexSetSalary = useConvexMutation((api as any).hr.setBaseSalary);

  const invalidateHr = () => queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.identity.users() });

  const upsertAttendance = useMutation({
    mutationFn: async (input: AttendanceUpsertInput) => {
      try {
        if (backend === "convex") return await convexUpsert(input as any);
        return await apiClient.request<AttendanceDto>("/api/v1/hr/attendance", {
          method: "POST",
          body: input,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidateHr,
  });

  const reviewLeaveRequest = useMutation({
    mutationFn: async (input: { leaveRequestId: string; status: "approved" | "rejected" }) => {
      try {
        if (backend === "convex") return await convexReview(input as any);
        return await apiClient.request<LeaveRequestDto>("/api/v1/hr/leave-requests/review", {
          method: "POST",
          body: input,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidateHr,
  });

  const createLeaveRequest = useMutation({
    mutationFn: async (input: LeaveCreateInput) => {
      try {
        if (backend === "convex") return await convexCreateLeave(input as any);
        return await apiClient.request<LeaveRequestDto>("/api/v1/hr/leave-requests", {
          method: "POST",
          body: input,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidateHr,
  });

  const setBaseSalary = useMutation({
    mutationFn: async (input: SetBaseSalaryInput) => {
      try {
        if (backend === "convex") return await convexSetSalary(input as any);
        return await apiClient.request<{ success: true }>("/api/v1/hr/base-salary", {
          method: "POST",
          body: input,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: () => {
      invalidateHr();
      invalidateUsers();
    },
  });

  return { upsertAttendance, reviewLeaveRequest, createLeaveRequest, setBaseSalary };
}
