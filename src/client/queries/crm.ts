/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { ApiClientError, normalizeApiError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";

export function useLeads(filters?: {
  status?: string;
  assignedTo?: string;
  source?: string;
  q?: string;
}) {
  const query = Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== ""),
  );
  const next = useQuery({
    queryKey: queryKeys.crm.leads(query),
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/leads", { query, signal }),
  });
  return { data: next.data ?? [], isLoading: next.isLoading };
}

export function useLeadCommands() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });

  const createLead = useMutation({
    mutationFn: async (data: any) => {
      try {
        return await apiClient.request("/api/v1/leads", { method: "POST", body: data });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const createPublicLead = useMutation({
    mutationFn: async (data: any) => {
      try {
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
        return await apiClient.request(`/api/v1/leads/${leadId}`, { method: "PATCH", body: rest });
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
        return await apiClient.request(`/api/v1/public/leads/intake/${encodeURIComponent(token)}`, {
          method: "POST",
          body: payload,
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  });

  return {
    createLead,
    createPublicLead,
    updateLead,
    convertToClient,
    generateIntakeLink,
    submitIntake,
  };
}

export function useIntakeByToken(token: string | null) {
  const next = useQuery({
    queryKey: ["crm", "intake", token],
    queryFn: async ({ signal }) => {
      try {
        return await apiClient.request<{ lead: any }>(
          `/api/v1/public/leads/intake/${encodeURIComponent(token!)}`,
          { signal },
        );
      } catch (error) {
        // An unknown or expired token is a normal "no intake here" answer, not a failure.
        if (error instanceof ApiClientError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: !!token,
  });
  return { data: next.data, isLoading: next.isLoading };
}

export function useAppointments(filters?: {
  status?: string;
  assignedLawyerId?: string;
  leadId?: string;
}) {
  const query = Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== ""),
  );
  const next = useQuery({
    queryKey: queryKeys.crm.appointments(query),
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/appointments", { query, signal }),
  });
  return {
    data: next.data ?? [],
    isLoading: next.isLoading,
    isError: next.isError,
    error: next.error,
  };
}

export function useAvailableSlots(date?: string, assignedLawyerId?: string) {
  const next = useQuery({
    queryKey: queryKeys.crm.availableSlots(date!, assignedLawyerId),
    queryFn: ({ signal }) =>
      apiClient.request<string[]>("/api/v1/appointments/slots", {
        query: { date, assignedLawyerId },
        signal,
      }),
    enabled: !!date,
  });
  return { data: next.data ?? [], isLoading: next.isLoading };
}

export function useAppointmentCommands() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });

  const createAppointment = useMutation({
    mutationFn: async (data: any) => {
      try {
        try {
          return await apiClient.request("/api/v1/appointments", { method: "POST", body: data });
        } catch (error) {
          // The same form serves signed-in staff and anonymous website visitors.
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
        return await apiClient.request("/api/v1/appointments/book", { method: "POST", body: data });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: async (args: { appointmentId: string; status: string; meetingLink?: string }) => {
      try {
        const { appointmentId, ...rest } = args;
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
