import "server-only";
import type { AuditContext } from "@/server/audit/context";
import type { AuthPrincipal } from "@/server/auth/types";
import { getServerEnvironment } from "@/server/env";
import {
  requireCapability,
  requireFirmContext,
} from "@/server/policies/authorization";
import { CrmRepository } from "@/server/repositories/crm-repository";
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

function requireStaff(principal: AuthPrincipal) {
  if (principal.user.role === "client") {
    throw new AppError("FORBIDDEN", "Clients cannot manage firm CRM records", 403);
  }
}

function requireCrmManager(principal: AuthPrincipal) {
  requireStaff(principal);
  requireCapability(principal, "clients.manage");
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
    return repository.listLeads(firmId, filters);
  }

  async createLeadPublic(input: LeadCreateInput) {
    return repository.createLead(await this.publicFirmId(), input);
  }

  async createLead(principal: AuthPrincipal, input: LeadCreateInput, audit: AuditContext) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.createLead(firmId, input, audit);
  }

  async updateLead(
    principal: AuthPrincipal,
    leadId: string,
    input: LeadUpdateInput,
    audit: AuditContext,
  ) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.updateLead(firmId, leadId, input, audit);
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
    return repository.generateIntakeLink(firmId, leadId, audit);
  }

  async getIntakeByToken(token: string) {
    return repository.getIntakeByToken(token);
  }

  async submitIntake(token: string, input: IntakeSubmitInput) {
    return repository.submitIntake(token, input);
  }

  async listAppointments(principal: AuthPrincipal, filters: AppointmentListInput) {
    const { firmId } = requireFirmContext(principal);
    // Booking page (clients) and staff calendars share this list; clients filter client-side.
    if (principal.user.role !== "client") requireStaff(principal);
    return repository.listAppointments(firmId, filters);
  }

  async listAvailableSlots(input: AppointmentSlotsInput, principal?: AuthPrincipal | null) {
    const firmId = principal?.firmId
      ? requireFirmContext(principal).firmId
      : await this.publicFirmId();
    return repository.listAvailableSlots(firmId, input);
  }

  async createAppointmentPublic(input: AppointmentCreateInput) {
    return repository.createAppointment(await this.publicFirmId(), input);
  }

  async createAppointment(
    principal: AuthPrincipal,
    input: AppointmentCreateInput,
    audit: AuditContext,
  ) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.createAppointment(firmId, input, audit);
  }

  async bookConsultation(
    principal: AuthPrincipal,
    input: AppointmentBookInput,
    audit: AuditContext,
  ) {
    const { firmId } = requireFirmContext(principal);
    return repository.bookConsultation(firmId, input, audit);
  }

  async updateAppointmentStatus(
    principal: AuthPrincipal,
    appointmentId: string,
    input: AppointmentStatusUpdateInput,
    audit: AuditContext,
  ) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.updateAppointmentStatus(firmId, appointmentId, input, audit);
  }

  async assignLawyer(
    principal: AuthPrincipal,
    appointmentId: string,
    input: AppointmentAssignInput,
    audit: AuditContext,
  ) {
    requireCrmManager(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.assignLawyer(firmId, appointmentId, input, audit);
  }

  async rescheduleAppointment(
    principal: AuthPrincipal,
    appointmentId: string,
    input: AppointmentRescheduleInput,
    audit: AuditContext,
  ) {
    requireStaff(principal);
    const { firmId } = requireFirmContext(principal);
    return repository.rescheduleAppointment(firmId, appointmentId, input, audit);
  }
}

let service: CrmService | undefined;
export function getCrmService() {
  service ??= new CrmService();
  return service;
}
