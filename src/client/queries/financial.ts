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
import {
  authoritativeBackendData,
  useShadowRead,
  usesConvexBackend,
  usesNextBackend,
} from "@/client/data/shadow-reader";
import { queryKeys } from "@/client/queries/query-keys";

export function useInvoices(filters?: { clientId?: string; caseId?: string; status?: string }) {
  const backend = useDomainBackend("finance");
  const convex = useConvexQuery(
    api.invoices.listInvoices,
    usesConvexBackend(backend) ? filters || {} : "skip",
  );
  const next = useQuery({
    queryKey: queryKeys.financial.invoices(filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/financial/invoices", { query: { ...filters }, signal }),
    enabled: usesNextBackend(backend),
  });
  useShadowRead(
    "finance",
    "listInvoices",
    backend,
    convex,
    next.data,
    next.isLoading,
    next.error,
  );
  const data = authoritativeBackendData(backend, convex as any[] | undefined, next.data);
  return {
    data: data ?? [],
    isLoading: backend === "next" ? next.isLoading : convex === undefined,
  };
}

export function useInvoiceCommands() {
  const backend = useDomainBackend("finance");
  const queryClient = useQueryClient();
  const convexCreateInvoice = useConvexMutation(api.invoices.createInvoiceFromTimeEntries as any);
  const convexUpdateStatus = useConvexMutation(api.invoices.updateInvoiceStatus as any);
  const convexPayInvoice = useConvexMutation(api.invoices.payInvoice as any);
  const convexInitiateGateway = useConvexMutation(api.invoices.initiateGatewayPayment as any);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.financial.invoices() });

  const createInvoice = useMutation({
    mutationFn: async (data: any) => {
      try {
        if (backend === "convex") return await convexCreateInvoice(data);
        return await apiClient.request("/api/v1/financial/invoices", { method: "POST", body: data });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: async (data: { id?: string; invoiceId?: string; status: string; paidDate?: string }) => {
      try {
        const id = String(data.id ?? data.invoiceId ?? "");
        if (backend === "convex") {
          return await convexUpdateStatus({
            invoiceId: id,
            status: data.status,
            paidDate: data.paidDate,
          });
        }
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
        if (backend === "convex") return await convexPayInvoice(data);
        const idempotencyKey =
          typeof data.idempotencyKey === "string" && data.idempotencyKey.length >= 8
            ? data.idempotencyKey
            : crypto.randomUUID();
        return await apiClient.request(`/api/v1/financial/invoices/${id}/pay`, {
          method: "POST",
          body: {
            gateway: data.gateway,
            referenceNumber: data.referenceNumber,
            amount: data.amount,
            idempotencyKey,
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
        if (backend === "convex") return await convexInitiateGateway(data);
        const idempotencyKey =
          typeof data.idempotencyKey === "string" && data.idempotencyKey.length >= 8
            ? data.idempotencyKey
            : crypto.randomUUID();
        return await apiClient.request(`/api/v1/financial/invoices/${id}/gateway`, {
          method: "POST",
          body: { gateway: data.gateway, idempotencyKey },
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
  const backend = useDomainBackend("finance");
  const convex = useConvexQuery(
    api.timeEntries.listTimeEntries,
    backend === "convex" ? filters || {} : "skip",
  );
  const next = useQuery({
    queryKey: queryKeys.financial.timeEntries(filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/financial/time-entries", { query: { ...filters }, signal }),
    enabled: backend === "next",
  });
  return {
    data: (backend === "convex" ? convex : next.data) ?? [],
    isLoading: backend === "next" ? next.isLoading : convex === undefined,
  };
}

export function useTimeEntryCommands() {
  const backend = useDomainBackend("finance");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.timeEntries.createTimeEntry as any);
  const convexDelete = useConvexMutation(api.timeEntries.deleteTimeEntry as any);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.financial.timeEntries() });

  const createTimeEntry = useMutation({
    mutationFn: async (data: any) => {
      try {
        if (backend === "convex") return await convexCreate(data);
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
        if (backend === "convex") return await convexDelete({ entryId: id });
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
  const backend = useDomainBackend("finance");
  const convex = useConvexQuery(
    api.invoices.listTrustTransactions as any,
    backend === "convex" ? filters || {} : "skip",
  );
  const next = useQuery({
    queryKey: queryKeys.financial.trustTransactions(filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/financial/trust-transactions", {
        query: { ...filters },
        signal,
      }),
    enabled: backend === "next",
  });
  return {
    data: (backend === "convex" ? convex : next.data) ?? [],
    isLoading: backend === "next" ? next.isLoading : convex === undefined,
  };
}

export function useTrustCommands() {
  const backend = useDomainBackend("finance");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.invoices.createTrustTransaction as any);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.financial.trustTransactions() });

  const createTrustTransaction = useMutation({
    mutationFn: async (data: any) => {
      try {
        if (backend === "convex") return await convexCreate(data);
        const idempotencyKey =
          typeof data.idempotencyKey === "string" && data.idempotencyKey.length >= 8
            ? data.idempotencyKey
            : crypto.randomUUID();
        return await apiClient.request("/api/v1/financial/trust-transactions", {
          method: "POST",
          body: { ...data, idempotencyKey },
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
  const backend = useDomainBackend("finance");
  const convex = useConvexQuery(api.expenses.list as any, backend === "convex" ? filters || {} : "skip");
  const next = useQuery({
    queryKey: queryKeys.financial.expenses(filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/financial/expenses", { query: { ...filters }, signal }),
    enabled: backend === "next",
  });
  return {
    data: (backend === "convex" ? convex : next.data) ?? [],
    isLoading: backend === "next" ? next.isLoading : convex === undefined,
  };
}

export function useExpenseStats() {
  const backend = useDomainBackend("finance");
  const convex = useConvexQuery(api.expenses.getStats as any, backend === "convex" ? {} : "skip");
  const next = useQuery({
    queryKey: [...queryKeys.financial.expenses(), "stats"],
    queryFn: ({ signal }) =>
      apiClient.request("/api/v1/financial/expenses/stats", { signal }),
    enabled: backend === "next",
  });
  return {
    data: backend === "convex" ? convex : next.data,
    isLoading: backend === "next" ? next.isLoading : convex === undefined,
  };
}

export function useExpenseCommands() {
  const backend = useDomainBackend("finance");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.expenses.create as any);
  const convexApprove = useConvexMutation(api.expenses.approve as any);
  const convexRemove = useConvexMutation(api.expenses.remove as any);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.financial.expenses() });

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      try {
        if (backend === "convex") return await convexCreate(data);
        return await apiClient.request("/api/v1/financial/expenses", { method: "POST", body: data });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const approveExpense = useMutation({
    mutationFn: async (data: { id: string; status?: "approved" | "rejected" }) => {
      try {
        if (backend === "convex") return await convexApprove(data);
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
        if (backend === "convex") return await convexRemove(data);
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
