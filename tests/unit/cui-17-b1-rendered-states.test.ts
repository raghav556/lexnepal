// Match the application locale provider added by Session17E; assertions are unchanged.
vi.mock("@/lib/i18n-context", () => ({ useI18n: () => ({ language: "en", t: (key: string) => key }) }));
/* eslint-disable @typescript-eslint/no-explicit-any -- deterministic component mocks */
import React from "react";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Render real Client views with deterministic queries. Presentation primitives are
// reduced to their visible text; this does not claim browser or layout coverage.
type Query = {
  data: any;
  hasData?: boolean;
  isPending: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isFetched: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: ReturnType<typeof vi.fn<() => unknown>>;
};
const state = vi.hoisted(() => ({
  queries: {} as Record<string, Query>,
  caseId: null as string | null,
}));
vi.stubGlobal("React", React);
vi.mock("@/client/queries/clients", () => ({
  useMyClientQuery: () => state.queries.client,
  useMyTeam: () => [],
}));
vi.mock("@/client/queries/cases", () => ({
  useClientCasesQuery: () => state.queries.cases,
  useClientCaseQuery: () => state.queries.detail,
  // Compatibility for reproducing defects against the untouched historical snapshot.
  useClientCases: () => state.queries.cases.data,
}));
vi.mock("@/client/queries/hearings", () => ({
  useHearingsQuery: () => state.queries.hearings,
  useHearings: () => state.queries.hearings.data,
}));
vi.mock("@/client/queries/tasks", () => ({
  useTasksQuery: () => state.queries.tasks,
  useTasks: () => state.queries.tasks.data,
}));
vi.mock("@/client/queries/documents", () => ({
  useDocumentsQuery: () => state.queries.documents,
  useDownloadDocument: () => vi.fn(),
  useUploadDocument: () => vi.fn(),
}));
vi.mock("@/client/queries/communication", () => ({
  useNotifications: () => state.queries.notifications,
  useUnreadMessageCounts: () => state.queries.unread,
  useMessages: () => state.queries.messages,
  useNotificationCommands: () => ({
    markRead: { mutateAsync: vi.fn() },
    markAllRead: { isPending: false, mutateAsync: vi.fn() },
  }),
}));
vi.mock("@/client/queries/crm", () => ({ useAppointments: () => state.queries.appointments }));
vi.mock("@/client/queries/envelopes", () => ({
  useMyPendingEnvelopeActionsQuery: () => state.queries.envelopes,
  useSigningInbox: () => state.queries.inbox,
  useDeclineEnvelope: () => vi.fn(),
  useIssueOtp: () => vi.fn(),
  useMarkDocumentViewed: () => vi.fn(),
  useSignDocument: () => vi.fn(),
  useVerifyOtp: () => vi.fn(),
}));
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ _id: "user-1", name: "Client", role: "client" }),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "matter-1" }),
  useSearchParams: () => new URLSearchParams(state.caseId ? { caseId: state.caseId } : {}),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => React.createElement("a", { href }, children),
}));
vi.mock("@/client/navigation", () => ({
  Link: ({ children, href }: any) => React.createElement("a", { href }, children),
}));
vi.mock("@/components/messages/MatterChatPanel", () => ({
  MatterChatPanel: ({ caseId, title, mode, appearance }: any) =>
    React.createElement(
      "article",
      { "data-chat-id": caseId, "data-mode": mode, "data-appearance": appearance },
      title,
    ),
}));
vi.mock("@/lib/pdf-generator", () => ({ generateSignatureEventSummaryPDF: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/dashboard/dashboard-primitives", () => ({
  DashboardButton: ({ children, disabled }: any) =>
    React.createElement("button", { disabled }, children),
  EmptyState: ({ title, description, action, role }: any) =>
    React.createElement(
      "section",
      { role },
      React.createElement("h3", null, title),
      description,
      action,
    ),
}));
vi.mock("@/components/dashboard", async () => {
  const primitives = await import("@/components/dashboard/dashboard-primitives");
  const { ClientQueryError } = await import("@/components/dashboard/client-query-error");
  const panel = ({
    title,
    description,
    children,
    actions,
    name,
    date,
    matter,
    category,
    status,
  }: any) =>
    React.createElement(
      "section",
      null,
      title ? React.createElement("h2", null, title) : null,
      description,
      name,
      date,
      matter,
      category,
      status,
      actions,
      children,
    );
  return {
    ...primitives,
    ClientQueryError,
    PortalPageShell: ({
      title,
      description,
      loading,
      loadingLabel,
      heroChildren,
      children,
      actions,
    }: any) =>
      React.createElement(
        "main",
        null,
        React.createElement("h1", null, title),
        description,
        heroChildren,
        actions,
        loading ? React.createElement("p", { role: "status" }, loadingLabel) : children,
      ),
    DashboardSection: panel,
    ClientStatePanel: panel,
    ClientSoftPanel: panel,
    ClientPanel: panel,
    ClientTimelineItem: panel,
    ClientDocumentItem: panel,
    ClientHearingSummary: panel,
    ClientFilterBar: panel,
    DashboardListRow: panel,
    DashboardListSkeleton: () => React.createElement("p", { role: "status" }, "Loading records"),
    DashboardStatusLabel: ({ label, status }: any) =>
      React.createElement("span", null, label ?? status),
    MetricCard: ({ label, value, state: status }: any) =>
      React.createElement(
        "section",
        { "data-metric": label, "data-state": status },
        label,
        ": ",
        value,
      ),
    DualDateDisplay: ({ isoDate }: any) => React.createElement("time", null, isoDate),
    usePortalBranding: () => ({ heroImageUrl: null }),
    DashboardTable: panel,
    DashboardTableHead: panel,
    DashboardTableBody: panel,
    DashboardTableCell: panel,
    DashboardTableHeaderCell: panel,
    DashboardTableRow: panel,
  };
});
vi.mock("@/components/ui/tabs", () => {
  const component = ({ children }: any) => React.createElement("div", null, children);
  // Inspect every tab's render path; interaction and tab visibility remain browser work.
  return { Tabs: component, TabsList: component, TabsTrigger: component, TabsContent: component };
});
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) => (open ? React.createElement("div", null, children) : null),
  DialogContent: ({ children }: any) => React.createElement("div", null, children),
  DialogHeader: ({ children }: any) => React.createElement("div", null, children),
  DialogTitle: ({ children }: any) => React.createElement("h2", null, children),
}));

