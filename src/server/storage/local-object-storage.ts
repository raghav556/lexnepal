import "server-only";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { ObjectStorage, StoredObject, UploadGrant } from "@/server/storage/object-storage";
import { getServerEnvironment } from "@/server/env";

export interface LocalObjectStorageOptions {
  /** Absolute or repo-relative root directory for all stored objects. */
  root: string;
  /** Base origin for app-controlled upload/download endpoints (no trailing slash). */
  appBaseUrl: string;
}

const UPLOADS_DIRECTORY = "__uploads__";
const METADATA_SUFFIX = ".metadata.json";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Local filesystem implementation of the ObjectStorage port. Keys keep the S3-style
 * `folder/object` identifiers already persisted in the database (`protected/<firmId>/...`,
 * `quarantine/...`, `rejected/...`); each key maps to `<root>/<key>` plus a sidecar
 * `.metadata.json`. Presigned S3 URLs are replaced by app-controlled,
 * authorization-checked endpoints under `/api/v1/storage/...` served by this app.
 */
export class LocalObjectStorage implements ObjectStorage {
  private readonly root: string;
  private readonly appBaseUrl: string;

  constructor(options: LocalObjectStorageOptions) {
    this.root = path.resolve(options.root);
    this.appBaseUrl = options.appBaseUrl.replace(/\/+$/, "");
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  async createUploadGrant(input: {
    key: string;
    contentType: string;
    maxBytes: number;
    intentId: string;
    expiresInSeconds: number;
  }): Promise<UploadGrant> {
    this.resolveKey(input.key);
    if (!Number.isSafeInteger(input.maxBytes) || input.maxBytes < 1) {
      throw new Error("Upload grant maximum size is invalid");
    }
    const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);
    const grantId = randomUUID();
    const grantFile = this.uploadGrantPath(grantId);
    await fs.mkdir(path.dirname(grantFile), { recursive: true });
    await this.assertExistingPathInsideRoot(path.dirname(grantFile));
    await fs.writeFile(
      grantFile,
      JSON.stringify({
        key: input.key,
        contentType: input.contentType,
        maxBytes: input.maxBytes,
        intentId: input.intentId,
        expiresAt: expiresAt.toISOString(),
      }),
      { encoding: "utf8" },
    );
    return {
      url: `${this.appBaseUrl}/api/v1/storage/uploads/${grantId}`,
      method: "POST",
      fields: { grantId, key: input.key, intentId: input.intentId },
      expiresAt,
    };
  }

  async consumeUploadGrant(grantId: string): Promise<{
    key: string;
    contentType: string;
    maxBytes: number;
    intentId: string;
  } | null> {
    if (!UUID_PATTERN.test(grantId)) return null;
    const grantFile = this.uploadGrantPath(grantId);
    let raw: string;
    try {
      raw = await fs.readFile(grantFile, "utf8");
    } catch {
      return null;
    }
    let grant: UploadGrantRecord;
    try {
      grant = JSON.parse(raw) as UploadGrantRecord;
      this.validateUploadGrantRecord(grant);
    } catch {
      await fs.rm(grantFile, { force: true });
      return null;
    }
    if (new Date(grant.expiresAt).getTime() <= Date.now()) {
      await fs.rm(grantFile, { force: true });
      return null;
    }
    return {
      key: grant.key,
      contentType: grant.contentType,
      maxBytes: grant.maxBytes,
      intentId: grant.intentId,
    };
  }

  async storeGrantedUpload(grantId: string, bytes: Uint8Array): Promise<StoredObject> {
    if (!UUID_PATTERN.test(grantId)) throw new Error("Upload grant is invalid or expired");
    const grantFile = this.uploadGrantPath(grantId);
    const claimedFile = `${grantFile}.${randomUUID()}.claimed`;
    try {
      await fs.rename(grantFile, claimedFile);
    } catch {
      throw new Error("Upload grant is invalid or expired");
    }
    try {
      const grant = JSON.parse(await fs.readFile(claimedFile, "utf8")) as UploadGrantRecord;
      this.validateUploadGrantRecord(grant);
      if (new Date(grant.expiresAt).getTime() <= Date.now()) {
        throw new Error("Upload grant is invalid or expired");
      }
      if (bytes.byteLength <= 0 || bytes.byteLength > grant.maxBytes) {
        throw new Error("Upload size does not match the grant constraints");
      }
      const metadata = { "upload-intent-id": grant.intentId };
      await this.putObject(grant.key, bytes, grant.contentType, metadata);
      return {
        key: grant.key,
        sizeBytes: bytes.byteLength,
        contentType: grant.contentType,
        metadata,
      };
    } finally {
      await fs.rm(claimedFile, { force: true });
    }
  }

