import "server-only";
import { and, count, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import nodemailer from "nodemailer";
import { getDatabase } from "@/server/db/client";
import {
  cases,
  documents,
  durableJobEffects,
  hearings,
  invoices,
  notifications,
  signatureEnvelopes,
  signatureRecipients,
  tasks,
} from "@/server/db/schema";
import { PermanentJobError, RetryableJobError } from "@/server/jobs/errors";
import type {
  DurableJobRecord,
  JobExecutionContext,
  JobHandler,
  JobType,
} from "@/server/jobs/types";
import { getDocumentStorageRuntime } from "@/server/storage/runtime";
import { getServerEnvironment } from "@/server/env";
import { getAvatarService } from "@/server/services/avatar-service";
import { getKycService } from "@/server/services/kyc-service";

const database = getDatabase();
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];

export function createJobHandlers(): ReadonlyMap<JobType, JobHandler> {
  return new Map<JobType, JobHandler>([
    ["document.malware_scan", handleMalwareScan],
    ["document.cleanup", handleDocumentCleanup],
    ["identity.avatar_scan", handleAvatarScan],
    ["kyc.malware_scan", handleKycScan],
    ["reminder.task", handleTaskReminders],
    ["reminder.hearing", handleHearingReminders],
    ["reminder.signature", handleSignatureReminders],
    ["envelope.expire", handleEnvelopeExpiration],
    ["analytics.aggregate", handleAnalyticsAggregation],
    ["document.ocr", blocked("OCR engine and supported-format policy are not configured")],
    ["document.thumbnail", blocked("Thumbnail renderer is not configured")],
    ["communication.email", handleEmailDelivery],
    ["communication.sms", blocked("SMS provider is not configured")],
    [
      "records.dispose",
      blocked("Records-owner approval and disposition service are not configured"),
    ],
    ["archive.zip", blocked("ZIP artifact service is not configured")],
  ]);
}

async function handleMalwareScan({ job }: JobExecutionContext) {
  const parsed = z.object({ uploadIntentId: z.string().uuid() }).safeParse(job.payload);
  if (!parsed.success) throw new PermanentJobError("Invalid document malware-scan payload");
  const payload = parsed.data;
  const pipeline = getDocumentStorageRuntime().pipeline;
  const result = await pipeline.processNextScan(`job-${job.id}`, payload.uploadIntentId);
  if (result === "retry") throw new RetryableJobError("Document scan requested a retry");
  if (result === "dead_letter") throw new PermanentJobError("Document scan exhausted retries");
  if (result === "idle") {
    const status = await pipeline.getUploadIntentStatus(payload.uploadIntentId);
    if (status === "promoted" || status === "rejected") {
      return { scanResult: "already_processed", uploadStatus: status };
    }
    throw new RetryableJobError("The document scan item is not currently claimable");
  }
  return { scanResult: result };
}

async function handleDocumentCleanup() {
  const [documentsResult, kycResult] = await Promise.all([
    getDocumentStorageRuntime().pipeline.cleanup(500),
    getKycService().cleanupExpired(200),
  ]);
  return { documents: documentsResult, kyc: kycResult };
}

async function handleAvatarScan({ job }: JobExecutionContext) {
  const parsed = z.object({ avatarIntentId: z.string().uuid() }).safeParse(job.payload);
  if (!parsed.success) throw new PermanentJobError("Invalid avatar-scan payload");
  return getAvatarService().process(parsed.data.avatarIntentId, job.firmId);
}

async function handleKycScan({ job }: JobExecutionContext) {
  const parsed = z.object({ kycIntentId: z.string().uuid() }).safeParse(job.payload);
  if (!parsed.success) throw new PermanentJobError("Invalid KYC malware-scan payload");
  return getKycService().process(parsed.data.kycIntentId, job.firmId);
}

