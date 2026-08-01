import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuth, requireRole, STAFF_ROLES } from "./lib/roles";
import { notifyUser } from "./lib/notify";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const taskStatus = v.union(
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("done"),
  v.literal("cancelled"),
);

const taskPriority = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent"),
);

const taskCategory = v.union(
  v.literal("filing"),
  v.literal("research"),
  v.literal("client"),
  v.literal("court"),
  v.literal("admin"),
  v.literal("other"),
);

const recurrenceRule = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
);

const HEARING_PREP_TITLES = [
  "Review case file and precedents",
  "Draft written arguments/notes",
  "Client briefing completed",
];

async function notifyAssignee(
  ctx: MutationCtx,
  userId: Id<"users">,
  title: string,
  body: string,
  taskId: Id<"tasks">,
) {
  await notifyUser(ctx, {
    userId,
    title,
    body,
    type: "task_due",
    relatedId: taskId,
  });
}

async function writeTaskAudit(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string,
  taskId: string,
  details?: string,
) {
  await ctx.db.insert("auditLog", {
    userId,
    action,
    resource: "tasks",
    resourceId: taskId,
    details,
  });
}

function addRecurrence(dateStr: string, rule: "daily" | "weekly" | "monthly"): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    const today = new Date();
    if (rule === "daily") today.setDate(today.getDate() + 1);
    else if (rule === "weekly") today.setDate(today.getDate() + 7);
    else today.setMonth(today.getMonth() + 1);
    return today.toISOString().slice(0, 10);
  }
  if (rule === "daily") d.setDate(d.getDate() + 1);
  else if (rule === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

async function spawnRecurrence(ctx: MutationCtx, task: Doc<"tasks">, actorId: Id<"users">) {
  if (!task.isRecurring || !task.recurrenceRule) return;
  const nextDue = task.dueDate
    ? addRecurrence(task.dueDate, task.recurrenceRule)
    : addRecurrence(new Date().toISOString().slice(0, 10), task.recurrenceRule);
  const newId = await ctx.db.insert("tasks", {
    firmId: task.firmId,
    caseId: task.caseId,
    title: task.title,
    description: task.description,
    assignedTo: task.assignedTo,
    createdBy: actorId,
    status: "todo",
    priority: task.priority,
    category: task.category,
    dueDate: nextDue,
    isRecurring: true,
    recurrenceRule: task.recurrenceRule,
    watchers: task.watchers,
    clientVisible: task.clientVisible,
    hearingId: task.hearingId,
    documentId: task.documentId,
    parentTaskId: undefined,
  });
  await writeTaskAudit(ctx, actorId, "task.recurrence_spawned", newId, `From ${task._id}`);
}

export const listTasks = query({
  args: {
    caseId: v.optional(v.id("cases")),
    assignedTo: v.optional(v.id("users")),
    status: v.optional(taskStatus),
    hearingId: v.optional(v.id("hearings")),
    parentTaskId: v.optional(v.id("tasks")),
    includeArchived: v.optional(v.boolean()),
    includeSubtasks: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    // Client portal: only client-visible checklist items on their cases
    if (user.role === "client") {
      const client = await ctx.db
        .query("clients")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      if (!client) return [];
      const clientCases = await ctx.db
        .query("cases")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .collect();
      const caseIds = new Set(clientCases.map((c) => c._id));
      const all = await ctx.db.query("tasks").collect();
      return all.filter(
        (t) =>
          !!t.clientVisible &&
          !!t.caseId &&
          caseIds.has(t.caseId) &&
          !t.archivedAt &&
          !t.parentTaskId,
      );
    }

    let tasks;
    if (args.parentTaskId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_parent", (q) => q.eq("parentTaskId", args.parentTaskId!))
        .collect();
    } else if (args.hearingId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_hearing", (q) => q.eq("hearingId", args.hearingId!))
        .collect();
    } else if (args.caseId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_case", (q) => q.eq("caseId", args.caseId!))
        .collect();
    } else if (args.assignedTo) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_assignee", (q) => q.eq("assignedTo", args.assignedTo!))
        .collect();
    } else if (args.status) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      tasks = await ctx.db.query("tasks").collect();
    }

    if (args.status && (args.caseId || args.assignedTo || args.hearingId || args.parentTaskId)) {
      tasks = tasks.filter((t) => t.status === args.status);
    }
    if (args.assignedTo && args.caseId) {
      tasks = tasks.filter((t) => t.assignedTo === args.assignedTo);
    }
    if (!args.includeArchived) {
      tasks = tasks.filter((t) => !t.archivedAt);
    }
    if (!args.parentTaskId && !args.includeSubtasks && !args.hearingId) {
      tasks = tasks.filter((t) => !t.parentTaskId);
    }
    if (user.firmId) {
      tasks = tasks.filter((t) => !t.firmId || t.firmId === user.firmId);
    }

    return tasks;
  },
});

