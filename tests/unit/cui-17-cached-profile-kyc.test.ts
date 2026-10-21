/* eslint-disable @typescript-eslint/no-explicit-any -- synthetic query and presentation fixtures */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ audit: {} as any, files: {} as any }));
vi.stubGlobal("React", React);
const user = {
  id: "synthetic-user",
  name: "Synthetic Client",
  role: "client",
  email: "client@example.invalid",
  emailVerified: true,
};
const event = {
  id: "synthetic-event",
  action: "SENSITIVE_CACHED_ACTIVITY",
  details: "PRIVATE_AUDIT_DETAILS",
  ipAddress: "192.0.2.123",
  createdAt: "2026-01-01T00:00:00Z",
};
const file = {
  id: "synthetic-file",
  fileName: "SENSITIVE_IDENTITY_DOCUMENT.pdf",
  docType: "government_id",
  mimeType: "application/pdf",
  url: "/api/v1/files/SENSITIVE_STORAGE_ID/download",
};
const query = (data: unknown, status: "success" | "pending" | "error" = "success", http = 500) => ({
  data,
  isPending: status === "pending",
  isError: status === "error",
  isFetching: status === "pending",
  error: status === "error" ? { status: http, message: "PRIVATE_SERVER_DETAIL" } : null,
  refetch: vi.fn(),
});
vi.mock("@/client/queries/identity", () => ({
  useCurrentIdentityUser: () => user,
  useSessionsQuery: () => query([]),
  useOwnAuditEventsQuery: () => state.audit,
  useProfileCommands: () => ({}),
}));
vi.mock("@/client/queries/clients", () => ({
  useMyClientQuery: () => query({ _id: "synthetic-client", kycStatus: "verified" }),
  useKycFilesQuery: () => state.files,
  useClientCommands: () => ({}),
}));
vi.mock("@/client/queries/cases", () => ({ useClientCases: () => [] }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ signout: vi.fn() }) }));
vi.mock("@/components/dashboard/portal-branding-context", () => ({
  usePortalBranding: () => ({ heroImageUrl: null }),
}));
// Extras query unrelated Staff/Admin features; this regression covers the shared
// activity renderer's portal boundary, without claiming those features are tested.
vi.mock("@/views/shared/profile/StaffProfileExtras", () => ({ StaffProfileExtras: () => null }));
vi.mock("@/views/shared/profile/AdminProfileExtras", () => ({ AdminProfileExtras: () => null }));
vi.mock("@/components/ui/tabs.tsx", () => {
  const Tab = ({ children }: any) => React.createElement("div", null, children);
  return { Tabs: Tab, TabsContent: Tab, TabsList: Tab, TabsTrigger: Tab };
});
vi.mock("@/components/dashboard", async () => {
  const primitives = await import("@/components/dashboard/dashboard-primitives");
  const client = await import("@/components/dashboard/client-primitives");
  const { DashboardListRow } = await import("@/components/dashboard/dashboard-table");
  const { ClientQueryError } = await import("@/components/dashboard/client-query-error");
  return {
    ...primitives,
    ...client,
    ClientQueryError,
    DashboardListRow,
    DashboardListSkeleton: () => React.createElement("p", { role: "status" }, "Loading records"),
    DashboardStatusLabel: ({ label, status }: any) =>
      React.createElement("span", null, label ?? status),
    PortalPageShell: ({ title, children }: any) =>
      React.createElement("main", null, React.createElement("h1", null, title), children),
  };
});

import Profile from "@/views/shared/SharedProfilePage";
import KYC from "@/views/client/ClientKYCOnboarding";

beforeEach(() => {
  state.audit = query([event]);
  state.files = query([file]);
});

const profile = (variant: "client" | "staff" | "admin" = "client") =>
  renderToStaticMarkup(React.createElement(Profile, { variant }));
const kyc = () => renderToStaticMarkup(React.createElement(KYC));

