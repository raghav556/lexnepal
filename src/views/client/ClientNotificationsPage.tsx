"use client";

import { Bell, BellRing, CheckCheck, Inbox } from "lucide-react";
import { useNotifications, useNotificationCommands } from "@/client/queries/communication";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import {
  DashboardButton,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES } from "@/lib/dashboard-semantics";

export default function ClientNotificationsPage() {
  const currentUser = useCurrentUser();
  const { data: notificationsResponse } = useNotifications();
  const notifications = notificationsResponse || [];
  const { markRead, markAllRead } = useNotificationCommands();

  if (!currentUser) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading your notifications…"
        title="Notifications"
      >
        <div />
      </PortalPageShell>
    );
  }

  const unread = notifications.filter((n: any) => !n.isRead).length;
  const read = notifications.length - unread;

  const metrics = [
    {
      label: "Total Alerts",
      value: String(notifications.length),
      icon: Bell,
      tone: DASHBOARD_METRIC_TONES.messages,
      helperText: "Firm notifications",
    },
    {
      label: "Unread Alerts",
      value: String(unread),
      icon: BellRing,
      tone: unread > 0 ? ("warning" as const) : ("success" as const),
      helperText: "Awaiting your review",
    },
    {
      label: "Read / Handled",
      value: String(read),
      icon: CheckCheck,
      tone: "neutral" as const,
      helperText: "Past notifications",
    },
  ];

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Activity Stream"
      title="Notifications"
      description="Hearing reminders, signature requests, and billing updates from your legal team."
      icon={Bell}
      metrics={metrics}
      actions={
        unread > 0 ? (
          <DashboardButton
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await markAllRead.mutateAsync();
                toast.success("All notifications marked as read");
              } catch {
                toast.error("Failed to mark notifications read");
              }
            }}
          >
            <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
          </DashboardButton>
        ) : undefined
      }
    >
      <DashboardSection
        title="Recent Activity"
        description={`Showing ${notifications.length} notification${notifications.length === 1 ? "" : "s"}`}
        icon={Inbox}
      >
        {notificationsResponse === undefined ? (
          <DashboardListSkeleton rows={4} />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="Hearing reminders, signature requests, and billing updates will appear here."
            icon={Bell}
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((notif: any) => (
              <DashboardListRow
                key={notif._id || notif.id}
                className={cn(
                  "cursor-pointer items-start p-4 transition-all",
                  !notif.isRead &&
                    "border-dashboard-primary/40 bg-dashboard-primary-soft/40 shadow-xs",
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
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      notif.isRead
                        ? "bg-dashboard-neutral-soft text-muted-foreground"
                        : "bg-dashboard-primary-soft text-dashboard-primary",
                    )}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground break-words">
                        {notif.title || notif.type || "Notification"}
                      </p>
                      {!notif.isRead ? (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-dashboard-primary" />
                      ) : null}
                    </div>
                    {notif.body || notif.message ? (
                      <p className="text-xs text-muted-foreground break-words leading-relaxed">
                        {notif.body || notif.message}
                      </p>
                    ) : null}
                    {notif._creationTime || notif.createdAt ? (
                      <p className="text-[10px] text-muted-foreground pt-0.5">
                        {new Date(notif._creationTime || notif.createdAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
              </DashboardListRow>
            ))}
          </div>
        )}
      </DashboardSection>
    </PortalPageShell>
  );
}
