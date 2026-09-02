import { returningInsert } from "@/server/db/mysql-returning";
import { sql } from "drizzle-orm";
import { and, asc, eq, isNull } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { durableSchedules, firms, users } from "../../src/server/db/schema";
import type { JobType } from "../../src/server/jobs/types";

const database = getDatabase();
const activeFirms = await database
  .select({ id: firms.id })
  .from(firms)
  .where(and(eq(firms.isActive, true), isNull(firms.deletedAt)));
let created = 0;
for (const firm of activeFirms) {
  const [actor] = await database
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.firmId, firm.id),
        eq(users.role, "admin"),
        eq(users.isActive, true),
        eq(users.isPending, false),
        isNull(users.deletedAt),
      ),
    )
    .orderBy(asc(users.createdAt))
    .limit(1);
  if (!actor) continue;
  const schedules: Array<{
    name: string;
    jobType: JobType;
    intervalSeconds: number;
    nextRunAt: Date;
    timeoutSeconds?: number;
  }> = [
    {
      name: "task-reminders-daily",
      jobType: "reminder.task",
      intervalSeconds: 86_400,
      nextRunAt: nextUtcTime(1, 30),
    },
    {
      name: "hearing-reminders-daily",
      jobType: "reminder.hearing",
      intervalSeconds: 86_400,
      nextRunAt: nextUtcTime(1, 35),
    },
    {
      name: "signature-reminders-daily",
      jobType: "reminder.signature",
      intervalSeconds: 86_400,
      nextRunAt: nextUtcTime(1, 40),
    },
    {
      name: "envelope-expiration-hourly",
      jobType: "envelope.expire",
      intervalSeconds: 3_600,
      nextRunAt: new Date(Date.now() + 60_000),
    },
    {
      name: "document-cleanup-hourly",
      jobType: "document.cleanup",
      intervalSeconds: 3_600,
      nextRunAt: new Date(Date.now() + 2 * 60_000),
    },
    {
      name: "analytics-daily",
      jobType: "analytics.aggregate",
      intervalSeconds: 86_400,
      nextRunAt: nextUtcTime(2, 30),
    },
  ];
  for (const schedule of schedules) {
    const inserted = await returningInsert(
      database
        .insert(durableSchedules)
        .values({
          firmId: firm.id,
          actorUserId: actor.id,
          name: schedule.name,
          jobType: schedule.jobType,
          intervalSeconds: schedule.intervalSeconds,
          nextRunAt: schedule.nextRunAt,
          timeoutSeconds: schedule.timeoutSeconds ?? 300,
        })
        .onDuplicateKeyUpdate({ set: { id: sql.raw("id") } })
        .$returningId(),
      (id) => database.select().from(durableSchedules).where(eq(durableSchedules.id, id)).limit(1),
    );
    created += inserted.length;
  }
}
process.stdout.write(
  `${JSON.stringify({ firms: activeFirms.length, schedulesCreated: created })}\n`,
);
await closeDatabase();

function nextUtcTime(hour: number, minute: number): Date {
  const now = new Date();
  const candidate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute),
  );
  if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate() + 1);
  return candidate;
}
