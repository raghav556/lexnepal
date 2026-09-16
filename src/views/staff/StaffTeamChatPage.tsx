"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Loader2,
  Lock,
  MessageSquare,
  Search,
  Send,
  Users,
  FolderOpen,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  DashboardButton,
  DashboardSection,
  EmptyState,
  HeroStatChip,
  PortalPageShell,
  STAFF_HERO_OUTLINE_BUTTON_CLASS,
  StaffHeroChipRow,
} from "@/components/dashboard";
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { LuxuryDmPanel } from "@/components/chat";
import { useDmCommands, useDmThreads } from "@/client/queries/dm";
import { useStaffDirectory } from "@/client/queries/identity";
import { useCases } from "@/client/queries/cases";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { presenceLabel } from "@/shared/team-chat-presence";

type LeftTab = "dms" | "cases";

export default function StaffTeamChatPage() {
  const currentUser = useCurrentUser();
  const searchParams = useSearchParams();
  const dmParam = searchParams.get("dm");
  const caseParam = searchParams.get("case");

  const [leftTab, setLeftTab] = useState<LeftTab>(caseParam ? "cases" : "dms");
  const [search, setSearch] = useState("");
  const [selectedDm, setSelectedDm] = useState<string | null>(dmParam);
  const [selectedCase, setSelectedCase] = useState<string | null>(caseParam);
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(dmParam || caseParam));

  const { data: threads, isLoading: threadsLoading } = useDmThreads();
  const { openThread } = useDmCommands();
  const staff = useStaffDirectory() || [];
  const cases = useCases({}) || [];

  const myId = currentUser?._id || currentUser?.id;

  useEffect(() => {
    if (dmParam) {
      setLeftTab("dms");
      setSelectedDm(dmParam);
      setMobileShowChat(true);
    }
    if (caseParam) {
      setLeftTab("cases");
      setSelectedCase(caseParam);
      setMobileShowChat(true);
    }
  }, [dmParam, caseParam]);

  const peerCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((u: any) => {
      if (!u || u._id === myId || u.role === "client") return false;
      if (!q) return true;
      return String(u.name || u.email || "")
        .toLowerCase()
        .includes(q);
    });
  }, [staff, myId, search]);

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.peerName.toLowerCase().includes(q));
  }, [threads, search]);

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c: any) =>
        String(c.title || "")
          .toLowerCase()
          .includes(q) ||
        String(c.caseNumber || "")
          .toLowerCase()
          .includes(q),
    );
  }, [cases, search]);

  const selectedThread = threads.find((t) => t._id === selectedDm);
  const selectedCaseRow = cases.find((c: any) => c._id === selectedCase);

  const startDm = async (peerUserId: string) => {
    try {
      const thread = await openThread.mutateAsync(peerUserId);
      setSelectedDm(thread._id);
      setLeftTab("dms");
      setMobileShowChat(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not open DM");
    }
  };

  if (currentUser === undefined || currentUser === null) {
    return (
      <PortalPageShell portal="staff" loading loadingLabel="Loading team chat…" title="Team chat">
        {null}
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell
      portal="staff"
      title="Team chat"
      description="1:1 staff DMs and case-team rooms. Clients never see these conversations."
      icon={Users}
      actions={
        <>
          <DashboardButton size="sm" variant="primary" onClick={() => setLeftTab("dms")}>
            <Users className="size-3.5" aria-hidden /> Direct messages
          </DashboardButton>
          <DashboardButton
            asChild
            size="sm"
            variant="outline"
            className={STAFF_HERO_OUTLINE_BUTTON_CLASS}
          >
            <Link href="/staff/messages">
              <MessageSquare className="size-3.5" aria-hidden />
              Client messages
            </Link>
          </DashboardButton>
        </>
      }
      heroChildren={
        <StaffHeroChipRow>
          <HeroStatChip icon={Users} value={(threads ?? []).length} label="DM threads" />
          <HeroStatChip icon={FolderOpen} value={cases.length} label="case rooms" />
          <HeroStatChip icon={Users} value={peerCandidates.length} label="colleagues" />
          <HeroStatChip value={leftTab === "dms" ? "DMs" : "Cases"} label="current view" />
        </StaffHeroChipRow>
      }
      contentClassName="space-y-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-200px)]">
        <DashboardSection
          className={cn(
            "lg:col-span-4 xl:col-span-3 flex flex-col overflow-hidden !p-0",
            mobileShowChat ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="p-3 border-b border-dashboard-border space-y-3">
            <div className="flex gap-1 p-1 rounded-lg bg-dashboard-neutral-soft">
              <button
                type="button"
                className={cn(
                  "flex-1 text-xs font-semibold py-2 rounded-md transition-colors",
                  leftTab === "dms"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
                onClick={() => setLeftTab("dms")}
              >
                DMs
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 text-xs font-semibold py-2 rounded-md transition-colors",
                  leftTab === "cases"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
                onClick={() => setLeftTab("cases")}
              >
                Case teams
              </button>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={leftTab === "dms" ? "Search people…" : "Search matters…"}
                className="h-9 pl-8"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {leftTab === "dms" ? (
              <>
                {threadsLoading ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : null}
                {filteredThreads.map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => {
                      setSelectedDm(t._id);
                      setMobileShowChat(true);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      selectedDm === t._id
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold truncate">{t.peerName}</p>
                      {(t.unreadCount || 0) > 0 ? (
                        <span className="text-[10px] font-bold bg-accent text-accent-foreground rounded-full px-1.5">
                          {t.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {presenceLabel(t.lastMessage?.createdAt || t.lastMessageAt)}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {t.lastMessage?.content || "No messages yet"}
                    </p>
                  </button>
                ))}
                <div className="pt-3 border-t border-border mt-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-2">
                    Start a DM
                  </p>
                  {peerCandidates.slice(0, 12).map((u: any) => (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => void startDm(u._id)}
                      className="w-full text-left px-3 py-2 rounded-md text-xs hover:bg-muted/60 flex justify-between gap-2"
                    >
                      <span className="truncate font-medium">{u.name || u.email}</span>
                      <span className="text-muted-foreground shrink-0">{u.role}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : filteredCases.length === 0 ? (
              <EmptyState
                title="No matters"
                description="Case team rooms appear for matters you can access."
                icon={FolderOpen}
                className="py-8"
              />
            ) : (
              filteredCases.map((c: any) => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => {
                    setSelectedCase(c._id);
                    setMobileShowChat(true);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    selectedCase === c._id
                      ? "border-primary/40 bg-primary/10"
                      : "border-transparent hover:bg-muted/60",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <FolderOpen className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">
                        [{c.caseNumber}] {c.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Lock className="w-3 h-3" /> Internal team room
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DashboardSection>

        {/* Chat pane */}
        <div
          className={cn(
            "lg:col-span-8 xl:col-span-9 min-h-[420px]",
            mobileShowChat ? "block" : "hidden lg:block",
          )}
        >
          <AnimatePresence mode="wait">
            {leftTab === "dms" && selectedDm ? (
              <DashboardSection className="h-full flex flex-col overflow-hidden !p-0">
                <LuxuryDmPanel
                  threadId={selectedDm}
                  peerName={selectedThread?.peerName || "DM"}
                  peerRole={selectedThread?.peerRole}
                  peerPresence={presenceLabel(selectedThread?.lastMessageAt)}
                  showBack
                  onBack={() => setMobileShowChat(false)}
                  bordered={false}
                  className="h-full rounded-2xl"
                />
              </DashboardSection>
            ) : leftTab === "cases" && selectedCase ? (
              <DashboardSection className="h-full flex flex-col gap-2 !p-3">
                <motion.div
                  key={`case-${selectedCase}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2 lg:hidden">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setMobileShowChat(false)}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/staff/cases/${selectedCase}?tab=messages&mode=team`}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Open case
                      </Link>
                    </Button>
                  </div>
                  <MatterChatPanel
                    caseId={selectedCase}
                    mode="staff"
                    stream="team"
                    title={selectedCaseRow?.title || "Case team"}
                    users={staff}
                    className="flex-1 h-[min(70vh,640px)]"
                    showBack
                    onBack={() => setMobileShowChat(false)}
                  />
                </motion.div>
              </DashboardSection>
            ) : (
              <DashboardSection className="h-full flex items-center justify-center">
                <EmptyState
                  title="Select a conversation"
                  description="Select a DM or case team room to start chatting."
                  icon={Users}
                  className="py-16"
                />
              </DashboardSection>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PortalPageShell>
  );
}
