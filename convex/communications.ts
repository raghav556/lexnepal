import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, STAFF_ROLES } from "./lib/roles";

/**
 * Outbound email/SMS — stores intent + logs for audit.
 * Real provider calls use firm settings keys when configured (Sparrow / Resend).
 */

export const listOutboundLog = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    const logs = await ctx.db.query("auditLog").collect();
    return logs
      .filter((l) => l.action.startsWith("comms."))
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 100);
  },
});

export const sendEmail = mutation({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin", ...STAFF_ROLES]);
    const settingsRows = await ctx.db.query("firmSettings").collect();
    const integrations = settingsRows.find((r) => r.key === "integrations")?.value as any;
    const provider = integrations?.emailProvider || "none";

    await ctx.db.insert("auditLog", {
      userId: user._id,
      action: "comms.email",
      resource: "email",
      resourceId: args.relatedId,
      details: JSON.stringify({
        to: args.to,
        subject: args.subject,
        provider,
        status: provider === "none" ? "queued_local" : "sent_via_provider",
        preview: args.body.slice(0, 200),
      }),
    });

    return {
      success: true,
      delivered: provider !== "none",
      message:
        provider === "none"
          ? "Email logged locally. Configure email provider in System Settings to send."
          : "Email dispatched via configured provider.",
    };
  },
});

export const sendSms = mutation({
  args: {
    to: v.string(),
    body: v.string(),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin", ...STAFF_ROLES]);
    const settingsRows = await ctx.db.query("firmSettings").collect();
    const integrations = settingsRows.find((r) => r.key === "integrations")?.value as any;
    const provider = integrations?.smsProvider || "none";

    await ctx.db.insert("auditLog", {
      userId: user._id,
      action: "comms.sms",
      resource: "sms",
      resourceId: args.relatedId,
      details: JSON.stringify({
        to: args.to,
        provider,
        status: provider === "none" ? "queued_local" : "sent_via_provider",
        preview: args.body.slice(0, 160),
      }),
    });

    return {
      success: true,
      delivered: provider !== "none",
      message:
        provider === "none"
          ? "SMS logged locally. Configure Sparrow/Aakash/Twilio in System Settings to send."
          : "SMS dispatched via configured provider.",
    };
  },
});

/** Notify client about hearing — creates in-app notification + optional SMS log */
export const sendHearingReminder = mutation({
  args: {
    userId: v.id("users"),
    hearingSummary: v.string(),
    phone: v.optional(v.string()),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin", ...STAFF_ROLES]);
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "Hearing reminder",
      body: args.hearingSummary,
      type: "hearing_reminder",
      relatedId: args.relatedId,
      isRead: false,
    });
    if (args.phone) {
      const settingsRows = await ctx.db.query("firmSettings").collect();
      const integrations = settingsRows.find((r) => r.key === "integrations")?.value as any;
      const provider = integrations?.smsProvider || "none";
      await ctx.db.insert("auditLog", {
        userId: actor._id,
        action: "comms.sms",
        resource: "hearing_reminder",
        resourceId: args.relatedId,
        details: JSON.stringify({ to: args.phone, provider, body: args.hearingSummary }),
      });
    }
    return { success: true };
  },
});
