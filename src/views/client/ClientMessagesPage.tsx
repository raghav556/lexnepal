"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, Loader2, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { useUnreadMessageCounts } from "@/client/queries/communication";
import { useMyClient, useMyTeam } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

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

  if (currentUser === undefined || currentUser === null || clientRecord === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clientRecord === null) {
    return (
      <div className="p-4 sm:p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No client profile linked</EmptyTitle>
            <EmptyDescription>
              Ask the firm to grant portal access before messaging your legal team.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full font-sans">
      <h1 className="font-serif text-2xl font-bold text-foreground mb-1">Matters Chat</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Message your legal team about an open matter. Conversations are tied to each case.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[calc(100vh-180px)]">
        <div className={cn("space-y-2 overflow-y-auto", mobileShowChat ? "hidden md:block" : "block")}>
          {cases.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No matters yet</EmptyTitle>
                <EmptyDescription>
                  Conversations appear once the firm opens a case for you. Need help sooner? Book a
                  consultation or contact the firm.
                </EmptyDescription>
              </EmptyHeader>
              <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
                <Button asChild size="sm">
                  <Link href="/client/booking">
                    <Calendar className="w-4 h-4 mr-1" />
                    Book Appointment
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/contact">Contact the firm</Link>
                </Button>
              </div>
            </Empty>
          ) : (
            cases.map((c: any) => {
              const active = selected === c._id;
              const unread = unreadByCase[c._id] || 0;
              return (
                <Card
                  key={c._id}
                  className={cn(
                    "cursor-pointer transition-colors border hover:bg-secondary/40",
                    active && "border-accent bg-accent/5",
                  )}
                  onClick={() => {
                    setSelected(c._id);
                    setMobileShowChat(true);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">
                        [{c.caseNumber}] {c.title}
                      </p>
                      {unread > 0 ? (
                        <span className="shrink-0 text-[10px] font-bold bg-accent text-accent-foreground rounded-full px-1.5 py-0.5">
                          {unread}
                        </span>
                      ) : null}
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

        {selected ? (
          <div
            className={cn(
              "md:col-span-2 h-[calc(100dvh-11rem)] md:h-full",
              mobileShowChat ? "block" : "hidden md:block",
            )}
          >
            <MatterChatPanel
              caseId={selected}
              mode="client"
              title={cases.find((c: any) => c._id === selected)?.title || "Chat Channel"}
              users={users}
              showBack
              onBack={() => setMobileShowChat(false)}
              className="h-full"
            />
          </div>
        ) : (
          <div
            className={cn(
              "md:col-span-2 items-center justify-center text-muted-foreground text-sm border rounded-xl bg-secondary/10 gap-2",
              mobileShowChat ? "flex flex-col" : "hidden md:flex flex-col",
            )}
          >
            <MessageCircle className="w-8 h-8 opacity-30" />
            Select a conversation thread
          </div>
        )}
      </div>
    </div>
  );
}
