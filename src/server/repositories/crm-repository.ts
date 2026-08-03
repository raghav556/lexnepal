import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { leads, appointments, users, clients } from "../db/schema";


export class CrmRepository {
  // --- Leads ---
  async listLeads(firmId: string, filters?: { status?: string; assignedTo?: string }) {
    const db = getDatabase();
    let query = db.select().from(leads).where(eq(leads.firmId, firmId));
    
    if (filters?.status) {
      query = db.select().from(leads).where(and(eq(leads.firmId, firmId), eq(leads.status, filters.status as any)));
    }
    if (filters?.assignedTo) {
      query = db.select().from(leads).where(and(eq(leads.firmId, firmId), eq(leads.assignedTo, filters.assignedTo)));
    }
    
    return await query.orderBy(desc(leads.createdAt));
  }

  async createLead(
    firmId: string,
    data: {
      fullName: string;
      email?: string;
      phone?: string;
      source: string;
      practiceAreaInterest?: string;
      message?: string;
      assignedTo?: string;
      notes?: string;
    }
  ) {
    const db = getDatabase();
    const [row] = await db
      .insert(leads)
      .values({
        firmId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        source: data.source as any,
        practiceAreaInterest: data.practiceAreaInterest,
        message: data.message,
        assignedTo: data.assignedTo,
        notes: data.notes,
        status: "new",
      })
      .returning();
    return row;
  }

  async updateLead(
    firmId: string,
    leadId: string,
    data: {
      status?: string;
      assignedTo?: string;
      notes?: string;
    }
  ) {
    const db = getDatabase();
    const updates: Partial<typeof leads.$inferInsert> = {};
    if (data.status) updates.status = data.status as any;
    if (data.assignedTo) updates.assignedTo = data.assignedTo;
    if (data.notes) updates.notes = data.notes;
    updates.updatedAt = new Date();

    const [row] = await db
      .update(leads)
      .set(updates)
      .where(and(eq(leads.id, leadId), eq(leads.firmId, firmId)))
      .returning();
    return row;
  }

  async convertToClient(firmId: string, leadId: string) {
    const db = getDatabase();
    return await db.transaction(async (tx) => {
      const [lead] = await tx.select().from(leads).where(and(eq(leads.id, leadId), eq(leads.firmId, firmId)));
      if (!lead) throw new Error("Lead not found");
      if (lead.convertedClientId) throw new Error("Lead already converted");

      const [client] = await tx.insert(clients).values({
        firmId,
        type: "individual",
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
      }).returning();

      await tx.update(leads).set({
        status: "converted",
        convertedClientId: client!.id,
        updatedAt: new Date(),
      }).where(eq(leads.id, leadId));

      return client;
    });
  }

  async generateIntakeLink(firmId: string, leadId: string) {
    const db = getDatabase();
    const token = crypto.randomUUID();
    await db.update(leads).set({
      intakeToken: token,
      updatedAt: new Date(),
    }).where(and(eq(leads.id, leadId), eq(leads.firmId, firmId)));
    return token;
  }

  async getIntakeByToken(token: string) {
    const db = getDatabase();
    const [lead] = await db.select().from(leads).where(eq(leads.intakeToken, token));
    return lead;
  }

  async submitIntake(token: string, payload: any) {
    const db = getDatabase();
    const [lead] = await db.select().from(leads).where(eq(leads.intakeToken, token));
    if (!lead) throw new Error("Invalid token");

    await db.update(leads).set({
      notes: (lead.notes ? lead.notes + "\n\n" : "") + "Intake form submitted:\n" + JSON.stringify(payload, null, 2),
      intakeSubmitted: true,
      updatedAt: new Date(),
    }).where(eq(leads.id, lead.id));
  }

  // --- Appointments ---
  async listAppointments(firmId: string, filters?: { status?: string; assignedLawyerId?: string }) {
    const db = getDatabase();
    let query = db.select().from(appointments).where(eq(appointments.firmId, firmId));
    
    if (filters?.status) {
      query = db.select().from(appointments).where(and(eq(appointments.firmId, firmId), eq(appointments.status, filters.status as any)));
    }
    if (filters?.assignedLawyerId) {
      query = db.select().from(appointments).where(and(eq(appointments.firmId, firmId), eq(appointments.assignedLawyerId, filters.assignedLawyerId)));
    }
    
    return await query.orderBy(desc(appointments.date));
  }

  async listAvailableSlots(firmId: string, date: string) {
    // Basic implementation that returns default slots and filters out confirmed ones
    const allSlots = [
      "09:00 AM", "10:00 AM", "11:00 AM",
      "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
    ];
    const db = getDatabase();
    const booked = await db.select().from(appointments).where(
      and(
        eq(appointments.firmId, firmId),
        eq(appointments.date, date),
        eq(appointments.status, "confirmed")
      )
    );
    const bookedSlots = new Set(booked.map(a => a.timeSlot));
    return allSlots.filter(slot => !bookedSlots.has(slot));
  }

  async createAppointment(
    firmId: string,
    data: {
      clientName: string;
      clientEmail?: string;
      clientPhone: string;
      practiceArea: string;
      date: string;
      timeSlot: string;
      notes?: string;
      assignedLawyerId?: string;
    }
  ) {
    const db = getDatabase();
    const [row] = await db
      .insert(appointments)
      .values({
        firmId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        practiceArea: data.practiceArea,
        date: data.date,
        timeSlot: data.timeSlot,
        notes: data.notes,
        assignedLawyerId: data.assignedLawyerId,
        status: "pending",
      })
      .returning();
    return row;
  }

  async bookConsultation(
    firmId: string,
    clientId: string,
    data: {
      date: string;
      timeSlot: string;
      practiceArea: string;
      notes?: string;
    }
  ) {
    const db = getDatabase();
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) throw new Error("Client not found");

    const [row] = await db
      .insert(appointments)
      .values({
        firmId,
        clientId,
        clientName: client.fullName,
        clientEmail: client.email,
        clientPhone: client.phone || "",
        practiceArea: data.practiceArea,
        date: data.date,
        timeSlot: data.timeSlot,
        notes: data.notes,
        status: "pending",
      })
      .returning();
    return row;
  }

  async updateAppointmentStatus(
    firmId: string,
    appointmentId: string,
    status: string,
    meetingLink?: string
  ) {
    const db = getDatabase();
    const updates: Partial<typeof appointments.$inferInsert> = {
      status: status as any,
      updatedAt: new Date(),
    };
    if (meetingLink !== undefined) updates.meetingLink = meetingLink;

    const [row] = await db
      .update(appointments)
      .set(updates)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.firmId, firmId)))
      .returning();
    return row;
  }

  async assignLawyerToAppointment(
    firmId: string,
    appointmentId: string,
    lawyerId: string
  ) {
    const db = getDatabase();
    const [row] = await db
      .update(appointments)
      .set({ assignedLawyerId: lawyerId, updatedAt: new Date() })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.firmId, firmId)))
      .returning();
    return row;
  }

  async rescheduleAppointment(
    firmId: string,
    appointmentId: string,
    date: string,
    timeSlot: string
  ) {
    const db = getDatabase();
    const [row] = await db
      .update(appointments)
      .set({ date, timeSlot, updatedAt: new Date() })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.firmId, firmId)))
      .returning();
    return row;
  }
}
