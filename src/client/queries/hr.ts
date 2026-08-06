import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
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
  return useQuery({
    queryKey: queryKeys.hr.attendance(filters),
    queryFn: ({ signal }) =>
      apiClient.request<AttendanceDto[]>("/api/v1/hr/attendance", { query: { ...filters }, signal }),
  }).data;
}

export function useLeaveRequests(filters?: { userId?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.hr.leaveRequests(filters),
    queryFn: ({ signal }) =>
      apiClient.request<LeaveRequestDto[]>("/api/v1/hr/leave-requests", {
        query: { ...filters },
        signal,
      }),
  }).data;
}

export function usePayroll() {
  return useQuery({
    queryKey: queryKeys.hr.payroll,
    queryFn: ({ signal }) => apiClient.request<PayrollRowDto[]>("/api/v1/hr/payroll", { signal }),
  }).data;
}

export function useHrCommands() {
  const queryClient = useQueryClient();

  const invalidateHr = () => queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.identity.users() });

  const upsertAttendance = useMutation({
    mutationFn: async (input: AttendanceUpsertInput) => {
      try {
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
