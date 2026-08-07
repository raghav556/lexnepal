/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";
import type { ExpenseStatsDto } from "@/shared/contracts/financial";

/** Money writes are retried by the client, so every one carries a caller-stable idempotency key. */
function idempotencyKeyFrom(data: { idempotencyKey?: unknown }) {
  return typeof data.idempotencyKey === "string" && data.idempotencyKey.length >= 8
    ? data.idempotencyKey
    : crypto.randomUUID();
}

export function useInvoices(filters?: { clientId?: string; caseId?: string; status?: string }) {
  const next = useQuery({
    queryKey: queryKeys.financial.invoices(filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/financial/invoices", { query: { ...filters }, signal }),
  });
  return { data: next.data ?? [], isLoading: next.isLoading };
}

export async function fetchInvoiceDetail(invoiceId: string) {
  return apiClient.request<any>(`/api/v1/financial/invoices/${invoiceId}`);
}

export function useMyPayments() {
  const next = useQuery({
    queryKey: queryKeys.financial.myPayments,
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/financial/payments/mine", { signal }),
  });
  return { data: next.data ?? [], isLoading: next.isLoading };
}

export function useInvoiceCommands() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.financial.invoices() });

  const createInvoice = useMutation({
    mutationFn: async (data: any) => {
      try {
        return await apiClient.request("/api/v1/financial/invoices", {
          method: "POST",
          body: data,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: async (data: {
      id?: string;
      invoiceId?: string;
      status: string;
      paidDate?: string;
    }) => {
      try {
        const id = String(data.id ?? data.invoiceId ?? "");
        return await apiClient.request(`/api/v1/financial/invoices/${id}`, {
          method: "PATCH",
          body: { status: data.status, paidDate: data.paidDate },
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const payInvoice = useMutation({
    mutationFn: async (data: any) => {
      try {
        const id = String(data.invoiceId ?? data.id ?? "");
        return await apiClient.request(`/api/v1/financial/invoices/${id}/pay`, {
          method: "POST",
          body: {
            gateway: data.gateway,
            referenceNumber: data.referenceNumber,
            amount: data.amount,
            idempotencyKey: idempotencyKeyFrom(data),
          },
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const initiateGateway = useMutation({
    mutationFn: async (data: any) => {
      try {
        const id = String(data.invoiceId ?? data.id ?? "");
        return await apiClient.request(`/api/v1/financial/invoices/${id}/gateway`, {
          method: "POST",
          body: { gateway: data.gateway, idempotencyKey: idempotencyKeyFrom(data) },
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  return { createInvoice, updateStatus, payInvoice, initiateGateway };
}

export function useTimeEntries(filters?: { caseId?: string; userId?: string }) {
  const next = useQuery({
    queryKey: queryKeys.financial.timeEntries(filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/financial/time-entries", { query: { ...filters }, signal }),
  });
  return { data: next.data ?? [], isLoading: next.isLoading };
}

export function useTimeEntryCommands() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.financial.timeEntries() });

  const createTimeEntry = useMutation({
    mutationFn: async (data: any) => {
      try {
        return await apiClient.request("/api/v1/financial/time-entries", {
          method: "POST",
          body: data,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const deleteTimeEntry = useMutation({
    mutationFn: async (data: { id?: string; entryId?: string }) => {
      try {
        const id = String(data.id ?? data.entryId ?? "");
        return await apiClient.request(`/api/v1/financial/time-entries/${id}`, { method: "DELETE" });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  return { createTimeEntry, deleteTimeEntry };
}

export function useTrustTransactions(filters?: { clientId?: string; caseId?: string }) {
  const next = useQuery({
    queryKey: queryKeys.financial.trustTransactions(filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/financial/trust-transactions", {
        query: { ...filters },
        signal,
      }),
  });
  return { data: next.data ?? [], isLoading: next.isLoading };
}

export function useTrustCommands() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.financial.trustTransactions() });

  const createTrustTransaction = useMutation({
    mutationFn: async (data: any) => {
      try {
        return await apiClient.request("/api/v1/financial/trust-transactions", {
          method: "POST",
          body: { ...data, idempotencyKey: idempotencyKeyFrom(data) },
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  return { createTrustTransaction };
}

export function useExpenses(filters?: { caseId?: string; category?: string; status?: string }) {
  const next = useQuery({
    queryKey: queryKeys.financial.expenses(filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/financial/expenses", { query: { ...filters }, signal }),
  });
  return { data: next.data ?? [], isLoading: next.isLoading };
}

export function useExpenseStats() {
  const next = useQuery({
    queryKey: [...queryKeys.financial.expenses(), "stats"],
    queryFn: ({ signal }) =>
      apiClient.request<ExpenseStatsDto>("/api/v1/financial/expenses/stats", { signal }),
  });
  return { data: next.data, isLoading: next.isLoading };
}

export function useExpenseCommands() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.financial.expenses() });

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      try {
        return await apiClient.request("/api/v1/financial/expenses", {
          method: "POST",
          body: data,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const approveExpense = useMutation({
    mutationFn: async (data: { id: string; status?: "approved" | "rejected" }) => {
      try {
        return await apiClient.request(`/api/v1/financial/expenses/${data.id}/approve`, {
          method: "POST",
          body: { status: data.status ?? "approved" },
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const deleteExpense = useMutation({
    mutationFn: async (data: { id: string }) => {
      try {
        return await apiClient.request(`/api/v1/financial/expenses/${data.id}`, {
          method: "DELETE",
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  return { createExpense, approveExpense, deleteExpense };
}
