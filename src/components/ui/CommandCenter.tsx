import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Lock, MessageCircle, FileText, User, Paperclip, Users, ShieldCheck, ChevronLeft } from "lucide-react";
import { Button } from "./button.tsx";
import { Input } from "./input.tsx";
import { cn } from "@/lib/utils.ts";
import { useMessages, useMessageCommands } from "../../client/queries/communication";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useStaffDirectory } from "@/client/queries/identity";
import { useCases } from "@/client/queries/cases";

export function CommandCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const currentUser = useCurrentUser();
  const allCases = useCases({}) || [];
  
  // Security/Privacy Filter: Admins see all cases. Lawyers only see cases assigned to them.
  const cases = currentUser?.role === "admin" 
    ? allCases 
    : allCases.filter((c: any) => c.assignedLawyerId === currentUser?._id);

  const users = useStaffDirectory() || [];
  const STAFF_ROLES = ["admin", "partner", "associate", "paralegal"];
  const staffUsers = users.filter((u: any) => STAFF_ROLES.includes(u.role) && u._id !== currentUser?._id);
  
  const [activeTab, setActiveTab] = useState<"cases" | "team">("cases");
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [draft, setDraft] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) setMobileShowChat(false);
  }, [isOpen]);

  const currentThreadId = activeTab === "cases" 
    ? selectedCase 
    : (selectedStaff && currentUser ? `dm_${[currentUser._id, selectedStaff].sort().join("_")}` : null);

  // Default selections
  useEffect(() => {
    if (isOpen) {
      if (activeTab === "cases" && cases.length > 0 && !selectedCase) {
        setSelectedCase(cases[0]._id);
      } else if (activeTab === "team" && staffUsers.length > 0 && !selectedStaff) {
        setSelectedStaff(staffUsers[0]._id);
      }
    }
  }, [isOpen, cases, staffUsers, activeTab, selectedCase, selectedStaff]);

  const { data: messagesResponse } = useMessages(currentThreadId || "", true);
  const messages = messagesResponse?.page || [];

  const { sendMessage, markMessagesRead } = useMessageCommands();

  // Mark read when thread selected
  useEffect(() => {
    if (currentThreadId && isOpen) {
      markMessagesRead.mutate({ caseId: currentThreadId });
    }
  }, [currentThreadId, isOpen, markMessagesRead, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentThreadId || !draft.trim()) return;
    try {
        await sendMessage.mutateAsync({
          caseId: currentThreadId,
          content: draft,
          isInternal: activeTab === "cases" ? isInternal : true,
        });
      setDraft("");
    } catch (err) {
      console.error(err);
    }
  };

  const getClientDetails = (caseId: string) => {
    const c = cases.find((c: any) => c._id === caseId);
    if (!c) return null;
    const client = users.find((u: any) => u._id === c.clientId);
    return { caseDetails: c, clientDetails: client };
  };

  const caseDetails = selectedCase ? getClientDetails(selectedCase) : null;
  const staffDetails = selectedStaff ? users.find((u: any) => u._id === selectedStaff) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
          />

          {/* Sliding Panel */}
          <motion.div
            initial={{ x: "100%", boxShadow: "-10px 0 30px rgba(0,0,0,0)" }}
            animate={{ x: 0, boxShadow: "-10px 0 30px rgba(0,0,0,0.1)" }}
            exit={{ x: "100%", boxShadow: "-10px 0 30px rgba(0,0,0,0)" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full md:w-[850px] bg-background border-l border-border z-[101] flex flex-col md:flex-row shadow-2xl"
          >
            {/* Left Sidebar: Threads */}
            <div className={cn(
              "w-full md:w-[280px] border-r border-border flex-col bg-muted/10",
              mobileShowChat ? "hidden md:flex" : "flex"
            )}>
              <div className="p-4 border-b border-border bg-background flex items-center justify-between">
                <h2 className="font-serif font-bold text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-accent" />
                  Command Center
                </h2>
                <button onClick={onClose} className="md:hidden p-2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex p-2 gap-1 bg-background border-b border-border">
                <button
                  onClick={() => { setActiveTab("cases"); setMobileShowChat(false); }}
                  className={cn("flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors",
                    activeTab === "cases" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Client Cases
                </button>
                <button
                  onClick={() => { setActiveTab("team"); setMobileShowChat(false); }}
                  className={cn("flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5",
                    activeTab === "team" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  Team Chat
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {activeTab === "cases" ? (
                  cases.map((c: any) => {
                    const isActive = selectedCase === c._id;
                  const client = users.find((u: any) => u._id === c.clientId);
                  return (
                    <button
                      key={c._id}
                      onClick={() => { setSelectedCase(c._id); setMobileShowChat(true); }}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-all duration-200 border",
                        isActive 
                          ? "bg-background border-accent/30 shadow-sm" 
                          : "bg-transparent border-transparent hover:bg-black/5"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{c.caseNumber}</span>
                        {/* Unread dot mock */}
                        {c.status === "open" && !isActive && <span className="w-2 h-2 rounded-full bg-accent" />}
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate">{client?.name || "Unknown Client"}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                    </button>
                  );
                })
                ) : (
                  staffUsers.map((u: any) => {
                    const isActive = selectedStaff === u._id;
                    return (
                      <button
                        key={u._id}
                        onClick={() => { setSelectedStaff(u._id); setMobileShowChat(true); }}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-all duration-200 border flex items-center gap-3",
                          isActive 
                            ? "bg-background border-primary/30 shadow-sm" 
                            : "bg-transparent border-transparent hover:bg-black/5"
                        )}
                      >
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          {/* Live Presence indicator (Mocked as online for all staff) */}
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground capitalize truncate">{u.role}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Middle: Chat Thread */}
            <div className={cn(
              "flex-1 flex-col bg-background relative",
              mobileShowChat ? "flex" : "hidden md:flex"
            )}>
              {/* Mobile header: back + close */}
              <div className="h-14 border-b border-border px-3 flex items-center justify-between bg-background z-10 flex md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileShowChat(false)}
                  className="p-2 text-muted-foreground hover:text-foreground"
                  aria-label="Back to threads"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0 px-2 text-center">
                  {activeTab === "cases" ? (
                    <>
                      <h3 className="font-bold text-sm text-foreground truncate">{caseDetails?.caseDetails?.title || "Chat"}</h3>
                      <p className="text-[10px] text-muted-foreground truncate">{caseDetails?.clientDetails?.name}</p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-bold text-sm text-foreground truncate">{staffDetails?.name || "Team Chat"}</h3>
                      <p className="text-[10px] text-muted-foreground">Secure 1-on-1</p>
                    </>
                  )}
                </div>
                <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Desktop header */}
              <div className="h-16 border-b border-border px-6 flex items-center justify-between bg-background z-10 hidden md:flex">
                {activeTab === "cases" ? (
                  <div>
                    <h3 className="font-bold text-foreground">{caseDetails?.caseDetails?.title}</h3>
                    <p className="text-xs text-muted-foreground">Client: {caseDetails?.clientDetails?.name}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    <div>
                      <h3 className="font-bold text-foreground">Secure Team Chat</h3>
                      <p className="text-xs text-muted-foreground">Encrypted 1-on-1 with {staffDetails?.name}</p>
                    </div>
                  </div>
                )}
                <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3">
                    <MessageCircle className="w-10 h-10 opacity-20" />
                    <p className="text-sm">No messages in this thread yet.</p>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isMe = msg.senderId === currentUser?._id;
                    const sender = users.find((u: any) => u._id === msg.senderId);
                    
                    return (
                      <div key={msg._id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-semibold text-foreground">
                            {isMe ? "You" : sender?.name || "Unknown"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(msg._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className={cn(
                          "px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm relative group",
                          activeTab === "team" 
                            ? (isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-border")
                            : (msg.isInternal 
                              ? "bg-muted text-foreground border border-border" 
                              : isMe 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-accent text-accent-foreground")
                        )}>
                          {msg.isInternal && activeTab === "cases" && (
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5 pb-1.5 border-b border-border/50">
                              <Lock className="w-3 h-3" /> Internal Note (Hidden from client)
                            </div>
                          )}
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-border bg-background">
                <form onSubmit={handleSend} className="space-y-3">
                  <div className={cn(
                    "flex flex-col rounded-xl border focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-background overflow-hidden",
                    isInternal ? "border-muted-foreground/30 bg-muted/10" : "border-border"
                  )}>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={isInternal ? "Type an internal note to the team..." : "Reply to client..."}
                      className="w-full min-h-[80px] p-4 text-sm focus:outline-none resize-none bg-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                    />
                    
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t border-border/50">
                      <div className="flex items-center gap-4">
                        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors p-1">
                          <Paperclip className="w-4 h-4" />
                        </button>
                        
                        {activeTab === "cases" && (
                          <div className="flex items-center gap-2 border-l border-border pl-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <div className={cn(
                                "relative w-8 h-4 rounded-full transition-colors",
                                isInternal ? "bg-muted-foreground/50" : "bg-primary"
                              )}>
                                <div className={cn(
                                  "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                                  isInternal ? "translate-x-4" : "translate-x-0"
                                )} />
                              </div>
                              <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={isInternal}
                                onChange={(e) => setIsInternal(e.target.checked)}
                              />
                              <span className={cn(
                                "text-xs font-semibold transition-colors",
                                isInternal ? "text-muted-foreground" : "text-primary"
                              )}>
                                {isInternal ? "Internal Note" : "Client Reply"}
                              </span>
                            </label>
                          </div>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        disabled={!draft.trim() || !currentThreadId} 
                        size="sm" 
                        className={cn(
                          "h-8 gap-2 transition-colors",
                          (isInternal || activeTab === "team") ? "bg-muted-foreground hover:bg-muted-foreground/90 text-white" : "bg-primary hover:bg-primary/90"
                        )}
                      >
                        {(isInternal || activeTab === "team") ? <Lock className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                        Send
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
