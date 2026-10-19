"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DashboardButton,
  DashboardSection,
  EmptyState,
  MetricCard,
  PortalPageShell,
  StatusBadge,
  usePortalBranding,
} from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { LuxuryDmPanel } from "@/components/chat";
import { useCasesQuery } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useUnreadMessageCounts } from "@/client/queries/communication";
import { useDmCommands, useDmThreads } from "@/client/queries/dm";
import { useSessionCapabilities, useStaffDirectory } from "@/client/queries/identity";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Briefcase, FolderOpen, Lock, Mail, MessageSquare, Phone, Search, Users } from "lucide-react";
import { toast } from "sonner";

type Channel = "client" | "dm" | "team";

type MatterRow = {
  _id: string;
  title?: string;
  caseNumber?: string;
  clientId?: string;
  status?: string;
  practiceArea?: string;
  teamMemberIds?: string[];
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "—";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function readChannel(params: URLSearchParams): { channel: Channel; id: string | null } {
  const caseId = params.get("caseId");
  if (caseId) return { channel: "client", id: caseId };
  if (params.get("channel") === "dm") return { channel: "dm", id: params.get("dm") };
  if (params.get("channel") === "team") return { channel: "team", id: params.get("case") };
  return { channel: "client", id: null };
}

function formatRole(role?: string) {
  if (!role) return "Staff";
  return role.replaceAll("_", " ");
}

export default function StaffMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { heroImageUrl } = usePortalBranding();
  const currentUser = useCurrentUser();
  const capabilities = useSessionCapabilities();
  const canOpenClient =
    capabilities?.includes("clients.view_all") === true ||
    capabilities?.includes("clients.manage") === true;
  const casesQuery = useCasesQuery({});
  const cases = (casesQuery.data ?? []) as MatterRow[];
  const clients = useClients() ?? [];
  const { data: threads = [], isLoading: threadsLoading } = useDmThreads();
  const { openThread } = useDmCommands();
  const staff = useStaffDirectory() ?? [];
  const myId = currentUser?._id || currentUser?.id;
  const caseIds = cases.map((matter) => matter._id);
  const unreadQuery = useUnreadMessageCounts(caseIds);
  const unreadByCase = unreadQuery.data;

  const linked = readChannel(searchParams);
  const [channel, setChannel] = useState<Channel>(linked.channel);
  const [selectedId, setSelectedId] = useState<string | null>(linked.id);
  const [search, setSearch] = useState("");
  const [mobileChat, setMobileChat] = useState(Boolean(linked.id));
  const [openingDm, setOpeningDm] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const next = readChannel(searchParams);
    setChannel(next.channel);
    setSelectedId(next.id);
    if (next.id) setMobileChat(true);
  }, [searchParams]);

  const clientName = (clientId?: string) =>
    clients.find((client) => String(client._id ?? client.id) === String(clientId ?? ""))?.fullName ||
    "Client";

  const matterUnread = Object.values(unreadByCase).reduce((sum, count) => sum + Number(count || 0), 0);
  const dmUnread = threads.reduce((sum, thread) => sum + Number(thread.unreadCount || 0), 0);
  const query = search.trim().toLowerCase();

  const visibleMatters = useMemo(
    () =>
      cases.filter((matter) => {
        if (!query) return true;
        const name = clientName(matter.clientId).toLowerCase();
        return (
          String(matter.title ?? "").toLowerCase().includes(query) ||
          String(matter.caseNumber ?? "").toLowerCase().includes(query) ||
          name.includes(query)
        );
      }),
    [cases, clients, query],
  );

  const visibleThreads = threads.filter(
    (thread) => !query || thread.peerName.toLowerCase().includes(query),
  );
  const peers = staff.filter((user) => {
    if (!user.id || user.id === myId || user.role === "client") return false;
    if (threads.some((thread) => thread.peerUserId === user.id)) return false;
    if (!query) return true;
    return String(user.name || user.email || "").toLowerCase().includes(query);
  });

  const selectedMatter = cases.find((matter) => matter._id === selectedId) ?? null;
  const selectedClient = clients.find(
    (client) => String(client._id ?? client.id) === String(selectedMatter?.clientId ?? ""),
  );
  const selectedThread = threads.find((thread) => thread._id === selectedId) ?? null;
  const selectedPeer = selectedThread
    ? staff.find((user) => user.id === selectedThread.peerUserId)
    : null;
  const hasSelection =
    (channel === "dm" && Boolean(selectedThread)) ||
    (channel !== "dm" && Boolean(selectedMatter));

  const choose = (nextChannel: Channel, id: string | null) => {
    setChannel(nextChannel);
    setSelectedId(id);
    setMobileChat(Boolean(id));
    setDetailsOpen(false);
    const next = new URLSearchParams();
    if (nextChannel === "client" && id) next.set("caseId", id);
    if (nextChannel === "dm") {
      next.set("channel", "dm");
      if (id) next.set("dm", id);
    }
    if (nextChannel === "team") {
      next.set("channel", "team");
      if (id) next.set("case", id);
    }
    const suffix = next.toString();
    router.replace(suffix ? `/staff/messages?${suffix}` : "/staff/messages", { scroll: false });
  };

  const startDm = async (peerUserId: string) => {
    if (openingDm) return;
    setOpeningDm(peerUserId);
    try {
      const thread = await openThread.mutateAsync(peerUserId);
      choose("dm", thread._id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the direct message.");
    } finally {
      setOpeningDm(null);
    }
  };

  if (currentUser === undefined || currentUser === null) {
    return (
      <PortalPageShell portal="staff" loading loadingLabel="Loading messages…" title="Messages">
        {null}
      </PortalPageShell>
    );
  }

  const detailsTitle =
    channel === "dm"
      ? selectedThread?.peerName || "Staff colleague"
      : clientName(selectedMatter?.clientId);
  const channelBadge =
    channel === "team"
      ? { tone: "warning" as const, label: "Confidential" }
      : channel === "dm"
        ? { tone: "neutral" as const, label: "Private staff" }
        : { tone: "information" as const, label: "Client-visible" };

  return (
    <PortalPageShell
      portal="staff"
      title="Messages"
      description="Client-visible matter messages, private staff direct messages, and confidential case-team notes."
      icon={MessageSquare}
      className="staff-messages-workspace"
      heroClassName="staff-messages-hero"
      loadingLabel="Loading messages…"
      heroChildren={
        <div
          aria-hidden
          className="staff-messages-hero-art"
          style={
            heroImageUrl
              ? {
                  backgroundImage: `url(${JSON.stringify(heroImageUrl)}), url("/images/staff-home-nepal.jpg")`,
                }
              : undefined
          }
        />
      }
    >
      <div className="staff-messages-metrics">
        <MetricCard
          label="Client conversations"
          value={String(cases.length)}
          icon={MessageSquare}
          tone="information"
          helperText="Matters you can message"
        />
        <MetricCard
          label="Direct messages"
          value={String(threads.length)}
          icon={Users}
          tone="neutral"
          helperText="Private staff threads"
        />
        <MetricCard
          label="Case teams"
          value={String(cases.length)}
          icon={Lock}
          tone="warning"
          helperText="Internal matter rooms"
        />
        <MetricCard
          label="Unread"
          value={String(matterUnread + dmUnread)}
          icon={FolderOpen}
          tone="success"
          helperText="Matter unread includes client and internal messages"
        />
      </div>

      <div
        className="staff-messages-stage"
        data-chat={mobileChat ? "open" : "closed"}
        data-context={hasSelection ? "open" : "closed"}
        data-details={detailsOpen ? "open" : "closed"}
        data-channel={channel}
      >
        <section className="staff-messages-list" aria-label="Conversations">
          <div className="staff-messages-tabs" role="tablist" aria-label="Message channels">
            {(
              [
                ["client", "Client"],
                ["dm", "Direct"],
                ["team", "Case teams"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={channel === value}
                onClick={() => choose(value, null)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="staff-messages-search">
            <Search aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, matter, or message…"
              aria-label="Search conversations"
            />
          </div>
          <div className="staff-messages-list-scroll">
            {channel !== "dm" && casesQuery.isError ? (
              <div className="staff-messages-empty">
                <p>Matters could not be loaded.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void casesQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : channel === "dm" && threadsLoading ? (
              <p className="staff-messages-empty">Loading direct messages…</p>
            ) : (
              <ul className="staff-messages-rows">
                {channel !== "dm"
                  ? visibleMatters.map((matter) => {
                      const unread = Number(unreadByCase[matter._id] || 0);
                      return (
                        <li key={matter._id}>
                          <button
                            type="button"
                            className="staff-messages-row"
                            aria-current={selectedId === matter._id ? "true" : undefined}
                            onClick={() => choose(channel, matter._id)}
                          >
                            <span className="staff-messages-avatar" aria-hidden>
                              {initials(clientName(matter.clientId))}
                            </span>
                            <span className="staff-messages-copy">
                              <strong>{clientName(matter.clientId)}</strong>
                              <small>
                                {matter.caseNumber || "No number"} · {matter.title || "Untitled matter"}
                              </small>
                              <em>{channel === "team" ? "Confidential" : "Client-visible"}</em>
                            </span>
                            {unread > 0 ? (
                              <b
                                aria-label={`${unread} unread matter messages, including client and internal`}
                              >
                                {unread}
                              </b>
                            ) : null}
                          </button>
                        </li>
                      );
                    })
                  : visibleThreads.map((thread) => (
                      <li key={thread._id}>
                        <button
                          type="button"
                          className="staff-messages-row"
                          aria-current={selectedId === thread._id ? "true" : undefined}
                          onClick={() => choose("dm", thread._id)}
                        >
                          <span className="staff-messages-avatar" aria-hidden>
                            {initials(thread.peerName)}
                          </span>
                          <span className="staff-messages-copy">
                            <strong>{thread.peerName}</strong>
                            <small>{thread.lastMessage?.content || "No messages yet"}</small>
                            <em>Private staff</em>
                          </span>
                          {thread.unreadCount ? (
                            <b aria-label={`${thread.unreadCount} unread direct messages`}>
                              {thread.unreadCount}
                            </b>
                          ) : null}
                        </button>
                      </li>
                    ))}
              </ul>
            )}
            {channel === "dm" ? (
              <div className="staff-messages-new-dm" aria-label="New direct message">
                <div className="staff-messages-new-dm-head">
                  <Users aria-hidden className="size-4" />
                  <h3>New direct message</h3>
                </div>
                <p className="staff-messages-new-dm-help">
                  Choose a colleague from your firm directory to open a private staff thread.
                </p>
                {peers.length > 0 ? (
                  <div className="staff-messages-peers">
                    {peers.slice(0, 8).map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        disabled={openingDm === user.id}
                        onClick={() => void startDm(user.id)}
                      >
                        {user.name || user.email || "Staff"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="staff-messages-new-dm-empty">
                    {threadsLoading
                      ? "Loading colleagues…"
                      : "No additional colleagues available to message right now."}
                  </p>
                )}
              </div>
            ) : null}
            {channel !== "dm" && !casesQuery.isError && visibleMatters.length === 0 ? (
              <EmptyState
                title="No conversations match"
                description="Try another name or matter."
                icon={MessageSquare}
                className="border-0"
              />
            ) : null}
            {channel === "dm" && !threadsLoading && visibleThreads.length === 0 ? (
              <EmptyState
                title="No conversations yet"
                description="Start a new direct message above, or wait for a colleague to message you."
                icon={Users}
                className="border-0"
              />
            ) : null}
          </div>
        </section>

        <section className="staff-messages-chat" aria-label="Conversation">
          {hasSelection ? (
            <button
              type="button"
              className="staff-messages-details-toggle"
              onClick={() => setDetailsOpen(true)}
            >
              Conversation details
            </button>
          ) : null}
          {channel === "dm" && selectedThread ? (
            <LuxuryDmPanel
              threadId={selectedThread._id}
              peerName={selectedThread.peerName}
              peerRole={selectedThread.peerRole}
              peerPresence=""
              subtitle="Private staff conversation"
              showTemplates={false}
              showBack
              onBack={() => setMobileChat(false)}
              className="h-full min-h-0"
            />
          ) : channel !== "dm" && selectedMatter ? (
            <MatterChatPanel
              caseId={selectedMatter._id}
              mode="staff"
              stream={channel === "team" ? "team" : "client"}
              title={channel === "team" ? "Confidential case team" : "Client-visible messages"}
              subtitle={
                channel === "team"
                  ? "Confidential — hidden from clients"
                  : "Client-visible — the client can read this"
              }
              caseNumber={selectedMatter.caseNumber}
              showBack
              onBack={() => setMobileChat(false)}
              externalLink={`/staff/cases/${selectedMatter._id}`}
              externalLinkLabel="Open matter"
              showTemplates={false}
              className="h-full min-h-0"
            />
          ) : (
            <EmptyState
              title="Select a conversation"
              description={
                channel === "dm"
                  ? "Choose a colleague to open a private staff thread."
                  : channel === "team"
                    ? "Choose a matter to open its confidential case-team notes."
                    : "Choose a matter to message the client."
              }
              icon={MessageSquare}
              className="border-0"
            />
          )}
        </section>

        {hasSelection ? (
          <aside className="staff-messages-context" aria-label="Conversation details">
            <div className="staff-messages-context-head">
              <h2>Conversation details</h2>
              <button
                type="button"
                className="staff-messages-details-close"
                onClick={() => setDetailsOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="staff-messages-context-scroll">
              <div className="staff-messages-details-identity">
                <span className="staff-messages-avatar" aria-hidden>
                  {initials(detailsTitle)}
                </span>
                <div>
                  <strong>{detailsTitle}</strong>
                  <StatusBadge tone={channelBadge.tone}>{channelBadge.label}</StatusBadge>
                </div>
              </div>

              {channel === "dm" && selectedThread ? (
                <>
                  <DashboardSection
                    density="compact"
                    title="Staff participant"
                    icon={Users}
                    className="staff-messages-details-card"
                  >
                    <dl className="staff-messages-details-fields">
                      <div>
                        <dt>Role</dt>
                        <dd>{formatRole(selectedThread.peerRole || selectedPeer?.role)}</dd>
                      </div>
                      <div>
                        <dt>Email</dt>
                        <dd>
                          {selectedPeer?.email ? (
                            <a href={`mailto:${selectedPeer.email}`}>{selectedPeer.email}</a>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                    </dl>
                  </DashboardSection>
                  <p className="staff-messages-details-note">
                    Private staff conversation — clients never see this thread.
                  </p>
                </>
              ) : selectedMatter ? (
                <>
                  <DashboardSection
                    density="compact"
                    title="Linked matter"
                    icon={Briefcase}
                    className="staff-messages-details-card"
                    actions={
                      <StatusBadge tone="neutral">
                        {String(selectedMatter.status || "unknown").replaceAll("_", " ")}
                      </StatusBadge>
                    }
                  >
                    <dl className="staff-messages-details-fields">
                      <div>
                        <dt>Title</dt>
                        <dd>{selectedMatter.title || "Untitled matter"}</dd>
                      </div>
                      <div>
                        <dt>Number</dt>
                        <dd>{selectedMatter.caseNumber || "—"}</dd>
                      </div>
                      <div>
                        <dt>Practice area</dt>
                        <dd>{selectedMatter.practiceArea || "—"}</dd>
                      </div>
                    </dl>
                  </DashboardSection>

                  {channel === "client" ? (
                    <DashboardSection
                      density="compact"
                      title="Contact"
                      icon={Mail}
                      className="staff-messages-details-card"
                    >
                      <dl className="staff-messages-details-fields">
                        <div>
                          <dt>Email</dt>
                          <dd>
                            {selectedClient?.email ? (
                              <a href={`mailto:${selectedClient.email}`}>
                                <Mail className="size-3.5" aria-hidden />
                                {selectedClient.email}
                              </a>
                            ) : (
                              "—"
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Phone</dt>
                          <dd>
                            {selectedClient?.phone ? (
                              <a href={`tel:${selectedClient.phone}`}>
                                <Phone className="size-3.5" aria-hidden />
                                {selectedClient.phone}
                              </a>
                            ) : (
                              "—"
                            )}
                          </dd>
                        </div>
                      </dl>
                    </DashboardSection>
                  ) : (
                    <p className="staff-messages-details-note">
                      Confidential case-team notes stay hidden from the client. Use this room for
                      internal strategy only.
                    </p>
                  )}

                  <div className="staff-messages-details-actions">
                    <DashboardButton asChild size="sm">
                      <Link href={`/staff/cases/${selectedMatter._id}`}>Open matter</Link>
                    </DashboardButton>
                    {channel === "client" &&
                    canOpenClient &&
                    selectedMatter.clientId ? (
                      <DashboardButton asChild size="sm" variant="outline">
                        <Link
                          href={`/staff/clients?client=${encodeURIComponent(selectedMatter.clientId)}`}
                        >
                          Open client
                        </Link>
                      </DashboardButton>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </PortalPageShell>
  );
}