async function handleTaskReminders({ job, signal }: JobExecutionContext) {
  throwIfAborted(signal);
  const now = new Date();
  const due = await database
    .select({ id: tasks.id, userId: tasks.assignedTo, title: tasks.title })
    .from(tasks)
    .where(
      and(
        eq(tasks.firmId, job.firmId),
        inArray(tasks.status, ["todo", "in_progress"]),
        lte(tasks.dueDate, now),
        isNull(tasks.deletedAt),
      ),
    )
    .limit(500);
  let notified = 0;
  for (const task of due) {
    throwIfAborted(signal);
    if (
      await createNotificationEffect(job, `task-reminder:${task.id}`, {
        userId: task.userId,
        title: "Task overdue",
        body: `“${task.title}” is overdue.`,
        type: "task_due",
        relatedId: task.id,
        link: `/staff/tasks?task=${task.id}`,
        update: (transaction) =>
          transaction
            .update(tasks)
            .set({ lastDueReminderAt: now, updatedAt: now })
            .where(eq(tasks.id, task.id)),
      })
    ) {
      notified += 1;
    }
  }
  return { candidates: due.length, notified };
}

async function handleHearingReminders({ job, signal }: JobExecutionContext) {
  throwIfAborted(signal);
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const due = await database
    .select({ id: hearings.id, userId: cases.assignedLawyerId, court: hearings.court })
    .from(hearings)
    .innerJoin(cases, and(eq(cases.id, hearings.caseId), eq(cases.firmId, hearings.firmId)))
    .where(
      and(
        eq(hearings.firmId, job.firmId),
        gte(hearings.dateGregorian, today),
        lte(hearings.dateGregorian, tomorrow),
        inArray(hearings.status, ["scheduled", "postponed", "part_heard", "continuous"]),
        isNull(hearings.deletedAt),
      ),
    )
    .limit(500);
  let notified = 0;
  for (const hearing of due) {
    throwIfAborted(signal);
    if (
      await createNotificationEffect(job, `hearing-reminder:${hearing.id}`, {
        userId: hearing.userId,
        title: "Upcoming hearing",
        body: `A hearing at ${hearing.court} is scheduled within 24 hours.`,
        type: "hearing_reminder",
        relatedId: hearing.id,
        link: `/staff/hearings?hearing=${hearing.id}`,
      })
    ) {
      notified += 1;
    }
  }
  return { candidates: due.length, notified };
}

async function handleSignatureReminders({ job, signal }: JobExecutionContext) {
  throwIfAborted(signal);
  const due = await database
    .select({
      recipientId: signatureRecipients.id,
      envelopeId: signatureEnvelopes.id,
      userId: signatureRecipients.userId,
      title: signatureEnvelopes.title,
    })
    .from(signatureRecipients)
    .innerJoin(
      signatureEnvelopes,
      and(
        eq(signatureEnvelopes.id, signatureRecipients.envelopeId),
        eq(signatureEnvelopes.firmId, signatureRecipients.firmId),
      ),
    )
    .where(
      and(
        eq(signatureRecipients.firmId, job.firmId),
        eq(signatureEnvelopes.status, "sent"),
        inArray(signatureRecipients.status, ["pending", "awaiting_turn"]),
        isNull(signatureRecipients.deletedAt),
      ),
    )
    .limit(500);
  const now = new Date();
  let notified = 0;
  for (const recipient of due) {
    throwIfAborted(signal);
    if (
      await createNotificationEffect(job, `signature-reminder:${recipient.recipientId}`, {
        userId: recipient.userId,
        title: "Signature required",
        body: `“${recipient.title}” is waiting for your signature.`,
        type: "document_request",
        relatedId: recipient.envelopeId,
        link: `/client/signatures?envelope=${recipient.envelopeId}`,
        update: async (transaction) => {
          await transaction
            .update(signatureRecipients)
            .set({ remindedAt: now, updatedAt: now })
            .where(eq(signatureRecipients.id, recipient.recipientId));
          await transaction
            .update(signatureEnvelopes)
            .set({ lastRemindedAt: now, updatedAt: now })
            .where(eq(signatureEnvelopes.id, recipient.envelopeId));
        },
      })
    ) {
      notified += 1;
    }
  }
  return { candidates: due.length, notified };
}

