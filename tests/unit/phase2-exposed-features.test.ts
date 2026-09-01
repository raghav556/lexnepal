import fs from "node:fs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { resolveCapabilities } from "@/server/auth/capabilities";
import type { AuthPrincipal } from "@/server/auth/types";
import type { AuthorizationDataSource } from "@/server/policies/authorization";
import {
  DocumentArchiveService,
  type DocumentArchiveRepository,
} from "@/server/storage/document-archive";
import type { ObjectStorage, StoredObject, UploadGrant } from "@/server/storage/object-storage";
import {
  buildGuidedResponse,
  evaluateGuidedIntent,
  validateCallbackContact,
} from "@/lib/chatbot-guidance";
import { documentArchiveSchema } from "@/shared/contracts/documents";

const principal: AuthPrincipal = {
  user: {
    id: "user-1",
    firmId: "firm-1",
    tokenIdentifier: "issuer|user-1",
    name: "Staff User",
    email: "staff@example.com",
    role: "associate",
    isActive: true,
    isPending: false,
    avatar: null,
    phone: null,
  },
  firmId: "firm-1",
  capabilities: resolveCapabilities("associate", undefined),
  sessionId: "session-1",
  authenticationMethod: "session_cookie",
};

const authorization: AuthorizationDataSource = {
  getCase: async () => null,
  getClient: async () => null,
  getClientByUser: async () => null,
  getDocument: async (id) => ({
    id,
    firmId: "firm-1",
    caseId: null,
    uploadedBy: "user-1",
    intendedSignerUserId: null,
    isTemplate: false,
    isPrivileged: false,
    confidentialityLevel: "confidential",
    deletedAt: null,
  }),
};

class ArchiveStorage implements ObjectStorage {
  objects = new Map<string, Uint8Array>();
  async createUploadGrant(): Promise<UploadGrant> {
    throw new Error("not used");
  }
  async createDownloadUrl(): Promise<string> {
    throw new Error("not used");
  }
  async headObject(key: string): Promise<StoredObject | null> {
    const bytes = this.objects.get(key);
    return bytes
      ? { key, sizeBytes: bytes.byteLength, contentType: "text/plain", metadata: {} }
      : null;
  }
  async readObject(key: string): Promise<Uint8Array> {
    const bytes = this.objects.get(key);
    if (!bytes) throw new Error("not found");
    return bytes;
  }
  async putObject(key: string, bytes: Uint8Array): Promise<void> {
    this.objects.set(key, bytes);
  }
  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
    this.objects.set(destinationKey, await this.readObject(sourceKey));
  }
  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }
  async listKeys(prefix: string): Promise<string[]> {
    return [...this.objects.keys()].filter((key) => key.startsWith(prefix));
  }
}

function archiveRepository(
  documents: Record<string, { title: string; storageKey: string; firmId?: string }>,
): DocumentArchiveRepository {
  const get = async (id: string) => {
    const document = documents[id];
    return document
      ? {
          id,
          firmId: document.firmId || "firm-1",
          storageKey: document.storageKey,
          uploadStatus: "clean" as const,
          title: document.title,
          mimeType: "text/plain",
          sizeBytes: 5,
        }
      : null;
  };
  return { getDownloadableDocument: get, getArchiveDocument: get };
}

describe("Phase 2 document archive", () => {
  it("validates, bounds and deduplicates archive document identifiers", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(documentArchiveSchema.parse({ documentIds: [id, id] }).documentIds).toEqual([id]);
    expect(documentArchiveSchema.safeParse({ documentIds: [] }).success).toBe(false);
    expect(
      documentArchiveSchema.safeParse({ documentIds: Array.from({ length: 26 }, () => id) })
        .success,
    ).toBe(false);
  });

  it("creates a real ZIP with sanitized, deterministic entry names", async () => {
    const storage = new ArchiveStorage();
    storage.objects.set("protected/firm-1/a", new TextEncoder().encode("first"));
    storage.objects.set("protected/firm-1/b", new TextEncoder().encode("second"));
    const service = new DocumentArchiveService(
      authorization,
      archiveRepository({
        a: { title: "../brief", storageKey: "protected/firm-1/a" },
        b: { title: "../brief", storageKey: "protected/firm-1/b" },
      }),
      storage,
    );
    const result = await service.createAuthorizedArchive(principal, ["a", "b"]);
    const zip = await JSZip.loadAsync(result.bytes);
    expect(Object.keys(zip.files).sort()).toEqual(["brief (2).txt", "brief.txt"]);
    expect(await zip.file("brief.txt")!.async("string")).toBe("first");
    expect(await zip.file("brief (2).txt")!.async("string")).toBe("second");
  });

  it("rejects storage keys outside the authenticated firm boundary", async () => {
    const service = new DocumentArchiveService(
      authorization,
      archiveRepository({ a: { title: "brief", storageKey: "protected/firm-2/a" } }),
      new ArchiveStorage(),
    );
    await expect(service.createAuthorizedArchive(principal, ["a"])).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("Phase 2 truthful guided assistant", () => {
  it("uses published CMS details and does not invent missing office information", () => {
    expect(
      buildGuidedResponse({
        intent: "location",
        settings: { address: "Published Address" },
      }).content,
    ).toContain("Published Address");
    const missing = buildGuidedResponse({ intent: "hours", settings: {} });
    expect(missing.content).toContain("have not been published");
    expect(missing.linkHref).toBe("/contact");
  });

  it("keeps legal advice and response-time limitations explicit", () => {
    expect(evaluateGuidedIntent("Can I sue after a fraud?")).toBe("complex_case");
    const response = buildGuidedResponse({ intent: "complex_case" }).content;
    expect(response).toContain("cannot assess");
    expect(response).toContain("cannot");
    expect(response).toContain("legal advice");
    expect(response).not.toMatch(/immediately|shortly|guaranteed response/i);
  });

  it("validates callback email and phone input", () => {
    expect(validateCallbackContact("person@example.com")).toBe(true);
    expect(validateCallbackContact("+977 9800000000")).toBe(true);
    expect(validateCallbackContact("not-contact")).toBe(false);
  });

  it("contains no simulated controls or live-agent claims in exposed runtime components", () => {
    const documentsPage = fs.readFileSync("src/views/staff/StaffDocumentsPage.tsx", "utf8");
    const chatbot = fs.readFileSync("src/components/ui/ChatbotWidget.tsx", "utf8");
    expect(documentsPage).not.toContain("(Simulated)");
    expect(chatbot).not.toMatch(/typically replies instantly|bg-green-500/i);
    expect(chatbot).toContain("Automated guidance • not legal advice");
  });
});

describe("Phase 2 immutable version restoration contracts", () => {
  it("exposes persisted history and creates an audited new version instead of overwriting", () => {
    const service = fs.readFileSync("src/server/services/document-service.ts", "utf8");
    const repository = fs.readFileSync("src/server/repositories/document-repository.ts", "utf8");
    expect(service).toContain("listVersionHistory");
    expect(service).toContain("createRestoredVersion");
    expect(service).toContain("storage.copyObject");
    expect(repository).toContain(".insert(documents)");
    expect(repository).toContain('action: "document.version_restored"');
    expect(repository).not.toMatch(/update\(documents\)[\s\S]{0,200}version_restored/);
  });
});
