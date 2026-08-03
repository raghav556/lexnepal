import assert from "node:assert/strict";
import test from "node:test";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  hashSharePassword,
  validateDocumentMetadata,
  verifySharePassword,
} from "../../convex/lib/documentSecurity.ts";
import { DEFAULT_ROLE_PERMISSIONS, isStaffOrAdmin } from "../../convex/lib/roles.ts";

const validDocument = {
  title: "Court filing",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  storageId: "kg2abc123",
};

test("document validation accepts the current allowlist boundary", () => {
  assert.equal(MAX_DOCUMENT_BYTES, 50 * 1024 * 1024);
  assert.ok(ALLOWED_DOCUMENT_MIME_TYPES.has("application/pdf"));
  assert.doesNotThrow(() => validateDocumentMetadata(validDocument));
  assert.doesNotThrow(() =>
    validateDocumentMetadata({ ...validDocument, sizeBytes: MAX_DOCUMENT_BYTES }),
  );
});

test("document validation rejects unsafe metadata boundaries", () => {
  assert.throws(() => validateDocumentMetadata({ ...validDocument, title: "   " }));
  assert.throws(() => validateDocumentMetadata({ ...validDocument, mimeType: "text/html" }));
  assert.throws(() => validateDocumentMetadata({ ...validDocument, sizeBytes: 0 }));
  assert.throws(() =>
    validateDocumentMetadata({ ...validDocument, sizeBytes: MAX_DOCUMENT_BYTES + 1 }),
  );
  assert.throws(() => validateDocumentMetadata({ ...validDocument, storageId: "" }));
});

test("public-share passwords preserve length, hashing and verification behavior", async () => {
  await assert.rejects(() => hashSharePassword("short"));
  const encoded = await hashSharePassword("correct horse battery staple");
  assert.match(encoded, /^pbkdf2-sha256\$210000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.equal(await verifySharePassword("correct horse battery staple", encoded), true);
  assert.equal(await verifySharePassword("incorrect password", encoded), false);
  assert.equal(await verifySharePassword("anything", "invalid"), false);
});

test("document capabilities preserve least-privilege role boundaries", () => {
  assert.equal(isStaffOrAdmin("admin"), true);
  assert.equal(isStaffOrAdmin("partner"), true);
  assert.equal(isStaffOrAdmin("client"), false);
  assert.ok(DEFAULT_ROLE_PERMISSIONS.admin.includes("records.dispose"));
  assert.ok(DEFAULT_ROLE_PERMISSIONS.partner.includes("legalHold.manage"));
  assert.ok(!DEFAULT_ROLE_PERMISSIONS.associate.includes("records.dispose"));
  assert.ok(!DEFAULT_ROLE_PERMISSIONS.client.includes("documents.share"));
});
