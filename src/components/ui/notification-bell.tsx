import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
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
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function NotificationBell() {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();

  const notifications = useQuery(api.notifications.listNotifications, currentUser ? {} : "skip" as any) || [];
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      try {
        await markRead({ notificationId: notification._id as any });
      } catch (e) {
        console.error(e);
      }
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      await markAllRead();
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error("Failed to mark notifications read");
    }
  };

  if (!currentUser) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_0_2px_hsl(var(--background))]" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 font-serif">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-auto p-0 text-xs text-primary hover:bg-transparent hover:underline">
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <DropdownMenuGroup>
              {notifications.map((notif: any) => (
                <DropdownMenuItem
                  key={notif._id}
                  className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${notif.isRead ? 'opacity-60' : 'bg-primary/5 font-medium'}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span className="text-sm font-semibold">{notif.title}</span>
                    {!notif.isRead && <span className="w-2 h-2 mt-1 rounded-full bg-primary flex-shrink-0" />}
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {notif.body}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(notif._creationTime).toLocaleString()}
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