export const listWorkload = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    let tasks = await ctx.db.query("tasks").collect();
    tasks = tasks.filter(
      (t) =>
        !t.archivedAt &&
        !t.parentTaskId &&
        t.status !== "done" &&
        t.status !== "cancelled",
    );
    if (user.firmId) {
      tasks = tasks.filter((t) => !t.firmId || t.firmId === user.firmId);
    }
    const byAssignee: Record<string, { assignedTo: string; total: number; urgent: number; overdue: number }> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const t of tasks) {
      const key = t.assignedTo;
      if (!byAssignee[key]) {
        byAssignee[key] = { assignedTo: key, total: 0, urgent: 0, overdue: 0 };
      }
      byAssignee[key].total++;
      if (t.priority === "urgent" || t.priority === "high") byAssignee[key].urgent++;
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        if (!Number.isNaN(due.getTime()) && due.getTime() < today.getTime()) {
          byAssignee[key].overdue++;
        }
      }
    }
    return Object.values(byAssignee).sort((a, b) => b.total - a.total);
  },
});

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    caseId: v.optional(v.id("cases")),
    assignedTo: v.id("users"),
    priority: taskPriority,
    category: v.optional(taskCategory),
    dueDate: v.optional(v.string()),
    dueDateBs: v.optional(v.string()),
    hearingId: v.optional(v.id("hearings")),
    documentId: v.optional(v.id("documents")),
    parentTaskId: v.optional(v.id("tasks")),
    watchers: v.optional(v.array(v.id("users"))),
    clientVisible: v.optional(v.boolean()),
    isRecurring: v.optional(v.boolean()),
    recurrenceRule: v.optional(recurrenceRule),
    reminderAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const { isRecurring, recurrenceRule: rule, ...rest } = args;
    const recurring = !!(isRecurring && rule);
    const taskId = await ctx.db.insert("tasks", {
      ...rest,
      firmId: user.firmId,
      createdBy: user._id,
      status: "todo",
      isRecurring: recurring,
      recurrenceRule: recurring ? rule : undefined,
      watchers: args.watchers || [],
      clientVisible: args.clientVisible ?? false,
    });
    await writeTaskAudit(ctx, user._id, "task.created", taskId, args.title);
    if (args.assignedTo !== user._id) {
      await notifyAssignee(ctx, args.assignedTo, "New task assigned", `"${args.title}" was assigned to you.`, taskId);
    }
    return taskId;
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    status: v.optional(taskStatus),
    priority: v.optional(taskPriority),
    category: v.optional(v.union(taskCategory, v.null())),
    assignedTo: v.optional(v.id("users")),
    caseId: v.optional(v.union(v.id("cases"), v.null())),
    dueDate: v.optional(v.union(v.string(), v.null())),
    dueDateBs: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    hearingId: v.optional(v.union(v.id("hearings"), v.null())),
    documentId: v.optional(v.union(v.id("documents"), v.null())),
    watchers: v.optional(v.array(v.id("users"))),
    clientVisible: v.optional(v.boolean()),
    isRecurring: v.optional(v.boolean()),
    recurrenceRule: v.optional(v.union(recurrenceRule, v.null())),
    reminderAt: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const { taskId, ...raw } = args;
    const existing = await ctx.db.get(taskId);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Task not found" });

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (value !== undefined) updates[key] = value === null ? undefined : value;
    }

    if (raw.status !== undefined) {
      if (raw.status === "done" && existing.status !== "done") {
        updates.completedAt = new Date().toISOString();
      } else if (raw.status !== "done") {
        updates.completedAt = undefined;
      }
    }

    await ctx.db.patch(taskId, updates);
    await writeTaskAudit(ctx, actor._id, "task.updated", taskId, raw.status ? `status=${raw.status}` : undefined);

    if (raw.status === "done" && existing.status !== "done") {
      const refreshed = { ...existing, ...updates } as Doc<"tasks">;
      await spawnRecurrence(ctx, refreshed, actor._id);
    }

    if (raw.assignedTo && raw.assignedTo !== existing.assignedTo && raw.assignedTo !== actor._id) {
      const title = (raw.title as string | undefined) || existing.title;
      await notifyAssignee(ctx, raw.assignedTo, "Task reassigned to you", `"${title}" was reassigned to you.`, taskId);
    }

    const watchers = (raw.watchers as Id<"users">[] | undefined) ?? existing.watchers;
    if (raw.status && raw.status !== existing.status && watchers?.length) {
      const title = (raw.title as string | undefined) || existing.title;
      for (const wid of watchers) {
        if (wid !== actor._id && wid !== (raw.assignedTo || existing.assignedTo)) {
          await notifyAssignee(
            ctx,
            wid,
            "Watched task updated",
            `"${title}" moved to ${String(raw.status).replace("_", " ")}.`,
            taskId,
          );
        }
      }
    }
  },
});

