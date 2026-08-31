import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";
import type {
  AttendanceDto,
  AttendanceUpsertInput,
  LeaveBalanceDto,
  LeaveBalanceUpsertInput,
  LeaveCreateInput,
  LeaveRequestDto,
  PayrollRowDto,
  PayrollRunCreateInput,
  PayrollRunDto,
  PayslipDto,
  SetBaseSalaryInput,
} from "@/shared/contracts/hr";

export function useAttendance(filters?: { userId?: string; date?: string }, enabled = true) {
  return useQuery({
    queryKey: queryKeys.hr.attendance(filters),
    queryFn: ({ signal }) =>
      apiClient.request<AttendanceDto[]>("/api/v1/hr/attendance", {
        query: { ...filters },
        signal,
      }),
    enabled,
  }).data;
}

export function useLeaveRequests(filters?: { userId?: string; status?: string }, enabled = true) {
  return useQuery({
    queryKey: queryKeys.hr.leaveRequests(filters),
    queryFn: ({ signal }) =>
      apiClient.request<LeaveRequestDto[]>("/api/v1/hr/leave-requests", {
        query: { ...filters },
        signal,
      }),
    enabled,
  }).data;
}

export function useLeaveBalances(filters?: { userId?: string; year?: number }, enabled = true) {
  return useQuery({
    queryKey: queryKeys.hr.leaveBalances(filters),
    queryFn: ({ signal }) =>
      apiClient.request<LeaveBalanceDto[]>("/api/v1/hr/leave-balances", {
        query: { ...filters },
        signal,
      }),
    enabled,
  }).data;
}

export function usePayroll(enabled = true) {
  return useQuery({
    queryKey: queryKeys.hr.payroll,
    queryFn: ({ signal }) => apiClient.request<PayrollRowDto[]>("/api/v1/hr/payroll", { signal }),
    enabled,
  }).data;
}

export function usePayrollRuns(filters?: { status?: string }, enabled = true) {
  return useQuery({
    queryKey: queryKeys.hr.payrollRuns(filters),
    queryFn: ({ signal }) =>
      apiClient.request<PayrollRunDto[]>("/api/v1/hr/payroll/runs", {
        query: { ...filters },
        signal,
      }),
    enabled,
  }).data;
}

export function usePayrollRun(runId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.hr.payrollRun(runId),
    queryFn: ({ signal }) =>
      apiClient.request<PayrollRunDto>(`/api/v1/hr/payroll/runs/${runId}`, { signal }),
    enabled: Boolean(runId) && enabled,
  }).data;
}

export function usePayslips(enabled = true) {
  return useQuery({
    queryKey: queryKeys.hr.payslips,
    queryFn: ({ signal }) =>
      apiClient.request<PayslipDto[]>("/api/v1/hr/payroll/payslips", { signal }),
    enabled,
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

  const upsertLeaveBalance = useMutation({
    mutationFn: async (input: LeaveBalanceUpsertInput) => {
      try {
        return await apiClient.request<LeaveBalanceDto>("/api/v1/hr/leave-balances", {
          method: "POST",
          body: input,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidateHr,
  });

  const createPayrollRun = useMutation({
    mutationFn: async (input: PayrollRunCreateInput) => {
      try {
        return await apiClient.request<PayrollRunDto>("/api/v1/hr/payroll/runs", {
          method: "POST",
          body: input,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidateHr,
  });

  const finalizePayrollRun = useMutation({
    mutationFn: async (runId: string) => {
      try {
        return await apiClient.request<PayrollRunDto>(`/api/v1/hr/payroll/runs/${runId}/finalize`, {
          method: "POST",
          body: {},
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

  return {
    upsertAttendance,
    reviewLeaveRequest,
    createLeaveRequest,
    upsertLeaveBalance,
    createPayrollRun,
    finalizePayrollRun,
    setBaseSalary,
  };
}
