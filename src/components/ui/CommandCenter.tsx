"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  MessageSquare,
  Search,
  ChevronLeft,
  ExternalLink,
  Users,
  Briefcase,
  Sparkles,
  Lock,
  Globe,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useStaffDirectory } from "@/client/queries/identity";
import { useDmCommands, useDmThreads } from "@/client/queries/dm";
import { useUnreadMessageCounts } from "@/client/queries/communication";
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { LuxuryDmPanel, LuxuryThreadCard } from "@/components/chat";
import { toast } from "sonner";

export function CommandCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const currentUser = useCurrentUser();
  const allCases = useCases({}) || [];
  const clients = useClients() || [];
  const staff = useStaffDirectory() || [];
  const { data: threads = [] } = useDmThreads();
  const { openThread } = useDmCommands();

  const cases = useMemo(() => {
    if (currentUser?.role === "admin") return allCases;
    const uid = currentUser?._id || currentUser?.id;
    return allCases.filter(
      (c: { assignedLawyerId?: string; teamMemberIds?: string[] }) =>
        c.assignedLawyerId === uid ||
        (Array.isArray(c.teamMemberIds) && c.teamMemberIds.includes(uid!)),
    );
  }, [allCases, currentUser]);

  const caseIds = useMemo(() => cases.map((c: { _id: string }) => c._id), [cases]);
  const { data: unreadByCase = {} } = useUnreadMessageCounts(caseIds);

  const [activeTab, setActiveTab] = useState<"cases" | "team">("cases");
  const [streamMode, setStreamMode] = useState<"client" | "team">("client");
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [selectedDm, setSelectedDm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const myId = currentUser?._id || currentUser?.id;
  const peers = useMemo(
    () => staff.filter((u: any) => u && u._id !== myId && u.role !== "client"),
    [staff, myId],
  );

  useEffect(() => {
    if (!isOpen) {
      setMobileShowChat(false);
      setSearchQuery("");
    }
  }, [isOpen]);

  // Auto-select first case if none selected
  useEffect(() => {
    if (isOpen && activeTab === "cases" && cases.length > 0 && !selectedCase) {
      setSelectedCase(cases[0]._id);
    }
  }, [isOpen, cases, selectedCase, activeTab]);

  // Auto-select first DM if none selected
  useEffect(() => {
    if (isOpen && activeTab === "team" && threads.length > 0 && !selectedDm) {
      setSelectedDm(threads[0]._id);
    }
  }, [isOpen, threads, selectedDm, activeTab]);

  const handleStartDm = async (peerUserId: string) => {
    try {
      const thread = await openThread.mutateAsync(peerUserId);
      setSelectedDm(thread._id);
      setMobileShowChat(true);
      toast.success(`Direct channel opened with ${thread.peerName}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not start direct message");
    }
  };

  // Filtered cases
  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((c: any) => {
      const client = clients.find((cl: any) => cl._id === c.clientId);
      const str =
        `${c.caseNumber || ""} ${c.title || ""} ${c.practiceArea || ""} ${client?.fullName || ""}`.toLowerCase();
      return str.includes(q);
    });
  }, [cases, clients, searchQuery]);

  // Filtered DM threads & colleagues
  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.peerName.toLowerCase().includes(q));
  }, [threads, searchQuery]);

  const filteredPeers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return peers;
    return peers.filter((u: any) =>
      `${u.name || ""} ${u.email || ""} ${u.role || ""}`.toLowerCase().includes(q),
    );
  }, [peers, searchQuery]);

  const activeCaseObj = cases.find((c: { _id: string }) => c._id === selectedCase);
  const activeThreadObj = threads.find((t) => t._id === selectedDm);

  // Total unread counts
  const totalCaseUnread = Object.values(unreadByCase).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const totalDmUnread = threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Glassmorphic Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] transition-opacity"
          />

          {/* Luxury Executive Slide-Over Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="fixed top-0 right-0 h-screen w-full md:w-[960px] lg:w-[1020px] bg-slate-950 border-l border-slate-800/90 z-[101] flex flex-col md:flex-row shadow-2xl shadow-black/90 text-slate-100 overflow-hidden"
          >
            {/* Left Column: Thread List Rail */}
            <div
              className={cn(
                "w-full md:w-[340px] lg:w-[370px] border-r border-slate-800/80 flex-col bg-slate-950/70 backdrop-blur-xl shrink-0 h-full overflow-hidden",
                mobileShowChat ? "hidden md:flex" : "flex",
              )}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-slate-900/50">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                    <MessageSquare className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-serif font-bold text-sm text-white tracking-tight">
                        Command Center
                      </h2>
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
                      Cases & Staff Dispatch
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  aria-label="Close Command Center"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              {/* Real-time Search Input */}
              <div className="p-3 border-b border-slate-800/60 bg-slate-900/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      activeTab === "cases"
                        ? "Search matters, clients, practice…"
                        : "Search staff colleagues, role…"
                    }
                    className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="p-2 border-b border-slate-800/60 flex gap-1.5 bg-slate-950">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("cases");
                    setSearchQuery("");
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all select-none",
                    activeTab === "cases"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900",
                  )}
                >
                  <Briefcase className="size-3.5" />
                  <span>Matters</span>
                  {totalCaseUnread > 0 && (
                    <span className="size-4.5 rounded-full bg-blue-400 text-slate-950 font-bold text-[9.5px] flex items-center justify-center">
                      {totalCaseUnread}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("team");
                    setSearchQuery("");
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all select-none",
                    activeTab === "team"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900",
                  )}
                >
                  <Users className="size-3.5" />
                  <span>Team DMs</span>
                  {totalDmUnread > 0 && (
                    <span className="size-4.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[9.5px] flex items-center justify-center">
                      {totalDmUnread}
                    </span>
                  )}
                </button>
              </div>

              {/* Scrollable Thread List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 bg-slate-950/80">
                {activeTab === "cases" ? (
                  filteredCases.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                      <Briefcase className="size-8 mx-auto opacity-30" />
                      <p>No matters match your filter.</p>
                    </div>
                  ) : (
                    filteredCases.map((c: any) => {
                      const client = clients.find((cl: any) => cl._id === c.clientId);
                      return (
                        <LuxuryThreadCard
                          key={c._id}
                          id={c._id}
                          type="matter"
                          title={c.title}
                          badge={c.caseNumber}
                          subtitle={`${c.practiceArea || "Legal"} · ${client?.fullName || "Client"}`}
                          unreadCount={unreadByCase[c._id] || 0}
                          isSelected={selectedCase === c._id}
                          onClick={() => {
                            setSelectedCase(c._id);
                            setMobileShowChat(true);
                          }}
                        />
                      );
                    })
                  )
                ) : (
                  <>
                    {/* Active DM threads */}
                    {filteredThreads.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10.5px] uppercase tracking-wider text-slate-500 font-bold px-2 pt-1">
                          Direct Conversations
                        </p>
                        {filteredThreads.map((t) => (
                          <LuxuryThreadCard
                            key={t._id}
                            id={t._id}
                            type="dm"
                            title={t.peerName}
                            subtitle={t.peerRole?.replace(/_/g, " ").toUpperCase() || "STAFF"}
                            lastMessageSnippet={t.lastMessage?.content}
                            timestamp={t.lastMessageAt}
                            unreadCount={t.unreadCount || 0}
                            isSelected={selectedDm === t._id}
                            isOnline={true}
                            onClick={() => {
                              setSelectedDm(t._id);
                              setMobileShowChat(true);
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Start DM Teammate Directory */}
                    <div className="pt-3 space-y-1">
                      <p className="text-[10.5px] uppercase tracking-wider text-slate-500 font-bold px-2 flex items-center justify-between">
                        <span>Available Colleagues</span>
                        <UserPlus className="size-3 text-slate-400" />
                      </p>
                      {filteredPeers.map((u: any) => (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => void handleStartDm(u._id)}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold text-slate-300 group-hover:text-blue-300 truncate">
                              {u.name || u.email}
                            </p>
                            <p className="text-[10px] text-slate-500 capitalize">
                              {u.role?.replace(/_/g, " ")}
                            </p>
                          </div>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                            Chat
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Bottom Drawer Nav Link */}
              <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
                <Link
                  href={activeTab === "team" ? "/staff/team-chat" : "/staff/messages"}
                  onClick={onClose}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="size-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                    <span>Open full {activeTab === "team" ? "Team Chat" : "Client Inbox"}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-400">↗</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Chat Workspace */}
            <div
              className={cn(
                "flex-1 flex flex-col min-w-0 bg-slate-950 h-full overflow-hidden",
                mobileShowChat ? "flex" : "hidden md:flex",
              )}
            >
              {activeTab === "cases" && selectedCase ? (
                <MatterChatPanel
                  caseId={selectedCase}
                  mode="staff"
                  stream={streamMode}
                  onStreamChange={setStreamMode}
                  title={activeCaseObj?.title || "Matter Room"}
                  caseNumber={activeCaseObj?.caseNumber}
                  subtitle={activeCaseObj?.practiceArea}
                  showBack={true}
                  onBack={() => setMobileShowChat(false)}
                  onClose={onClose}
                  bordered={false}
                  className="flex-1 rounded-none border-0"
                />
              ) : activeTab === "team" && selectedDm ? (
                <LuxuryDmPanel
                  threadId={selectedDm}
                  peerName={activeThreadObj?.peerName || "Colleague"}
                  peerRole={activeThreadObj?.peerRole}
                  showBack={true}
                  onBack={() => setMobileShowChat(false)}
                  onClose={onClose}
                  bordered={false}
                  className="flex-1 rounded-none border-0"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 gap-3">
                  <div className="size-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shadow-xl">
                    <Sparkles className="size-7 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Select a conversation</p>
                    <p className="text-xs text-slate-500 max-w-xs mt-1">
                      Pick an active case matter or colleague from the left panel to begin executive
                      legal dispatch.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
