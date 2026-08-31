"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { useCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useUnreadMessageCounts } from "@/client/queries/communication";
import { cn } from "@/lib/utils.ts";
import {
  DashboardButton,
  DashboardListRow,
  DashboardSection,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";

export default function StaffMessagesPage() {
  const currentUser = useCurrentUser();
  const cases = useCases({}) || [];
  const clients = useClients() || [];
  const searchParams = useSearchParams();
  const queryCaseId = searchParams.get("caseId");

  const [selected, setSelected] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const caseIds = cases.map((c: { _id: string }) => c._id);
  const { data: unreadByCase = {} } = useUnreadMessageCounts(caseIds);

  useEffect(() => {
    if (queryCaseId) {
      setSelected(queryCaseId);
      setMobileShowChat(true);
      return;
    }
    if (cases.length > 0 && !selected) {
      setSelected(cases[0]._id);
    }
  }, [cases, selected, queryCaseId]);

  if (currentUser === undefined || currentUser === null) {
    return (
      <PortalPageShell
        portal="staff"
        loading
        loadingLabel="Loading messages…"
        title="Client messages"
      >
        {null}
      </PortalPageShell>
    );
  }

  const selectedCase = cases.find((c: { _id: string }) => c._id === selected);
  const clientName =
    clients.find((cl: { _id: string }) => cl._id === selectedCase?.clientId)?.fullName || "Client";

  return (
    <PortalPageShell
      portal="staff"
      decorated
      titleKey="portal.messages.title"
      descriptionKey="portal.messages.description"
      icon={MessageSquare}
      actions={
        <DashboardButton asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
          <Link href="/staff/cases">All cases</Link>
        </DashboardButton>
      }
      contentClassName="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[calc(100vh-200px)]">
        <DashboardSection
          title="Matter threads"
          className={cn(
            "flex flex-col overflow-hidden !p-0",
            mobileShowChat ? "hidden md:flex" : "flex",
          )}
        >
          <div
            className={cn(
              "flex-1 overflow-y-auto p-3 space-y-2",
              mobileShowChat ? "hidden md:block" : "block",
            )}
          >
            {cases.length === 0 ? (
              <EmptyState
                title="No matters assigned"
                description="Open or get assigned to a case to message clients."
                icon={MessageSquare}
                className="m-2 border-0"
              />
            ) : (
              cases.map((c: any) => {
                const active = selected === c._id;
                const unread = unreadByCase[c._id] || 0;
                const name =
                  clients.find((cl: { _id: string }) => cl._id === c.clientId)?.fullName ||
                  "Client";
                return (
                  <DashboardListRow
                    key={c._id}
                    className={cn(
                      "cursor-pointer p-4",
                      active && "border-dashboard-primary bg-dashboard-primary-soft",
                    )}
                    onClick={() => {
                      setSelected(c._id);
                      setMobileShowChat(true);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelected(c._id);
                        setMobileShowChat(true);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">
                        [{c.caseNumber}] {c.title}
                      </p>
                      {unread > 0 ? (
                        <span className="shrink-0 text-[10px] font-bold bg-dashboard-primary text-dashboard-primary-foreground rounded-full px-1.5 py-0.5">
                          {unread}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{name}</p>
                  </DashboardListRow>
                );
              })
            )}
          </div>
        </DashboardSection>

        {selected ? (
          <div
            className={cn(
              "md:col-span-2 h-[calc(100dvh-11rem)] md:h-full",
              mobileShowChat ? "block" : "hidden md:block",
            )}
          >
            <MatterChatPanel
              caseId={selected}
              mode="staff"
              title={`${selectedCase?.title || "Matter"} · ${clientName}`}
              users={[]}
              showBack
              onBack={() => setMobileShowChat(false)}
              className="h-full"
            />
          </div>
        ) : (
          <DashboardSection
            className={cn(
              "md:col-span-2 items-center justify-center",
              mobileShowChat ? "flex" : "hidden md:flex",
            )}
          >
            <EmptyState
              title="Select a matter"
              description="Choose a matter from the list to view client messages."
              icon={MessageSquare}
              className="border-0"
            />
          </DashboardSection>
        )}
      </div>
    </PortalPageShell>
  );
}
