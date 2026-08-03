// @ts-nocheck
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireAuth, STAFF_ROLES } from "./lib/roles";

export const listAppointments = query({
  args: {
    status: v.optional(v.string()),
    assignedLawyerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Only authenticated users (admins, staff) can list appointments
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    
    let q: any = ctx.db.query("appointments");

    if (args.assignedLawyerId) {
      q = q.withIndex("by_assigned_lawyer", (q: any) => q.eq("assignedLawyerId", args.assignedLawyerId!));
    } else if (args.status) {
      q = q.withIndex("by_status", (q: any) => q.eq("status", args.status as any));
    }

    const appointments = await q.collect();
    
    // Sort by date ascending (oldest first, or closest upcoming first depending on logic)
    // Actually we sort in memory for simplicity
    return appointments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },
});

export const createAppointment = mutation({
  args: {
    clientName: v.string(),
    clientEmail: v.optional(v.union(v.string(), v.literal(""))),
    clientPhone: v.string(),
    practiceArea: v.string(),
    date: v.string(),
    timeSlot: v.string(),
    notes: v.optional(v.string()),
    assignedLawyerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Public endpoint, no auth required
    const appointmentId = await ctx.db.insert("appointments", {
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      clientPhone: args.clientPhone,
      practiceArea: args.practiceArea,
      date: args.date,
      timeSlot: args.timeSlot,
      notes: args.notes,
      assignedLawyerId: args.assignedLawyerId,
      status: "pending",
    });
    return appointmentId;
  },
});

export const updateAppointmentStatus = mutation({
  args: {
    id: v.id("appointments"),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled")),
    meetingLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    
    // Only staff or admin can update status
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);

    const updateData: any = { status: args.status };
    if (args.meetingLink !== undefined) {
      updateData.meetingLink = args.meetingLink;
    }

    await ctx.db.patch(args.id, updateData);

    // In-app notification + email log when confirmed
    if (args.status === "confirmed") {
      const apt = await ctx.db.get(args.id);
      if (apt?.assignedLawyerId) {
        await ctx.db.insert("notifications", {
          userId: apt.assignedLawyerId,
          title: "Appointment confirmed",
          body: `${apt.clientName} â€” ${apt.date} ${apt.timeSlot}`,
          type: "system",
          relatedId: args.id,
          isRead: false,
        });
      }
      if (apt?.clientEmail) {
        const actor = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
        await ctx.db.insert("auditLog", {
          userId: actor._id,
          action: "comms.email",
          resource: "appointment",
          resourceId: args.id,
          details: JSON.stringify({
            to: apt.clientEmail,
            subject: "Consultation confirmed",
            meetingLink: args.meetingLink || apt.meetingLink,
          }),
        });
      }
    }

    return { success: true };
  },
});

export const assignLawyerToAppointment = mutation({
  args: {
    id: v.id("appointments"),
    assignedLawyerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    
    // Only admin can assign
    await requireRole(ctx, ["admin"]);

    await ctx.db.patch(args.id, { assignedLawyerId: args.assignedLawyerId });
    return { success: true };
  },
});

export const rescheduleAppointment = mutation({
  args: {
    id: v.id("appointments"),
    date: v.string(),
    timeSlot: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });
    
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);

    await ctx.db.patch(args.id, { 
      date: args.date,
      timeSlot: args.timeSlot
    });
    return { success: true };
  },
});

export const bookConsultation = mutation({
  args: {
    clientName: v.string(),
    clientEmail: v.optional(v.string()),
    clientPhone: v.string(),
    clientId: v.optional(v.id("clients")),
    practiceArea: v.string(),
    date: v.string(),
    timeSlot: v.string(),
    notes: v.optional(v.string()),
    assignedLawyerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return ctx.db.insert("appointments", {
      ...args,
      status: "pending",
    });
  },
});

export const listClientAppointments = query({
  args: { clientId: v.optional(v.id("clients")) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const all = await ctx.db.query("appointments").collect();
    if (!args.clientId) return all;
    return all.filter((a) => a.clientId === args.clientId);
  },
});

export const listAvailableSlots = query({
  args: {
    date: v.string(),
    assignedLawyerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const base = ["10:00 AM", "11:00 AM", "01:30 PM", "03:00 PM", "04:30 PM"];
    let booked = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
    booked = booked.filter(
      (a) =>
        a.status !== "cancelled" &&
        (!args.assignedLawyerId || a.assignedLawyerId === args.assignedLawyerId),
    );
    const taken = new Set(booked.map((b) => b.timeSlot));
    return base.filter((s) => !taken.has(s));
  },
});
// @ts-nocheck
