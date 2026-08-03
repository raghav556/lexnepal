import "server-only";

export const JOB_TYPES = [
  "document.malware_scan",
  "document.cleanup",
  "document.ocr",
  "document.thumbnail",
  "identity.avatar_scan",
  "kyc.malware_scan",
  "communication.email",
  "communication.sms",
  "reminder.task",
  "reminder.hearing",
  "reminder.signature",
  "envelope.expire",
  "records.dispose",
  "archive.zip",
  "analytics.aggregate",
] as const;

export type JobType = (typeof JOB_TYPES)[number];
export type JobStatus =
  "pending" | "processing" | "retry" | "completed" | "dead_letter" | "cancelled";

export interface DurableJobRecord {
  id: string;
  firmId: string;
  type: JobType;
  idempotencyKey: string;
  payload: unknown;
  status: JobStatus;
  priority: number;
  attempts: number;
  totalAttempts: number;
  maxAttempts: number;
  timeoutSeconds: number;
  availableAt: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  leaseExpiresAt: Date | null;
  actorUserId: string;
  correlationId: string | null;
  lastError: string | null;
  result: unknown;
  completedAt: Date | null;
  deadLetteredAt: Date | null;
  manualRetryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnqueueJobInput {
  firmId: string;
  type: JobType;
  idempotencyKey: string;
  payload?: unknown;
  actorUserId: string;
  correlationId?: string;
  priority?: number;
  maxAttempts?: number;
  timeoutSeconds?: number;
  availableAt?: Date;
}

export interface JobExecutionContext {
  job: DurableJobRecord;
  signal: AbortSignal;
}

export type JobHandler = (context: JobExecutionContext) => Promise<Record<string, unknown>>;
