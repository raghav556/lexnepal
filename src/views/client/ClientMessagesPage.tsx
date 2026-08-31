"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, MessageCircle, MessageSquare, UserRound, ArrowLeft } from "lucide-react";
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { useUnreadMessageCounts } from "@/client/queries/communication";
import { useMyClient, useMyTeam } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import {
  DashboardButton,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES } from "@/lib/dashboard-semantics";

export default function ClientMessagesPage() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];
  const users = useMyTeam() || [];
  const searchParams = useSearchParams();
  const queryCaseId = searchParams.get("caseId");

  const [selected, setSelected] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const caseIds = cases.map((c: { _id: string }) => c._id);
  const { data: unreadByCase = {} } = useUnreadMessageCounts(caseIds);

  const totalUnread = Object.values(unreadByCase).reduce(
    (sum: number, count: any) => sum + (Number(count) || 0),
    0,
  );

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

  if (currentUser === undefined || clientRecord === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading your messages…"
        title="Messages"
      >
        <div />
      </PortalPageShell>
    );
  }

  if (clientRecord === null) {
    return (
      <PortalPageShell
        portal="client"
        decorated
        showTodayDate
        eyebrow="Direct Advocate Communications"
        title="Messages"
        description="Secure communication channels tied to each legal matter."
        icon={MessageCircle}
      >
        <EmptyState
          title="No client profile linked"
          description="Ask the firm to grant portal access before messaging your legal team."
          icon={MessageCircle}
        />
      </PortalPageShell>
    );
  }

  const metrics = [
    {
      label: "Active Discussions",
      value: String(cases.length),
      icon: MessageSquare,
      tone: DASHBOARD_METRIC_TONES.messages,
      helperText: "Matter channels",
    },
    {
      label: "Unread Messages",
      value: String(totalUnread),
      icon: MessageCircle,
      tone: totalUnread > 0 ? ("warning" as const) : ("success" as const),
      helperText: "Awaiting your review",
    },
    {
      label: "Legal Advocates",
      value: String(users.length),
      icon: UserRound,
      tone: "information" as const,
      helperText: "Assigned team members",
    },
  ];

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Direct Advocate Communications"
      title="Messages"
      description="Message your legal team about an open matter. Conversations are securely encrypted and tied to each case."
      icon={MessageCircle}
      metrics={metrics}
      actions={
        <DashboardButton asChild size="sm" variant="secondary">
          <Link href="/client/booking">
            <Calendar className="w-4 h-4 mr-1.5" /> Book Consultation
          </Link>
        </DashboardButton>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:min-h-[560px]">
        <DashboardSection
          title="Matter Channels"
          description="Select a case to view discussion"
          icon={MessageSquare}
          className={cn("h-full", mobileShowChat ? "hidden md:block" : "block")}
        >
          {cases === undefined ? (
            <DashboardListSkeleton rows={4} />
          ) : cases.length === 0 ? (
            <EmptyState
              title="No matters yet"
              description="Conversations appear once the firm opens a case for you. Need help sooner? Book a consultation or contact the firm."
              icon={MessageCircle}
              action={
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <DashboardButton asChild size="sm">
                    <Link href="/client/booking">
                      <Calendar className="w-4 h-4 mr-1" />
                      Book Appointment
                    </Link>
                  </DashboardButton>
                  <DashboardButton asChild size="sm" variant="outline">
                    <Link href="/contact">Contact the firm</Link>
                  </DashboardButton>
                </div>
              }
            />
          ) : (
            <div className="space-y-2">
              {cases.map((c: any) => {
                const active = selected === c._id;
                const unread = unreadByCase[c._id] || 0;
                return (
                  <DashboardListRow
                    key={c._id}
                    className={cn(
                      "cursor-pointer transition-all p-3",
                      active &&
                        "border-dashboard-primary/40 bg-dashboard-primary-soft/50 shadow-xs",
                    )}
                    onClick={() => {
                      setSelected(c._id);
                      setMobileShowChat(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">
                          [{c.caseNumber}] {c.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.practiceArea}</p>
                      </div>
                      {unread > 0 ? (
                        <span className="shrink-0 text-[10px] font-bold bg-dashboard-primary text-dashboard-primary-foreground rounded-full px-2 py-0.5">
                          {unread}
                        </span>
                      ) : null}
                    </div>
                  </DashboardListRow>
                );
              })}
            </div>
          )}
        </DashboardSection>

        <div className={cn("md:col-span-2 h-full", mobileShowChat ? "block" : "hidden md:block")}>
          {selected ? (
            <div className="h-[560px] flex flex-col">
              <MatterChatPanel
                caseId={selected}
                mode="client"
                title={cases.find((c: any) => c._id === selected)?.title || "Chat Channel"}
                users={users}
                showBack
                onBack={() => setMobileShowChat(false)}
                className="h-full rounded-xl border border-dashboard-border shadow-xs overflow-hidden"
              />
            </div>
          ) : (
            <DashboardSection className="h-full flex flex-col items-center justify-center min-h-[300px]">
              <div className="flex flex-col items-center text-center p-8 text-muted-foreground gap-3">
                <MessageCircle className="w-12 h-12 text-dashboard-neutral opacity-40" />
                <p className="text-sm font-semibold text-foreground">No case selected</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Choose a matter from the list on the left to start communicating with your legal
                  team.
                </p>
              </div>
            </DashboardSection>
          )}
        </div>
      </div>
    </PortalPageShell>
  );
}
