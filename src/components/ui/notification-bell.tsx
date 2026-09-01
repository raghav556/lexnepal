import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications, useNotificationCommands } from "@/client/queries/communication";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { Button } from "./button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  triggerClassName?: string;
  iconClassName?: string;
}

export function NotificationBell({ triggerClassName, iconClassName }: NotificationBellProps = {}) {
  const currentUser = useCurrentUser();
  // Keep SSR and first client paint identical — auth/query data is client-only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: notificationsResponse } = useNotifications();
  const notifications = notificationsResponse || [];

  const { markRead, markAllRead } = useNotificationCommands();

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  const ready = mounted && !!currentUser;

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      try {
        await markRead.mutateAsync({ notificationId: notification._id || notification.id });
      } catch (e) {
        console.error(e);
      }
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      await markAllRead.mutateAsync();
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error("Failed to mark notifications read");
    }
  };

  if (!ready) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("group relative", triggerClassName)}
        disabled
        aria-label="Notifications loading"
      >
        <Bell className={cn("size-5 text-muted-foreground", iconClassName)} />
      </Button>
    );
  }

  return (
    <DropdownMenu className="relative inline-flex w-auto shrink-0 text-left">
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("group relative", triggerClassName)}
          aria-label={
            unreadCount > 0 ? `Open notifications (${unreadCount} unread)` : "Open notifications"
          }
        >
          <Bell
            className={cn(
              "size-5 text-muted-foreground transition-colors group-hover:text-foreground",
              iconClassName,
            )}
          />
          {unreadCount > 0 && (
            <span
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 shadow-[0_0_0_2px_var(--background)]"
              aria-hidden="true"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="flex max-h-[calc(100vh-1rem)] w-80 max-w-[calc(100vw-1rem)] flex-col overflow-hidden"
        align="end"
        collisionAware
      >
        <div className="flex shrink-0 items-center justify-between gap-4 px-3 py-2">
          <DropdownMenuLabel className="p-0 font-serif">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-auto p-0 text-xs text-primary hover:bg-transparent hover:underline"
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="min-h-0 max-h-[300px] flex-1 overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <DropdownMenuGroup>
              {notifications.map((notif: any) => (
                <DropdownMenuItem
                  key={notif._id || notif.id}
                  className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${notif.isRead ? "opacity-60" : "bg-primary/5 font-medium"}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span className="text-sm font-semibold">{notif.title}</span>
                    {!notif.isRead && (
                      <span className="w-2 h-2 mt-1 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {notif.body}
                  </span>
                  <span
                    suppressHydrationWarning
                    className="text-[10px] text-muted-foreground/60 mt-1"
                  >
                    {new Date(notif._creationTime || notif.createdAt).toLocaleString()}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