import Home from "@/views/client/ClientDashboard";
import Cases from "@/views/client/ClientCasesPage";
import Detail from "@/views/client/ClientCaseDetailPage";
import Hearings from "@/views/client/ClientHearingsPage";
import Checklist from "@/views/client/ClientChecklistPage";
import Documents from "@/views/client/ClientDocumentsPage";
import Signatures from "@/views/client/ClientSignaturesPage";
import Notifications from "@/views/client/ClientNotificationsPage";
import Messages from "@/views/client/ClientMessagesPage";
import { ClientQueryBoundary } from "@/components/dashboard/client-query-boundary";

function query(
  data: any,
  status: "success" | "pending" | "error" = "success",
  httpStatus = 500,
): Query {
  return {
    data,
    hasData: data !== undefined,
    isPending: status === "pending",
    isLoading: status === "pending",
    isSuccess: status === "success",
    isError: status === "error",
    isFetched: status !== "pending",
    isFetching: status === "pending",
    error: status === "error" ? { status: httpStatus, message: "PRIVATE SERVER DETAIL" } : null,
    refetch: vi.fn<() => unknown>(),
  };
}
const matter = {
  _id: "matter-1",
  title: "Healthy matter",
  caseNumber: "M-1",
  status: "active",
  practiceArea: "Civil",
  court: "District Court",
};
const hearing = {
  _id: "hearing-1",
  caseId: "matter-1",
  status: "scheduled",
  dateGregorian: "2026-12-20",
  time: "10:00",
  court: "Healthy court",
};
const appointment = {
  id: "appointment-1",
  status: "confirmed",
  date: "2026-12-21",
  timeSlot: "11:00",
  practiceArea: "Healthy consultation",
};
const doc = {
  _id: "doc-1",
  title: "Healthy document",
  caseId: "matter-1",
  type: "other",
  createdAt: "2026-01-01",
  uploadedBy: "user-1",
};
const task = {
  _id: "task-1",
  caseId: "matter-1",
  title: "Healthy action",
  clientVisible: true,
  status: "done",
  dueDate: "2026-12-19",
};
const notification = {
  _id: "notice-1",
  id: "notice-1",
  caseId: "matter-1",
  title: "Healthy update",
  message: "Healthy update",
  type: "case_update",
  isRead: false,
  createdAt: "2026-10-09T10:00:00Z",
};
function render(view: React.ComponentType) {
  return renderToStaticMarkup(React.createElement(view));
}
beforeEach(() => {
  state.caseId = null;
  state.queries = {
    client: query({ _id: "client-1", fullName: "Local Client", kycStatus: "verified" }),
    cases: query([matter]),
    detail: query(matter),
    hearings: query([hearing]),
    documents: query([doc]),
    tasks: query([task]),
    notifications: query([notification]),
    messages: query({ page: [] }),
    envelopes: query([]),
    unread: query({ "matter-1": 3 }),
    appointments: query([appointment]),
    inbox: query({ pendingEnvelopes: [], pendingDirect: [], recentlySigned: [] }),
  };
});

