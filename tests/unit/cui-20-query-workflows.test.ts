import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiClientError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";
import {
  useMessageCommands,
  useNotificationCommands,
  useNotifications,
} from "@/client/queries/communication";
import { useAppointmentCommands } from "@/client/queries/crm";
import { useClientCommands } from "@/client/queries/clients";
import { useClientCaseQuery, useClientCasesQuery } from "@/client/queries/cases";
import { useProfileCommands } from "@/client/queries/identity";
import { useDownloadDocument, useUploadDocument } from "@/client/queries/documents";
import {
  useIssueOtp,
  useVerifyOtp,
  useSignDocument,
  useMarkDocumentViewed,
} from "@/client/queries/envelopes";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  password: vi.fn(),
  verifyTotp: vi.fn(),
  user: { id: "synthetic-user", role: "client" },
}));
vi.mock("@/client/api/client", () => ({ apiClient: { request: mocks.request } }));
vi.mock("@/client/auth/auth-provider", () => ({
  useAuthContext: () => ({ identityUser: mocks.user }),
}));
vi.mock("@/client/auth/local-auth-client", () => ({
  localAuthClient: {
    changePassword: mocks.password,
    twoFactor: { verifyTotp: mocks.verifyTotp },
  },
}));

let client: QueryClient;
function capture<T>(useHook: () => T): T {
  let result!: T;
  function Harness() {
    result = useHook();
    return null;
  }
  renderToString(
    React.createElement(QueryClientProvider, { client }, React.createElement(Harness)),
  );
  return result;
}
beforeEach(() => {
  vi.resetAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  mocks.request.mockResolvedValue({ synthetic: true });
});
afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
});

