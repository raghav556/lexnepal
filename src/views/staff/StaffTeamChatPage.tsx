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
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { useDmCommands, useDmMessages, useDmThreads } from "@/client/queries/dm";
import { useStaffDirectory } from "@/client/queries/identity";
import { useCases } from "@/client/queries/cases";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { presenceLabel } from "@/shared/team-chat-presence";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty.tsx";

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
  const [draft, setDraft] = useState("");

  const { data: threads, isLoading: threadsLoading } = useDmThreads();
  const { data: dmMessages } = useDmMessages(leftTab === "dms" ? selectedDm : null);
  const { openThread, sendMessage, markRead } = useDmCommands();
  const staff = useStaffDirectory() || [];
  const cases = useCases({}) || [];
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (selectedDm) markRead.mutate(selectedDm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDm, dmMessages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

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
        String(c.title || "").toLowerCase().includes(q) ||
        String(c.caseNumber || "").toLowerCase().includes(q),
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

  const handleSendDm = async () => {
    if (!selectedDm || !draft.trim()) return;
    try {
      await sendMessage.mutateAsync({ threadId: selectedDm, content: draft.trim() });
      setDraft("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    }
  };

  if (currentUser === undefined || currentUser === null) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full font-sans space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Team Chat
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            1:1 staff DMs and case-team rooms. Clients never see these conversations.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/staff/messages">
            <MessageSquare className="w-4 h-4 mr-1" />
            Client messages
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-200px)]">
        {/* Left rail */}
        <Card
          className={cn(
            "lg:col-span-4 xl:col-span-3 flex flex-col overflow-hidden border",
            mobileShowChat ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="p-3 border-b border-border space-y-3">
            <div className="flex gap-1 p-1 rounded-lg bg-secondary/40">
              <button
                type="button"
                className={cn(
                  "flex-1 text-xs font-semibold py-2 rounded-md transition-colors",
                  leftTab === "dms" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
                onClick={() => setLeftTab("dms")}
              >
                DMs
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 text-xs font-semibold py-2 rounded-md transition-colors",
                  leftTab === "cases" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
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
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyTitle>No matters</EmptyTitle>
                  <EmptyDescription>Case team rooms appear for matters you can access.</EmptyDescription>
                </EmptyHeader>
              </Empty>
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
        </Card>

        {/* Chat pane */}
        <div
          className={cn(
            "lg:col-span-8 xl:col-span-9 min-h-[420px]",
            mobileShowChat ? "block" : "hidden lg:block",
          )}
        >
          <AnimatePresence mode="wait">
            {leftTab === "dms" && selectedDm ? (
              <motion.div
                key={`dm-${selectedDm}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col border rounded-xl overflow-hidden bg-card"
              >
                <div className="p-3 border-b border-border flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="lg:hidden"
                    onClick={() => setMobileShowChat(false)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{selectedThread?.peerName || "DM"}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Private staff chat
                    </p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/10">
                  {dmMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                      <MessageSquare className="w-8 h-8 opacity-30" />
                      Say hello to start the conversation.
                    </div>
                  ) : (
                    dmMessages.map((msg: any) => {
                      const isMe = msg.senderId === myId;
                      return (
                        <motion.div
                          key={msg._id || msg.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn("flex", isMe ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs border",
                              isMe
                                ? "bg-primary text-primary-foreground border-primary rounded-tr-md"
                                : "bg-card border-border rounded-tl-md",
                            )}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Message your teammate…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendDm();
                      }
                    }}
                  />
                  <Button size="sm" onClick={() => void handleSendDm()} disabled={!draft.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ) : leftTab === "cases" && selectedCase ? (
              <motion.div
                key={`case-${selectedCase}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 lg:hidden">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setMobileShowChat(false)}>
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
            ) : (
              <Card className="h-full flex items-center justify-center border">
                <CardContent className="text-center text-muted-foreground text-sm space-y-2 py-16">
                  <Users className="w-10 h-10 mx-auto opacity-25" />
                  <p>Select a DM or case team room to start chatting.</p>
                </CardContent>
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
