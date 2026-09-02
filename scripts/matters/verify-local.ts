import { returningUpsert } from "@/server/db/mysql-returning";
import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../../src/server/db/client";
import { getLocalAuth } from "../../src/server/auth/local-auth";
import { authUsers, cases, clients, firmSettings, users } from "../../db/schema";
import { GET as listClients } from "../../src/app/api/v1/clients/route";
import { GET as getClient } from "../../src/app/api/v1/clients/[id]/route";
import { GET as getCase } from "../../src/app/api/v1/cases/[id]/route";
import { POST as searchConflicts } from "../../src/app/api/v1/conflict-checks/search/route";
import { POST as createKycIntent } from "../../src/app/api/v1/clients/me/kyc-upload-intents/route";
import { POST as completeKycIntent } from "../../src/app/api/v1/clients/me/kyc-upload-intents/[intentId]/complete/route";
import { POST as submitKyc } from "../../src/app/api/v1/clients/me/kyc-submissions/route";
import { POST as reviewKyc } from "../../src/app/api/v1/clients/[id]/kyc-review/route";
import { getKycService } from "../../src/server/services/kyc-service";
import { getDocumentStorageRuntime } from "../../src/server/storage/runtime";

const database = getDatabase();
const firmA = "61000000-0000-4000-8000-000000000001";
const firmB = "61000000-0000-4000-8000-000000000002";
const password = "Local-boundary-only-2026!";

try {
  await database
    .insert(firmSettings)
    .values({
      firmId: firmA,
      key: "rolePermissions",
      value: {
        associate: [
          "users.manage",
          "users.view_directory",
          "clients.view_all",
          "clients.manage",
          "kyc.review",
          "cases.view_all",
          "cases.manage",
          "conflicts.manage",
        ],
      },
    })
    .onDuplicateKeyUpdate({
      set: {
        value: {
          associate: [
            "users.manage",
            "users.view_directory",
            "clients.view_all",
            "clients.manage",
            "kyc.review",
            "cases.view_all",
            "cases.manage",
            "conflicts.manage",
          ],
        },
        updatedAt: new Date(),
      },
    });
  const staffCookie = await signIn("boundary-a@example.invalid");
  const [staffB] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "boundary-b@example.invalid"))
    .limit(1);

  const clientEmail = "kyc-boundary-client@example.invalid";
  const [clientUser] = await returningUpsert(
    database
      .insert(users)
      .values({
        firmId: firmA,
        tokenIdentifier: `boundary:${clientEmail}`,
        email: clientEmail,
        name: "KYC Boundary Client",
        role: "client",
        isActive: true,
        isPending: false,
      })
      .onDuplicateKeyUpdate({
        set: { role: "client", isActive: true, isPending: false, updatedAt: new Date() },
      }),
    () => database.select().from(users).where(eq(users.email, clientEmail)).limit(1),
  );
  const [existingAuth] = await database
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.lexnepalUserId, clientUser.id))
    .limit(1);
  if (existingAuth) await database.delete(authUsers).where(eq(authUsers.id, existingAuth.id));
  const createdAuth = await getLocalAuth().api.createUser({
    body: {
      name: "KYC Boundary Client",
      email: clientEmail,
      password,
      role: "user",
      data: { lexnepalUserId: clientUser.id },
    },
  });
  await database
    .update(authUsers)
    .set({ emailVerified: true })
    .where(eq(authUsers.id, createdAuth.user.id));
  const [client] = await returningUpsert(
    database
      .insert(clients)
      .values({
        firmId: firmA,
        legacyConvexId: "matters-local-kyc-client",
        userId: clientUser.id,
        type: "individual",
        fullName: "KYC Boundary Client",
        email: clientEmail,
        kycStatus: "pending",
        isActive: true,
      })
      .onDuplicateKeyUpdate({
        set: {
          userId: clientUser.id,
          kycStatus: "pending",
          kycIdNumber: null,
          updatedAt: new Date(),
        },
      }),
    () =>
      database
        .select()
        .from(clients)
        .where(eq(clients.legacyConvexId, "matters-local-kyc-client"))
        .limit(1),
  );
  const clientCookie = await signIn(clientEmail);

  const [foreignClient] = await returningUpsert(
    database
      .insert(clients)
      .values({
        firmId: firmB,
        legacyConvexId: "matters-cross-firm-client",
        type: "individual",
        fullName: "ForeignCollisionName",
        kycStatus: "pending",
        isActive: true,
      })
      .onDuplicateKeyUpdate({ set: { fullName: "ForeignCollisionName", updatedAt: new Date() } }),
    () =>
      database
        .select()
        .from(clients)
        .where(eq(clients.legacyConvexId, "matters-cross-firm-client"))
        .limit(1),
  );
  const [foreignCase] = await returningUpsert(
    database
      .insert(cases)
      .values({
        firmId: firmB,
        legacyConvexId: "matters-cross-firm-case",
        caseNumber: "FOREIGN-CASE-1",
        title: "ForeignCollisionName Matter",
        practiceArea: "Civil",
        status: "active",
        clientId: foreignClient.id,
        assignedLawyerId: staffB.id,
        conflictChecked: false,
      })
      .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } }),
    () =>
      database
        .select()
        .from(cases)
        .where(eq(cases.legacyConvexId, "matters-cross-firm-case"))
        .limit(1),
  );

  const anonymous = await listClients(new Request("http://local/api/v1/clients"));
  const staffList = await listClients(
    new Request("http://local/api/v1/clients", { headers: { cookie: staffCookie } }),
  );
  const staffBody = await staffList.json();
  const crossClient = await getClient(
    new Request(`http://local/api/v1/clients/${foreignClient.id}`, {
      headers: { cookie: staffCookie },
    }),
  );
  const crossCase = await getCase(
    new Request(`http://local/api/v1/cases/${foreignCase.id}`, {
      headers: { cookie: staffCookie },
    }),
  );
  const conflict = await searchConflicts(
    new Request("http://local/api/v1/conflict-checks/search", {
      method: "POST",
      headers: { cookie: staffCookie, "content-type": "application/json" },
      body: JSON.stringify({ query: "ForeignCollisionName" }),
    }),
  );
  const conflictBody = (await conflict.json()) as { data: { hits: unknown[] } };

  const cleanPdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF");
  const governmentId = await uploadAndScan(
    clientCookie,
    cleanPdf,
    "government-id.pdf",
    "government_id",
  );
  const addressProof = await uploadAndScan(
    clientCookie,
    cleanPdf,
    "address-proof.pdf",
    "proof_of_address",
  );
  const eicar = new TextEncoder().encode(
    "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
  );
  const engineVerdict = await getDocumentStorageRuntime().scanner.scan(eicar, "application/pdf");
  const infected = await uploadAndScan(clientCookie, eicar, "infected.pdf", "other", true);
  const submission = await submitKyc(
    new Request("http://local/api/v1/clients/me/kyc-submissions", {
      method: "POST",
      headers: { cookie: clientCookie, "content-type": "application/json" },
      body: JSON.stringify({
        uploadIntentIds: [governmentId, addressProof],
        address: "Kathmandu",
        idNumber: "KYC-LOCAL-1",
        consentAccepted: true,
      }),
    }),
  );
  const review = await reviewKyc(
    new Request(`http://local/api/v1/clients/${client.id}/kyc-review`, {
      method: "POST",
      headers: { cookie: staffCookie, "content-type": "application/json" },
      body: JSON.stringify({ decision: "verified" }),
    }),
  );

  if (
    anonymous.status !== 401 ||
    staffList.status !== 200 ||
    JSON.stringify(staffBody).includes("KYC-LOCAL-1")
  )
    throw new Error("Client authorization or sensitive DTO verification failed");
  if (
    crossClient.status !== 404 ||
    crossCase.status !== 404 ||
    conflict.status !== 201 ||
    conflictBody.data.hits.length !== 0
  )
    throw new Error("Cross-firm isolation failed");
  if (
    engineVerdict.verdict !== "infected" ||
    infected !== "rejected" ||
    submission.status !== 201 ||
    review.status !== 200
  )
    throw new Error("KYC scanning/submission/review workflow failed");
  process.stdout.write(
    `${JSON.stringify({ passed: true, anonymous: 401, crossFirmClient: 404, crossFirmCase: 404, crossFirmConflictHits: 0, cleanKycPromoted: 2, eicarRejected: true, submission: 201, review: 200, sensitiveDtoExcluded: true })}\n`,
  );
} finally {
  await closeDatabase();
}

