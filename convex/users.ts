import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { requireAuth, requireRole, requireFirmId, writeUserAudit, DEFAULT_ROLE_PERMISSIONS, STAFF_ROLES } from "./lib/roles";
import { generateTotpSecret, buildOtpAuthUri, verifyTotp, hashPassword } from "./lib/totp";

export type UserRole = Doc<"users">["role"];

const roleValidator = v.union(
  v.literal("partner"),
  v.literal("senior_associate"),
  v.literal("associate"),
  v.literal("paralegal"),
  v.literal("intern"),
  v.literal("admin"),
  v.literal("client"),
);

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function makeInviteToken() {
  return "setup_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

async function logInviteEmail(
  ctx: { db: { insert: Function } },
  actorId: Id<"users">,
  to: string,
  subject: string,
  body: string,
  relatedId: string,
) {
  await ctx.db.insert("auditLog", {
    userId: actorId,
    action: "comms.email",
    resource: "email",
    resourceId: relatedId,
    details: JSON.stringify({
      to,
      subject,
      provider: "none",
      status: "queued_local",
      preview: body.slice(0, 200),
    }),
  });
}

async function ensureClientLinked(
  ctx: { db: any },
  userId: Id<"users">,
  name: string,
  email?: string,
  phone?: string,
  firmId?: Id<"firms">,
) {
  const existing = await ctx.db
    .query("clients")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (existing) {
    if (!existing.firmId && firmId) await ctx.db.patch(existing._id, { firmId });
    return existing._id;
  }
  if (email) {
    const byEmail = await ctx.db.query("clients").collect();
    const match = byEmail.find((c: Doc<"clients">) => c.email === email);
    if (match) {
      if (match.firmId && firmId && match.firmId !== firmId) {
        throw new ConvexError("Client email belongs to another firm");
      }
      await ctx.db.patch(match._id, { userId, firmId: match.firmId || firmId });
      return match._id;
    }
  }
  return ctx.db.insert("clients", {
    type: "individual",
    fullName: name,
    email,
    phone,
    userId,
    kycStatus: "pending",
    isActive: true,
    firmId,
  });
}

// ─── Auth sync / current user ───────────────────────────────────────────────

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx): Promise<{ id: string; role: UserRole }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "User not logged in" });
    }

    let user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    // Bind invited account by email (OIDC proves ownership)
    if (!user && identity.email) {
      const invited = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email))
        .first();
      if (
        invited &&
        (invited.isPending ||
          invited.tokenIdentifier.startsWith("invite_") ||
          invited.tokenIdentifier.startsWith("manual_"))
      ) {
        if (invited.inviteExpiresAt && new Date(invited.inviteExpiresAt).getTime() < Date.now()) {
          throw new ConvexError({
            code: "FORBIDDEN",
            message: "Invitation has expired. Ask an admin to resend the invite.",
          });
        }
        await ctx.db.patch(invited._id, {
          tokenIdentifier: identity.tokenIdentifier,
          name: identity.name || invited.name,
          isPending: false,
          isActive: true,
          activationToken: undefined,
          inviteExpiresAt: undefined,
          lastLoginAt: new Date().toISOString(),
        });
        user = await ctx.db.get(invited._id);
        if (user && user.role === "client") {
          await ensureClientLinked(ctx, user._id, user.name || "Client", user.email, user.phone, user.firmId);
        }
      }
    }

    if (!user) {
      const activeFirms = (await ctx.db.query("firms").collect()).filter((firm) => firm.isActive);
      if (activeFirms.length !== 1) throw new ConvexError("A firm assignment is required before creating a portal account");
      const firmId = activeFirms[0]._id;
      const id = await ctx.db.insert("users", {
        name: identity.name,
        email: identity.email,
        tokenIdentifier: identity.tokenIdentifier,
        role: "client",
        isActive: true,
        lastLoginAt: new Date().toISOString(),
        firmId,
      });
      await ensureClientLinked(ctx, id, identity.name || "Client", identity.email, undefined, firmId);
      await ctx.db.insert("sessions", {
        userId: id,
        device: "Web",
        browser: "Browser",
        ipAddress: "—",
        lastActive: new Date().toISOString(),
        isCurrent: true,
      });
      return { id, role: "client" };
    }

    if (!user.isActive) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Account is suspended" });
    }
    if (user.isPending) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Complete account setup via your invitation link before signing in.",
      });
    }

    const now = new Date().toISOString();
    await ctx.db.patch(user._id, {
      lastLoginAt: now,
      name: identity.name || user.name,
      email: identity.email || user.email,
    });

    // Mark prior sessions not current; add this login
    const existingSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user!._id))
      .collect();
    for (const s of existingSessions) {
      if (s.isCurrent) await ctx.db.patch(s._id, { isCurrent: false });
    }
    await ctx.db.insert("sessions", {
      userId: user._id,
      device: "Web",
      browser: "Browser",
      ipAddress: "—",
      lastActive: now,
      isCurrent: true,
    });

    await writeUserAudit(ctx, user._id, "users.login", user._id, "Signed in");
    return { id: user._id, role: user.role };
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