/** Soft-delete (archive). Prefer this over hard delete. */
export const archiveTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const existing = await ctx.db.get(args.taskId);
    if (!existing) throw new ConvexError({ code: "NOT_FOUND", message: "Task not found" });
    await ctx.db.patch(args.taskId, { archivedAt: new Date().toISOString(), status: "cancelled" });
    await writeTaskAudit(ctx, user._id, "task.archived", args.taskId, existing.title);
  },
});

export const restoreTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    await ctx.db.patch(args.taskId, { archivedAt: undefined, status: "todo" });
    await writeTaskAudit(ctx, user._id, "task.restored", args.taskId);
  },
});

/** Hard delete — for archived tasks or admin purge */
export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const comments = await ctx.db
      .query("taskComments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);
    const subs = await ctx.db
      .query("tasks")
      .withIndex("by_parent", (q) => q.eq("parentTaskId", args.taskId))
      .collect();
    for (const s of subs) await ctx.db.delete(s._id);
    await ctx.db.delete(args.taskId);
    await writeTaskAudit(ctx, user._id, "task.deleted", args.taskId);
  },
});

export const listSopTemplates = query({
  args: { practiceArea: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (args.practiceArea) {
      return ctx.db
        .query("sopTemplates")
        .withIndex("by_practice", (q) => q.eq("practiceArea", args.practiceArea!))
        .collect();
    }
    return ctx.db.query("sopTemplates").collect();
  },
});