  async createDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    this.resolveKey(key);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = await createDownloadToken(key, expiresAt);
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    return `${this.appBaseUrl}/api/v1/storage/objects/${encodedKey}?token=${token}`;
  }

  async resolveDownloadToken(key: string, token: string): Promise<boolean> {
    try {
      this.resolveKey(key);
    } catch {
      return false;
    }
    return verifyDownloadToken(key, token);
  }

  async headObject(key: string): Promise<StoredObject | null> {
    const filePath = this.resolveKey(key);
    try {
      await this.assertExistingPathInsideRoot(filePath);
      await this.assertExistingPathInsideRoot(`${filePath}${METADATA_SUFFIX}`);
      const [stat, rawMetadata] = await Promise.all([
        fs.stat(filePath),
        fs.readFile(`${filePath}${METADATA_SUFFIX}`, "utf8").catch(() => "{}"),
      ]);
      const metadata = JSON.parse(rawMetadata) as {
        "content-type"?: string | null;
        custom?: Record<string, string>;
      };
      return {
        key,
        sizeBytes: stat.size,
        contentType: metadata["content-type"] ?? null,
        metadata: metadata.custom ?? {},
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async readObject(key: string): Promise<Uint8Array> {
    const filePath = this.resolveKey(key);
    try {
      await this.assertExistingPathInsideRoot(filePath);
      return new Uint8Array(await fs.readFile(filePath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new MissingObjectError(key);
      }
      throw error;
    }
  }

  async putObject(
    key: string,
    bytes: Uint8Array,
    contentType: string,
    metadata: Record<string, string> = {},
  ): Promise<void> {
    const filePath = this.resolveKey(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await this.assertExistingPathInsideRoot(path.dirname(filePath));
    await this.assertExistingPathInsideRoot(filePath);
    await this.assertExistingPathInsideRoot(`${filePath}${METADATA_SUFFIX}`);
    await fs.writeFile(filePath, bytes);
    await writeMetadata(filePath, contentType, metadata);
  }

  async copyObject(
    sourceKey: string,
    destinationKey: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    const source = this.resolveKey(sourceKey);
    const destination = this.resolveKey(destinationKey);
    await this.assertExistingPathInsideRoot(source);
    await this.assertExistingPathInsideRoot(`${source}${METADATA_SUFFIX}`);
    let contentType: string | null = null;
    let previousCustom: Record<string, string> = {};
    try {
      const raw = JSON.parse(await fs.readFile(`${source}${METADATA_SUFFIX}`, "utf8")) as {
        "content-type"?: string;
        custom?: Record<string, string>;
      };
      contentType = raw["content-type"] ?? null;
      previousCustom = raw.custom ?? {};
    } catch {
      // Source metadata is optional; fall back to an unknown content type.
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await this.assertExistingPathInsideRoot(path.dirname(destination));
    await this.assertExistingPathInsideRoot(destination);
    await this.assertExistingPathInsideRoot(`${destination}${METADATA_SUFFIX}`);
    await fs.copyFile(source, destination);
    const custom = metadata ? { ...previousCustom, ...metadata } : previousCustom;
    if (metadata?.["content-type"]) {
      contentType = metadata["content-type"];
      delete custom["content-type"];
    }
    await writeMetadata(destination, contentType ?? "application/octet-stream", custom);
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = this.resolveKey(key);
    await this.assertExistingPathInsideRoot(path.dirname(filePath));
    await this.assertExistingPathInsideRoot(filePath);
    await this.assertExistingPathInsideRoot(`${filePath}${METADATA_SUFFIX}`);
    await Promise.all([
      fs.rm(filePath, { force: true }),
      fs.rm(`${filePath}${METADATA_SUFFIX}`, { force: true }),
    ]);
  }

  async listKeys(prefix: string): Promise<string[]> {
    const normalizedPrefix = normalizeObjectPath(prefix, true);
    const scanRoot = normalizedPrefix
      ? path.resolve(this.root, ...normalizedPrefix.split("/"))
      : this.root;
    this.assertResolvedInsideRoot(scanRoot, true);
    await this.assertExistingPathInsideRoot(scanRoot);
    const keys: string[] = [];
    const walk = async (absoluteDir: string, relativeDir: string): Promise<void> => {
      let entries;
      try {
        entries = await fs.readdir(absoluteDir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const nextRelative = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          if (nextRelative === UPLOADS_DIRECTORY) continue;
          await walk(path.join(absoluteDir, entry.name), nextRelative);
        } else if (entry.isFile() && !entry.name.endsWith(METADATA_SUFFIX)) {
          keys.push(nextRelative);
        }
      }
    };
    await walk(scanRoot, normalizedPrefix.replace(/\/+$/, ""));
    return keys.sort();
  }

  private resolveKey(key: string): string {
    const normalizedKey = normalizeObjectPath(key, false);
    const resolved = path.resolve(this.root, ...normalizedKey.split("/"));
    this.assertResolvedInsideRoot(resolved, false);
    return resolved;
  }

  private assertResolvedInsideRoot(resolved: string, allowRoot: boolean): void {
    const relative = path.relative(this.root, resolved);
    if (
      (!allowRoot && !relative) ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      throw new Error("Object key escapes the storage root");
    }
  }

  private async assertExistingPathInsideRoot(candidate: string): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
    let realCandidate: string;
    try {
      realCandidate = await fs.realpath(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    const realRoot = await fs.realpath(this.root);
    const relative = path.relative(realRoot, realCandidate);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error("Object key escapes the storage root through a symbolic link");
    }
  }

  private uploadGrantPath(grantId: string): string {
    return path.join(this.root, UPLOADS_DIRECTORY, `${grantId}.json`);
  }

  private validateUploadGrantRecord(grant: UploadGrantRecord): void {
    if (
      !grant ||
      typeof grant.key !== "string" ||
      typeof grant.contentType !== "string" ||
      !Number.isSafeInteger(grant.maxBytes) ||
      grant.maxBytes < 1 ||
      typeof grant.intentId !== "string" ||
      !Number.isFinite(new Date(grant.expiresAt).getTime())
    ) {
      throw new Error("Upload grant is invalid or expired");
    }
    this.resolveKey(grant.key);
  }
}

interface UploadGrantRecord {
  key: string;
  contentType: string;
  maxBytes: number;
  intentId: string;
  expiresAt: string;
}

function normalizeObjectPath(value: string, allowEmpty: boolean): string {
  if (typeof value !== "string" || value.includes("\0")) {
    throw new Error("Object key is invalid");
  }
  if (value.includes("\\")) throw new Error("Object key is invalid");
  let normalized = value;
  if (!normalized && allowEmpty) return "";
  if (
    !normalized ||
    normalized.startsWith("/") ||
    path.posix.isAbsolute(normalized) ||
    path.win32.isAbsolute(value) ||
    /^[A-Za-z]:/.test(normalized)
  ) {
    throw new Error("Object key is invalid");
  }
  if (allowEmpty) normalized = normalized.replace(/\/+$/, "");
  if (!normalized && allowEmpty) return "";
  assertNoTraversalSegments(normalized);
  try {
    assertNoTraversalSegments(decodeURIComponent(normalized));
  } catch (error) {
    if (error instanceof URIError) throw new Error("Object key is invalid");
    throw error;
  }
  return normalized;
}

function assertNoTraversalSegments(value: string): void {
  const segments = value.replace(/\\/g, "/").split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Object key is invalid");
  }
}

export class MissingObjectError extends Error {
  constructor(key: string) {
    super(`Object ${key} does not exist`);
    this.name = "MissingObjectError";
  }
}

async function writeMetadata(
  filePath: string,
  contentType: string | null,
  custom: Record<string, string>,
): Promise<void> {
  await fs.writeFile(
    `${filePath}${METADATA_SUFFIX}`,
    JSON.stringify({ "content-type": contentType, custom }),
    "utf8",
  );
}

// ---- Download tokens -------------------------------------------------------
// Short-lived HMAC tokens replace S3 presigned download URLs. Authorization happens
// inside the app: a token is only minted after the existing permission checks run,
// and it is bound to the exact object key and an expiry.

const DOWNLOAD_TOKEN_PURPOSE = "lexnepal-storage-download";

async function createDownloadToken(key: string, expiresAt: Date): Promise<string> {
  const environment = getServerEnvironment();
  const secret = environment.STORAGE_DOWNLOAD_TOKEN_SECRET;
  const { createHmac } = await import("node:crypto");
  const payload = Buffer.from(
    JSON.stringify({ purpose: DOWNLOAD_TOKEN_PURPOSE, key, exp: expiresAt.getTime() }),
  );
  const signature = createHmac("sha256", secret).update(payload).digest();
  return `${payload.toString("base64url")}.${signature.toString("base64url")}`;
}

async function verifyDownloadToken(key: string, token: string): Promise<boolean> {
  const environment = getServerEnvironment();
  const secret = environment.STORAGE_DOWNLOAD_TOKEN_SECRET;
  const tokenParts = token.split(".");
  if (tokenParts.length !== 2) return false;
  const [payloadPart, signaturePart] = tokenParts;
  if (!payloadPart || !signaturePart) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const payload = Buffer.from(payloadPart, "base64url");
  const expected = createHmac("sha256", secret).update(payload).digest();
  const actual = Buffer.from(signaturePart, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const decoded = JSON.parse(payload.toString("utf8")) as {
      purpose?: string;
      key?: string;
      exp?: number;
    };
    return (
      decoded.purpose === DOWNLOAD_TOKEN_PURPOSE &&
      decoded.key === key &&
      typeof decoded.exp === "number" &&
      decoded.exp > Date.now()
    );
  } catch {
    return false;
  }
}