// ─── Directory ──────────────────────────────────────────────────────────────

export const listUsers = query({
  args: { role: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const users = await ctx.db.query("users").collect();
    if (args.role) return users.filter((u) => u.role === args.role);
    return users;
  },
});

/** Slim staff list for assignment dropdowns (non-admin safe) */
export const listStaffDirectory = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => STAFF_ROLES.includes(u.role) && u.isActive && !u.isPending)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        role: u.role,
        email: u.email,
      }));
  },
});

export const getUserActivity = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const logs = await ctx.db
      .query("auditLog")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const aboutUser = await ctx.db
      .query("auditLog")
      .withIndex("by_resource", (q) => q.eq("resource", "users"))
      .collect();
    const related = [
      ...logs,
      ...aboutUser.filter((l) => l.resourceId === args.userId),
    ];
    const seen = new Set<string>();
    const unique = related.filter((l) => {
      if (seen.has(l._id)) return false;
      seen.add(l._id);
      return true;
    });
    return unique.sort((a, b) => b._creationTime - a._creationTime).slice(0, 20);
  },
});

export const getRolePermissions = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireRole(ctx, ["admin"]);
    const firmId = await requireFirmId(ctx, admin);
    const override = await ctx.db
      .query("firmSettings")
      .withIndex("by_firm_key", (q) => q.eq("firmId", firmId).eq("key", "rolePermissions"))
      .first();
    return (override?.value as typeof DEFAULT_ROLE_PERMISSIONS) || DEFAULT_ROLE_PERMISSIONS;
  },
});

export const saveRolePermissions = mutation({
  args: { permissions: v.any() },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);
    const firmId = await requireFirmId(ctx, admin);
    const existing = await ctx.db
      .query("firmSettings")
      .withIndex("by_firm_key", (q) => q.eq("firmId", firmId).eq("key", "rolePermissions"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.permissions });
    } else {
      await ctx.db.insert("firmSettings", { firmId, key: "rolePermissions", value: args.permissions });
    }
    await writeUserAudit(ctx, admin._id, "users.permissions_update", "rolePermissions", "Role permission matrix updated");
    return { success: true };
  },
});

// ─── Admin CRUD / invite ────────────────────────────────────────────────────

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    role: roleValidator,
    isPublicFacing: v.optional(v.boolean()),
    phone: v.optional(v.string()),
    barCouncilNumber: v.optional(v.string()),
    barCouncilExpiry: v.optional(v.string()),
    practiceAreas: v.optional(v.array(v.string())),
    /** When false, create active user without invite (CMS team). Default true. */
    invite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);
    const firmId = await requireFirmId(ctx, admin);
    const sendInvite = args.invite !== false;
    const now = new Date();
    const token = sendInvite ? makeInviteToken() : undefined;

    if (args.email) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
      if (existing) {
        throw new ConvexError({ code: "CONFLICT", message: "A user with this email already exists" });
      }
    }

    const id = await ctx.db.insert("users", {
      tokenIdentifier: sendInvite
        ? "invite_" + Math.random().toString(36).substring(2, 15)
        : "manual_" + Math.random().toString(36).substring(2, 15),
      name: args.name,
      email: args.email,
      role: args.role,
      phone: args.phone,
      barCouncilNumber: args.barCouncilNumber,
      barCouncilExpiry: args.barCouncilExpiry,
      practiceAreas: args.practiceAreas,
      isPublicFacing: args.isPublicFacing || false,
      isActive: sendInvite ? false : true,
      isPending: sendInvite,
      activationToken: token,
      invitedAt: sendInvite ? now.toISOString() : undefined,
      invitedBy: sendInvite ? admin._id : undefined,
      inviteExpiresAt: sendInvite ? new Date(now.getTime() + INVITE_TTL_MS).toISOString() : undefined,
      twoFactorRequired: args.role === "admin" || args.role === "partner" ? true : undefined,
      firmId,
    });

    if (args.role === "client") {
      await ensureClientLinked(ctx, id, args.name, args.email, args.phone, firmId);
    }

    if (sendInvite && args.email && token) {
      const setupUrl = `/setup-account?token=${token}`;
      const body = `You have been invited to Srimar Law as ${args.role}.\n\nActivate your account (link expires in 7 days):\n${setupUrl}\n\nIf the link expired, ask an administrator to resend the invitation.`;
      await logInviteEmail(ctx, admin._id, args.email, "You're invited to Srimar Law", body, id);
    }

    await writeUserAudit(
      ctx,
      admin._id,
      sendInvite ? "users.invite" : "users.create",
      id,
      `Created ${args.role} ${args.name}${sendInvite ? " (invite sent)" : ""}`,
    );

    return { id, activationToken: token, inviteExpiresAt: sendInvite ? new Date(now.getTime() + INVITE_TTL_MS).toISOString() : undefined };
  },
});

