import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { cases, durableJobs, firmSettings, messages, notifications } from "../../db/schema";
import { migrateCommunicationExport } from "../../src/server/services/communication-migration";
import { createJobWorker } from "../../src/server/jobs/runtime";
import { GET as listMessages, POST as sendMessage } from "../../src/app/api/v1/messages/route";
import { GET as listNotifications } from "../../src/app/api/v1/notifications/route";
import { POST as sendEmail } from "../../src/app/api/v1/communications/email/route";

const database = getDatabase();
const firmA = "61000000-0000-4000-8000-000000000001";
const firmMap = { convex_firm_a: firmA };
const password = "Local-boundary-only-2026!";
const exportPath = "tests/fixtures/convex-communication-export";
const mailSubject = `CRM-verify-mail-${Date.now()}`;

async function signIn(email: string) {
  const response = await getLocalAuth().api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  if (!response.ok) throw new Error(`Sign-in failed for ${email}. Run auth:verify-boundary first.`);
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error("Session cookie missing");
  return cookie;
}

try {
  await database
    .insert(firmSettings)
    .values({
      firmId: firmA,
      key: "rolePermissions",
      value: {
        associate: ["cases.view_all", "cases.manage", "clients.manage", "clients.view_all"],
      },
    })
    .onDuplicateKeyUpdate({
      set: {
        value: {
          associate: ["cases.view_all", "cases.manage", "clients.manage", "clients.view_all"],
        },
        updatedAt: new Date(),
      },
    });

  const first = await migrateCommunicationExport({ exportPath, firmMap });
  const second = await migrateCommunicationExport({ exportPath, firmMap });
  if (!first.reconciliation.passed) {
    throw new Error(`First communication migration failed: ${JSON.stringify(first, null, 2)}`);
  }
  if (!second.reconciliation.passed) {
    throw new Error(`Second communication migration failed: ${JSON.stringify(second, null, 2)}`);
  }

  const [matter] = await database
    .select({ id: cases.id })
    .from(cases)
    .where(eq(cases.firmId, firmA))
    .limit(1);
  if (!matter) throw new Error("Expected migrated matter case for message API proof");

  const cookie = await signIn("boundary-a@example.invalid");
  const headers = { cookie, "content-type": "application/json" };

  const listResponse = await listMessages(
    new Request(`http://local/api/v1/messages?caseId=${matter.id}`, { headers }),
  );
  if (!listResponse.ok) {
    throw new Error(`Messages list failed: ${listResponse.status} ${await listResponse.text()}`);
  }
  const listBody = (await listResponse.json()) as {
    data: { page: Array<{ content: string; _id: string; isInternal: boolean }> };
  };
  if (!listBody.data.page.some((row) => row.content.includes("Fixture staff message") && row._id)) {
    throw new Error("Migrated message missing from list/poll payload");
  }
  if (!listBody.data.page.some((row) => row.isInternal === true)) {
    throw new Error("Staff should see internal messages when polling");
  }

  const notificationsResponse = await listNotifications(
    new Request("http://local/api/v1/notifications", { headers }),
  );
  if (!notificationsResponse.ok) {
    throw new Error(`Notifications list failed: ${notificationsResponse.status}`);
  }
  const notificationsBody = (await notificationsResponse.json()) as {
    data: Array<{ title: string; _id: string }>;
  };
  // Notifications migrate onto identity fixture user; boundary user may have none yet.
  if (!Array.isArray(notificationsBody.data)) {
    throw new Error("Notifications list payload invalid");
  }

  const createResponse = await sendMessage(
    new Request("http://local/api/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        caseId: matter.id,
        content: "Verify-local polled message",
        isInternal: false,
      }),
    }),
  );
  if (!createResponse.ok) {
    throw new Error(`Send message failed: ${createResponse.status} ${await createResponse.text()}`);
  }

  const emailResponse = await sendEmail(
    new Request("http://local/api/v1/communications/email", {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: "mailpit-verify@example.invalid",
        subject: mailSubject,
        body: "Local Mailpit delivery proof from communication:verify-local",
        relatedId: matter.id,
      }),
    }),
  );
  if (!emailResponse.ok) {
    throw new Error(`Send email failed: ${emailResponse.status} ${await emailResponse.text()}`);
  }
  const emailBody = (await emailResponse.json()) as { data: { jobId: string } };
  if (!emailBody.data.jobId) throw new Error("Email enqueue did not return jobId");

  let emailCompleted = false;
  let emailStatus = "missing";
  let workerAttempt = 0;
  const emailDeadline = Date.now() + 30_000;
  while (Date.now() < emailDeadline) {
    const workerResult = await createJobWorker(`communication-verify-${workerAttempt}`).runOnce();
    workerAttempt += 1;
    const [job] = await database
      .select({ status: durableJobs.status })
      .from(durableJobs)
      .where(eq(durableJobs.id, emailBody.data.jobId))
      .limit(1);
    emailStatus = job?.status ?? "missing";
    if (job?.status === "completed") {
      emailCompleted = true;
      break;
    }
    if (job?.status === "dead_letter" || job?.status === "failed") {
      throw new Error(`Email job ended in status=${job.status}`);
    }
    if (workerResult === "idle") {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!emailCompleted) {
    throw new Error(
      `Email job did not complete within 30 seconds (status=${emailStatus}). Is Mailpit on :1025?`,
    );
  }

  const mailpit = await fetch(
    `http://127.0.0.1:8025/api/v1/search?query=${encodeURIComponent(mailSubject)}`,
  );
  if (!mailpit.ok) {
    throw new Error(`Mailpit search failed: ${mailpit.status}. Is Mailpit UI on :8025?`);
  }
  const mailpitBody = (await mailpit.json()) as { messages?: unknown[]; total?: number };
  const hitCount = Array.isArray(mailpitBody.messages)
    ? mailpitBody.messages.length
    : Number(mailpitBody.total ?? 0);
  if (hitCount < 1) {
    throw new Error(`Mailpit did not capture subject ${mailSubject}`);
  }

  const [messageRow] = await database
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.firmId, firmA))
    .limit(1);
  const [notificationRow] = await database
    .select({ id: notifications.id })
    .from(notifications)
    .where(eq(notifications.firmId, firmA))
    .limit(1);
  if (!messageRow || !notificationRow) {
    throw new Error("Expected firm-scoped communication rows after migration");
  }

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        migrated: second.migrated,
        reconciliation: second.reconciliation,
        apiCounts: {
          messages: listBody.data.page.length,
          notificationsForCaller: notificationsBody.data.length,
        },
        email: { jobId: emailBody.data.jobId, mailpitHits: hitCount },
        polling: { messagesRefetchIntervalMs: 5000, notificationsRefetchIntervalMs: 10_000 },
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await closeDatabase();
}
