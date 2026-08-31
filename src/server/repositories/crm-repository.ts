import "server-only";
import { and, asc, eq, ilike, isNull, ne, or, type SQL } from "drizzle-orm";
import type { AuditContext } from "@/server/audit/context";
import { getDatabase } from "@/server/db/client";
import { appointments, auditLog, clients, firms, leads } from "@/server/db/schema";
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
import { DEFAULT_APPOINTMENT_SLOTS } from "@/shared/crm/appointment-slots";
import { AppError } from "@/shared/errors/api-error";

const database = getDatabase();

export { DEFAULT_APPOINTMENT_SLOTS };
function toDto<T extends Record<string, unknown>>(row: T): T & { _id: string } {
  const output: Record<string, unknown> = { ...row, _id: row.id };
  for (const [key, value] of Object.entries(output)) {
    if (value instanceof Date) {
      output[key] = key === "date" ? value.toISOString().slice(0, 10) : value.toISOString();
    }
  }
  if (typeof output.date === "string" && output.date.length > 10) {
    output.date = output.date.slice(0, 10);
  }
  delete output.firmId;
  delete output.legacyConvexId;
  delete output.deletedAt;
  return output as T & { _id: string };
}

async function writeAudit(
  tx: Parameters<Parameters<typeof database.transaction>[0]>[0],
  audit: AuditContext,
  action: string,
  resource: string,
  resourceId: string,
  details?: string,
) {
  await tx.insert(auditLog).values({
    firmId: audit.firmId,
    userId: audit.actorId,
    action,
    resource,
    resourceId,
    details: details ?? null,
    ipAddress: audit.ipAddress,
    requestId: audit.requestId,
  });
}

export class CrmRepository {
  async resolveFirmIdBySlug(slug: string): Promise<string | null> {
    const [row] = await database
      .select({ id: firms.id })
      .from(firms)
      .where(eq(firms.slug, slug))
      .limit(1);
    return row?.id ?? null;
  }

  async listLeads(firmId: string, filters: LeadListInput = {}) {
    const conditions: SQL[] = [eq(leads.firmId, firmId), isNull(leads.deletedAt)];
    if (filters.status) conditions.push(eq(leads.status, filters.status));
    if (filters.assignedTo) conditions.push(eq(leads.assignedTo, filters.assignedTo));
    if (filters.source) conditions.push(eq(leads.source, filters.source));
    if (filters.q) {
      const pattern = `%${filters.q}%`;
      conditions.push(
        or(
          ilike(leads.fullName, pattern),
          ilike(leads.email, pattern),
          ilike(leads.phone, pattern),
        )!,
      );
    }
    const rows = await database
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(asc(leads.createdAt));
    return rows.map((row) => toDto(row as unknown as Record<string, unknown>));
  }