export const resendInvitation = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");
    if (!user.email) throw new ConvexError("User has no email");
    if (!user.isPending && user.isActive) {
      throw new ConvexError("User is already active; use password reset instead");
    }

    const token = makeInviteToken();
    const expires = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    await ctx.db.patch(args.userId, {
      activationToken: token,
      isPending: true,
      isActive: false,
      invitedAt: new Date().toISOString(),
      invitedBy: admin._id,
      inviteExpiresAt: expires,
    });

    const setupUrl = `/setup-account?token=${token}`;
    const body = `Your invitation to Srimar Law was resent.\n\nActivate your account (expires in 7 days):\n${setupUrl}`;
    await logInviteEmail(ctx, admin._id, user.email, "Invitation resent — Srimar Law", body, args.userId);
    await writeUserAudit(ctx, admin._id, "users.invite_resend", args.userId, `Resent invite to ${user.email}`);

    return { success: true, activationToken: token, inviteExpiresAt: expires };
  },
});

export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(roleValidator),
    barCouncilNumber: v.optional(v.string()),
    barCouncilExpiry: v.optional(v.string()),
    practiceAreas: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    twoFactorRequired: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);
    const existing = await ctx.db.get(args.userId);
    if (!existing) throw new ConvexError("User not found");

    const { userId, ...updates } = args;
    const patch: Record<string, unknown> = { ...updates };

    if (args.isActive === false && existing.isActive) {
      patch.deactivatedAt = new Date().toISOString();
      patch.deactivatedBy = admin._id;
    }
    if (args.isActive === true && !existing.isActive) {
      patch.deactivatedAt = undefined;
      patch.deactivatedBy = undefined;
      // Do not clear pending — reactivation of suspended non-pending users only
      if (!existing.isPending) {
        // ok
      }
    }

    await ctx.db.patch(userId, patch);

    if (args.role !== undefined && args.role !== existing.role) {
      await writeUserAudit(ctx, admin._id, "users.role_change", userId, `${existing.role} → ${args.role}`);
    }
    if (args.isActive !== undefined && args.isActive !== existing.isActive) {
      await writeUserAudit(
        ctx,
        admin._id,
        args.isActive ? "users.reactivate" : "users.suspend",
        userId,
        args.isActive ? "Account reactivated" : "Account suspended",
      );
      if (!args.isActive) {
        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
        for (const s of sessions) await ctx.db.delete(s._id);
      }
    } else {
      await writeUserAudit(ctx, admin._id, "users.update", userId, "Profile fields updated by admin");
    }
  },
});

/** Soft-delete / archive. Hard delete only when no case assignments. */
export const archiveUser = mutation({
  args: {
    userId: v.id("users"),
    hardDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");
    if (user._id === admin._id) throw new ConvexError("Cannot archive your own account");

    if (args.hardDelete) {
      const cases = await ctx.db.query("cases").collect();
      const assigned = cases.some(
        (c) =>
          c.assignedLawyerId === args.userId ||
          c.teamMemberIds.includes(args.userId),
      );
      if (assigned) {
        throw new ConvexError("Cannot hard-delete: user is assigned to cases. Archive instead.");
      }
      await ctx.db.delete(args.userId);
      await writeUserAudit(ctx, admin._id, "users.delete", args.userId, `Hard deleted ${user.email}`);
      return { success: true, mode: "hard" as const };
    }

    await ctx.db.patch(args.userId, {
      isActive: false,
      deactivatedAt: new Date().toISOString(),
      deactivatedBy: admin._id,
    });
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    await writeUserAudit(ctx, admin._id, "users.archive", args.userId, `Archived ${user.email}`);
    return { success: true, mode: "soft" as const };
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");
    if (user._id === admin._id) throw new ConvexError("Cannot delete your own account");
    await ctx.db.patch(args.userId, {
      isActive: false,
      deactivatedAt: new Date().toISOString(),
      deactivatedBy: admin._id,
    });
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    await writeUserAudit(ctx, admin._id, "users.archive", args.userId, `Soft-deleted ${user.email}`);
    return { success: true };
  },
});

