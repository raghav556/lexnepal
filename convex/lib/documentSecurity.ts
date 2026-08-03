import { ConvexError } from "convex/values";

export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "text/plain",
]);

export function validateDocumentMetadata(args: {
  title: string;
  mimeType: string;
  sizeBytes: number;
  storageId: string;
}) {
  const title = args.title.trim();
  if (!title || title.length > 240) {
    throw new ConvexError("Document title must be between 1 and 240 characters");
  }
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(args.mimeType.toLowerCase())) {
    throw new ConvexError(`Unsupported document type: ${args.mimeType}`);
  }
  if (!Number.isSafeInteger(args.sizeBytes) || args.sizeBytes <= 0 || args.sizeBytes > MAX_DOCUMENT_BYTES) {
    throw new ConvexError("Document size must be between 1 byte and 50 MB");
  }
  if (!args.storageId || args.storageId.length > 512) {
    throw new ConvexError("Invalid storage identifier");
  }
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) return null;
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function randomHex(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

const SHARE_PASSWORD_ITERATIONS = 210_000;

export async function hashSharePassword(password: string): Promise<string> {
  if (password.length < 10 || password.length > 128) {
    throw new ConvexError("Share passwords must be between 10 and 128 characters");
  }
  const salt = randomHex(16);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(salt)!, iterations: SHARE_PASSWORD_ITERATIONS },
    key,
    256,
  ));
  return `pbkdf2-sha256$${SHARE_PASSWORD_ITERATIONS}$${salt}$${bytesToHex(derived)}`;
}

export async function verifySharePassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, iterationsRaw, saltHex, expectedHex] = encoded.split("$");
  const salt = hexToBytes(saltHex || "");
  const expected = hexToBytes(expectedHex || "");
  const iterations = Number(iterationsRaw);
  if (algorithm !== "pbkdf2-sha256" || !salt || !expected || !Number.isInteger(iterations)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const actual = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    expected.length * 8,
  ));
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actual.length; i++) mismatch |= actual[i] ^ expected[i];
  return mismatch === 0;
}