describe("S17-02 Home independent query states", () => {
  it.each(["hearings", "documents", "tasks", "notifications"])(
    "renders independent content while %s is pending",
    (key) => {
      state.queries[key] = query(undefined, "pending");
      const html = render(Home);
      expect(html).toContain("Healthy matter");
      expect(html).not.toContain("Preparing your portal");
      expect(html).toContain("Loading");
      if (key !== "documents") expect(html).toContain("Healthy document");
    },
  );
  it.each(["hearings", "documents", "tasks", "notifications"])(
    "keeps independent content on %s failure",
    (key) => {
      state.queries[key] = query(undefined, "error");
      const html = render(Home);
      expect(html).toContain("Healthy matter");
      expect(html).toContain("Try again");
      expect(html).not.toContain("PRIVATE SERVER DETAIL");
      expect(html).not.toContain("Preparing your portal");
    },
  );
  it("does not expose Client content if required identity lookup fails", () => {
    state.queries.client = query(undefined, "error");
    const html = render(Home);
    expect(html).toContain("Unable to load your client profile");
    expect(html).not.toContain("Healthy matter");
    expect(html).not.toContain("Healthy document");
    expect(html).not.toContain("No client profile linked");
    expect(html).not.toContain("data-metric");
  });
  it("does not expose cached section data before identity lookup succeeds", () => {
    state.queries.client = query(undefined, "pending");
    const html = render(Home);
    expect(html).toContain("Preparing your portal");
    expect(html).not.toContain("Healthy matter");
    expect(html).not.toContain("Healthy document");
    expect(html).not.toContain("data-metric");
  });
  it("waits for matter scoping without hiding independently authorized updates", () => {
    state.queries.cases = query(undefined, "pending");
    const html = render(Home);
    expect(html).toContain("Healthy update");
    expect(html).toContain("Loading your matters");
    expect(html).not.toContain("No documents yet");
    expect(html).not.toContain("No matters yet");
  });
  it("uses unavailable KPI values rather than an endless loading state after failure", () => {
    state.queries.cases = query(undefined, "error");
    const html = render(Home);
    expect(html).toMatch(/data-metric="Active Matters" data-state="default"/);
    expect(html).not.toContain("Active Matters: 0");
  });
  it("renders successful empty sections truthfully", () => {
    for (const key of ["hearings", "documents", "tasks", "notifications"])
      state.queries[key] = query([]);
    const html = render(Home);
    expect(html).toContain("No recent updates");
    expect(html).toContain("No documents yet");
    expect(html).toContain("No upcoming hearing");
  });
  it("renders all healthy data", () => {
    const html = render(Home);
    expect(html).toContain("Healthy matter");
    expect(html).toContain("Healthy document");
    expect(html).toContain("Healthy court");
  });
  it("preserves records during background refresh and failed refresh", () => {
    state.queries.documents.isFetching = true;
    expect(render(Home)).toContain("Healthy document");
    state.queries.documents = query([doc], "error");
    const html = render(Home);
    expect(html).toContain("Healthy document");
    expect(html).toContain("Unable to load documents");
  });
});

