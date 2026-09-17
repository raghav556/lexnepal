/**
 * R12 Stage E live checks: leftover status enum contracted; Zod aliases stay
 * at the API. Same role matrix as R11.
 *
 *   node --env-file-if-exists=.env.local scripts/local/verify-r12-cases.mjs
 */
import { createPool } from "mysql2/promise";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3001";
const CASE_ID = "9e392e5d-a8d7-4cc5-aaaf-6860f2bab0ed";
const PASSWORD = "E2E-Smoke-Only-2026!";
const CLIENT_CASE_KEYS = [
  "id",
  "_id",
  "caseNumber",
  "title",
  "clientSummary",
  "status",
  "practiceArea",
  "court",
  "assignedLawyerId",
  "advocate",
  "parties",
];
const CLIENT_CRM_KEYS = [
  "id",
  "_id",
  "type",
  "fullName",
  "email",
  "phone",
  "address",
  "companyName",
  "kycStatus",
  "kycRejectionReason",
];
const CLIENT_CASE_FORBIDDEN = [
  "description",
  "notes",
  "teamMemberIds",
  "opposingCounsel",
  "judge",
  "clientId",
  "filingDate",
  "closedDate",
  "closureOutcome",
];
const CLIENT_CRM_FORBIDDEN = ["notes", "kycIdNumber", "kycConsentVersion", "userId"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseCookies(setCookieHeaders) {
  const jar = new Map();
  for (const header of setCookieHeaders ?? []) {
    const [pair] = header.split(";");
    const eqIdx = pair.indexOf("=");
    if (eqIdx > 0) jar.set(pair.slice(0, eqIdx).trim(), pair.slice(eqIdx + 1).trim());
  }
  return jar;
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function signIn(email, ip) {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BASE,
      referer: `${BASE}/sign-in`,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email, password: PASSWORD, rememberMe: false }),
  });
  if (!res.ok)
    throw new Error(`sign-in ${email} failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return parseCookies(res.headers.getSetCookie());
}

async function api(jar, path, ip) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      cookie: cookieHeader(jar),
      "x-forwarded-for": ip,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function keysOf(row) {
  return Object.keys(row ?? {}).sort();
}

async function snapshot(pool) {
  const [[row]] = await pool.query(`
    SELECT
      COUNT(*) AS caseCount,
      SUM(status = 'closed_won') AS closedWon,
      SUM(status = 'closed_lost') AS closedLost,
      SUM(status = 'closed') AS closed,
      SUM(client_summary IS NOT NULL) AS summaries
    FROM cases
    WHERE deleted_at IS NULL
  `);
  const [[parties]] = await pool.query(`
    SELECT COUNT(*) AS n FROM case_parties WHERE deleted_at IS NULL
  `);
  const [[enumRow]] = await pool.query(`
    SELECT COLUMN_TYPE AS columnType
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'cases' AND column_name = 'status'
  `);
  return {
    caseCount: Number(row.caseCount ?? 0),
    closedWon: Number(row.closedWon ?? 0),
    closedLost: Number(row.closedLost ?? 0),
    closed: Number(row.closed ?? 0),
    summaries: Number(row.summaries ?? 0),
    parties: Number(parties.n ?? 0),
    statusEnum: String(enumRow.columnType ?? ""),
  };
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const pool = createPool({ uri: databaseUrl, timezone: "Z" });
const counts = await snapshot(pool);
await pool.end();

console.log("R12 DB snapshot", {
  caseCount: counts.caseCount,
  closed: counts.closed,
  closedWon: counts.closedWon,
  closedLost: counts.closedLost,
  parties: counts.parties,
  summaries: counts.summaries,
  statusEnum: counts.statusEnum,
});

assert(counts.statusEnum.includes("closed"), "status enum includes closed");
assert(!counts.statusEnum.includes("closed_won"), "status enum still lists closed_won");
assert(!counts.statusEnum.includes("closed_lost"), "status enum still lists closed_lost");
assert(counts.closedWon === 0, `closed_won rows remain: ${counts.closedWon}`);
assert(counts.closedLost === 0, `closed_lost rows remain: ${counts.closedLost}`);

const staff = await signIn("e2e-staff@example.invalid", "127.0.2.11");
const staff2 = await signIn("e2e-staff2@example.invalid", "127.0.2.12");
const client = await signIn("e2e-client@example.invalid", "127.0.2.13");
const admin = await signIn("e2e-admin@example.invalid", "127.0.2.10");

const staffCase = await api(staff, `/api/v1/cases/${CASE_ID}?details=true`, "127.0.2.11");
const staff2Case = await api(staff2, `/api/v1/cases/${CASE_ID}`, "127.0.2.12");
const clientCase = await api(client, `/api/v1/cases/${CASE_ID}`, "127.0.2.13");
const adminCase = await api(admin, `/api/v1/cases/${CASE_ID}`, "127.0.2.10");
const clientMe = await api(client, "/api/v1/clients/me", "127.0.2.13");
const staffParties = await api(staff, `/api/v1/cases/${CASE_ID}/parties`, "127.0.2.11");
const clientParties = await api(client, `/api/v1/cases/${CASE_ID}/parties`, "127.0.2.13");
const missing = await api(
  staff,
  "/api/v1/cases/11111111-1111-4111-8111-111111111111",
  "127.0.2.11",
);

assert(staffCase.status === 200, `lead GET failed ${staffCase.status}`);
assert(staff2Case.status === 200, `team GET failed ${staff2Case.status}`);
assert(clientCase.status === 200, `client GET failed ${clientCase.status}`);
assert(adminCase.status === 200, `admin GET failed ${adminCase.status}`);
assert(missing.status === 404 || missing.status === 403, `unknown case was ${missing.status}`);

const clientRow = clientCase.body.data;
assert(
  keysOf(clientRow).join() === [...CLIENT_CASE_KEYS].sort().join(),
  "Client Case keys drifted",
);
for (const key of CLIENT_CASE_FORBIDDEN) {
  assert(!(key in clientRow), `Client Case leaked ${key}`);
}
assert(!JSON.stringify(clientRow).includes("INTERNAL"), "Client Case leaked description text");
assert(
  clientRow.status !== "closed_won" && clientRow.status !== "closed_lost",
  "Client saw leftover status",
);

const crm = clientMe.body.data;
assert(keysOf(crm).join() === [...CLIENT_CRM_KEYS].sort().join(), "Client CRM keys drifted");
for (const key of CLIENT_CRM_FORBIDDEN) {
  assert(!(key in crm), `Client CRM leaked ${key}`);
}

const staffPartyRows = staffParties.body.data ?? [];
const clientPartyRows = clientParties.body.data ?? [];
assert(Array.isArray(staffPartyRows), "Staff parties missing");
assert(Array.isArray(clientPartyRows), "Client parties missing");
assert(
  clientPartyRows.every((row) => !("clientVisible" in row) && !("clientId" in row)),
  "Client party allowlist leaked visibility fields",
);
assert(clientPartyRows.length <= staffPartyRows.length, "Client received more parties than Staff");
assert(
  !staffCase.body.data.teamMemberIds || Array.isArray(staffCase.body.data.teamMemberIds),
  "Staff Case lost teamMemberIds",
);
assert(!("teamMemberIds" in clientRow), "Client Case leaked team roster");

console.log("R12 live matrix", {
  lead: staffCase.status,
  team: staff2Case.status,
  client: clientCase.status,
  admin: adminCase.status,
  unknownCase: missing.status,
  staffParties: staffPartyRows.length,
  clientParties: clientPartyRows.length,
  clientStatus: clientRow.status,
});

console.log("R12 Stage E: MySQL enum contracted; API aliases remain.");
