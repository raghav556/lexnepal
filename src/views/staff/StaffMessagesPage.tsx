"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { MatterChatPanel } from "@/components/messages/MatterChatPanel";
import { useCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useUnreadMessageCounts } from "@/client/queries/communication";
import { cn } from "@/lib/utils.ts";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty.tsx";

export default function StaffMessagesPage() {
  const currentUser = useCurrentUser();
  const cases = useCases({}) || [];
  const clients = useClients() || [];
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

  if (currentUser === undefined || currentUser === null) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedCase = cases.find((c: { _id: string }) => c._id === selected);
  const clientName =
    clients.find((cl: { _id: string }) => cl._id === selectedCase?.clientId)?.fullName || "Client";

  return (
    <div className="p-4 sm:p-6 h-full font-sans space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Client Messages
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Matter-threaded conversations with portal clients. Use Client reply for messages they can see.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
          <Link href="/staff/cases">All cases</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[calc(100vh-200px)]">
        <div className={cn("space-y-2 overflow-y-auto", mobileShowChat ? "hidden md:block" : "block")}>
          {cases.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No matters assigned</EmptyTitle>
                <EmptyDescription>Open or get assigned to a case to message clients.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            cases.map((c: any) => {
              const active = selected === c._id;
              const unread = unreadByCase[c._id] || 0;
              const name =
                clients.find((cl: { _id: string }) => cl._id === c.clientId)?.fullName || "Client";
              return (
                <Card
                  key={c._id}
                  className={cn(
                    "cursor-pointer transition-colors border hover:bg-secondary/40",
                    active && "border-primary bg-primary/5",
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
                    <p className="text-xs text-muted-foreground mt-1">{name}</p>
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
              mode="staff"
              title={`${selectedCase?.title || "Matter"} · ${clientName}`}
              users={[]}
              showBack
              onBack={() => setMobileShowChat(false)}
              className="h-full"
            />
          </div>
        ) : (
          <div
            className={cn(
              "md:col-span-2 items-center justify-center text-muted-foreground text-sm border rounded-xl bg-secondary/10",
              mobileShowChat ? "flex" : "hidden md:flex",
            )}
          >
            Select a matter on the left
          </div>
        )}
      </div>
    </div>
  );
}