describe("S17-CACHE-01 Client Profile activity", () => {
  it("renders healthy activity and count without raw audit details", () => {
    const html = profile();
    expect(html).toContain(event.action);
    expect(html).toContain("1 loaded event");
    expect(html).not.toContain(event.details);
    expect(html).not.toContain(event.ipAddress);
  });
  it("distinguishes initial activity loading from empty", () => {
    state.audit = query(undefined, "pending");
    const html = profile();
    expect(html).toContain("Loading...");
    expect(html).not.toContain("No activity recorded");
    expect(html).not.toContain("loaded event");
  });
  it("renders successful empty activity without an error or count", () => {
    state.audit = query([]);
    const html = profile();
    expect(html).toContain("No activity recorded");
    expect(html).not.toContain("Activity unavailable");
    expect(html).not.toContain("loaded event");
  });
  it("retains valid cached activity alongside recoverable error/retry feedback", () => {
    state.audit = query([event], "error", 500);
    const html = profile();
    expect(html).toContain("Activity unavailable");
    expect(html).toContain("Try again");
    expect(html).toContain(event.action);
    expect(html).toContain("1 loaded event");
    expect(html).not.toContain("PRIVATE_SERVER_DETAIL");
  });
  it.each([401, 403, 404])("withholds cached activity and count after HTTP %s", (http) => {
    state.audit = query([event], "error", http);
    const html = profile();
    expect(html).toContain("Activity unavailable");
    expect(html).toContain("Try again");
    expect(html).not.toContain(event.action);
    expect(html).not.toContain(event.details);
    expect(html).not.toContain("loaded event");
    expect(html).not.toContain("Loading...");
    expect(html).not.toContain("No activity recorded");
  });
  describe.each(["staff", "admin"] as const)("%s shared behavior", (variant) => {
    it.each([401, 403, 404])("preserves the existing rendering after HTTP %s", (http) => {
      state.audit = query([event], "error", http);
      const html = profile(variant);
      expect(html).toContain(event.action);
      expect(html).toContain(event.details);
      expect(html).toContain("1 loaded event");
      expect(html).not.toContain("Activity unavailable");
    });
  });
});

describe("S17-CACHE-01 KYC submitted documents", () => {
  it("renders healthy filenames, metadata and Open links", () => {
    const html = kyc();
    expect(html).toContain(file.fileName);
    expect(html).toContain(file.mimeType);
    expect(html).toContain(`href="${file.url}"`);
  });
  it("distinguishes initial file loading from empty", () => {
    state.files = query(undefined, "pending");
    const html = kyc();
    expect(html).toContain("Loading records");
    expect(html).not.toContain("No documents have been submitted");
    expect(html).not.toContain(file.fileName);
  });
  it("renders successful empty submitted documents", () => {
    state.files = query([]);
    const html = kyc();
    expect(html).toContain("No documents have been submitted");
    expect(html).not.toContain("Unable to load submitted documents");
  });
  it("retains valid cached files with recoverable error/retry feedback", () => {
    state.files = query([file], "error", 500);
    const html = kyc();
    expect(html).toContain("Unable to load submitted documents");
    expect(html).toContain("Try again");
    expect(html).toContain(file.fileName);
    expect(html).toContain(`href="${file.url}"`);
    expect(html).not.toContain("PRIVATE_SERVER_DETAIL");
  });
  it.each([401, 403, 404])(
    "withholds every cached file field and Open link after HTTP %s",
    (http) => {
      state.files = query([file], "error", http);
      const html = kyc();
      expect(html).toContain("Unable to load submitted documents");
      expect(html).toContain("Try again");
      expect(html).not.toContain(file.fileName);
      expect(html).not.toContain(file.mimeType);
      expect(html).not.toContain(file.url);
      expect(html).not.toContain("No documents have been submitted");
      expect(html).toContain("Identity verified");
    },
  );
});