describe("S17-03 truthful secondary states", () => {
  it.each(["pending", "error"] as const)(
    "Matters distinguishes %s from no upcoming hearing/actions/updates",
    (status) => {
      for (const key of ["hearings", "tasks", "notifications"])
        state.queries[key] = query(undefined, status);
      const html = render(Cases);
      expect(html).toContain("Healthy matter");
      expect(html).not.toContain("No upcoming hearing");
      expect(html).not.toContain("No open actions");
      expect(html).not.toContain("No recent matter activity");
      expect(html).not.toContain("No recent update");
      expect(html).toContain(status === "pending" ? "Loading" : "Try again");
    },
  );
  it.each(["pending", "error"] as const)(
    "Matter Details distinguishes %s from completion/empty data",
    (status) => {
      for (const key of ["hearings", "tasks", "notifications", "documents"])
        state.queries[key] = query(undefined, status);
      const html = render(Detail);
      expect(html).toContain("Healthy matter");
      expect(html).not.toContain("0/0 completed");
      expect(html).not.toContain("None scheduled");
      expect(html).not.toContain("No open client actions");
      expect(html).not.toContain("No hearings on this matter");
      expect(html).not.toContain("No recent activity");
      expect(html).toContain(status === "pending" ? "Loading" : "Try again");
    },
  );
  it("Hearings retains healthy hearings when matter metadata and actions fail", () => {
    state.queries.cases = query(undefined, "error");
    state.queries.tasks = query(undefined, "error");
    const html = render(Hearings);
    expect(html).toContain("Healthy court");
    expect(html).toContain("Unable to load matter information");
    expect(html).toContain("Unable to load preparation actions");
    expect(html).not.toContain("No open client actions");
  });
  it("Hearings does not show zero counts or no upcoming during initial load", () => {
    state.queries.hearings = query(undefined, "pending");
    const html = render(Hearings);
    expect(html).not.toContain("Upcoming (0)");
    expect(html).not.toContain("No upcoming hearings");
    expect(html).toContain("Loading");
  });
  it.each(["cases", "tasks"])(
    "Checklist waits for required %s before completion and due summaries",
    (key) => {
      state.queries[key] = query(undefined, "pending");
      const html = render(Checklist);
      expect(html).toContain("Loading your action checklist");
      expect(html).not.toContain("No shared action items");
      expect(html).not.toContain("No open due");
    },
  );
  it("Checklist distinguishes failures from empty, then verified completion", () => {
    state.queries.tasks = query(undefined, "error");
    expect(render(Checklist)).toContain("Unable to load action items");
    state.queries.tasks = query([task]);
    expect(render(Checklist)).toContain("100%");
  });
  it.each(["pending", "error"] as const)(
    "Documents distinguishes %s counts from zero",
    (status) => {
      state.queries.documents = query(undefined, status);
      const html = render(Documents);
      expect(html).not.toContain("0 documents");
      expect(html).toContain(status === "pending" ? "Loading documents" : "Documents unavailable");
    },
  );
  it("Documents preserves records with failed matter metadata and does not label them General", () => {
    state.queries.cases = query(undefined, "error");
    const html = render(Documents);
    expect(html).toContain("Healthy document");
    expect(html).toContain("Matter information unavailable");
    expect(html).not.toContain(">General<");
  });
  it.each(["pending", "error"] as const)(
    "Signatures avoids zero request description on %s",
    (status) => {
      state.queries.inbox = query(undefined, status);
      const html = render(Signatures);
      expect(html).not.toContain("0 requests requiring your action");
      expect(html).not.toContain("No documents awaiting your signature");
      expect(html).toContain(
        status === "pending" ? "Loading signing" : "Signing requests unavailable",
      );
    },
  );
  it.each(["hearings", "appointments"])(
    "Important Dates retains the independent successful source when %s fails",
    (key) => {
      state.queries[key] = query(undefined, "error");
      if (key === "appointments") state.queries[key].data = [];
      const html = render(Notifications);
      expect(html).toContain(key === "hearings" ? "Healthy consultation" : "Healthy court");
      expect(html).toContain("Try again");
      expect(html).not.toContain("No upcoming important dates");
    },
  );
  it("Important Dates keeps appointments while the hearing source is pending", () => {
    state.queries.hearings = query(undefined, "pending");
    const html = render(Notifications);
    expect(html).toContain("Healthy consultation");
    expect(html).toContain("Loading hearing dates");
  });
  it("Important Dates keeps independent appointments on profile lookup failure", () => {
    state.queries.client = query(undefined, "error");
    const html = render(Notifications);
    expect(html).toContain("Unable to load your client profile");
    expect(html).toContain("Healthy consultation");
    expect(html).not.toContain("Healthy court");
    expect(html).not.toContain("No upcoming important dates");
  });
  it("Notifications does not invent zero unread after feed failure", () => {
    state.queries.notifications = query(undefined, "error");
    state.queries.notifications.data = [];
    const html = render(Notifications);
    expect(html).toContain("Unread notification count unavailable");
    expect(html).not.toContain("0 unread in your recent notifications");
    expect(html).toContain("Healthy court");
  });
  it("Important Dates uses no-upcoming only after both sources succeed empty", () => {
    state.queries.hearings = query([]);
    state.queries.appointments = query([]);
    expect(render(Notifications)).toContain("No upcoming important dates");
  });
  it.each([Cases, Detail, Hearings, Checklist, Documents, Signatures, Notifications])(
    "keeps ordinary cached data and reports a failed refresh",
    (View) => {
      const key =
        View === Signatures
          ? "inbox"
          : View === Documents
            ? "documents"
            : View === Notifications
              ? "notifications"
              : View === Hearings
                ? "hearings"
                : "tasks";
      const current = state.queries[key];
      state.queries[key] = query(current.data, "error");
      const html = render(View);
      expect(html).toContain("Try again");
      if (View === Documents) expect(html).toContain("Healthy document");
      if (View === Hearings) expect(html).toContain("Healthy court");
      if (View === Checklist) expect(html).toContain("100%");
    },
  );
  it.each([Cases, Detail, Hearings, Checklist, Documents, Signatures, Notifications])(
    "renders each affected route with all sources healthy",
    (View) => {
      const html = render(View);
      expect(html).not.toContain("Try again");
      expect(html).not.toContain("unavailable");
      expect(html).not.toContain("Loading");
    },
  );
  it("distinguishes successful empty matters/actions/hearings from unavailable sources", () => {
    state.queries.hearings = query([]);
    state.queries.tasks = query([]);
    state.queries.notifications = query([]);
    expect(render(Cases)).toContain("No upcoming hearing");
    expect(render(Cases)).toContain("No open actions");
    expect(render(Detail)).toContain("No hearings on this matter");
    expect(render(Checklist)).toContain("No shared action items");
  });
  it("retains actual signed history and requests during an ordinary inbox refresh failure", () => {
    state.queries.inbox = query(
      {
        pendingEnvelopes: [],
        pendingDirect: [
          { kind: "direct", document: { ...doc, id: "doc-1", mimeType: "application/pdf" } },
        ],
        recentlySigned: [
          {
            kind: "direct",
            document: {
              ...doc,
              id: "signed-1",
              title: "Completed signing",
              mimeType: "application/pdf",
              signedAt: "2026-01-01T10:00:00Z",
            },
          },
        ],
      },
      "error",
    );
    const html = render(Signatures);
    expect(html).toContain("Healthy document");
    expect(html).toContain("Completed signing");
    expect(html).toContain("1 request requiring your action");
    expect(html).toContain("Try again");
  });
});

