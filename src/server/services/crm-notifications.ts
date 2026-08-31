import "server-only";
import { createHash } from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { resolveCapabilities } from "@/server/auth/capabilities";
import type { UserRole } from "@/server/auth/types";
import { getDatabase } from "@/server/db/client";
import { firmSettings, users } from "@/server/db/schema";
import { getJobRepository } from "@/server/jobs/runtime";
import { createLogger } from "@/server/observability/logger";
import { CommunicationRepository } from "@/server/repositories/communication-repository";

const database = getDatabase();
const notifications = new CommunicationRepository();
const logger = createLogger({ module: "crm-notifications" });

type StaffRow = { id: string; name: string | null; email: string | null; role: UserRole };

async function listClientsManagers(firmId: string, excludeUserId?: string): Promise<StaffRow[]> {
  const [settings] = await database
    .select({ value: firmSettings.value })
    .from(firmSettings)
    .where(
      and(
        eq(firmSettings.firmId, firmId),
        eq(firmSettings.key, "rolePermissions"),
        isNull(firmSettings.deletedAt),
      ),
    )
    .limit(1);

  const conditions = [
    eq(users.firmId, firmId),
    eq(users.isActive, true),
    isNull(users.deletedAt),
    ne(users.role, "client"),
  ];
  if (excludeUserId) conditions.push(ne(users.id, excludeUserId));

  const rows = await database
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(and(...conditions));

  return rows.filter((row) =>
    resolveCapabilities(row.role as UserRole, settings?.value).has("clients.manage"),
  ) as StaffRow[];
}

async function getActiveStaff(firmId: string, userId: string): Promise<StaffRow | null> {
  const [row] = await database
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.firmId, firmId),
        eq(users.id, userId),
        eq(users.isActive, true),
        isNull(users.deletedAt),
        ne(users.role, "client"),
      ),
    )
    .limit(1);
  return (row as StaffRow | undefined) ?? null;
}

function crmLinkForRole(role: UserRole): string {
  // Admin console is admin-only; all other staff use the staff CRM surface.
  return role === "admin" ? "/admin/crm" : "/staff/crm";
}

async function enqueueCrmEmail(input: {
  firmId: string;
  actorUserId: string;
  to: string;
  subject: string;
  body: string;
  relatedId: string;
  purpose:
    | "lead_created"
    | "lead_assigned"
    | "intake_submitted"
    | "appointment_booked"
    | "appointment_assigned"
    | "appointment_confirmed"
    | "appointment_cancelled"
    | "appointment_rescheduled";
}) {
  const digest = createHash("sha256")
    .update(`${input.purpose}|${input.relatedId}|${input.to}|${input.subject}`)
    .digest("hex");
  await getJobRepository().enqueue({
    firmId: input.firmId,
    actorUserId: input.actorUserId,
    type: "communication.email",
    idempotencyKey: `crm.${input.purpose}:${digest}`,
    payload: {
      to: input.to,
      subject: input.subject,
      text: input.body,
    },
    maxAttempts: 5,
    timeoutSeconds: 60,
  });
}

async function notifyRecipients(input: {
  firmId: string;
  actorUserId: string;
  recipients: StaffRow[];
  title: string;
  body: string;
  relatedId: string;
  purpose:
    | "lead_created"
    | "lead_assigned"
    | "intake_submitted"
    | "appointment_booked"
    | "appointment_assigned";
  emailFooter: string;
  linkFor?: (role: UserRole) => string;
}) {
  for (const recipient of input.recipients) {
    const link = input.linkFor ? input.linkFor(recipient.role) : crmLinkForRole(recipient.role);
    await notifications.createNotification(input.firmId, {
      userId: recipient.id,
      title: input.title,
      body: input.body,
      type: "system",
      relatedId: input.relatedId,
      link,
    });
    if (recipient.email) {
      await enqueueCrmEmail({
        firmId: input.firmId,
        actorUserId: input.actorUserId,
        to: recipient.email,
        subject: input.title,
        body: `${input.body}\n\n${input.emailFooter}`,
        relatedId: input.relatedId,
        purpose: input.purpose,
      });
    }
  }
}