async function handleEnvelopeExpiration({ job }: JobExecutionContext) {
  const now = new Date();
  const expired = await database
    .update(signatureEnvelopes)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(signatureEnvelopes.firmId, job.firmId),
        eq(signatureEnvelopes.status, "sent"),
        lte(signatureEnvelopes.expiresAt, now),
        isNull(signatureEnvelopes.deletedAt),
      ),
    )
    .returning({ id: signatureEnvelopes.id });
  return { expired: expired.length };
}

async function handleAnalyticsAggregation({ job }: JobExecutionContext) {
  const [[caseCount], [taskCount], [documentCount], [invoiceCount]] = await Promise.all([
    database
      .select({ value: count() })
      .from(cases)
      .where(and(eq(cases.firmId, job.firmId), isNull(cases.deletedAt))),
    database
      .select({ value: count() })
      .from(tasks)
      .where(and(eq(tasks.firmId, job.firmId), isNull(tasks.deletedAt))),
    database
      .select({ value: count() })
      .from(documents)
      .where(and(eq(documents.firmId, job.firmId), isNull(documents.deletedAt))),
    database
      .select({ value: count() })
      .from(invoices)
      .where(and(eq(invoices.firmId, job.firmId), isNull(invoices.deletedAt))),
  ]);
  return {
    cases: caseCount.value,
    tasks: taskCount.value,
    documents: documentCount.value,
    invoices: invoiceCount.value,
    aggregatedAt: new Date().toISOString(),
  };
}

async function handleEmailDelivery({ job, signal }: JobExecutionContext) {
  const parsed = z
    .object({
      to: z.string().email(),
      subject: z.string().min(1).max(200),
      text: z.string().min(1).max(50_000),
    })
    .safeParse(job.payload);
  if (!parsed.success) throw new PermanentJobError("Invalid email delivery payload");
  const [alreadySent] = await database
    .select({ id: durableJobEffects.id })
    .from(durableJobEffects)
    .where(and(eq(durableJobEffects.jobId, job.id), eq(durableJobEffects.effectKey, "smtp-sent")))
    .limit(1);
  if (alreadySent) return { delivered: true, duplicateSuppressed: true };
  throwIfAborted(signal);
  const environment = getServerEnvironment();
  const transport = nodemailer.createTransport({
    host: environment.SMTP_HOST,
    port: environment.SMTP_PORT,
    secure: false,
    connectionTimeout: 10_000,
    socketTimeout: 30_000,
  });
  try {
    const result = await transport.sendMail({
      from: environment.SMTP_FROM,
      to: parsed.data.to,
      subject: parsed.data.subject,
      text: parsed.data.text,
      messageId: `<job-${job.id}@lexnepal.local>`,
    });
    await database
      .insert(durableJobEffects)
      .values({
        firmId: job.firmId,
        jobId: job.id,
        effectKey: "smtp-sent",
        details: { messageId: result.messageId, accepted: result.accepted },
      })
      .onConflictDoNothing();
    return { delivered: true, messageId: result.messageId };
  } catch (error) {
    throw new RetryableJobError(error instanceof Error ? error.message : "SMTP delivery failed");
  } finally {
    transport.close();
  }
}

function blocked(reason: string): JobHandler {
  return async () => {
    throw new PermanentJobError(reason);
  };
}

async function createNotificationEffect(
  job: DurableJobRecord,
  effectKey: string,
  input: {
    userId: string;
    title: string;
    body: string;
    type: "task_due" | "hearing_reminder" | "document_request";
    relatedId: string;
    link: string;
    update?: (transaction: Transaction) => Promise<unknown>;
  },
): Promise<boolean> {
  return database.transaction(async (transaction) => {
    const [effect] = await transaction
      .insert(durableJobEffects)
      .values({ firmId: job.firmId, jobId: job.id, effectKey, details: { userId: input.userId } })
      .onConflictDoNothing({
        target: [durableJobEffects.firmId, durableJobEffects.jobId, durableJobEffects.effectKey],
      })
      .returning({ id: durableJobEffects.id });
    if (!effect) return false;
    await transaction.insert(notifications).values({
      firmId: job.firmId,
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type,
      relatedId: input.relatedId,
      link: input.link,
    });
    if (input.update) await input.update(transaction);
    return true;
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason;
}