describe("real message command hooks with a mocked API", () => {
  for (const name of ["sendMessage", "markMessagesRead"] as const) {
    it(`${name} targets one matter and refreshes its thread and unread counts`, async () => {
      const key = queryKeys.cases.detail("synthetic-matter");
      client.setQueryData(key, []);
      client.setQueryData(queryKeys.cases.detail("other-matter"), ["private"]);
      client.setQueryData(["messages", "unread", "synthetic-matter"], { "synthetic-matter": 1 });
      const cmd = capture(useMessageCommands)[name];
      const args = { caseId: "synthetic-matter", content: "Synthetic message", isInternal: false };
      await cmd.mutateAsync(args);
      expect(mocks.request).toHaveBeenCalledWith(
        name === "sendMessage" ? "/api/v1/messages" : "/api/v1/messages/read",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ caseId: args.caseId }),
        }),
      );
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
      expect(client.getQueryState(["messages", "unread", "synthetic-matter"])?.isInvalidated).toBe(
        true,
      );
      expect(client.getQueryState(queryKeys.cases.detail("other-matter"))?.isInvalidated).toBe(
        false,
      );
      if (name === "sendMessage")
        expect(mocks.request.mock.calls[0][1].body).toMatchObject({
          content: args.content,
          isInternal: false,
        });
    });
    for (const status of [401, 403, 404])
      it(`${name} rejects HTTP ${status} without a success refresh`, async () => {
        const key = queryKeys.cases.detail("synthetic-matter");
        client.setQueryData(key, []);
        mocks.request.mockRejectedValue(
          new ApiClientError("FORBIDDEN", "Synthetic denied", status),
        );
        const cmd = capture(useMessageCommands)[name];
        await expect(
          cmd.mutateAsync({ caseId: "synthetic-matter", content: "Synthetic", isInternal: false }),
        ).rejects.toThrow();
        expect(mocks.request).toHaveBeenCalledTimes(1);
        expect(client.getQueryState(key)?.isInvalidated).toBe(false);
      });
  }
});
describe("notifications retain account-scoped reads and cache keys", () => {
  it("the notifications query key includes the signed-in identity", () => {
    capture(useNotifications);
    expect(client.getQueryCache().getAll()[0].queryKey).toEqual([
      "notifications",
      mocks.user.id,
      "continued",
      { firmId: undefined, userId: mocks.user.id, role: mocks.user.role },
    ]);
  });
  for (const name of ["markRead", "markAllRead"] as const) {
    it(`${name} invalidates only the current account feed`, async () => {
      const current = [
        "notifications",
        mocks.user.id,
        "continued",
        { firmId: undefined, userId: mocks.user.id, role: mocks.user.role },
      ];
      const other = ["notifications", "another-client", "continued"];
      client.setQueryData(current, []);
      client.setQueryData(other, ["private"]);
      const cmds = capture(useNotificationCommands);
      if (name === "markRead")
        await cmds.markRead.mutateAsync({ notificationId: "synthetic-notification" });
      else await cmds.markAllRead.mutateAsync();
      expect(mocks.request).toHaveBeenCalledWith(
        name === "markRead"
          ? "/api/v1/notifications/synthetic-notification"
          : "/api/v1/notifications",
        { method: "PATCH", body: {} },
      );
      expect(client.getQueryState(current)?.isInvalidated).toBe(true);
      expect(client.getQueryState(other)?.isInvalidated).toBe(false);
    });
    it(`${name} reports a failed write and leaves the feed uninvalidated`, async () => {
      const key = ["notifications", mocks.user.id];
      client.setQueryData(key, []);
      mocks.request.mockRejectedValue(new Error("Synthetic write failure"));
      const cmds = capture(useNotificationCommands);
      if (name === "markRead")
        await expect(
          cmds.markRead.mutateAsync({ notificationId: "synthetic-notification" }),
        ).rejects.toThrow();
      else await expect(cmds.markAllRead.mutateAsync()).rejects.toThrow();
      expect(client.getQueryState(key)?.isInvalidated).toBe(false);
    });
  }
});
describe("Client booking uses authenticated commands", () => {
  it("successful booking posts once and invalidates appointment data", async () => {
    const key = queryKeys.crm.appointments({});
    client.setQueryData(key, []);
    const cmd = capture(useAppointmentCommands).bookConsultation;
    const body = {
      clientId: "synthetic-client",
      date: "2026-09-22",
      timeSlot: "10:00",
      practiceArea: "Phone Consultation",
    };
    await cmd.mutateAsync(body);
    expect(mocks.request).toHaveBeenCalledWith("/api/v1/appointments/book", {
      method: "POST",
      body,
    });
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });
  for (const status of [401, 403, 409])
    it(`booking HTTP ${status} never falls back to an anonymous appointment`, async () => {
      mocks.request.mockRejectedValue(
        new ApiClientError("FORBIDDEN", "Synthetic booking denied", status),
      );
      await expect(
        capture(useAppointmentCommands).bookConsultation.mutateAsync({ date: "2026-09-22" }),
      ).rejects.toThrow();
      expect(mocks.request).toHaveBeenCalledTimes(1);
      expect(mocks.request.mock.calls[0][0]).toBe("/api/v1/appointments/book");
    });
});
describe("self-service Client/KYC/profile commands", () => {
  it("contact updates use /me and refresh Client queries", async () => {
    client.setQueryData(queryKeys.clients.mine, {});
    await capture(useClientCommands).updateMine({ address: "Synthetic address" });
    expect(mocks.request).toHaveBeenCalledWith("/api/v1/clients/me", {
      method: "PATCH",
      body: { address: "Synthetic address" },
    });
    expect(client.getQueryState(queryKeys.clients.mine)?.isInvalidated).toBe(true);
  });
  it("KYC submission sends intent IDs and consent without trusting a supplied Client ID", async () => {
    await capture(useClientCommands).submitKyc({
      clientId: "untrusted-client",
      files: [{ storageId: "synthetic-intent" }],
      address: "Synthetic",
      idNumber: "SYNTHETIC-ID",
      consentAccepted: true,
    });
    expect(mocks.request).toHaveBeenCalledWith("/api/v1/clients/me/kyc-submissions", {
      method: "POST",
      body: {
        uploadIntentIds: ["synthetic-intent"],
        address: "Synthetic",
        idNumber: "SYNTHETIC-ID",
        consentAccepted: true,
      },
    });
  });
  it("a rejected KYC submission cannot look successful", async () => {
    mocks.request.mockRejectedValue(new Error("Synthetic rejected"));
    await expect(
      capture(useClientCommands).submitKyc({
        files: [],
        address: "Synthetic",
        idNumber: "Synthetic",
        consentAccepted: false,
      }),
    ).rejects.toThrow("Synthetic rejected");
  });
  it("password changes revoke other sessions using the auth client", async () => {
    mocks.password.mockResolvedValue({ data: {}, error: null });
    await capture(useProfileCommands).changePassword("synthetic-old", "synthetic-new");
    expect(mocks.password).toHaveBeenCalledWith({
      currentPassword: "synthetic-old",
      newPassword: "synthetic-new",
      revokeOtherSessions: true,
    });
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("password failure propagates without a success result", async () => {
    mocks.password.mockResolvedValue({ error: { message: "Synthetic auth rejected" } });
    await expect(
      capture(useProfileCommands).changePassword("synthetic-old", "synthetic-new"),
    ).rejects.toThrow("Synthetic auth rejected");
  });
  it("MFA verification does not trust the device implicitly", async () => {
    mocks.verifyTotp.mockResolvedValue({ data: {}, error: null });
    await capture(useProfileCommands).confirmTotp("123456");
    expect(mocks.verifyTotp).toHaveBeenCalledWith({ code: "123456", trustDevice: false });
  });
  it("session revocation targets the current user's endpoint", async () => {
    await capture(useProfileCommands).revokeSession("synthetic-session");
    expect(mocks.request).toHaveBeenCalledWith("/api/v1/users/me/sessions/synthetic-session", {
      method: "DELETE",
    });
  });
});
describe("real Client matter query hooks", () => {
  it("the list retains its Client filter through the API request", async () => {
    capture(() => useClientCasesQuery({ clientId: "synthetic-client" }));
    await client.getQueryCache().getAll()[0].fetch();
    expect(mocks.request).toHaveBeenCalledWith(
      "/api/v1/cases",
      expect.objectContaining({ query: { clientId: "synthetic-client" } }),
    );
  });
  for (const status of [401, 403, 404])
    it(`detail HTTP ${status} remains an error with a Client-specific key`, async () => {
      capture(() => useClientCaseQuery("synthetic-matter"));
      const query = client.getQueryCache().getAll()[0];
      expect(query.queryKey).toEqual([...queryKeys.cases.detail("synthetic-matter"), "client"]);
      mocks.request.mockRejectedValue(new ApiClientError("FORBIDDEN", "Synthetic denied", status));
      await expect(query.fetch()).rejects.toThrow();
      expect(query.state.status).toBe("error");
    });
});
describe("document quarantine and authorized downloads with synthetic transports", () => {
  for (const state of ["promoted", "rejected", "expired", "storage-denied"] as const) {
    it(`upload ${state} preserves quarantine ordering and truthful completion`, async () => {
      const calls: string[] = [];
      const storage = vi.fn(async () => {
        calls.push("storage");
        return new Response(null, { status: state === "storage-denied" ? 403 : 200 });
      });
      vi.stubGlobal("fetch", storage);
      mocks.request.mockImplementation(async (url: string) => {
        calls.push(url);
        if (url === "/api/v1/document-upload-intents")
          return {
            intentId: "synthetic-intent",
            upload: { url: "https://storage.invalid/synthetic", fields: { key: "synthetic" } },
          };
        return { status: state, documentId: state === "promoted" ? "synthetic-document" : null };
      });
      client.setQueryData(queryKeys.documents.list({}), []);
      const upload = capture(useUploadDocument);
      const promise = upload({
        file: new File(["synthetic"], "synthetic.pdf", { type: "application/pdf" }),
        caseId: "synthetic-matter",
        type: "evidence",
      });
      if (state === "promoted") {
        await expect(promise).resolves.toMatchObject({
          intentId: "synthetic-intent",
          status: "promoted",
          documentId: "synthetic-document",
        });
        expect(client.getQueryState(queryKeys.documents.list({}))?.isInvalidated).toBe(true);
      } else {
        await expect(promise).rejects.toThrow();
        expect(client.getQueryState(queryKeys.documents.list({}))?.isInvalidated).toBe(false);
      }
      expect(calls.slice(0, 2)).toEqual(["/api/v1/document-upload-intents", "storage"]);
      if (state === "storage-denied") expect(calls).toHaveLength(2);
      else expect(calls[2]).toBe("/api/v1/document-upload-intents/synthetic-intent/complete");
      expect(mocks.request.mock.calls[0][1].body).toMatchObject({
        caseId: "synthetic-matter",
        fileName: "synthetic.pdf",
        mimeType: "application/pdf",
        sizeBytes: 9,
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
    });
  }
  for (const status of [401, 403, 404])
    it(`download HTTP ${status} rejects rather than yielding a cached URL`, async () => {
      mocks.request.mockRejectedValue(new ApiClientError("FORBIDDEN", "Synthetic denied", status));
      await expect(capture(useDownloadDocument)("synthetic-document")).rejects.toThrow();
      expect(mocks.request.mock.calls[0][0]).toBe("/api/v1/documents/synthetic-document/download");
    });
});
describe("existing signer command workflow remains authoritative", () => {
  it("view, issue and verify target the actual document/challenge APIs", async () => {
    await capture(useMarkDocumentViewed)({ documentId: "synthetic-document" });
    await capture(useIssueOtp)({
      documentId: "synthetic-document",
      envelopeId: "synthetic-envelope",
    });
    await capture(useVerifyOtp)({ challengeId: "synthetic-challenge", code: "123456" });
    expect(mocks.request.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/envelopes/mark-viewed",
      "/api/v1/envelopes/otp/issue",
      "/api/v1/envelopes/otp/verify",
    ]);
  });
  it("sign forwards the existing consent, OTP and envelope context then invalidates signing data", async () => {
    const sign = capture(useSignDocument);
    client.setQueryData(queryKeys.envelopes.all, []);
    client.setQueryData(queryKeys.documents.all, []);
    await sign({
      documentId: "synthetic-document",
      envelopeId: "synthetic-envelope",
      signatureMethod: "type",
      typedSignatureText: "Synthetic Signer",
      consentAccepted: true,
      otpChallengeId: "synthetic-challenge",
    });
    expect(mocks.request).toHaveBeenCalledWith(
      "/api/v1/envelopes/sign",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          documentId: "synthetic-document",
          envelopeId: "synthetic-envelope",
          consentAccepted: true,
          otpChallengeId: "synthetic-challenge",
        }),
      }),
    );
    expect(client.getQueryState(queryKeys.envelopes.all)?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.documents.all)?.isInvalidated).toBe(true);
  });
  it("signing denial propagates without replaying the command", async () => {
    mocks.request.mockRejectedValue(new ApiClientError("FORBIDDEN", "Synthetic denied", 403));
    await expect(
      capture(useSignDocument)({
        documentId: "synthetic-document",
        signatureMethod: "type",
        consentAccepted: true,
      }),
    ).rejects.toThrow();
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
});
