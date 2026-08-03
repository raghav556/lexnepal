/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDomainBackend } from "@/client/data/provider";
import { api } from "@/convex/_generated/api.js";
// @ts-ignore
import { useConvex } from "convex/react";
import { queryKeys } from "./query-keys";

// --- Leads ---

export function useLeads(filters?: { status?: string; assignedTo?: string }) {
  const backend = useDomainBackend("leads");
  const convex = useConvex();

  return useQuery({
    queryKey: queryKeys.crm.leads(filters),
    queryFn: async () => {
      if (backend === "convex") {
        return await convex.query(api.leads.listLeads, filters || {});
      } else {
        const params = new URLSearchParams();
        if (filters?.status) params.set("status", filters.status);
        if (filters?.assignedTo) params.set("assignedTo", filters.assignedTo);
        const res = await fetch(`/api/crm/leads?${params}`);
        if (!res.ok) throw new Error("Failed to fetch leads");
        return res.json();
      }
    },
  });
}

export function useLeadCommands() {
  const backend = useDomainBackend("leads");
  const convex = useConvex();
  const queryClient = useQueryClient();

  const createLead = useMutation({
    mutationFn: async (data: any) => {
      if (backend === "convex") {
        return await convex.mutation(api.leads.createLead, data);
      } else {
        const res = await fetch("/api/crm/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to create lead");
        return res.json();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.crm.all }),
  });

  const updateLead = useMutation({
    mutationFn: async (args: { leadId: string; status?: string; assignedTo?: string; notes?: string }) => {
      if (backend === "convex") {
        const { leadId, ...rest } = args;
        return await convex.mutation(api.leads.updateLead, { leadId: leadId as any, ...rest });
      } else {
        const { leadId, ...data } = args;
        const res = await fetch(`/api/crm/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update lead");
        return res.json();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.crm.all }),
  });

  const convertToClient = useMutation({
    mutationFn: async (args: { leadId: string }) => {
      if (backend === "convex") {
        return await convex.mutation(api.leads.convertToClient, { leadId: args.leadId as any });
      } else {
        const res = await fetch(`/api/crm/leads/${args.leadId}/convert`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to convert lead to client");
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });

  const generateIntakeLink = useMutation({
    mutationFn: async (args: { leadId: string }) => {
      if (backend === "convex") {
        return await convex.mutation(api.leads.generateIntakeLink as any, { leadId: args.leadId as any });
      } else {
        const res = await fetch(`/api/crm/leads/${args.leadId}/intake-link`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to generate intake link");
        return res.json();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.crm.all }),
  });
  
  const submitIntake = useMutation({
    mutationFn: async (args: { token: string; payload: any }) => {
      if (backend === "convex") {
        return await convex.mutation(api.leads.submitIntake as any, args);
      } else {
        const res = await fetch(`/api/crm/leads/intake/${args.token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args.payload),
        });
        if (!res.ok) throw new Error("Failed to submit intake form");
        return res.json();
      }
    }
  });

  return { createLead, updateLead, convertToClient, generateIntakeLink, submitIntake };
}

export function useIntakeByToken(token: string | null) {
  const backend = useDomainBackend("leads");
  const convex = useConvex();

  return useQuery({
    queryKey: ["crm", "intake", token],
    queryFn: async () => {
      if (backend === "convex") {
        return await convex.query(api.leads.getIntakeByToken as any, { token: token! });
      } else {
        const res = await fetch(`/api/crm/leads/intake/${token}`);
        if (!res.ok) throw new Error("Failed to fetch intake token");
        return res.json();
      }
    },
    enabled: !!token,
  });
}

// --- Appointments ---

export function useAppointments(filters?: { status?: string; assignedLawyerId?: string }) {
  const backend = useDomainBackend("appointments");
  const convex = useConvex();

  return useQuery({
    queryKey: queryKeys.crm.appointments(filters),
    queryFn: async () => {
      if (backend === "convex") {
        return await convex.query(api.appointments.listAppointments, filters || {});
      } else {
        const params = new URLSearchParams();
        if (filters?.status) params.set("status", filters.status);
        if (filters?.assignedLawyerId) params.set("assignedLawyerId", filters.assignedLawyerId);
        const res = await fetch(`/api/crm/appointments?${params}`);
        if (!res.ok) throw new Error("Failed to fetch appointments");
        return res.json();
      }
    },
  });
}

export function useAvailableSlots(date?: string) {
  const backend = useDomainBackend("appointments");
  const convex = useConvex();

  return useQuery({
    queryKey: queryKeys.crm.availableSlots(date!),
    queryFn: async () => {
      if (backend === "convex") {
        return await convex.query(api.appointments.listAvailableSlots, { date: date! });
      } else {
        const res = await fetch(`/api/crm/appointments/slots?date=${date}`);
        if (!res.ok) throw new Error("Failed to fetch slots");
        return res.json();
      }
    },
    enabled: !!date,
  });
}

export function useAppointmentCommands() {
  const backend = useDomainBackend("appointments");
  const convex = useConvex();
  const queryClient = useQueryClient();

  const createAppointment = useMutation({
    mutationFn: async (data: any) => {
      if (backend === "convex") {
        return await convex.mutation(api.appointments.createAppointment, data);
      } else {
        const res = await fetch("/api/crm/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to create appointment");
        return res.json();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.crm.all }),
  });

  const bookConsultation = useMutation({
    mutationFn: async (data: { date: string; timeSlot: string; practiceArea: string; notes?: string }) => {
      if (backend === "convex") {
        return await convex.mutation(api.appointments.bookConsultation, data);
      } else {
        const res = await fetch("/api/crm/appointments/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to book consultation");
        return res.json();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.crm.all }),
  });

  const updateStatus = useMutation({
    mutationFn: async (args: { appointmentId: string; status: string; meetingLink?: string }) => {
      if (backend === "convex") {
        const { appointmentId, ...rest } = args;
        return await convex.mutation(api.appointments.updateAppointmentStatus, { appointmentId: appointmentId as any, ...rest });
      } else {
        const { appointmentId, ...data } = args;
        const res = await fetch(`/api/crm/appointments/${appointmentId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update status");
        return res.json();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.crm.all }),
  });

  const assignLawyer = useMutation({
    mutationFn: async (args: { appointmentId: string; lawyerId: string }) => {
      if (backend === "convex") {
        return await convex.mutation(api.appointments.assignLawyerToAppointment, { 
          appointmentId: args.appointmentId as any, 
          lawyerId: args.lawyerId as any 
        });
      } else {
        const res = await fetch(`/api/crm/appointments/${args.appointmentId}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lawyerId: args.lawyerId }),
        });
        if (!res.ok) throw new Error("Failed to assign lawyer");
        return res.json();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.crm.all }),
  });

  const rescheduleAppointment = useMutation({
    mutationFn: async (args: { appointmentId: string; date: string; timeSlot: string }) => {
      if (backend === "convex") {
        const { appointmentId, ...rest } = args;
        return await convex.mutation(api.appointments.rescheduleAppointment, { appointmentId: appointmentId as any, ...rest });
      } else {
        const { appointmentId, ...data } = args;
        const res = await fetch(`/api/crm/appointments/${appointmentId}/reschedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to reschedule");
        return res.json();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.crm.all }),
  });

  return { createAppointment, bookConsultation, updateStatus, assignLawyer, rescheduleAppointment };
}