  async getLead(firmId: string, leadId: string) {
    const [row] = await database
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.firmId, firmId), isNull(leads.deletedAt)))
      .limit(1);
    if (!row) throw new AppError("NOT_FOUND", "Lead was not found", 404);
    return toDto(row as unknown as Record<string, unknown>);
  }

  async createLead(firmId: string, data: LeadCreateInput, audit?: AuditContext) {
    const [row] = await database
      .insert(leads)
      .values({
        firmId,
        fullName: data.fullName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        source: data.source,
        practiceAreaInterest: data.practiceAreaInterest ?? null,
        message: data.message ?? null,
        assignedTo: data.assignedTo ?? null,
        notes: data.notes ?? null,
        resourceId: data.resourceId ?? null,
        status: "new",
      })
      .returning();
    if (!row) throw new AppError("INTERNAL_ERROR", "Failed to create lead", 500);
    if (audit) {
      await database.insert(auditLog).values({
        firmId: audit.firmId,
        userId: audit.actorId,
        action: "lead.created",
        resource: "leads",
        resourceId: row.id,
        details: data.source,
        ipAddress: audit.ipAddress,
        requestId: audit.requestId,
      });
    }
    return toDto(row as unknown as Record<string, unknown>);
  }

  async updateLead(firmId: string, leadId: string, data: LeadUpdateInput, audit: AuditContext) {
    const updates: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
    if (data.status !== undefined) updates.status = data.status;
    if (data.assignedTo !== undefined) updates.assignedTo = data.assignedTo;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [row] = await database
      .update(leads)
      .set(updates)
      .where(and(eq(leads.id, leadId), eq(leads.firmId, firmId), isNull(leads.deletedAt)))
      .returning();
    if (!row) throw new AppError("NOT_FOUND", "Lead was not found", 404);
    await database.insert(auditLog).values({
      firmId: audit.firmId,
      userId: audit.actorId,
      action: "lead.updated",
      resource: "leads",
      resourceId: leadId,
      ipAddress: audit.ipAddress,
      requestId: audit.requestId,
    });
    return toDto(row as unknown as Record<string, unknown>);
  }

  async convertToClient(
    firmId: string,
    leadId: string,
    input: LeadConvertInput,
    audit: AuditContext,
  ) {
    return database.transaction(async (tx) => {
      const [lead] = await tx
        .select()
        .from(leads)
        .where(and(eq(leads.id, leadId), eq(leads.firmId, firmId), isNull(leads.deletedAt)));
      if (!lead) throw new AppError("NOT_FOUND", "Lead was not found", 404);
      if (lead.convertedClientId) {
        throw new AppError("CONFLICT", "Lead already converted", 409);
      }

      const [client] = await tx
        .insert(clients)
        .values({
          firmId,
          type: input.type,
          fullName: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          companyName: input.type === "corporate" ? (input.companyName ?? null) : null,
          kycStatus: "pending",
          isActive: true,
          notes: "Converted from lead",
        })
        .returning();
      if (!client) throw new AppError("INTERNAL_ERROR", "Failed to create client", 500);

      await tx
        .update(leads)
        .set({
          status: "converted",
          convertedClientId: client.id,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, leadId));

      await writeAudit(tx, audit, "lead.converted", "leads", leadId, client.id);
      return { clientId: client.id, _id: client.id };
    });
  }

  async generateIntakeLink(firmId: string, leadId: string, audit: AuditContext) {
    const token = `intake_${crypto.randomUUID().replace(/-/g, "")}`;
    const [row] = await database
      .update(leads)
      .set({ intakeToken: token, intakeSubmitted: false, updatedAt: new Date() })
      .where(and(eq(leads.id, leadId), eq(leads.firmId, firmId), isNull(leads.deletedAt)))
      .returning();
    if (!row) throw new AppError("NOT_FOUND", "Lead was not found", 404);
    await database.insert(auditLog).values({
      firmId: audit.firmId,
      userId: audit.actorId,
      action: "lead.intake_link",
      resource: "leads",
      resourceId: leadId,
      ipAddress: audit.ipAddress,
      requestId: audit.requestId,
    });
    return { token, url: `/intake/${token}` };
  }

  async getIntakeByToken(token: string) {
    const [lead] = await database
      .select()
      .from(leads)
      .where(and(eq(leads.intakeToken, token), isNull(leads.deletedAt)))
      .limit(1);
    if (!lead) return null;
    return {
      lead: {
        _id: lead.id,
        id: lead.id,
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        practiceAreaInterest: lead.practiceAreaInterest,
        intakeSubmitted: lead.intakeSubmitted ?? false,
      },
    };
  }

  async submitIntake(token: string, payload: IntakeSubmitInput) {
    const [lead] = await database
      .select()
      .from(leads)
      .where(and(eq(leads.intakeToken, token), isNull(leads.deletedAt)))
      .limit(1);
    if (!lead) throw new AppError("NOT_FOUND", "Invalid or expired intake link", 404);
    if (lead.intakeSubmitted) throw new AppError("CONFLICT", "Intake already submitted", 409);

    const notes = [
      lead.notes,
      payload.address ? `Address: ${payload.address}` : null,
      payload.citizenshipNo ? `Citizenship: ${payload.citizenshipNo}` : null,
      payload.documentStorageIds?.length ? `Docs: ${payload.documentStorageIds.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const [row] = await database
      .update(leads)
      .set({
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email ?? lead.email,
        practiceAreaInterest: payload.practiceArea || lead.practiceAreaInterest,
        message: payload.caseDescription || lead.message,
        notes: notes || null,
        intakeSubmitted: true,
        status: "contacted",
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id))
      .returning();

    return {
      success: true as const,
      leadId: row!.id,
      _id: row!.id,
      firmId: lead.firmId,
      fullName: row!.fullName,
      assignedTo: lead.assignedTo,
    };
  }

  async getClientLinkForUser(firmId: string, userId: string) {
    const [row] = await database
      .select({ id: clients.id, email: clients.email })
      .from(clients)
      .where(and(eq(clients.firmId, firmId), eq(clients.userId, userId), isNull(clients.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async getAppointment(firmId: string, appointmentId: string) {
    const [row] = await database
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.firmId, firmId),
          isNull(appointments.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw new AppError("NOT_FOUND", "Appointment was not found", 404);
    return toDto(row as unknown as Record<string, unknown>);
  }

  async listAppointments(firmId: string, filters: AppointmentListInput = {}) {
    const conditions: SQL[] = [eq(appointments.firmId, firmId), isNull(appointments.deletedAt)];
    if (filters.status) conditions.push(eq(appointments.status, filters.status));
    if (filters.assignedLawyerId) {
      conditions.push(eq(appointments.assignedLawyerId, filters.assignedLawyerId));
    }
    if (filters.leadId) conditions.push(eq(appointments.leadId, filters.leadId));
    if (filters.clientId) {
      if (filters.clientEmail) {
        conditions.push(
          or(
            eq(appointments.clientId, filters.clientId),
            and(isNull(appointments.clientId), eq(appointments.clientEmail, filters.clientEmail)),
          )!,
        );
      } else {
        conditions.push(eq(appointments.clientId, filters.clientId));
      }
    }
    const rows = await database
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(asc(appointments.date));
    return rows.map((row) => toDto(row as unknown as Record<string, unknown>));
  }

  async listAvailableSlots(firmId: string, input: AppointmentSlotsInput) {
    const conditions: SQL[] = [
      eq(appointments.firmId, firmId),
      eq(appointments.date, input.date),
      ne(appointments.status, "cancelled"),
      isNull(appointments.deletedAt),
    ];
    if (input.assignedLawyerId) {
      conditions.push(eq(appointments.assignedLawyerId, input.assignedLawyerId));
    }
    const booked = await database
      .select({ timeSlot: appointments.timeSlot })
      .from(appointments)
      .where(and(...conditions));
    const taken = new Set(booked.map((row) => row.timeSlot));
    return DEFAULT_APPOINTMENT_SLOTS.filter((slot) => !taken.has(slot));
  }

  async createAppointment(firmId: string, data: AppointmentCreateInput, audit?: AuditContext) {
    return database.transaction(async (tx) => {
      const leadId = data.leadId ?? null;
      if (leadId) {
        const [lead] = await tx
          .select()
          .from(leads)
          .where(and(eq(leads.id, leadId), eq(leads.firmId, firmId), isNull(leads.deletedAt)))
          .limit(1);
        if (!lead) throw new AppError("NOT_FOUND", "Lead was not found", 404);
        if (lead.status === "converted") {
          throw new AppError(
            "VALIDATION_FAILED",
            "Cannot schedule consultation for a converted lead",
            400,
          );
        }
      }

      const [row] = await tx
        .insert(appointments)
        .values({
          firmId,
          clientName: data.clientName,
          clientEmail: data.clientEmail || null,
          clientPhone: data.clientPhone,
          clientId: data.clientId ?? null,
          leadId,
          practiceArea: data.practiceArea,
          date: data.date,
          timeSlot: data.timeSlot,
          notes: data.notes ?? null,
          assignedLawyerId: data.assignedLawyerId ?? null,
          status: "pending",
        })
        .returning();
      if (!row) throw new AppError("INTERNAL_ERROR", "Failed to create appointment", 500);

      if (leadId) {
        await tx
          .update(leads)
          .set({ status: "consultation_scheduled", updatedAt: new Date() })
          .where(
            and(
              eq(leads.id, leadId),
              eq(leads.firmId, firmId),
              isNull(leads.deletedAt),
              ne(leads.status, "converted"),
              ne(leads.status, "lost"),
            ),
          );
      }

      if (audit) {
        await tx.insert(auditLog).values({
          firmId: audit.firmId,
          userId: audit.actorId,
          action: "appointment.created",
          resource: "appointments",
          resourceId: row.id,
          details: leadId ? `lead:${leadId}` : null,
          ipAddress: audit.ipAddress,
          requestId: audit.requestId,
        });
      }
      return toDto(row as unknown as Record<string, unknown>);
    });
  }

  async bookConsultation(firmId: string, data: AppointmentBookInput, audit: AuditContext) {
    if (data.clientId) {
      const [client] = await database
        .select()
        .from(clients)
        .where(and(eq(clients.id, data.clientId), eq(clients.firmId, firmId)))
        .limit(1);
      if (!client) throw new AppError("NOT_FOUND", "Client was not found", 404);
      return this.createAppointment(
        firmId,
        {
          ...data,
          clientName: data.clientName || client.fullName,
          clientEmail: data.clientEmail ?? client.email,
          clientPhone: data.clientPhone || client.phone || "N/A",
          clientId: client.id,
        },
        audit,
      );
    }
    return this.createAppointment(firmId, data, audit);
  }

  async updateAppointmentStatus(
    firmId: string,
    appointmentId: string,
    input: AppointmentStatusUpdateInput,
    audit: AuditContext,
  ) {
    return database.transaction(async (tx) => {
      const updates: Partial<typeof appointments.$inferInsert> = {
        status: input.status,
        updatedAt: new Date(),
      };
      if (input.meetingLink !== undefined) updates.meetingLink = input.meetingLink;

      const [row] = await tx
        .update(appointments)
        .set(updates)
        .where(
          and(
            eq(appointments.id, appointmentId),
            eq(appointments.firmId, firmId),
            isNull(appointments.deletedAt),
          ),
        )
        .returning();
      if (!row) throw new AppError("NOT_FOUND", "Appointment was not found", 404);

      await writeAudit(tx, audit, "appointment.status", "appointments", row.id, input.status);
      return { success: true as const, ...toDto(row as unknown as Record<string, unknown>) };
    });
  }

  async assignLawyer(
    firmId: string,
    appointmentId: string,
    input: AppointmentAssignInput,
    audit: AuditContext,
  ) {
    const [row] = await database
      .update(appointments)
      .set({ assignedLawyerId: input.assignedLawyerId, updatedAt: new Date() })
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.firmId, firmId),
          isNull(appointments.deletedAt),
        ),
      )
      .returning();
    if (!row) throw new AppError("NOT_FOUND", "Appointment was not found", 404);
    await database.insert(auditLog).values({
      firmId: audit.firmId,
      userId: audit.actorId,
      action: "appointment.assigned",
      resource: "appointments",
      resourceId: appointmentId,
      details: input.assignedLawyerId,
      ipAddress: audit.ipAddress,
      requestId: audit.requestId,
    });
    return { success: true as const, ...toDto(row as unknown as Record<string, unknown>) };
  }

  async rescheduleAppointment(
    firmId: string,
    appointmentId: string,
    input: AppointmentRescheduleInput,
    audit: AuditContext,
  ) {
    const [row] = await database
      .update(appointments)
      .set({ date: input.date, timeSlot: input.timeSlot, updatedAt: new Date() })
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.firmId, firmId),
          isNull(appointments.deletedAt),
        ),
      )
      .returning();
    if (!row) throw new AppError("NOT_FOUND", "Appointment was not found", 404);
    await database.insert(auditLog).values({
      firmId: audit.firmId,
      userId: audit.actorId,
      action: "appointment.rescheduled",
      resource: "appointments",
      resourceId: appointmentId,
      details: `${input.date} ${input.timeSlot}`,
      ipAddress: audit.ipAddress,
      requestId: audit.requestId,
    });
    return { success: true as const, ...toDto(row as unknown as Record<string, unknown>) };
  }
}