describe("S17-04 message deep links and unread state", () => {
  beforeEach(() => {
    state.caseId = "matter-1";
  });
  it("waits for matter data without false Matter unavailable", () => {
    state.queries.cases = query(undefined, "pending");
    const html = render(Messages);
    expect(html).toContain("Loading conversation");
    expect(html).not.toContain("Matter unavailable");
    expect(html).not.toContain("data-chat-id");
    expect(html).not.toContain("0 matters");
  });
  it("opens only a valid authorized deep link", () => {
    const html = render(Messages);
    expect(html).toContain('data-chat-id="matter-1"');
    expect(html).toContain('data-mode="client"');
    expect(html).toContain('data-appearance="client"');
    expect(html).not.toContain("Matter unavailable");
  });
  it("does not substitute another matter for an invalid/unlisted deep link", () => {
    state.caseId = "other-client-matter";
    const html = render(Messages);
    expect(html).toContain("Matter unavailable");
    expect(html).not.toContain("data-chat-id");
  });
  it("does not leave unread counts loading when there are no conversations", () => {
    state.caseId = null;
    state.queries.cases = query([]);
    state.queries.unread = query(undefined, "pending");
    state.queries.unread.data = {};
    const html = render(Messages);
    expect(html).toContain("No matters yet");
    expect(html).not.toContain("Loading unread counts");
  });
  it.each([
    [403, "Access denied"],
    [404, "Conversations not found"],
    [500, "Unable to load conversations"],
  ] as const)("handles HTTP %s truthfully without opening chat", (status, title) => {
    state.queries.cases = query(undefined, "error", status);
    const html = render(Messages);
    expect(html).toContain(title);
    expect(html).not.toContain("Matter unavailable");
    expect(html).not.toContain("data-chat-id");
    expect(html).not.toContain("PRIVATE SERVER DETAIL");
  });
  it.each(["pending", "error"] as const)("unread %s remains unknown rather than zero", (status) => {
    state.queries.unread = query(undefined, status);
    state.queries.unread.data = {};
    const html = render(Messages);
    expect(html).toContain(
      status === "pending" ? "Loading unread counts" : "Unread counts unavailable",
    );
    expect(html).toContain('data-chat-id="matter-1"');
    expect(html).not.toContain("0 unread");
    if (status === "error") expect(html).toContain("Try again");
  });
  it("shows successful unread counts", () => {
    expect(render(Messages)).toContain("3 unread");
  });
  it("retains cached unread counts and reports refresh failure", () => {
    state.queries.unread = query({ "matter-1": 3 }, "error");
    const html = render(Messages);
    expect(html).toContain("3 unread");
    expect(html).toContain("Unread counts unavailable");
  });
  it.each([401, 403, 404])("cached matter data cannot bypass HTTP %s", (status) => {
    state.queries.cases = query([matter], "error", status);
    expect(render(Messages)).not.toContain("data-chat-id");
  });
});

