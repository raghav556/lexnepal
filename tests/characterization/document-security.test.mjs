/**
 * Characterization: the document security boundaries carried over from Convex must keep holding on
 * the Next/Postgres stack — upload limits, MIME allowlist, share-password hashing, role capabilities.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  validateUploadedFile,
} from "../../src/server/storage/file-validation.ts";
import { hashSharePassword, verifySharePassword } from "../../src/server/security/share-password.ts";
import { DEFAULT_ROLE_PERMISSIONS } from "../../src/server/auth/capabilities.ts";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

function pdfUpload(overrides = {}) {
  return {
    bytes: PDF_BYTES,
    declaredMimeType: "application/pdf",
    declaredSizeBytes: PDF_BYTES.byteLength,
    storedMimeType: "application/pdf",
    storedSizeBytes: PDF_BYTES.byteLength,
    ...overrides,
  };
}

test("document validation accepts the current allowlist boundary", () => {
  assert.equal(MAX_DOCUMENT_BYTES, 50 * 1024 * 1024);
  assert.ok(ALLOWED_DOCUMENT_MIME_TYPES.has("application/pdf"));
  assert.doesNotThrow(() => validateUploadedFile(pdfUpload()));
});

test("document validation rejects unsafe metadata boundaries", () => {
  assert.throws(() => validateUploadedFile(pdfUpload({ declaredMimeType: "text/html" })), {
    code: "UNSUPPORTED_MIME",
  });
  assert.throws(
    () =>
      validateUploadedFile(
        pdfUpload({ bytes: new Uint8Array(), declaredSizeBytes: 0, storedSizeBytes: 0 }),
      ),
    { code: "EMPTY_FILE" },
  );
  assert.throws(() => validateUploadedFile(pdfUpload({ declaredSizeBytes: 999 })), {
    code: "SIZE_MISMATCH",
  });
  assert.throws(() => validateUploadedFile(pdfUpload({ storedMimeType: "image/png" })), {
    code: "MIME_MISMATCH",
  });
  assert.throws(
    () =>
      validateUploadedFile(
        pdfUpload({
          bytes: new Uint8Array([0x00, 0x01, 0x02, 0x03]),
          declaredSizeBytes: 4,
          storedSizeBytes: 4,
        }),
      ),
    { code: "MAGIC_BYTES_MISMATCH" },
  );
  assert.throws(() => validateUploadedFile(pdfUpload({ expectedSha256: "deadbeef" })), {
    code: "SHA256_MISMATCH",
  });
});

test("public-share passwords preserve length, hashing and verification behavior", () => {
  assert.throws(() => hashSharePassword("short"));
  const encoded = hashSharePassword("correct horse battery staple");
  assert.match(encoded, /^pbkdf2-sha256\$210000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.equal(verifySharePassword("correct horse battery staple", encoded), true);
  assert.equal(verifySharePassword("incorrect password", encoded), false);
  assert.equal(verifySharePassword("anything", "invalid"), false);
});

test("document capabilities preserve least-privilege role boundaries", () => {
  assert.ok(DEFAULT_ROLE_PERMISSIONS.admin.includes("records.dispose"));
  assert.ok(DEFAULT_ROLE_PERMISSIONS.partner.includes("legalHold.manage"));
  assert.ok(!DEFAULT_ROLE_PERMISSIONS.associate.includes("records.dispose"));
  assert.ok(!DEFAULT_ROLE_PERMISSIONS.client.includes("documents.share"));
});
