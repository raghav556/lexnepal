"use client";

import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Bell, Loader2 } from "lucide-react";
import { useNotifications, useNotificationCommands } from "@/client/queries/communication";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

export default function ClientNotificationsPage() {
  const currentUser = useCurrentUser();
  const { data: notificationsResponse } = useNotifications();
  const notifications = notificationsResponse || [];
  const { markRead, markAllRead } = useNotificationCommands();

  if (!currentUser) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const unread = notifications.filter((n: any) => !n.isRead).length;

  return (
    <div className="p-4 sm:p-6 space-y-4 font-sans max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await markAllRead.mutateAsync();
                toast.success("All notifications marked as read");
              } catch {
                toast.error("Failed to mark notifications read");
              }
            }}
          >
            Mark all read
          </Button>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No notifications yet</EmptyTitle>
            <EmptyDescription>
              Hearing reminders, signature requests, and billing updates will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif: any) => (
            <Card
              key={notif._id || notif.id}
              className={cn(
                "cursor-pointer transition-colors",
                !notif.isRead && "border-accent/40 bg-accent/5",
              )}
              onClick={async () => {
                if (!notif.isRead) {
                  try {
                    await markRead.mutateAsync({
                      notificationId: notif._id || notif.id,
                    });
                  } catch {
                    /* ignore */
                  }
                }
                if (notif.link) window.location.href = notif.link;
              }}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <Bell
                  className={cn(
                    "w-4 h-4 mt-0.5 shrink-0",
                    notif.isRead ? "text-muted-foreground" : "text-accent",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold break-words">
                    {notif.title || notif.type || "Notification"}
                  </p>
                  {notif.body || notif.message ? (
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">
                      {notif.body || notif.message}
                    </p>
                  ) : null}
                  {notif._creationTime || notif.createdAt ? (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(notif._creationTime || notif.createdAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