async function signIn(email: string) {
  const response = await getLocalAuth().api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  if (!response.ok) throw new Error(`Sign-in failed for ${email}`);
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error("Session cookie missing");
  return cookie;
}
async function uploadAndScan(
  cookie: string,
  bytes: Uint8Array,
  fileName: string,
  documentType: "government_id" | "proof_of_address" | "other",
  expectRejected = false,
) {
  const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const response = await createKycIntent(
    new Request("http://local/api/v1/clients/me/kyc-upload-intents", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        fileName,
        mimeType: "application/pdf",
        sizeBytes: bytes.byteLength,
        sha256,
        documentType,
      }),
    }),
  );
  if (response.status !== 201) throw new Error(`KYC intent failed: ${response.status}`);
  const { data } = (await response.json()) as {
    data: { intentId: string; upload: { url: string; fields: Record<string, string> } };
  };
  const form = new FormData();
  Object.entries(data.upload.fields).forEach(([key, value]) => form.append(key, value));
  form.append("file", new Blob([bytes], { type: "application/pdf" }), fileName);
  const stored = await fetch(data.upload.url, { method: "POST", body: form });
  if (!stored.ok) throw new Error(`Local storage upload failed: ${stored.status}`);
  const completed = await completeKycIntent(
    new Request(`http://local/api/v1/clients/me/kyc-upload-intents/${data.intentId}/complete`, {
      method: "POST",
      headers: { cookie },
    }),
  );
  if (expectRejected && completed.status === 422) return "rejected";
  if (completed.status !== 202) throw new Error(`KYC completion failed: ${completed.status}`);
  const result = await getKycService().process(data.intentId, firmA);
  if (expectRejected && result.status !== "rejected") throw new Error("EICAR was not rejected");
  if (!expectRejected && result.status !== "promoted")
    throw new Error("Clean KYC file was not promoted");
  return expectRejected ? result.status : data.intentId;
}
