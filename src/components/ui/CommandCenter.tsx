"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  MessageCircle,
  FileText,
  ChevronLeft,
  ExternalLink,
  Users,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useCases } from "@/client/queries/cases";
import { useStaffDirectory } from "@/client/queries/identity";
import { useDmCommands, useDmThreads } from "@/client/queries/dm";
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { toast } from "sonner";

export function CommandCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const currentUser = useCurrentUser();
  const allCases = useCases({}) || [];
  const staff = useStaffDirectory() || [];
  const { data: threads } = useDmThreads();
  const { openThread } = useDmCommands();

  const cases =
    currentUser?.role === "admin"
      ? allCases
      : allCases.filter(
          (c: { assignedLawyerId?: string }) =>
            c.assignedLawyerId === currentUser?._id || c.assignedLawyerId === currentUser?.id,
        );

  const [activeTab, setActiveTab] = useState<"cases" | "team">("cases");
  const [caseMode, setCaseMode] = useState<"client" | "team">("client");
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [selectedDm, setSelectedDm] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const myId = currentUser?._id || currentUser?.id;
  const peers = staff.filter(
    (u: any) => u && u._id !== myId && u.role !== "client",
  );

  useEffect(() => {
    if (!isOpen) setMobileShowChat(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === "cases" && cases.length > 0 && !selectedCase) {
      setSelectedCase(cases[0]._id);
    }
  }, [isOpen, cases, selectedCase, activeTab]);

  const startDm = async (peerUserId: string) => {
    try {
      const thread = await openThread.mutateAsync(peerUserId);
      setSelectedDm(thread._id);
      setMobileShowChat(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not open DM");
    }
  };

  const selected = cases.find((c: { _id: string }) => c._id === selectedCase);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed top-0 right-0 h-screen w-full md:w-[900px] bg-background border-l border-border z-[101] flex flex-col md:flex-row"
          >
            <div
              className={cn(
                "w-full md:w-[300px] border-r border-border flex-col bg-muted/10",
                mobileShowChat ? "hidden md:flex" : "flex",
              )}
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="font-serif font-bold text-foreground">Command Center</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    Cases & team DMs
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-1 p-2 border-b border-border">
                <button
                  type="button"
                  className={cn(
                    "flex-1 text-xs font-semibold py-2 rounded-md",
                    activeTab === "cases" ? "bg-primary/15 text-primary" : "text-muted-foreground",
                  )}
                  onClick={() => setActiveTab("cases")}
                >
                  Cases
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 text-xs font-semibold py-2 rounded-md",
                    activeTab === "team" ? "bg-primary/15 text-primary" : "text-muted-foreground",
                  )}
                  onClick={() => setActiveTab("team")}
                >
                  Team
                </button>
              </div>

              <div className="px-3 py-2 border-b border-border">
                <Link
                  href={activeTab === "team" ? "/staff/team-chat" : "/staff/messages"}
                  onClick={onClose}
                  className="flex items-center gap-2 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open full {activeTab === "team" ? "Team Chat" : "Client inbox"}
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {activeTab === "cases" ? (
                  cases.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-xs space-y-2">
                      <MessageCircle className="w-8 h-8 mx-auto opacity-20" />
                      <p>No matters available.</p>
                    </div>
                  ) : (
                    cases.map((c: any) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setSelectedCase(c._id);
                          setMobileShowChat(true);
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-colors",
                          selectedCase === c._id
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted border border-transparent",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">
                              [{c.caseNumber}] {c.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{c.practiceArea}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )
                ) : (
                  <>
                    {threads.map((t) => (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() => {
                          setSelectedDm(t._id);
                          setMobileShowChat(true);
                          onClose();
                          window.location.href = `/staff/team-chat?dm=${t._id}`;
                        }}
                        className="w-full text-left p-3 rounded-lg hover:bg-muted border border-transparent"
                      >
                        <div className="flex justify-between gap-2">
                          <p className="text-xs font-semibold truncate">{t.peerName}</p>
                          {(t.unreadCount || 0) > 0 ? (
                            <span className="text-[10px] font-bold bg-accent text-accent-foreground rounded-full px-1.5">
                              {t.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                          {t.lastMessage?.content || "Open conversation"}
                        </p>
                      </button>
                    ))}
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pt-3">
                      Start DM
                    </p>
                    {peers.slice(0, 10).map((u: any) => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => void startDm(u._id)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted rounded-md flex justify-between"
                      >
                        <span className="truncate">{u.name || u.email}</span>
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div
              className={cn(
                "flex-1 flex flex-col min-w-0",
                mobileShowChat ? "flex" : "hidden md:flex",
              )}
            >
              <div className="md:hidden p-2 border-b border-border">
                <button
                  type="button"
                  onClick={() => setMobileShowChat(false)}
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              </div>

              {activeTab === "cases" && selectedCase ? (
                <>
                  <div className="px-3 py-2 border-b border-border flex gap-2 items-center">
                    <button
                      type="button"
                      className={cn(
                        "text-xs font-semibold px-3 py-1.5 rounded-md",
                        caseMode === "client" ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                      onClick={() => setCaseMode("client")}
                    >
                      Client
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1",
                        caseMode === "team" ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                      onClick={() => setCaseMode("team")}
                    >
                      <Lock className="w-3 h-3" /> Case team
                    </button>
                    <span className="text-[10px] text-muted-foreground truncate ml-auto">
                      {selected?.title}
                    </span>
                  </div>
                  <MatterChatPanel
                    caseId={selectedCase}
                    mode="staff"
                    stream={caseMode}
                    title={caseMode === "team" ? "Case team" : "Client chat"}
                    bordered={false}
                    className="flex-1 rounded-none border-0"
                  />
                </>
              ) : activeTab === "team" && selectedDm ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6">
                  Opening Team Chat…
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  Select a matter or teammate
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
