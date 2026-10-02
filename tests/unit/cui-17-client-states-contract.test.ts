import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const clientViews = [
  "ClientDashboard",
  "ClientCasesPage",
  "ClientHearingsPage",
  "ClientChecklistPage",
  "ClientDocumentsPage",
  "ClientMessagesPage",
  "ClientBookingPage",
  "ClientKYCOnboarding",
  "ClientSignaturesPage",
  "ClientNotificationsPage",
];

describe("CUI-17 Client state contracts", () => {
  it.each(clientViews)("%s distinguishes client-record failure from a successful null", (view) => {
    const source = read(`src/views/client/${view}.tsx`);
    expect(source).toContain("useMyClientQuery");
    expect(source).toContain("clientQuery.isError");
    expect(source).toContain("clientQuery.refetch()");
  });

  it("retains additive query-state accessors without removing data-only callers", () => {
    for (const [file, original, statusAware] of [
      ["clients.ts", "useKycFiles", "useKycFilesQuery"],
      ["documents.ts", "useDocuments", "useDocumentsQuery"],
      ["tasks.ts", "useTasks", "useTasksQuery"],
      ["identity.ts", "useOwnAuditEvents", "useOwnAuditEventsQuery"],
      ["identity.ts", "useSessions", "useSessionsQuery"],
      ["envelopes.ts", "useMyPendingEnvelopeActions", "useMyPendingEnvelopeActionsQuery"],
    ]) {
      const source = read(`src/client/queries/${file}`);
      expect(source).toContain(`export function ${original}(`);
      expect(source).toContain(`export function ${statusAware}(`);
    }
  });

  it("keeps message-thread and profile failures scoped to Client presentation", () => {
    const chat = read("src/components/messages/MatterChatPanel.tsx");
    const profile = read("src/views/shared/SharedProfilePage.tsx");
    expect(chat).toContain("isClientAppearance && isError");
    expect(profile).toContain('variant === "client" && sessionsQuery.isError');
    expect(profile).toContain('variant === "client" && auditQuery.isError');
    expect(profile).toContain('variant !== "client" && log.details');
  });
});
