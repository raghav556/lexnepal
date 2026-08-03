import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES } from "./lib/documentSecurity";

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function validateMagic(bytes: Uint8Array, mimeType: string) {
  const signatures: Record<string, number[][]> = {
    "application/pdf": [[0x25, 0x50, 0x44, 0x46, 0x2d]],
    "image/jpeg": [[0xff, 0xd8, 0xff]],
    "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    "image/tiff": [[0x49, 0x49, 0x2a, 0x00], [0x4d, 0x4d, 0x00, 0x2a]],
    "application/msword": [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [[0x50, 0x4b, 0x03, 0x04]],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [[0x50, 0x4b, 0x03, 0x04]],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [[0x50, 0x4b, 0x03, 0x04]],
  };
  const expected = signatures[mimeType];
  if (expected && !expected.some((signature) => startsWith(bytes, signature))) {
    throw new ConvexError("File signature does not match its declared content type");
  }
}

async function sha256(bytes: Uint8Array) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function builtInMalwareScan(bytes: Uint8Array, mimeType: string) {
  const binaryText = new TextDecoder("latin1").decode(bytes);
  const upper = binaryText.toUpperCase();
  if (upper.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE")) return "EICAR test signature detected";
  if (startsWith(bytes, [0x4d, 0x5a]) || startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) {
    return "Executable payload detected";
  }
  if (upper.includes("VBAPROJECT.BIN") || upper.includes("AUTOOPEN") || upper.includes("DOCUMENT_OPEN")) {
    return "Office macro content detected";
  }
  if (mimeType === "application/pdf" && (/\/JavaScript\b/i.test(binaryText) || /\/Launch\b/i.test(binaryText))) {
    return "Active PDF content detected";
  }
  return null;
}

export const getScanTarget = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;
    const url = await ctx.storage.getUrl(doc.storageId as any);
    return { doc, url };
  },
});

export const markScanning = internalMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc || doc.uploadStatus !== "quarantined") return false;
    await ctx.db.patch(args.documentId, { uploadStatus: "scanning" });
    return true;
  },
});

export const completeScan = internalMutation({
  args: {
    documentId: v.id("documents"),
    clean: v.boolean(),
    provider: v.string(),
    details: v.string(),
    sha256: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return;
    const now = new Date().toISOString();
    await ctx.db.patch(args.documentId, {
      uploadStatus: args.clean ? "clean" : "rejected",
      scanProvider: args.provider,
      scanCompletedAt: now,
      scanDetails: args.details,
      sha256: args.sha256 || doc.sha256,
    });
    await ctx.db.insert("auditLog", {
      firmId: doc.firmId,
      userId: doc.uploadedBy,
      action: args.clean ? "document.scan_clean" : "document.scan_rejected",
      resource: "documents",
      resourceId: args.documentId,
      details: `${args.provider}: ${args.details}`,
    });
  },
});

export const scanDocumentInternal = internalAction({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const claimed = await ctx.runMutation(internal.documentSecurity.markScanning, args);
    if (!claimed) return;
    const target = await ctx.runQuery(internal.documentSecurity.getScanTarget, args);
    if (!target?.url) {
      await ctx.runMutation(internal.documentSecurity.completeScan, {
        ...args, clean: false, provider: "built-in", details: "Storage object is unavailable",
      });
      return;
    }

    try {
      if (!ALLOWED_DOCUMENT_MIME_TYPES.has(target.doc.mimeType) || target.doc.sizeBytes > MAX_DOCUMENT_BYTES) {
        throw new ConvexError("File type or size violates upload policy");
      }
      const response = await fetch(target.url);
      if (!response.ok) throw new ConvexError(`Could not retrieve quarantined object (${response.status})`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength !== target.doc.sizeBytes || bytes.byteLength > MAX_DOCUMENT_BYTES) {
        throw new ConvexError("Stored file size does not match upload metadata");
      }
      validateMagic(bytes, target.doc.mimeType);
      const contentHash = await sha256(bytes);
      if (target.doc.sha256 && target.doc.sha256.toLowerCase() !== contentHash) {
        throw new ConvexError("SHA-256 integrity verification failed");
      }

      let provider = "built-in-signature-scan";
      let threat = builtInMalwareScan(bytes, target.doc.mimeType);
      const externalUrl = process.env.MALWARE_SCAN_URL;
      if (!threat && externalUrl) {
        const scanResponse = await fetch(externalUrl, {
          method: "POST",
          headers: {
            "Content-Type": target.doc.mimeType,
            ...(process.env.MALWARE_SCAN_API_KEY ? { Authorization: `Bearer ${process.env.MALWARE_SCAN_API_KEY}` } : {}),
          },
          body: bytes,
        });
        if (!scanResponse.ok) throw new ConvexError(`External malware scanner failed (${scanResponse.status})`);
        const result = await scanResponse.json() as { clean?: boolean; threat?: string; provider?: string };
        provider = result.provider || "external-malware-scanner";
        if (result.clean !== true) threat = result.threat || "External scanner rejected the file";
      }

      await ctx.runMutation(internal.documentSecurity.completeScan, {
        ...args,
        clean: !threat,
        provider,
        details: threat || "File signature, integrity, and malware checks passed",
        sha256: contentHash,
      });
    } catch (error) {
      await ctx.runMutation(internal.documentSecurity.completeScan, {
        ...args,
        clean: false,
        provider: "security-pipeline",
        details: error instanceof Error ? error.message : "Security scan failed",
      });
    }
  },
});
