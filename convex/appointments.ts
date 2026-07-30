import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireAuth, STAFF_ROLES } from "./lib/roles.ts";

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
