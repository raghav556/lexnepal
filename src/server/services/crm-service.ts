import "server-only";
import type { AuditContext } from "@/server/audit/context";
import type { AuthPrincipal } from "@/server/auth/types";
import { getServerEnvironment } from "@/server/env";
import { requireCapability, requireFirmContext } from "@/server/policies/authorization";
import { CrmRepository } from "@/server/repositories/crm-repository";
import { MySqlIdentityRepository } from "@/server/repositories/identity-repository";
import {
  notifyAppointmentAssigned,
  notifyAppointmentBooked,
  notifyAppointmentClientStatus,
  notifyAppointmentRescheduled,
  notifyIntakeSubmitted,
  notifyLeadAssigned,
  notifyPublicLeadCreated,
} from "@/server/services/crm-notifications";
import { DEFAULT_APPOINTMENT_SLOTS } from "@/shared/crm/appointment-slots";
import type {
  AppointmentAssignInput,
  AppointmentBookInput,
  AppointmentCreateInput,
  AppointmentListInput,
  AppointmentRescheduleInput,
  AppointmentSlotsInput,
  AppointmentStatusUpdateInput,
  IntakeSubmitInput,
  LeadConvertInput,
  LeadCreateInput,
  LeadListInput,
  LeadUpdateInput,
} from "@/shared/contracts/crm";
import { AppError } from "@/shared/errors/api-error";

const repository = new CrmRepository();
const identityRepository = new MySqlIdentityRepository();

const CANON_SLOTS = new Set<string>(DEFAULT_APPOINTMENT_SLOTS);

function requireStaff(principal: AuthPrincipal) {
  if (principal.user.role === "client") {
    throw new AppError("FORBIDDEN", "Clients cannot manage firm CRM records", 403);
  }
}

function requireCrmManager(principal: AuthPrincipal) {
  requireStaff(principal);
  requireCapability(principal, "clients.manage");
}

function canManageAllLeads(principal: AuthPrincipal) {
  return principal.capabilities.has("clients.manage");
}

function assertCanonTimeSlot(timeSlot: string) {
  if (!CANON_SLOTS.has(timeSlot)) {
    throw new AppError(
      "VALIDATION_FAILED",
      `Invalid time slot. Allowed: ${DEFAULT_APPOINTMENT_SLOTS.join(", ")}`,
      400,
    );
  }
}

/** Non-managers only see / mutate leads assigned to themselves (HR-style scoping). */
function scopedLeadListFilters(principal: AuthPrincipal, filters: LeadListInput): LeadListInput {
  if (canManageAllLeads(principal)) return filters;
  return { ...filters, assignedTo: principal.user.id };
}

function assertLeadAssigneeAccess(principal: AuthPrincipal, lead: { assignedTo?: unknown }) {
  if (canManageAllLeads(principal)) return;
  if (lead.assignedTo !== principal.user.id) {
    throw new AppError("FORBIDDEN", "You can only access leads assigned to you", 403);
  }
}

function scopedAppointmentListFilters(
  principal: AuthPrincipal,
  filters: AppointmentListInput,
): AppointmentListInput {
  if (canManageAllLeads(principal)) return filters;
  return { ...filters, assignedLawyerId: principal.user.id };
}

export class CrmService {
  async publicFirmId() {
    const slug = getServerEnvironment().PUBLIC_FIRM_SLUG;
    const firmId = await repository.resolveFirmIdBySlug(slug);
    if (!firmId) {
      throw new AppError("SERVICE_UNAVAILABLE", "Public website firm is not configured", 503);
    }
    return firmId;
  }

