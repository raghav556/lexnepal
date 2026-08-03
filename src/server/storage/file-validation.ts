import "server-only";
import { createHash } from "node:crypto";

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

export type FileRejectionCode =
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_MIME"
  | "SIZE_MISMATCH"
  | "MIME_MISMATCH"
  | "MAGIC_BYTES_MISMATCH"
  | "SHA256_MISMATCH";

export class FileValidationError extends Error {
  constructor(
    public readonly code: FileRejectionCode,
    message: string,
  ) {
    super(message);
    this.name = "FileValidationError";
  }
}

export interface ValidatedFile {
  bytes: Uint8Array;
  sha256: string;
  mimeType: string;
  sizeBytes: number;
}

export function validateUploadedFile(input: {
  bytes: Uint8Array;
  declaredMimeType: string;
  declaredSizeBytes: number;
  storedMimeType: string | null;
  storedSizeBytes: number;
  expectedSha256?: string | null;
}): ValidatedFile {
  const mimeType = input.declaredMimeType.toLowerCase();
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) {
    throw new FileValidationError(
      "UNSUPPORTED_MIME",
      `Unsupported document MIME type: ${mimeType}`,
    );
  }
  if (input.bytes.byteLength === 0)
    throw new FileValidationError("EMPTY_FILE", "The uploaded file is empty");
  if (input.bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new FileValidationError("FILE_TOO_LARGE", "The uploaded file exceeds 50 MB");
  }
  if (
    input.declaredSizeBytes !== input.bytes.byteLength ||
    input.storedSizeBytes !== input.bytes.byteLength
  ) {
    throw new FileValidationError("SIZE_MISMATCH", "Declared, stored and actual file sizes differ");
  }
  if (input.storedMimeType && normalizeMime(input.storedMimeType) !== mimeType) {
    throw new FileValidationError("MIME_MISMATCH", "Declared and stored MIME types differ");
  }
  if (!matchesMagicBytes(input.bytes, mimeType)) {
    throw new FileValidationError(
      "MAGIC_BYTES_MISMATCH",
      "File content does not match its declared MIME type",
    );
  }
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  if (input.expectedSha256 && input.expectedSha256.toLowerCase() !== sha256) {
    throw new FileValidationError(
      "SHA256_MISMATCH",
      "The uploaded file checksum does not match the intent",
    );
  }
  return { bytes: input.bytes, sha256, mimeType, sizeBytes: input.bytes.byteLength };
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeMime(value: string): string {
  return value.split(";", 1)[0].trim().toLowerCase();
}

function matchesMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "application/pdf") return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (mimeType === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/png")
    return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === "image/tiff") {
    return (
      startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])
    );
  }
  if (mimeType === "application/msword")
    return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (mimeType === "text/plain") {
    if (bytes.subarray(0, Math.min(bytes.length, 8_192)).includes(0)) return false;
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.subarray(0, Math.min(bytes.length, 8_192)),
      );
      return true;
    } catch {
      return false;
    }
  }
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return false;
  const archiveNames = new TextDecoder("latin1").decode(bytes);
  if (mimeType.endsWith("wordprocessingml.document")) return archiveNames.includes("word/");
  if (mimeType.endsWith("spreadsheetml.sheet")) return archiveNames.includes("xl/");
  if (mimeType.endsWith("presentationml.presentation")) return archiveNames.includes("ppt/");
  return false;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}