/** Public website / chatbot lead → clients.manage (or assignee if already set). */
export async function notifyPublicLeadCreated(input: {
  firmId: string;
  lead: {
    id: string;
    fullName: string;
    source: string;
    assignedTo?: string | null;
    practiceAreaInterest?: string | null;
  };
}): Promise<void> {
  try {
    const area = input.lead.practiceAreaInterest?.trim();
    const title = "New website lead";
    const body = area
      ? `${input.lead.fullName} inquired about ${area} (${input.lead.source}).`
      : `${input.lead.fullName} submitted a lead (${input.lead.source}).`;

    let recipients: StaffRow[] = [];
    if (input.lead.assignedTo) {
      const assignee = await getActiveStaff(input.firmId, input.lead.assignedTo);
      if (assignee) recipients = [assignee];
    }
    if (recipients.length === 0) {
      recipients = await listClientsManagers(input.firmId);
    }
    if (recipients.length === 0) return;

    const actorUserId = recipients[0]!.id;
    await notifyRecipients({
      firmId: input.firmId,
      actorUserId,
      recipients,
      title,
      body,
      relatedId: input.lead.id,
      purpose: "lead_created",
      emailFooter: "Open CRM to follow up.",
    });
  } catch (error) {
    logger.error("crm.lead_created_notify_failed", {
      firmId: input.firmId,
      leadId: input.lead.id,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Lead assignedTo changed → notify the new assignee. */
export async function notifyLeadAssigned(input: {
  firmId: string;
  actorUserId: string;
  lead: { id: string; fullName: string };
  assignedTo: string;
}): Promise<void> {
  try {
    if (input.assignedTo === input.actorUserId) return;
    const assignee = await getActiveStaff(input.firmId, input.assignedTo);
    if (!assignee) return;

    await notifyRecipients({
      firmId: input.firmId,
      actorUserId: input.actorUserId,
      recipients: [assignee],
      title: "Lead assigned to you",
      body: `${input.lead.fullName} was assigned to you.`,
      relatedId: input.lead.id,
      purpose: "lead_assigned",
      emailFooter: "Open CRM to review the lead.",
    });
  } catch (error) {
    logger.error("crm.lead_assigned_notify_failed", {
      firmId: input.firmId,
      leadId: input.lead.id,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Intake form submitted → assignee, else clients.manage. */
export async function notifyIntakeSubmitted(input: {
  firmId: string;
  lead: {
    id: string;
    fullName: string;
    assignedTo?: string | null;
  };
}): Promise<void> {
  try {
    const title = "Intake form submitted";
    const body = `${input.lead.fullName} completed their intake form.`;

    let recipients: StaffRow[] = [];
    if (input.lead.assignedTo) {
      const assignee = await getActiveStaff(input.firmId, input.lead.assignedTo);
      if (assignee) recipients = [assignee];
    }
    if (recipients.length === 0) {
      recipients = await listClientsManagers(input.firmId);
    }
    if (recipients.length === 0) return;

    await notifyRecipients({
      firmId: input.firmId,
      actorUserId: recipients[0]!.id,
      recipients,
      title,
      body,
      relatedId: input.lead.id,
      purpose: "intake_submitted",
      emailFooter: "Open CRM to review the intake.",
    });
  } catch (error) {
    logger.error("crm.intake_submit_notify_failed", {
      firmId: input.firmId,
      leadId: input.lead.id,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

type AppointmentNotifyRow = {
  id: string;
  clientName: string;
  clientEmail?: string | null;
  practiceArea?: string | null;
  date: string;
  timeSlot: string;
  assignedLawyerId?: string | null;
  meetingLink?: string | null;
  status?: string | null;
};

function appointmentsLinkForRole(role: UserRole, appointmentId: string): string {
  const base = role === "admin" ? "/admin/appointments" : "/staff/appointments";
  return `${base}?appointment=${encodeURIComponent(appointmentId)}`;
}

function appointmentSummary(row: AppointmentNotifyRow): string {
  const area = row.practiceArea?.trim();
  return area
    ? `${row.clientName} — ${area} on ${row.date} at ${row.timeSlot}`
    : `${row.clientName} — ${row.date} at ${row.timeSlot}`;
}

/** Public or client portal booking → assignee, else clients.manage. */
export async function notifyAppointmentBooked(input: {
  firmId: string;
  appointment: AppointmentNotifyRow;
  source: "public" | "client";
  actorUserId?: string;
}): Promise<void> {
  try {
    const title =
      input.source === "public" ? "New public consultation request" : "New client booking request";
    const body = `${appointmentSummary(input.appointment)} (pending confirmation).`;

    let recipients: StaffRow[] = [];
    if (input.appointment.assignedLawyerId) {
      const assignee = await getActiveStaff(input.firmId, input.appointment.assignedLawyerId);
      if (assignee) recipients = [assignee];
    }
    if (recipients.length === 0) {
      recipients = await listClientsManagers(input.firmId, input.actorUserId);
    }
    if (recipients.length === 0) return;

    const actorUserId = input.actorUserId ?? recipients[0]!.id;
    const appointmentId = input.appointment.id;
    await notifyRecipients({
      firmId: input.firmId,
      actorUserId,
      recipients,
      title,
      body,
      relatedId: appointmentId,
      purpose: "appointment_booked",
      emailFooter: "Open Appointments to confirm or assign.",
      linkFor: (role) => appointmentsLinkForRole(role, appointmentId),
    });
  } catch (error) {
    logger.error("crm.appointment_booked_notify_failed", {
      firmId: input.firmId,
      appointmentId: input.appointment.id,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Lawyer assigned on an appointment → notify the new assignee. */
export async function notifyAppointmentAssigned(input: {
  firmId: string;
  actorUserId: string;
  appointment: AppointmentNotifyRow;
  assignedLawyerId: string;
}): Promise<void> {
  try {
    if (input.assignedLawyerId === input.actorUserId) return;
    const assignee = await getActiveStaff(input.firmId, input.assignedLawyerId);
    if (!assignee) return;

    const appointmentId = input.appointment.id;
    await notifyRecipients({
      firmId: input.firmId,
      actorUserId: input.actorUserId,
      recipients: [assignee],
      title: "Appointment assigned to you",
      body: appointmentSummary(input.appointment),
      relatedId: appointmentId,
      purpose: "appointment_assigned",
      emailFooter: "Open Appointments to review the booking.",
      linkFor: (role) => appointmentsLinkForRole(role, appointmentId),
    });
  } catch (error) {
    logger.error("crm.appointment_assigned_notify_failed", {
      firmId: input.firmId,
      appointmentId: input.appointment.id,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Confirm / cancel → real client email when an address is present (replaces audit-only stub). */
export async function notifyAppointmentClientStatus(input: {
  firmId: string;
  actorUserId: string;
  appointment: AppointmentNotifyRow;
  status: "confirmed" | "cancelled";
}): Promise<void> {
  try {
    const to = input.appointment.clientEmail?.trim();
    if (!to) return;

    const when = `${input.appointment.date} at ${input.appointment.timeSlot}`;
    if (input.status === "confirmed") {
      const linkLine = input.appointment.meetingLink?.trim()
        ? `\n\nMeeting link: ${input.appointment.meetingLink.trim()}`
        : "";
      await enqueueCrmEmail({
        firmId: input.firmId,
        actorUserId: input.actorUserId,
        to,
        subject: "Consultation confirmed",
        body: `Your consultation on ${when} has been confirmed.${linkLine}\n\n— Srimar Law`,
        relatedId: input.appointment.id,
        purpose: "appointment_confirmed",
      });
      return;
    }

    await enqueueCrmEmail({
      firmId: input.firmId,
      actorUserId: input.actorUserId,
      to,
      subject: "Consultation cancelled",
      body: `Your consultation on ${when} has been cancelled. Please contact the firm to reschedule if needed.\n\n— Srimar Law`,
      relatedId: input.appointment.id,
      purpose: "appointment_cancelled",
    });
  } catch (error) {
    logger.error("crm.appointment_client_status_email_failed", {
      firmId: input.firmId,
      appointmentId: input.appointment.id,
      status: input.status,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Reschedule → client email when present. */
export async function notifyAppointmentRescheduled(input: {
  firmId: string;
  actorUserId: string;
  appointment: AppointmentNotifyRow;
  previousDate: string;
  previousTimeSlot: string;
}): Promise<void> {
  try {
    const to = input.appointment.clientEmail?.trim();
    if (!to) return;

    await enqueueCrmEmail({
      firmId: input.firmId,
      actorUserId: input.actorUserId,
      to,
      subject: "Consultation rescheduled",
      body: `Your consultation has been moved from ${input.previousDate} at ${input.previousTimeSlot} to ${input.appointment.date} at ${input.appointment.timeSlot}.\n\n— Srimar Law`,
      relatedId: input.appointment.id,
      purpose: "appointment_rescheduled",
    });
  } catch (error) {
    logger.error("crm.appointment_reschedule_email_failed", {
      firmId: input.firmId,
      appointmentId: input.appointment.id,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}
