"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FolderOpen, MessageCircle, MessageSquare } from "lucide-react";
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { useUnreadMessageCounts } from "@/client/queries/communication";
import { useMyClient, useMyTeam } from "@/client/queries/clients";
import { useClientCases } from "@/client/queries/cases";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { DashboardButton, EmptyState, PortalPageShell } from "@/components/dashboard";
import { CASE_LIST_HERO_CLASS } from "@/shared/contracts/case-ui";
import type { ClientCaseDto } from "@/shared/contracts/domains";

export default function ClientMessagesPage() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useClientCases(clientId ? { clientId } : {}) || [];
  const users = useMyTeam() || [];
  const searchParams = useSearchParams();
  const queryCaseId = searchParams.get("caseId");

  const [selected, setSelected] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  /** User clicked a conversation — do not overwrite with auto-default. */
  const userPickedRef = useRef(false);
  /** Default (or deep-link) selection already applied for the current no-caseId / caseId mode. */
  const autoSelectDoneRef = useRef(false);
  const lastQueryCaseIdRef = useRef<string | null>(queryCaseId);

  const caseIds = useMemo(() => cases.map((c: ClientCaseDto) => c._id), [cases]);
  const { data: unreadByCase = {}, isFetched: unreadFetched } = useUnreadMessageCounts(caseIds);
  const unreadReady = caseIds.length === 0 || unreadFetched;

  const totalUnread = Object.values(unreadByCase).reduce(
    (sum: number, count) => sum + (Number(count) || 0),
    0,
  );

  const selectedMatter = useMemo(
    () => cases.find((c: ClientCaseDto) => c._id === selected) || null,
    [cases, selected],
  );

  useEffect(() => {
    if (lastQueryCaseIdRef.current !== queryCaseId) {
      lastQueryCaseIdRef.current = queryCaseId;
      autoSelectDoneRef.current = false;
      userPickedRef.current = false;
    }

    if (!cases.length) {
      setSelected(null);
      setMobileShowChat(false);
      autoSelectDoneRef.current = false;
      userPickedRef.current = false;
      return;
    }

    if (queryCaseId) {
      const allowed = cases.some((c: ClientCaseDto) => c._id === queryCaseId);
      if (allowed) {
        setSelected(queryCaseId);
        setMobileShowChat(true);
      } else {
        // Invalid / unauthorized deep-link must not open another matter.
        setSelected(null);
        setMobileShowChat(false);
      }
      autoSelectDoneRef.current = true;
      return;
    }

    const selectionStillValid = (id: string | null) =>
      Boolean(id && cases.some((c: ClientCaseDto) => c._id === id));

    if (userPickedRef.current) {
      if (selectionStillValid(selected)) return;
      userPickedRef.current = false;
      autoSelectDoneRef.current = false;
    }

    if (autoSelectDoneRef.current && selectionStillValid(selected)) {
      return;
    }

    // Wait for unread counts so we do not lock onto cases[0] with an empty map.
    if (!unreadReady) return;

    const withUnread = cases.find((c: ClientCaseDto) => Number(unreadByCase[c._id] || 0) > 0);
    setSelected(withUnread?._id || cases[0]._id);
    // Do not set mobileShowChat — mobile stays on Conversations until user/caseId opens chat.
    autoSelectDoneRef.current = true;
  }, [cases, queryCaseId, unreadByCase, unreadReady, selected]);

  const shellProps = {
    portal: "client" as const,
    decorated: true,
    className: "client-messages",
    heroClassName: cn(CASE_LIST_HERO_CLASS, "client-messages-hero"),
    eyebrow: "Client Portal",
    title: "Messages",
    description: "Message your legal team about your matters.",
    icon: MessageCircle,
    metricsClassName: "max-sm:hidden",
  };

  if (currentUser === undefined || clientRecord === undefined) {
    return (
      <PortalPageShell {...shellProps} loading loadingLabel="Loading your messages…">
        <div />
      </PortalPageShell>
    );
  }

  if (clientRecord === null) {
    return (
      <PortalPageShell {...shellProps} showTodayDate>
        <EmptyState
          title="No client profile linked"
          description="Ask the firm to grant portal access before messaging your legal team."
          icon={MessageCircle}
        />
      </PortalPageShell>
    );
  }

  const openMatter = (caseId: string) => {
    userPickedRef.current = true;
    autoSelectDoneRef.current = true;
    setSelected(caseId);
    setMobileShowChat(true);
  };

  return (
    <PortalPageShell
      {...shellProps}
      showTodayDate
      actions={
        <div className="client-messages-hero-actions">
          <DashboardButton asChild size="sm" variant="outline">
            <Link href="/client/cases">
              <FolderOpen className="h-3.5 w-3.5" aria-hidden />
              My Matters
            </Link>
          </DashboardButton>
        </div>
      }
    >
      <div className="client-messages-layout">
        <section
          className={cn(
            "client-messages-sidebar",
            mobileShowChat ? "client-messages-sidebar-hidden" : undefined,
          )}
          aria-label="Matter conversations"
        >
          <div className="client-messages-sidebar-head">
            <h2>Conversations</h2>
            <p>
              {cases.length} matter{cases.length === 1 ? "" : "s"}
              {totalUnread > 0 ? ` · ${totalUnread} unread` : ""}
            </p>
          </div>

          {cases.length === 0 ? (
            <EmptyState
              title="No matters yet"
              description="Conversations appear once the firm opens a case for you."
              icon={MessageCircle}
              action={
                <DashboardButton asChild size="sm" variant="outline">
                  <Link href="/client/cases">My Matters</Link>
                </DashboardButton>
              }
            />
          ) : (
            <ul className="client-messages-channel-list" role="listbox" aria-label="Matter list">
              {cases.map((matter: ClientCaseDto) => {
                const active = selected === matter._id;
                const unread = Number(unreadByCase[matter._id] || 0);
                return (
                  <li key={matter._id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={cn(
                        "client-messages-channel",
                        active && "client-messages-channel-active",
                        unread > 0 && "client-messages-channel-unread",
                      )}
                      onClick={() => openMatter(matter._id)}
                    >
                      <span className="client-messages-channel-avatar" aria-hidden>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </span>
                      <span className="client-messages-channel-copy min-w-0">
                        <span className="client-messages-channel-title">{matter.title}</span>
                        <span className="client-messages-channel-meta">
                          {matter.caseNumber}
                          {matter.practiceArea ? ` · ${matter.practiceArea}` : ""}
                        </span>
                      </span>
                      {unread > 0 ? (
                        <span
                          className="client-messages-unread"
                          aria-label={`${unread} unread message${unread === 1 ? "" : "s"}`}
                        >
                          {unread}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className={cn(
            "client-messages-conversation",
            mobileShowChat ? "client-messages-conversation-visible" : undefined,
          )}
          aria-label="Selected matter conversation"
        >
          {queryCaseId && !selectedMatter ? (
            <EmptyState
              title="Matter unavailable"
              description="That conversation link is not available for your account. Choose a matter from your list."
              icon={MessageCircle}
            />
          ) : selectedMatter && selected ? (
            <MatterChatPanel
              caseId={selected}
              mode="client"
              appearance="client"
              title={selectedMatter.title}
              caseNumber={selectedMatter.caseNumber}
              subtitle={`Legal team${selectedMatter.practiceArea ? ` · ${selectedMatter.practiceArea}` : ""}`}
              users={users}
              showBack
              onBack={() => setMobileShowChat(false)}
              externalLink={`/client/cases/${selected}`}
              externalLinkLabel="View Matter"
              bordered={false}
              className="client-messages-chat-panel h-full"
            />
          ) : (
            <div className="client-messages-empty-pane">
              <MessageCircle className="h-10 w-10 text-dashboard-neutral opacity-50" aria-hidden />
              <p className="client-messages-empty-title">Select a matter</p>
              <p className="client-messages-empty-copy">
                Choose a conversation to message your legal team.
              </p>
            </div>
          )}
        </section>
      </div>
    </PortalPageShell>
  );
}
