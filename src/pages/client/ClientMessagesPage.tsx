import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";

export default function ClientMessagesPage() {
  const currentUser = useCurrentUser();
  const clientRecord = useQuery(api.clients.getMyClientRecord, {});
  const clientId = clientRecord?._id;
  const cases = useQuery(api.cases.listCases, clientId ? { clientId: clientId as any } : "skip") || [];
  const users = useQuery(api.users.listUsers, {}) || [];

  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const paginatedMsgs = useQuery(
    api.messages.listMessages,
    selected ? { caseId: selected as any, paginationOpts: { numItems: 100, cursor: null } } : "skip" as any
  );
  const messages = paginatedMsgs?.page || [];

  const sendMessage = useMutation(api.messages.sendMessage);
  const markMessagesRead = useMutation(api.messages.markMessagesRead);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Set default selected case thread once cases load
  useEffect(() => {
    if (cases.length > 0 && !selected) {
      setSelected(cases[0]._id);
    }
  }, [cases, selected]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mark read when thread selected
  useEffect(() => {
    if (selected) {
      markMessagesRead({ caseId: selected as any }).catch(() => {});
    }
  }, [selected, markMessagesRead, messages.length]); // trigger on change or new messages count

  const handleSendMessage = async () => {
    if (!selected || !draft.trim()) return;
    try {
      await sendMessage({
        caseId: selected as any,
        content: draft,
        isInternal: false,
        attachmentIds: [],
      });
      setDraft("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message.");
    }
  };

  if (currentUser === undefined || currentUser === null || clientRecord === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full font-sans">
      <h1 className="font-serif text-2xl font-bold text-foreground mb-4"> matMatters Chat</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
        {/* Threads List */}
        <div className="space-y-2 overflow-y-auto">
          {cases.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No active matters to discuss.</p>
          ) : (
            cases.map((c: any) => {
              const active = selected === c._id;
              return (
                <Card
                  key={c._id}
                  className={cn("cursor-pointer transition-colors border hover:bg-secondary/40", active && "border-accent bg-accent/5")}
                  onClick={() => setSelected(c._id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">[{c.caseNumber}] {c.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      Practice Area: {c.practiceArea}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Message Window */}
        {selected ? (
          <Card className="md:col-span-2 flex flex-col h-full border overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-card">
              <CardTitle className="text-sm font-semibold text-primary font-serif">
                {cases.find((c: any) => c._id === selected)?.title || "Chat Channel"}
              </CardTitle>
            </CardHeader>

            <div className="flex-1 p-4 space-y-3.5 overflow-y-auto bg-secondary/15 flex flex-col justify-end">
              <div className="space-y-3.5 overflow-y-auto max-h-full">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-2">
                    <MessageCircle className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-xs">No messages yet. Send a message to start conversing with your legal team.</p>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const sender = users.find((u: any) => u._id === msg.senderId);
                    const isCurrentUserSender = msg.senderId === currentUser._id;
                    const dateObj = new Date(msg._creationTime);
                    const formattedTime = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

                    return (
                      <div key={msg._id} className={cn("flex w-full", isCurrentUserSender ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "rounded-xl px-3.5 py-2.5 max-w-[85%] text-xs shadow-2xs border",
                          isCurrentUserSender 
                            ? "bg-primary text-primary-foreground border-primary rounded-tr-none" 
                            : "bg-card text-foreground border-border rounded-tl-none"
                        )}>
                          <p className="leading-relaxed">{msg.content}</p>
                          <div className={cn("text-[9px] mt-1 opacity-75 font-semibold", isCurrentUserSender ? "text-primary-foreground/90" : "text-muted-foreground")}>
                            {sender ? sender.name : "System"} &bull; {formattedTime}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-3 border-t border-border bg-card flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your message to advocate..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
              />
              <Button size="sm" onClick={handleSendMessage} disabled={!draft.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ) : (
          <div className="md:col-span-2 flex items-center justify-center text-muted-foreground text-sm border rounded-xl bg-secondary/10">
            Select a conversation thread on the left
          </div>
        )}
      </div>
    </div>
  );
}