export const bulkUpdateUsers = mutation({
  args: {
    userIds: v.array(v.id("users")),
    action: v.union(
      v.literal("suspend"),
      v.literal("reactivate"),
      v.literal("resend_invite"),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);
    let count = 0;
    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      if (!user) continue;
      if (args.action === "suspend") {
        await ctx.db.patch(userId, {
          isActive: false,
          deactivatedAt: new Date().toISOString(),
          deactivatedBy: admin._id,
        });
        await writeUserAudit(ctx, admin._id, "users.suspend", userId, "Bulk suspend");
        count++;
      } else if (args.action === "reactivate") {
        if (!user.isPending) {
          await ctx.db.patch(userId, {
            isActive: true,
            deactivatedAt: undefined,
            deactivatedBy: undefined,
          });
          await writeUserAudit(ctx, admin._id, "users.reactivate", userId, "Bulk reactivate");
          count++;
        }
      } else if (args.action === "resend_invite" && user.email && (user.isPending || !user.isActive)) {
        const token = makeInviteToken();
        const expires = new Date(Date.now() + INVITE_TTL_MS).toISOString();
        await ctx.db.patch(userId, {
          activationToken: token,
          isPending: true,
          isActive: false,
          invitedAt: new Date().toISOString(),
          invitedBy: admin._id,
          inviteExpiresAt: expires,
        });
        await logInviteEmail(
          ctx,
          admin._id,
          user.email,
          "Invitation resent — Srimar Law",
          `Activate: /setup-account?token=${token}`,
          userId,
        );
        count++;
      }
    }
    return { success: true, count };
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    role: v.optional(roleValidator),
    bio: v.optional(v.string()),
    longBio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    twitterUrl: v.optional(v.string()),
    publicEmail: v.optional(v.string()),
    barCouncilNumber: v.optional(v.string()),
    isPublicFacing: v.optional(v.boolean()),
    practiceAreas: v.optional(v.array(v.string())),
    notableCases: v.optional(v.array(v.string())),
    education: v.optional(v.array(v.object({
      degree: v.string(),
      institution: v.string(),
      year: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const { userId, avatarUrl, ...rest } = args as typeof args & { avatarUrl?: string };
    const updates: Record<string, unknown> = { ...rest };
    if (avatarUrl !== undefined) updates.avatar = avatarUrl;
    delete updates.userId;
    await ctx.db.patch(userId, updates);
  },
});

export const updateOwnProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    await ctx.db.patch(user._id, {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.phone !== undefined ? { phone: args.phone } : {}),
      ...(args.bio !== undefined ? { bio: args.bio } : {}),
      ...(args.avatar !== undefined ? { avatar: args.avatar } : {}),
    });
    await writeUserAudit(ctx, user._id, "users.profile_update", user._id, "Self-updated profile");
    return { success: true };
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const setAvatarFromStorage = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const url = await ctx.storage.getUrl(args.storageId as any);
    if (!url) throw new ConvexError("Upload not found");
    await ctx.db.patch(user._id, { avatar: url });
    return { success: true, url };
  },
});

export const togglePublicStatus = mutation({
  args: {
    userId: v.id("users"),
    isPublicFacing: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.patch(args.userId, { isPublicFacing: args.isPublicFacing });
  },
});

export const sendPasswordReset = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");
    if (!user.email) throw new ConvexError("User has no email");
    const token = `reset_${Math.random().toString(36).slice(2)}`;
    const expires = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    await ctx.db.patch(args.userId, {
      activationToken: token,
      inviteExpiresAt: expires,
    });
    const body = `Reset / set your password:\n/setup-account?token=${token}\n\nLink expires in 7 days.`;
    await logInviteEmail(ctx, admin._id, user.email, "Password reset — Srimar Law", body, args.userId);
    await writeUserAudit(ctx, admin._id, "users.password_reset", args.userId, `Reset link sent to ${user.email}`);
    return { success: true, token };
  },
});

