import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalObjectStorage } from "@/server/storage/local-object-storage";

let root: string;
let storage: LocalObjectStorage;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "lexnepal-local-storage-test-"));
  storage = new LocalObjectStorage({
    root,
    appBaseUrl: "http://localhost:3001",
  });
  await storage.initialize();
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("LocalObjectStorage", () => {
  it("writes and reads objects with metadata", async () => {
    const bytes = new TextEncoder().encode("hello lexnepal");
    await storage.putObject("protected/firm-1/doc.bin", bytes, "text/plain", {
      sha256: "abc",
    });
    const head = await storage.headObject("protected/firm-1/doc.bin");
    expect(head).not.toBeNull();
    expect(head!.sizeBytes).toBe(bytes.byteLength);
    expect(head!.contentType).toBe("text/plain");
    expect(head!.metadata).toEqual({ sha256: "abc" });
    expect(new TextDecoder().decode(await storage.readObject("protected/firm-1/doc.bin"))).toBe(
      "hello lexnepal",
    );
  });

  it("auto-creates nested directories", async () => {
    await storage.putObject(
      "protected/firm/deep/nest/file.txt",
      new TextEncoder().encode("x"),
      "text/plain",
    );
    const stat = await fs.stat(path.join(root, "protected", "firm", "deep", "nest", "file.txt"));
    expect(stat.size).toBe(1);
  });

  it("returns null for missing objects and throws on missing reads", async () => {
    expect(await storage.headObject("missing/object.txt")).toBeNull();
    await expect(storage.readObject("missing/object.txt")).rejects.toThrow(/does not exist/);
  });

  it("copies objects preserving and overriding metadata", async () => {
    await storage.putObject(
      "quarantine/f-1/a.txt",
      new TextEncoder().encode("data"),
      "text/plain",
      {
        "upload-intent-id": "intent-1",
      },
    );
    await storage.copyObject("quarantine/f-1/a.txt", "rejected/f-1/a.txt", {
      "rejection-code": "VIRUS",
    });
    const copied = await storage.headObject("rejected/f-1/a.txt");
    expect(copied).not.toBeNull();
    expect(copied!.metadata).toEqual({
      "upload-intent-id": "intent-1",
      "rejection-code": "VIRUS",
    });
    expect(new TextDecoder().decode(await storage.readObject("rejected/f-1/a.txt"))).toBe("data");
  });

  it("deletes objects and their metadata", async () => {
    await storage.putObject("quarantine/temp/x.txt", new TextEncoder().encode("y"), "text/plain");
    await storage.deleteObject("quarantine/temp/x.txt");
    expect(await storage.headObject("quarantine/temp/x.txt")).toBeNull();
  });

  it("lists keys under a prefix and skips metadata sidecars", async () => {
    await storage.putObject("protected/f-1/a.txt", new TextEncoder().encode("a"), "text/plain");
    await storage.putObject("protected/f-1/b/c.txt", new TextEncoder().encode("b"), "text/plain");
    await storage.putObject(
      "protected/f-1/data.json",
      new TextEncoder().encode("{}"),
      "application/json",
    );
    await storage.putObject("protected/f-2/d.txt", new TextEncoder().encode("d"), "text/plain");
    const keys = await storage.listKeys("protected/f-1/");
    expect(keys).toEqual([
      "protected/f-1/a.txt",
      "protected/f-1/b/c.txt",
      "protected/f-1/data.json",
    ]);
  });

  it("rejects path traversal keys", async () => {
    await expect(
      storage.putObject("../escape.txt", new TextEncoder().encode("x"), "text/plain"),
    ).rejects.toThrow(/invalid|escapes/i);
    await expect(storage.readObject("quarantine/../../etc/passwd")).rejects.toThrow(
      /invalid|escapes/i,
    );
    await expect(storage.headObject("protected/..%2F..%2Fsecret")).rejects.toThrow(
      /invalid|escapes/i,
    );
    await expect(storage.listKeys("../")).rejects.toThrow(/invalid|escapes/i);
    await expect(storage.readObject("/absolute/path.txt")).rejects.toThrow(/invalid|escapes/i);
    await expect(storage.readObject("C:/absolute/path.txt")).rejects.toThrow(/invalid|escapes/i);
    await expect(storage.readObject("protected\\..\\escape.txt")).rejects.toThrow(
      /invalid|escapes/i,
    );
    await expect(storage.readObject("protected/%2e%2e/escape.txt")).rejects.toThrow(
      /invalid|escapes/i,
    );
    expect(await fs.stat(root).catch(() => null)).not.toBeNull();
    const escaped = path.join(path.dirname(root), "escape.txt");
    expect(await fs.stat(escaped).catch(() => null)).toBeNull();
  });

  it("issues single-use expiring upload grants", async () => {
    const grant = await storage.createUploadGrant({
      key: "quarantine/f-1/upload.bin",
      contentType: "application/pdf",
      maxBytes: 100,
      intentId: "intent-42",
      expiresInSeconds: 60,
    });
    expect(grant.url).toContain("/api/v1/storage/uploads/");
    expect(grant.fields.key).toBe("quarantine/f-1/upload.bin");
    const bytes = new TextEncoder().encode("%PDF-1.7 small");
    const stored = await storage.storeGrantedUpload(grant.fields.grantId, bytes);
    expect(stored.key).toBe("quarantine/f-1/upload.bin");
    expect(stored.metadata["upload-intent-id"]).toBe("intent-42");
    // Grant is consumed — a second use is rejected.
    await expect(storage.storeGrantedUpload(grant.fields.grantId, bytes)).rejects.toThrow(
      /invalid or expired/i,
    );
    // Size bound is enforced.
    const bounded = await storage.createUploadGrant({
      key: "quarantine/f-1/big.bin",
      contentType: "application/pdf",
      maxBytes: 4,
      intentId: "intent-43",
      expiresInSeconds: 60,
    });
    await expect(
      storage.storeGrantedUpload(
        bounded.fields.grantId,
        new TextEncoder().encode("too many bytes"),
      ),
    ).rejects.toThrow(/size/i);
  });

  it("allows only one concurrent consumer of an upload grant", async () => {
    const grant = await storage.createUploadGrant({
      key: "quarantine/f-1/concurrent.bin",
      contentType: "application/octet-stream",
      maxBytes: 10,
      intentId: "intent-concurrent",
      expiresInSeconds: 60,
    });
    const attempts = await Promise.allSettled([
      storage.storeGrantedUpload(grant.fields.grantId, new Uint8Array([1])),
      storage.storeGrantedUpload(grant.fields.grantId, new Uint8Array([2])),
    ]);
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
  });

  it("rejects unknown and expired upload grants", async () => {
    expect(await storage.consumeUploadGrant("00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(await storage.consumeUploadGrant("not-a-uuid")).toBeNull();
    const expired = await storage.createUploadGrant({
      key: "quarantine/f-1/e.bin",
      contentType: "text/plain",
      maxBytes: 10,
      intentId: "intent-44",
      expiresInSeconds: -1,
    });
    expect(await storage.consumeUploadGrant(expired.fields.grantId)).toBeNull();
  });

  it("mints download URLs bound to one key with expiry and token verification", async () => {
    await storage.putObject(
      "protected/f-1/doc.pdf",
      new TextEncoder().encode("pdf"),
      "application/pdf",
    );
    const url = await storage.createDownloadUrl("protected/f-1/doc.pdf", 60);
    expect(url).toContain("/api/v1/storage/objects/protected/f-1/doc.pdf");
    const token = new URL(url).searchParams.get("token") ?? "";
    expect(await storage.resolveDownloadToken("protected/f-1/doc.pdf", token)).toBe(true);
    // Token is bound to the key — a different key is rejected.
    expect(await storage.resolveDownloadToken("protected/f-2/doc.pdf", token)).toBe(false);
    // Forged / missing tokens are rejected.
    expect(await storage.resolveDownloadToken("protected/f-1/doc.pdf", "forged.token")).toBe(false);
    expect(await storage.resolveDownloadToken("protected/f-1/doc.pdf", "")).toBe(false);
    // Expired token is rejected.
    const expiredUrl = await storage.createDownloadUrl("protected/f-1/doc.pdf", -1);
    const expiredToken = new URL(expiredUrl).searchParams.get("token") ?? "";
    expect(await storage.resolveDownloadToken("protected/f-1/doc.pdf", expiredToken)).toBe(false);
  });
});
