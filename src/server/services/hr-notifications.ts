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
import type { LeaveRequestDto } from "@/shared/contracts/hr";

const database = getDatabase();
const notifications = new CommunicationRepository();
const logger = createLogger({ module: "hr-notifications" });

type ManagerRow = { id: string; name: string | null; email: string | null; role: UserRole };

async function listHrManagers(firmId: string, excludeUserId?: string): Promise<ManagerRow[]> {
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
    resolveCapabilities(row.role as UserRole, settings?.value).has("hr.manage"),
  ) as ManagerRow[];
}

async function enqueueLeaveEmail(input: {
  firmId: string;
  actorUserId: string;
  to: string;
  subject: string;
  body: string;
  relatedId: string;
  purpose: "leave_submitted" | "leave_decided";
}) {
  const digest = createHash("sha256")
    .update(`${input.purpose}|${input.relatedId}|${input.to}|${input.subject}`)
    .digest("hex");
  await getJobRepository().enqueue({
    firmId: input.firmId,
    actorUserId: input.actorUserId,
    type: "communication.email",
    idempotencyKey: `hr.${input.purpose}:${digest}`,
    payload: {
      to: input.to,
      subject: input.subject,
      text: input.body,
    },
    maxAttempts: 5,
    timeoutSeconds: 60,
  });
}

function leaveSummary(leave: LeaveRequestDto): string {
  const range =
    leave.toDate !== leave.fromDate ? `${leave.fromDate} → ${leave.toDate}` : leave.fromDate;
  return `${leave.type} (${range})`;
}

export async function notifyLeaveSubmitted(input: {
  firmId: string;
  actorUserId: string;
  actorName: string;
  leave: LeaveRequestDto;
}): Promise<void> {
  try {
    const managers = await listHrManagers(input.firmId, input.actorUserId);
    const summary = leaveSummary(input.leave);
    const title = "Leave request submitted";
    const body = `${input.actorName} requested ${summary}.`;
    const link = "/admin/hr";

    for (const manager of managers) {
      await notifications.createNotification(input.firmId, {
        userId: manager.id,
        title,
        body,
        type: "system",
        relatedId: input.leave.id,
        link,
      });
      if (manager.email) {
        await enqueueLeaveEmail({
          firmId: input.firmId,
          actorUserId: input.actorUserId,
          to: manager.email,
          subject: title,
          body: `${body}\n\nReview in Admin → HR.`,
          relatedId: input.leave.id,
          purpose: "leave_submitted",
        });
      }
    }
  } catch (error) {
    logger.error("hr.leave_submit_notify_failed", {
      firmId: input.firmId,
      leaveId: input.leave.id,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyLeaveReviewed(input: {
  firmId: string;
  actorUserId: string;
  leave: LeaveRequestDto;
}): Promise<void> {
  try {
    const [requester] = await database
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.firmId, input.firmId),
          eq(users.id, input.leave.userId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    if (!requester) return;

    const decision = input.leave.status === "approved" ? "approved" : "rejected";
    const summary = leaveSummary(input.leave);
    const title = `Leave request ${decision}`;
    const body = `Your ${summary} leave request was ${decision}.`;
    const link = "/staff/hr";

    await notifications.createNotification(input.firmId, {
      userId: requester.id,
      title,
      body,
      type: "system",
      relatedId: input.leave.id,
      link,
    });

    if (requester.email) {
      await enqueueLeaveEmail({
        firmId: input.firmId,
        actorUserId: input.actorUserId,
        to: requester.email,
        subject: title,
        body: `${body}\n\nOpen Staff → HR for details.`,
        relatedId: input.leave.id,
        purpose: "leave_decided",
      });
    }
  } catch (error) {
    logger.error("hr.leave_review_notify_failed", {
      firmId: input.firmId,
      leaveId: input.leave.id,
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}
