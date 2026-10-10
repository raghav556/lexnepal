/* eslint-disable @typescript-eslint/no-explicit-any -- synthetic query/presentation fixtures */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);
const query = (data: unknown) => ({
  data,
  hasData: true,
  isPending: false,
  isLoading: false,
  isError: false,
  isSuccess: true,
  isFetching: false,
  refetch: vi.fn(),
});
vi.mock("@/client/queries/clients", () => ({
  useMyClientQuery: () => query({ _id: "synthetic-client", kycStatus: "verified" }),
  useMyTeam: () => [],
}));
vi.mock("@/client/queries/cases", () => ({ useClientCasesQuery: () => query([]) }));
vi.mock("@/client/queries/hearings", () => ({ useHearingsQuery: () => query([]) }));
vi.mock("@/client/queries/tasks", () => ({ useTasksQuery: () => query([]) }));
vi.mock("@/client/queries/documents", () => ({
  useDocumentsQuery: () => query([]),
  useDownloadDocument: () => vi.fn(),
  useUploadDocument: () => vi.fn(),
}));
vi.mock("@/client/queries/communication", () => ({
  useNotifications: () => query([]),
  useNotificationCommands: () => ({ markRead: {}, markAllRead: { isPending: false } }),
}));
vi.mock("@/client/queries/crm", () => ({
  useAppointments: () => query([]),
  useAvailableSlots: () => query(["09:00", "10:00"]),
  useAppointmentCommands: () => ({ bookConsultation: { isPending: false, mutateAsync: vi.fn() } }),
}));
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ _id: "synthetic-user", name: "Client", role: "client" }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/client",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/i18n-context", () => ({
  useI18n: () => ({ language: "en", setLanguage: vi.fn(), t: (key: string) => key }),
}));
vi.mock("@/components/ui/notification-bell", () => ({ NotificationBell: () => null }));
vi.mock("@/components/dashboard/portal-branding-context", () => ({
  usePortalBranding: () => ({ heroImageUrl: null }),
}));
vi.mock("@/components/dashboard", async () => {
  const primitives = await import("@/components/dashboard/dashboard-primitives");
  const client = await import("@/components/dashboard/client-primitives");
  const { DashboardListRow } = await import("@/components/dashboard/dashboard-table");
  return {
    ...primitives,
    ...client,
    DashboardListRow,
    usePortalBranding: () => ({ heroImageUrl: null }),
    PortalPageShell: ({ title, children, actions }: any) =>
      React.createElement("main", null, React.createElement("h1", null, title), actions, children),
    DashboardStatusLabel: ({ status }: any) => React.createElement("span", null, status),
  };
});

import Cases from "@/views/client/ClientCasesPage";
import Hearings from "@/views/client/ClientHearingsPage";
import Checklist from "@/views/client/ClientChecklistPage";
import Documents from "@/views/client/ClientDocumentsPage";
import Notifications from "@/views/client/ClientNotificationsPage";
import Booking from "@/views/client/ClientBookingPage";
import { ClientMobileDrawer } from "@/components/dashboard/client-mobile-drawer";
import { PortalMobileNav } from "@/components/dashboard/portal-mobile-nav";
import { PasswordConfirmDialog } from "@/components/auth/PasswordConfirmDialog";

const render = (view: React.ComponentType) => renderToStaticMarkup(React.createElement(view));

describe("CUI-18 rendered Client control semantics (synthetic data, no database)", () => {
  it.each([
    [Cases, "Matter view"],
    [Hearings, "Hearing schedule views"],
    [Checklist, "Due status filters"],
    [Documents, "Document source filters"],
    [Notifications, "Notification filters"],
  ] as const)("renders named filter button groups", (view, label) => {
    const html = render(view);
    expect(html).toContain(`role="group" aria-label="${label}"`);
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('role="tab"');
  });

  it("gives mode radios a common native group and exactly one checked choice", () => {
    const html = render(Booking);
    const modes = html.match(/<input[^>]*name="consultation-mode"[^>]*>/g) ?? [];
    expect(modes).toHaveLength(3);
    expect(modes.every((input) => input.includes('type="radio"'))).toBe(true);
    expect(modes.filter((input) => input.includes('checked=""'))).toHaveLength(1);
    expect(modes.find((input) => input.includes('checked=""'))).toContain('value="virtual"');
    expect(html).toContain("Virtual");
    expect(html).toContain("In-Person");
    expect(html).toContain("Phone");
    expect(html).not.toContain('role="radio"');
  });

  it("preserves available-time buttons and the guarded request action", () => {
    const html = render(Booking);
    expect(html).toContain("09:00");
    expect(html).toContain("10:00");
    expect(html).toMatch(/<button[^>]*aria-pressed="false"/);
    expect(html).toMatch(/<button(?=[^>]*type="submit")(?=[^>]*disabled="")/);
  });

  it("renders a labelled modal drawer with the existing dialog close control", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ClientMobileDrawer,
        { id: "synthetic-client-drawer", open: true, onOpenChange: vi.fn() },
        React.createElement("a", { href: "/client/cases" }, "Matters"),
      ),
    );
    expect(html).toContain('role="dialog" aria-modal="true"');
    expect(html).toContain('aria-labelledby="synthetic-client-drawer-title"');
    expect(html).toContain('id="synthetic-client-drawer-title"');
    expect(html).toContain("Client navigation");
    expect(html).toContain('aria-label="Close dialog"');
    expect(html).toContain('href="/client/cases"');
  });

  it("does not render hidden drawer links when closed", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ClientMobileDrawer,
        { id: "closed-client-drawer", open: false, onOpenChange: vi.fn() },
        "HIDDEN_DRAWER_CONTENT",
      ),
    );
    expect(html).toBe("");
  });

  it.each([false, true])(
    "keeps modal semantics opt-in for other portals: %s",
    (clientModalDrawer) => {
      const accountMenu = vi.fn(() => "Hidden account");
      const html = renderToStaticMarkup(
        React.createElement(PortalMobileNav, {
          brand: "Synthetic portal",
          items: [],
          isActive: () => false,
          clientModalDrawer,
          accountMenu,
        }),
      );
      expect(html.includes('aria-haspopup="dialog"')).toBe(clientModalDrawer);
      expect(html).not.toContain('role="dialog"');
      expect(accountMenu).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, "Enable two-factor authentication"])(
    "applies the profile password-dialog name only when requested: %s",
    (dialogLabel) => {
      const html = renderToStaticMarkup(
        React.createElement(PasswordConfirmDialog, {
          open: true,
          onOpenChange: vi.fn(),
          title: "Enable two-factor authentication",
          description: "Enter your password",
          dialogLabel,
          onConfirm: vi.fn(),
        }),
      );
      expect(html.includes('aria-label="Enable two-factor authentication"')).toBe(
        Boolean(dialogLabel),
      );
      expect(html).toContain('type="password"');
      expect(html).toContain('autoComplete="current-password"');
    },
  );
});