export const runSop = mutation({
  args: {
    templateKey: v.string(),
    caseId: v.id("cases"),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const templates = await ctx.db
      .query("sopTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.templateKey))
      .collect();
    const template = templates[0];
    if (!template) throw new ConvexError({ code: "NOT_FOUND", message: "SOP template not found" });

    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_case", (q) => q.eq("caseId", args.caseId))
      .collect();
    const existingTitles = new Set(
      existing.filter((t) => !t.archivedAt).map((t) => t.title.trim().toLowerCase()),
    );
    const assignee = args.assignedTo || user._id;

    let created = 0;
    let skipped = 0;
    for (const title of template.taskTitles) {
      if (existingTitles.has(title.trim().toLowerCase())) {
        skipped++;
        continue;
      }
      const taskId = await ctx.db.insert("tasks", {
        title,
        caseId: args.caseId,
        firmId: user.firmId,
        assignedTo: assignee,
        createdBy: user._id,
        status: "todo",
        priority: template.defaultPriority,
        category: "court",
        isRecurring: false,
        watchers: [],
        clientVisible: false,
      });
      existingTitles.add(title.trim().toLowerCase());
      created++;
      await writeTaskAudit(ctx, user._id, "task.created", taskId, `SOP ${template.key}`);
      if (assignee !== user._id) {
        await notifyAssignee(ctx, assignee, "New task assigned", `"${title}" was assigned to you.`, taskId);
      }
    }
    return { created, skipped, label: template.label };
  },
});

export const createHearingPrepTasks = mutation({
  args: {
    hearingId: v.id("hearings"),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const hearing = await ctx.db.get(args.hearingId);
    if (!hearing) throw new ConvexError({ code: "NOT_FOUND", message: "Hearing not found" });
    const caseDoc = await ctx.db.get(hearing.caseId);
    const assignee = args.assignedTo || caseDoc?.assignedLawyerId || user._id;

    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_hearing", (q) => q.eq("hearingId", args.hearingId))
      .collect();
    const existingTitles = new Set(
      existing.filter((t) => !t.archivedAt).map((t) => t.title.trim().toLowerCase()),
    );

    let created = 0;
    let skipped = 0;
    for (const title of HEARING_PREP_TITLES) {
      if (existingTitles.has(title.toLowerCase())) {
        skipped++;
        continue;
      }
      const taskId = await ctx.db.insert("tasks", {
        title,
        caseId: hearing.caseId,
        firmId: user.firmId,
        hearingId: args.hearingId,
        assignedTo: assignee,
        createdBy: user._id,
        status: "todo",
        priority: "high",
        category: "court",
        dueDate: hearing.dateGregorian,
        dueDateBs: hearing.dateBs,
        isRecurring: false,
        watchers: [],
        clientVisible: false,
        description: `Hearing prep for ${hearing.court}${hearing.purpose ? ` — ${hearing.purpose}` : ""}`,
      });
      created++;
      await writeTaskAudit(ctx, user._id, "task.created", taskId, "hearing_prep");
      if (assignee !== user._id) {
        await notifyAssignee(ctx, assignee, "Hearing prep task", `"${title}" was assigned to you.`, taskId);
      }
    }
    return { created, skipped };
  },
});

export const listComments = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return ctx.db
      .query("taskComments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});

export const addComment = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    const content = args.content.trim();
    if (!content) throw new ConvexError({ code: "INVALID", message: "Comment cannot be empty" });
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new ConvexError({ code: "NOT_FOUND", message: "Task not found" });
    const id = await ctx.db.insert("taskComments", {
      taskId: args.taskId,
      authorId: user._id,
      content,
    });
    await writeTaskAudit(ctx, user._id, "task.commented", args.taskId);
    return id;
  },
});

async function sendOverdueRemindersHandler(ctx: MutationCtx) {
  const all = await ctx.db.query("tasks").collect();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let sent = 0;
  for (const task of all) {
    if (task.archivedAt) continue;
    if (!task.dueDate) continue;
    if (task.status === "done" || task.status === "cancelled") continue;
    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    due.setHours(0, 0, 0, 0);
    if (due.getTime() > today.getTime()) continue;
    if (task.lastDueReminderAt) {
      const last = new Date(task.lastDueReminderAt);
      if (!Number.isNaN(last.getTime()) && last.toDateString() === new Date().toDateString()) {
        continue;
      }
    }
    await notifyUser(ctx, {
      userId: task.assignedTo,
      title: "Task due / overdue",
      body: `"${task.title}" is due or overdue (${task.dueDateBs || task.dueDate}).`,
      type: "task_due",
      relatedId: task._id,
    });
    await ctx.db.patch(task._id, { lastDueReminderAt: new Date().toISOString() });
    sent++;
  }
  return { sent };
}

export const sendOverdueReminders = internalMutation({
  args: {},
  handler: async (ctx) => sendOverdueRemindersHandler(ctx),
});

export const scanOverdueReminders = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [...STAFF_ROLES, "admin"]);
    return sendOverdueRemindersHandler(ctx);
  },
});