export const activateAccount = mutation({
  args: {
    token: v.string(),
    password: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_activation", (q) => q.eq("activationToken", args.token))
      .first();
    if (!user) throw new ConvexError("Invalid activation token");
    if (user.inviteExpiresAt && new Date(user.inviteExpiresAt).getTime() < Date.now()) {
      throw new ConvexError("Invitation has expired. Ask an admin to resend the invite.");
    }

    const patch: Record<string, unknown> = {
      isPending: false,
      activationToken: undefined,
      inviteExpiresAt: undefined,
      name: args.name || user.name,
      isActive: true,
    };
    if (args.password) {
      if (args.password.length < 8) {
        throw new ConvexError("Password must be at least 8 characters");
      }
      patch.passwordHash = await hashPassword(args.password);
    }
    await ctx.db.patch(user._id, patch);

    if (user.role === "client") {
      await ensureClientLinked(ctx, user._id, (args.name || user.name) || "Client", user.email, user.phone, user.firmId);
    }

    // System actor for unauthenticated activate — use the user themselves
    await ctx.db.insert("auditLog", {
      userId: user._id,
      action: "users.activate",
      resource: "users",
      resourceId: user._id,
      details: "Account activated via invite token",
    });

    return { success: true, userId: user._id, role: user.role };
  },
});

// ─── Sessions ───────────────────────────────────────────────────────────────

export const listSessions = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const targetId = args.userId || user._id;
    if (targetId !== user._id && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot view another user's sessions" });
    }
    return ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", targetId))
      .collect();
  },
});

export const listMySessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    return ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const revokeSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    if (session.userId !== user._id && user.role !== "admin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Cannot revoke another user's session" });
    }
    await ctx.db.delete(args.sessionId);
    await writeUserAudit(ctx, user._id, "users.session_revoke", session.userId, `Revoked session ${args.sessionId}`);
  },
});

export const revokeAllSessions = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    await writeUserAudit(ctx, admin._id, "users.session_revoke_all", args.userId, `Revoked ${sessions.length} sessions`);
    return { success: true, count: sessions.length };
  },
});

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (args.newPassword.length < 8) {
      throw new ConvexError("Password must be at least 8 characters");
    }
    if (user.passwordHash) {
      const current = await hashPassword(args.currentPassword);
      if (current !== user.passwordHash) {
        throw new ConvexError("Current password is incorrect");
      }
    }
    await ctx.db.patch(user._id, { passwordHash: await hashPassword(args.newPassword) });
    await writeUserAudit(ctx, user._id, "users.password_change", user._id, "Password updated");
    return {
      success: true,
      message: user.passwordHash
        ? "Password updated."
        : "Local password set. Primary sign-in may still use your identity provider.",
    };
  },
});

// ─── 2FA (TOTP) ─────────────────────────────────────────────────────────────

export const beginTotpEnrollment = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const secret = generateTotpSecret();
    await ctx.db.patch(user._id, { totpSecret: secret, twoFactorEnabled: false });
    const account = user.email || user.name || user._id;
    return {
      secret,
      otpauthUrl: buildOtpAuthUri(secret, account),
    };
  },
});

export const confirmTotpEnrollment = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!user.totpSecret) throw new ConvexError("Start 2FA enrollment first");
    const ok = await verifyTotp(user.totpSecret, args.code);
    if (!ok) throw new ConvexError("Invalid authenticator code");
    await ctx.db.patch(user._id, { twoFactorEnabled: true });
    await writeUserAudit(ctx, user._id, "users.2fa_enable", user._id, "TOTP enabled");
    return { success: true };
  },
});

export const disableTotp = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (user.twoFactorEnabled && user.totpSecret) {
      const ok = await verifyTotp(user.totpSecret, args.code);
      if (!ok) throw new ConvexError("Invalid authenticator code");
    }
    await ctx.db.patch(user._id, {
      twoFactorEnabled: false,
      totpSecret: undefined,
    });
    await writeUserAudit(ctx, user._id, "users.2fa_disable", user._id, "TOTP disabled");
    return { success: true };
  },
});

/** @deprecated Use beginTotpEnrollment / confirmTotpEnrollment / disableTotp */
export const toggle2FA = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (args.enabled) {
      throw new ConvexError("Use beginTotpEnrollment and confirmTotpEnrollment to enable 2FA");
    }
    if (user.twoFactorEnabled) {
      throw new ConvexError("Use disableTotp with a verification code to disable 2FA");
    }
    await ctx.db.patch(user._id, { twoFactorEnabled: false, totpSecret: undefined });
    return { success: true };
  },
});

export const getMyAuditLog = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const logs = await ctx.db
      .query("auditLog")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return logs.sort((a, b) => b._creationTime - a._creationTime).slice(0, 30);
  },
});