describe("Client-only query boundary", () => {
  it("renders actual TanStack pending, successful empty, and failed cached refresh results", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let resolve!: (rows: string[]) => void;
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<string[]>((done) => {
            resolve = done;
          }),
      )
      .mockRejectedValueOnce(new Error("PRIVATE SERVER DETAIL"));
    const observer = new QueryObserver(client, { queryKey: ["b1-local-state"], queryFn: fetch });
    const unsubscribe = observer.subscribe(() => {});
    const markup = () =>
      renderToStaticMarkup(
        React.createElement(
          ClientQueryBoundary,
          {
            query: observer.getCurrentResult(),
            title: "Refresh failed",
            loadingLabel: "Loading local rows",
          },
          "Verified empty",
        ),
      );
    try {
      expect(markup()).toContain("Loading local rows");
      expect(markup()).not.toContain("Verified empty");
      resolve([]);
      await vi.waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
      expect(markup()).toContain("Verified empty");
      await observer.refetch();
      expect(markup()).toContain("Verified empty");
      expect(markup()).toContain("Refresh failed");
      expect(markup()).not.toContain("PRIVATE SERVER DETAIL");
    } finally {
      unsubscribe();
      client.clear();
    }
  });
  it("provides a functional retry and disables it during fetching", () => {
    const failed = query(undefined, "error");
    const props = {
      query: failed,
      title: "Unavailable",
      loadingLabel: "Loading",
      children: "Healthy child",
    };
    const tree = ClientQueryBoundary(props);
    (tree.props.children[0] as React.ReactElement<{ onRetry: () => void }>).props.onRetry();
    expect(failed.refetch).toHaveBeenCalledOnce();
    expect(renderToStaticMarkup(React.createElement(ClientQueryBoundary, props))).toContain(
      "Try again",
    );
    failed.isFetching = true;
    expect(renderToStaticMarkup(React.createElement(ClientQueryBoundary, props))).toContain(
      "disabled",
    );
  });
  it("accepts a successful empty cached result without a loading fallback", () => {
    const q = query([], "error");
    const html = renderToStaticMarkup(
      React.createElement(
        ClientQueryBoundary,
        { query: q, title: "Refresh failed", loadingLabel: "Loading" },
        "Verified empty",
      ),
    );
    expect(html).toContain("Verified empty");
    expect(html).toContain("Try again");
    expect(html).not.toContain("Loading");
  });
});

