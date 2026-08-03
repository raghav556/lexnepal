/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";
// @ts-ignore
import { useConvex } from "convex/react";
import { useDomainBackend } from "@/client/data/provider";
import { useMutation as useConvexMutation } from "@/client/data/convex-bridge";
import { api } from "@/convex/_generated/api.js";

export function useInvoices(filters?: { clientId?: string; caseId?: string }) {
  const backend = useDomainBackend("finance");
  const convex = useConvex();

  return useQuery({
    queryKey: queryKeys.financial.invoices(filters),
    queryFn: async () => {
      if (backend === "convex") {
        return await convex.query(api.invoices.listInvoices as any, filters || {});
      }
      const searchParams = new URLSearchParams();
      if (filters?.clientId) searchParams.append("clientId", filters.clientId);
      if (filters?.caseId) searchParams.append("caseId", filters.caseId);
      const res = await fetch(`/api/v1/financial/invoices?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
  });
}

export function useInvoiceCommands() {
  const backend = useDomainBackend("finance");
  const queryClient = useQueryClient();
  const convexCreateInvoice = useConvexMutation(api.invoices.createInvoiceFromTimeEntries as any);
  const convexUpdateStatus = useConvexMutation(api.invoices.updateInvoiceStatus as any);
  const convexPayInvoice = useConvexMutation(api.invoices.payInvoice as any);
  const convexInitiateGateway = useConvexMutation(api.invoices.initiateGatewayPayment as any);

  const createInvoice = useMutation({
    mutationFn: async (data: any) => {
      if (backend === "convex") {
        return await convexCreateInvoice(data);
      }
      const res = await fetch("/api/v1/financial/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create invoice");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.financial.invoices() }),
  });

  const updateStatus = useMutation({
    mutationFn: async (data: { id: string; status: string }) => {
      if (backend === "convex") {
        return await convexUpdateStatus(data);
      }
      const res = await fetch(`/api/v1/financial/invoices/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: data.status }),
      });
      if (!res.ok) throw new Error("Failed to update invoice");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.financial.invoices() }),
  });
  
  const payInvoice = useMutation({
    mutationFn: async (data: any) => {
      if (backend === "convex") return await convexPayInvoice(data);
      throw new Error("Next.js backend not implemented for payInvoice");
    }
  });

  const initiateGateway = useMutation({
    mutationFn: async (data: any) => {
      if (backend === "convex") return await convexInitiateGateway(data);
      throw new Error("Next.js backend not implemented for initiateGateway");
    }
  });

  return { createInvoice, updateStatus, payInvoice, initiateGateway };
}

export function useTimeEntries(filters?: { caseId?: string; userId?: string }) {
  const backend = useDomainBackend("finance");
  const convex = useConvex();

  return useQuery({
    queryKey: queryKeys.financial.timeEntries(filters),
    queryFn: async () => {
      if (backend === "convex") {
        return await convex.query(api.timeEntries.listTimeEntries as any, filters || {});
      }
      const searchParams = new URLSearchParams();
      if (filters?.caseId) searchParams.append("caseId", filters.caseId);
      if (filters?.userId) searchParams.append("userId", filters.userId);
      const res = await fetch(`/api/v1/financial/time-entries?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch time entries");
      return res.json();
    },
  });
}

export function useTimeEntryCommands() {
  const backend = useDomainBackend("finance");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.timeEntries.createTimeEntry as any);
  const convexDelete = useConvexMutation(api.timeEntries.deleteTimeEntry as any);

  const createTimeEntry = useMutation({
    mutationFn: async (data: any) => {
      if (backend === "convex") {
        return await convexCreate(data);
      }
      const res = await fetch("/api/v1/financial/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create time entry");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.financial.timeEntries() }),
  });

  const deleteTimeEntry = useMutation({
    mutationFn: async (data: { id: string }) => {
      if (backend === "convex") {
        return await convexDelete(data);
      }
      const res = await fetch(`/api/v1/financial/time-entries/${data.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete time entry");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.financial.timeEntries() }),
  });

  return { createTimeEntry, deleteTimeEntry };
}

export function useTrustTransactions(filters?: { clientId?: string; caseId?: string }) {
  const backend = useDomainBackend("finance");
  const convex = useConvex();

  return useQuery({
    queryKey: queryKeys.financial.trustTransactions(filters),
    queryFn: async () => {
      if (backend === "convex") {
        return await convex.query(api.invoices.listTrustTransactions as any, filters || {});
      }
      const searchParams = new URLSearchParams();
      if (filters?.clientId) searchParams.append("clientId", filters.clientId);
      if (filters?.caseId) searchParams.append("caseId", filters.caseId);
      const res = await fetch(`/api/v1/financial/trust-transactions?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch trust transactions");
      return res.json();
    },
  });
}

export function useTrustCommands() {
  const backend = useDomainBackend("finance");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.invoices.createTrustTransaction as any);

  const createTrustTransaction = useMutation({
    mutationFn: async (data: any) => {
      if (backend === "convex") {
        return await convexCreate(data);
      }
      const res = await fetch("/api/v1/financial/trust-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create trust transaction");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.financial.trustTransactions() }),
  });

  return { createTrustTransaction };
}

export function useExpenses(filters?: { caseId?: string; category?: string; status?: string }) {
  const backend = useDomainBackend("finance");
  const convex = useConvex();

  return useQuery({
    queryKey: queryKeys.financial.expenses(filters),
    queryFn: async () => {
      if (backend === "convex") {
        return await convex.query(api.expenses.list as any, filters || {});
      }
      const searchParams = new URLSearchParams();
      if (filters?.caseId) searchParams.append("caseId", filters.caseId);
      if (filters?.category) searchParams.append("category", filters.category);
      if (filters?.status) searchParams.append("status", filters.status);
      const res = await fetch(`/api/v1/financial/expenses?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
  });
}

export function useExpenseStats() {
  const backend = useDomainBackend("finance");
  const convex = useConvex();

  return useQuery({
    queryKey: [...queryKeys.financial.expenses(), "stats"],
    queryFn: async () => {
      if (backend === "convex") {
        return await convex.query(api.expenses.getStats as any, {});
      }
      const res = await fetch(`/api/v1/financial/expenses/stats`);
      if (!res.ok) throw new Error("Failed to fetch expense stats");
      return res.json();
    },
  });
}

export function useExpenseCommands() {
  const backend = useDomainBackend("finance");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.expenses.create as any);
  const convexApprove = useConvexMutation(api.expenses.approve as any);
  const convexRemove = useConvexMutation(api.expenses.remove as any);

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      if (backend === "convex") {
        return await convexCreate(data);
      }
      const res = await fetch("/api/v1/financial/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create expense");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.financial.expenses() }),
  });
  
  const approveExpense = useMutation({
    mutationFn: async (data: { id: string }) => {
      if (backend === "convex") {
        return await convexApprove(data);
      }
      const res = await fetch(`/api/v1/financial/expenses/${data.id}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve expense");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.financial.expenses() }),
  });
  
  const deleteExpense = useMutation({
    mutationFn: async (data: { id: string }) => {
      if (backend === "convex") {
        return await convexRemove(data);
      }
      const res = await fetch(`/api/v1/financial/expenses/${data.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete expense");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.financial.expenses() }),
  });

  return { createExpense, approveExpense, deleteExpense };
}