  async listLeads(principal: AuthPrincipal, filters: LeadListInput) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.listLeads(firmId, scopedLeadListFilters(principal, filters));
  }

  async createLeadPublic(input: LeadCreateInput) {
    const firmId = await this.publicFirmId();
    const lead = await repository.createLead(firmId, input);
    await notifyPublicLeadCreated({
      firmId,
      lead: {
        id: String(lead.id ?? lead._id),
        fullName: String(lead.fullName),
        source: String(lead.source),
        assignedTo: (lead.assignedTo as string | null | undefined) ?? null,
        practiceAreaInterest: (lead.practiceAreaInterest as string | null | undefined) ?? null,
      },
    });
    return lead;
  }

  async createLead(principal: AuthPrincipal, input: LeadCreateInput, audit: AuditContext) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    const payload = canManageAllLeads(principal)
      ? input
      : { ...input, assignedTo: principal.user.id };
    return repository.createLead(firmId, payload, audit);
  }

  async updateLead(
    principal: AuthPrincipal,
    leadId: string,
    input: LeadUpdateInput,
    audit: AuditContext,
  ) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    const previous = await repository.getLead(firmId, leadId);
    assertLeadAssigneeAccess(principal, { assignedTo: previous.assignedTo });

    let patch = input;
    if (!canManageAllLeads(principal)) {
      // Assignees may update status/notes only — not reassign the lead.
      if (input.assignedTo !== undefined && input.assignedTo !== principal.user.id) {
        throw new AppError("FORBIDDEN", "You cannot reassign leads", 403);
      }
      const { assignedTo: _ignored, ...rest } = input;
      patch = rest;
    }

    const updated = await repository.updateLead(firmId, leadId, patch, audit);
    if (
      canManageAllLeads(principal) &&
      input.assignedTo !== undefined &&
      input.assignedTo &&
      input.assignedTo !== previous.assignedTo
    ) {
      await notifyLeadAssigned({
        firmId,
        actorUserId: principal.user.id,
        lead: {
          id: leadId,
          fullName: String(updated.fullName ?? previous.fullName),
        },
        assignedTo: input.assignedTo,
      });
    }
    return updated;
  }

  async convertToClient(
    principal: AuthPrincipal,
    leadId: string,
    input: LeadConvertInput,
    audit: AuditContext,
  ) {
    requireCrmManager(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.convertToClient(firmId, leadId, input, audit);
  }

  async generateIntakeLink(principal: AuthPrincipal, leadId: string, audit: AuditContext) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    const lead = await repository.getLead(firmId, leadId);
    assertLeadAssigneeAccess(principal, { assignedTo: lead.assignedTo });
    return repository.generateIntakeLink(firmId, leadId, audit);
  }

  async getIntakeByToken(token: string) {
    return repository.getIntakeByToken(token);
  }

  async submitIntake(token: string, input: IntakeSubmitInput) {
    const result = await repository.submitIntake(token, input);
    await notifyIntakeSubmitted({
      firmId: result.firmId,
      lead: {
        id: result.leadId,
        fullName: result.fullName,
        assignedTo: result.assignedTo,
      },
    });
    return {
      success: result.success,
      leadId: result.leadId,
      _id: result._id,
    };
  }

  async listAppointments(principal: AuthPrincipal, filters: AppointmentListInput) {
    const { firmId } = requireFirmContext(principal);

    if (principal.user.role === "client") {
      const linked = await repository.getClientLinkForUser(firmId, principal.user.id);
      if (!linked) return [];
      return repository.listAppointments(firmId, {
        status: filters.status,
        clientId: linked.id,
        clientEmail: linked.email,
      });
    }

    requireStaff(principal);
    return repository.listAppointments(firmId, scopedAppointmentListFilters(principal, filters));
  }

  async listAvailableSlots(input: AppointmentSlotsInput, principal?: AuthPrincipal | null) {
    const firmId = principal?.firmId
      ? requireFirmContext(principal).firmId
      : await this.publicFirmId();
    return repository.listAvailableSlots(firmId, input);
  }

  async createAppointmentPublic(input: AppointmentCreateInput) {
    const firmId = await this.publicFirmId();
    const settings = await identityRepository.getSettings(firmId);
    if (!settings.onlineBookingEnabled) {
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Online appointment booking is currently disabled",
        503,
      );
    }
    assertCanonTimeSlot(input.timeSlot);
    const created = await repository.createAppointment(firmId, input);
    await notifyAppointmentBooked({
      firmId,
      source: "public",
      appointment: {
        id: String(created.id ?? created._id),
        clientName: String(created.clientName),
        clientEmail: (created.clientEmail as string | null | undefined) ?? null,
        practiceArea: (created.practiceArea as string | null | undefined) ?? null,
        date: String(created.date),
        timeSlot: String(created.timeSlot),
        assignedLawyerId: (created.assignedLawyerId as string | null | undefined) ?? null,
      },
    });
    return created;
  }

  async createAppointment(
    principal: AuthPrincipal,
    input: AppointmentCreateInput,
    audit: AuditContext,
  ) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    assertCanonTimeSlot(input.timeSlot);
    return repository.createAppointment(firmId, input, audit);
  }

  async bookConsultation(
    principal: AuthPrincipal,
    input: AppointmentBookInput,
    audit: AuditContext,
  ) {
    const { firmId } = requireFirmContext(principal);
    assertCanonTimeSlot(input.timeSlot);
    const created = await repository.bookConsultation(firmId, input, audit);
    if (principal.user.role === "client") {
      await notifyAppointmentBooked({
        firmId,
        source: "client",
        actorUserId: principal.user.id,
        appointment: {
          id: String(created.id ?? created._id),
          clientName: String(created.clientName),
          clientEmail: (created.clientEmail as string | null | undefined) ?? null,
          practiceArea: (created.practiceArea as string | null | undefined) ?? null,
          date: String(created.date),
          timeSlot: String(created.timeSlot),
          assignedLawyerId: (created.assignedLawyerId as string | null | undefined) ?? null,
        },
      });
    }
    return created;
  }

  async updateAppointmentStatus(
    principal: AuthPrincipal,
    appointmentId: string,
    input: AppointmentStatusUpdateInput,
    audit: AuditContext,
  ) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    const previous = await repository.getAppointment(firmId, appointmentId);
    const updated = await repository.updateAppointmentStatus(firmId, appointmentId, input, audit);
    const prevStatus = String(previous.status ?? "");
    if (
      prevStatus !== input.status &&
      (input.status === "confirmed" || input.status === "cancelled")
    ) {
      await notifyAppointmentClientStatus({
        firmId,
        actorUserId: principal.user.id,
        status: input.status,
        appointment: {
          id: appointmentId,
          clientName: String(previous.clientName),
          clientEmail: (previous.clientEmail as string | null | undefined) ?? null,
          practiceArea: (previous.practiceArea as string | null | undefined) ?? null,
          date: String(previous.date),
          timeSlot: String(previous.timeSlot),
          meetingLink:
            (input.meetingLink as string | null | undefined) ??
            (previous.meetingLink as string | null | undefined) ??
            null,
        },
      });
    }
    return updated;
  }

  async assignLawyer(
    principal: AuthPrincipal,
    appointmentId: string,
    input: AppointmentAssignInput,
    audit: AuditContext,
  ) {
    requireCrmManager(principal);
    const { firmId } = requireFirmContext(principal);
    const previous = await repository.getAppointment(firmId, appointmentId);
    const updated = await repository.assignLawyer(firmId, appointmentId, input, audit);
    if (input.assignedLawyerId !== previous.assignedLawyerId) {
      await notifyAppointmentAssigned({
        firmId,
        actorUserId: principal.user.id,
        assignedLawyerId: input.assignedLawyerId,
        appointment: {
          id: appointmentId,
          clientName: String(previous.clientName),
          clientEmail: (previous.clientEmail as string | null | undefined) ?? null,
          practiceArea: (previous.practiceArea as string | null | undefined) ?? null,
          date: String(previous.date),
          timeSlot: String(previous.timeSlot),
          assignedLawyerId: input.assignedLawyerId,
        },
      });
    }
    return updated;
  }

  async rescheduleAppointment(
    principal: AuthPrincipal,
    appointmentId: string,
    input: AppointmentRescheduleInput,
    audit: AuditContext,
  ) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    assertCanonTimeSlot(input.timeSlot);
    const previous = await repository.getAppointment(firmId, appointmentId);
    const updated = await repository.rescheduleAppointment(firmId, appointmentId, input, audit);
    const prevDate = String(previous.date);
    const prevSlot = String(previous.timeSlot);
    if (prevDate !== input.date || prevSlot !== input.timeSlot) {
      await notifyAppointmentRescheduled({
        firmId,
        actorUserId: principal.user.id,
        previousDate: prevDate,
        previousTimeSlot: prevSlot,
        appointment: {
          id: appointmentId,
          clientName: String(previous.clientName),
          clientEmail: (previous.clientEmail as string | null | undefined) ?? null,
          practiceArea: (previous.practiceArea as string | null | undefined) ?? null,
          date: input.date,
          timeSlot: input.timeSlot,
        },
      });
    }
    return updated;
  }
}

let service: CrmService | undefined;
export function getCrmService() {
  service ??= new CrmService();
  return service;
}
