/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { anyApi as api } from "convex/server";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "@/client/data/convex-bridge";
import { apiClient } from "@/client/api/client";
import { ApiClientError, normalizeApiError } from "@/client/api/errors";
import { useDomainBackend } from "@/client/data/provider";
import { queryKeys } from "@/client/queries/query-keys";

export function useLeads(filters?: { status?: string; assignedTo?: string }) {
  const backend = useDomainBackend("leads");
  const convex = useConvexQuery(
    api.leads.listLeads,
    backend === "convex" ? ((filters || {}) as any) : "skip",
  );
  const next = useQuery({
    queryKey: queryKeys.crm.leads(filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/leads", { query: { ...filters }, signal }),
    enabled: backend === "next",
  });
  return {
    data: (backend === "convex" ? convex : next.data) ?? [],
    isLoading: backend === "next" ? next.isLoading : convex === undefined,
  };
}

export function useLeadCommands() {
  const backend = useDomainBackend("leads");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.leads.createLead as any);
  const convexUpdate = useConvexMutation(api.leads.updateLead as any);
  const convexConvert = useConvexMutation(api.leads.convertToClient as any);
  const convexIntakeLink = useConvexMutation(api.leads.generateIntakeLink as any);
  const convexSubmitIntake = useConvexMutation(api.leads.submitIntake as any);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });

  const createLead = useMutation({
    mutationFn: async (data: any) => {
      try {
        if (backend === "convex") return await convexCreate(data);
        // Public website / chatbot captures go through the public firm endpoint.
        return await apiClient.request("/api/v1/public/leads", { method: "POST", body: data });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const updateLead = useMutation({
    mutationFn: async (args: {
      leadId: string;
      status?: string;
      assignedTo?: string | null;
      notes?: string;
    }) => {
      try {
        const { leadId, ...rest } = args;
        if (backend === "convex") return await convexUpdate({ leadId, ...rest });
        return await apiClient.request(`/api/v1/leads/${leadId}`, {
          method: "PATCH",
          body: rest,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const convertToClient = useMutation({
    mutationFn: async (args: {
      leadId: string;
      type?: "individual" | "corporate";
      companyName?: string;
    }) => {
      try {
        if (backend === "convex") return await convexConvert(args as any);
        return await apiClient.request(`/api/v1/leads/${args.leadId}/convert`, {
          method: "POST",
          body: { type: args.type ?? "individual", companyName: args.companyName },
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });

  const generateIntakeLink = useMutation({
    mutationFn: async (args: { leadId: string }) => {
      try {
        if (backend === "convex") {
          const result = await convexIntakeLink({ leadId: args.leadId });
          return typeof result === "string" ? result : result?.token;
        }
        const result = await apiClient.request<{ token: string; url: string }>(
          `/api/v1/leads/${args.leadId}/intake-link`,
          { method: "POST", body: {} },
        );
        return result.token;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const submitIntake = useMutation({
    mutationFn: async (args: {
      token: string;
      fullName: string;
      phone: string;
      email?: string;
      address?: string;
      citizenshipNo?: string;
      practiceArea?: string;
      caseDescription?: string;
      documentStorageIds?: string[];
    }) => {
      try {
        const { token, ...payload } = args;
        if (backend === "convex") return await convexSubmitIntake(args as any);
        return await apiClient.request(`/api/v1/public/leads/intake/${encodeURIComponent(token)}`, {
          method: "POST",
          body: payload,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  });

  return { createLead, updateLead, convertToClient, generateIntakeLink, submitIntake };
}

export function useIntakeByToken(token: string | null) {
  const backend = useDomainBackend("leads");
  const convex = useConvexQuery(
    api.leads.getIntakeByToken as any,
    backend === "convex" && token ? { token } : "skip",
  );
  const next = useQuery({
    queryKey: ["crm", "intake", token],
    queryFn: async ({ signal }) => {
      try {
        return await apiClient.request<{ lead: any }>(
          `/api/v1/public/leads/intake/${encodeURIComponent(token!)}`,
          { signal },
        );
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: backend === "next" && !!token,
  });

  const convexData =
    convex === undefined
      ? undefined
      : convex === null
        ? null
        : (convex as any)?.lead
          ? (convex as any)
          : { lead: convex };

  return {
    data: backend === "convex" ? convexData : next.data,
    isLoading: backend === "next" ? next.isLoading : convex === undefined,
  };
}

export function useAppointments(filters?: { status?: string; assignedLawyerId?: string }) {
  const backend = useDomainBackend("appointments");
  const convex = useConvexQuery(
    api.appointments.listAppointments,
    backend === "convex" ? ((filters || {}) as any) : "skip",
  );
  const next = useQuery({
    queryKey: queryKeys.crm.appointments(filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/appointments", { query: { ...filters }, signal }),
    enabled: backend === "next",
  });
  return {
    data: (backend === "convex" ? convex : next.data) ?? [],
    isLoading: backend === "next" ? next.isLoading : convex === undefined,
  };
}

export function useAvailableSlots(date?: string, assignedLawyerId?: string) {
  const backend = useDomainBackend("appointments");
  const convex = useConvexQuery(
    api.appointments.listAvailableSlots,
    backend === "convex" && date
      ? ({ date, assignedLawyerId } as any)
      : "skip",
  );
  const next = useQuery({
    queryKey: queryKeys.crm.availableSlots(date!),
    queryFn: ({ signal }) =>
      apiClient.request<string[]>("/api/v1/appointments/slots", {
        query: { date, assignedLawyerId },
        signal,
      }),
    enabled: backend === "next" && !!date,
  });
  return {
    data: (backend === "convex" ? convex : next.data) ?? [],
    isLoading: backend === "next" ? next.isLoading : convex === undefined,
  };
}

export function useAppointmentCommands() {
  const backend = useDomainBackend("appointments");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.appointments.createAppointment as any);
  const convexBook = useConvexMutation(api.appointments.bookConsultation as any);
  const convexStatus = useConvexMutation(api.appointments.updateAppointmentStatus as any);
  const convexAssign = useConvexMutation(api.appointments.assignLawyerToAppointment as any);
  const convexReschedule = useConvexMutation(api.appointments.rescheduleAppointment as any);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });

  const createAppointment = useMutation({
    mutationFn: async (data: any) => {
      try {
        if (backend === "convex") return await convexCreate(data);
        try {
          return await apiClient.request("/api/v1/appointments", { method: "POST", body: data });
        } catch (error) {
          if (error instanceof ApiClientError && error.status === 401) {
            return await apiClient.request("/api/v1/public/appointments", {
              method: "POST",
              body: data,
            });
          }
          throw error;
        }
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const bookConsultation = useMutation({
    mutationFn: async (data: any) => {
      try {
        if (backend === "convex") return await convexBook(data);
        return await apiClient.request("/api/v1/appointments/book", { method: "POST", body: data });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: async (args: {
      appointmentId: string;
      status: string;
      meetingLink?: string;
    }) => {
      try {
        const { appointmentId, ...rest } = args;
        if (backend === "convex") {
          return await convexStatus({ id: appointmentId, ...rest });
        }
        return await apiClient.request(`/api/v1/appointments/${appointmentId}/status`, {
          method: "PATCH",
          body: rest,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const assignLawyer = useMutation({
    mutationFn: async (args: { appointmentId: string; lawyerId: string }) => {
      try {
        if (backend === "convex") {
          return await convexAssign({
            id: args.appointmentId,
            assignedLawyerId: args.lawyerId,
          });
        }
        return await apiClient.request(`/api/v1/appointments/${args.appointmentId}/assign`, {
          method: "POST",
          body: { assignedLawyerId: args.lawyerId },
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const rescheduleAppointment = useMutation({
    mutationFn: async (args: { appointmentId: string; date: string; timeSlot: string }) => {
      try {
        const { appointmentId, ...rest } = args;
        if (backend === "convex") {
          return await convexReschedule({ id: appointmentId, ...rest });
        }
        return await apiClient.request(`/api/v1/appointments/${appointmentId}/reschedule`, {
          method: "POST",
          body: rest,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  return { createAppointment, bookConsultation, updateStatus, assignLawyer, rescheduleAppointment };
}