describe("B2 cached-data presentation guards", () => {
  const states = [
    ["successful data", "success", 200, "data"],
    ["initial loading", "pending", 200, "loading"],
    ["recoverable cached refresh failure", "error", 500, "data"],
    ["HTTP 401 with cached data", "error", 401, "denied"],
    ["HTTP 403 with cached data", "error", 403, "denied"],
    ["HTTP 404 with cached data", "error", 404, "denied"],
    ["successful empty data", "success", 200, "empty"],
  ] as const;

  it.each(states)("Home Last Update: %s", (_label, status, httpStatus, expected) => {
    const sensitive = "B2_SENSITIVE_NOTIFICATION";
    state.queries.notifications = query(
      expected === "loading"
        ? undefined
        : expected === "empty"
          ? []
          : [{ ...notification, title: sensitive, message: sensitive }],
      status,
      httpStatus,
    );
    const html = render(Home);
    const fact = html.match(/<dt>Last Update<\/dt>\s*<dd>([\s\S]*?)<\/dd>/)?.[1];
    expect(fact).toBeDefined();
    if (expected === "data") {
      expect(fact).toContain(sensitive);
    } else {
      expect(html).not.toContain(sensitive);
      expect(fact).toContain(
        expected === "loading"
          ? "Loading updates"
          : expected === "empty"
            ? "No recent update"
            : "Updates unavailable",
      );
    }
    if (status === "error") expect(html).toContain("Try again");
    expect(html).toContain("Healthy matter");
    expect(html).not.toContain("PRIVATE SERVER DETAIL");
  });

  it.each(states)("Documents auxiliary controls: %s", (_label, status, httpStatus, expected) => {
    const sensitive = "B2_SENSITIVE_DOCUMENT";
    state.queries.documents = query(
      expected === "loading"
        ? undefined
        : expected === "empty"
          ? []
          : [{ ...doc, title: sensitive, type: "court_filing" }],
      status,
      httpStatus,
    );
    const html = render(Documents);
    const options = html.match(
      /<select[^>]*aria-label="Filter by document type"[^>]*>([\s\S]*?)<\/select>/,
    )?.[1];
    expect(options).toBeDefined();
    expect(options).toContain("All Types");
    if (expected === "data") {
      expect(html).toContain(sensitive);
      expect(options).toContain('value="court_filing"');
      expect(html).toContain("Document Categories");
      expect(html).toMatch(/<span>Court Filing<\/span><strong>1<\/strong>/);
    } else {
      expect(html).not.toContain(sensitive);
      expect(options).not.toContain('value="court_filing"');
      expect(html).not.toContain("Document Categories");
      expect(html).not.toContain("Court Filing");
      expect(html).toContain(
        expected === "loading"
          ? "Loading documents"
          : expected === "empty"
            ? "No documents yet"
            : "Documents unavailable",
      );
    }
    if (status === "error") expect(html).toContain("Try again");
    expect(html).toContain("Upload Document");
    expect(html).not.toContain("PRIVATE SERVER DETAIL");
  });

  it.each(states)("Matter Recent Discussion: %s", (_label, status, httpStatus, expected) => {
    const sensitive = "B2_SENSITIVE_MESSAGE";
    state.queries.messages = query(
      expected === "loading"
        ? undefined
        : { page: expected === "empty" ? [] : [{ _id: "b2-message", content: sensitive }] },
      status,
      httpStatus,
    );
    const html = render(Detail);
    if (expected === "data") {
      expect(html).toContain("Recent Discussion");
      expect(html).toContain(sensitive);
      expect(html).toContain("Open full chat");
    } else {
      expect(html).not.toContain(sensitive);
      if (expected === "empty") {
        expect(html).not.toContain("Recent Discussion");
        expect(html).not.toContain("Unable to load recent discussion");
      } else {
        expect(html).toContain("Recent Discussion");
        expect(html).toContain(
          expected === "loading" ? "Loading recent discussion" : "Unable to load recent discussion",
        );
      }
    }
    if (status === "error") expect(html).toContain("Try again");
    expect(html).toContain("Healthy matter");
    expect(html).not.toContain("PRIVATE SERVER DETAIL");
  });

  it("Matter Recent Discussion reports an uncached fetch failure without an empty success", () => {
    state.queries.messages = query(undefined, "error");
    const html = render(Detail);
    expect(html).toContain("Unable to load recent discussion");
    expect(html).toContain("Try again");
    expect(html).toContain("Healthy matter");
    expect(html).not.toContain("PRIVATE SERVER DETAIL");
  });

  it.each([500, 401, 403, 404])(
    "existing boundary handles an actual cached TanStack HTTP %s refresh failure",
    async (status) => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const key = ["b2-cached-boundary", status];
      const sensitive = "B2_SENSITIVE_BOUNDARY_CONTENT";
      client.setQueryData(key, [sensitive]);
      const observer = new QueryObserver<string[]>(client, {
        queryKey: key,
        enabled: false,
        queryFn: vi.fn().mockRejectedValue({ status, message: "PRIVATE SERVER DETAIL" }),
      });
      const unsubscribe = observer.subscribe(() => {});
      const markup = () =>
        renderToStaticMarkup(
          React.createElement(
            ClientQueryBoundary,
            {
              query: observer.getCurrentResult(),
              title: "Refresh unavailable",
              loadingLabel: "Loading discussion",
            },
            observer.getCurrentResult().data?.join(" "),
          ),
        );
      try {
        expect(markup()).toContain(sensitive);
        await observer.refetch();
        expect(observer.getCurrentResult().isError).toBe(true);
        expect(observer.getCurrentResult().data).toEqual([sensitive]);
        const html = markup();
        expect(html).toContain("Refresh unavailable");
        expect(html).toContain("Try again");
        expect(html).not.toContain("PRIVATE SERVER DETAIL");
        if (status === 500) expect(html).toContain(sensitive);
        else expect(html).not.toContain(sensitive);
      } finally {
        unsubscribe();
        client.clear();
      }
    },
  );
});
