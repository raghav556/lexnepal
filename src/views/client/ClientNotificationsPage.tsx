"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  FileText,
  Inbox,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useNotifications, useNotificationCommands } from "@/client/queries/communication";
import { useAppointments } from "@/client/queries/crm";
import { useHearingsQuery } from "@/client/queries/hearings";
import { useMyClient } from "@/client/queries/clients";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatAppointmentDate } from "@/shared/crm/appointment-dates";
import { safeNotificationPath } from "@/shared/notification-links";
import {
  ClientPanel,
  DashboardButton,
  DashboardListSkeleton,
  PortalPageShell,
} from "@/components/dashboard";
import { CASE_LIST_HERO_CLASS } from "@/shared/contracts/case-ui";
import { cn } from "@/lib/utils";
import {
  filterClientNotifications,
  groupClientNotifications,
  nearestConfirmedAppointment,
  nearestUpcomingHearing,
  type ClientImportantAppointment,
  type ClientNotification,
  type NotificationCategory,
} from "./client-notifications-model";

const categories: { value: NotificationCategory; label: string; icon: typeof Bell }[] = [
  { value: "all", label: "All", icon: Inbox },
  { value: "unread", label: "Unread", icon: Bell },
  { value: "documents", label: "Documents", icon: FileText },
  { value: "messages", label: "Messages", icon: MessageSquare },
  { value: "hearings", label: "Hearings", icon: CalendarDays },
];

const notificationIcons: Record<ClientNotification["type"], typeof Bell> = {
  hearing_reminder: CalendarDays,
  task_due: ClipboardList,
  document_request: FileText,
  message: MessageSquare,
  system: Bell,
};
const notificationTones: Record<ClientNotification["type"], string> = {
  hearing_reminder: "bg-dashboard-information-soft text-dashboard-information-foreground",
  task_due: "bg-dashboard-warning-soft text-dashboard-warning-foreground",
  document_request: "bg-dashboard-primary-soft text-dashboard-primary",
  message: "bg-dashboard-information-soft text-dashboard-information-foreground",
  system: "bg-dashboard-neutral-soft text-dashboard-neutral-foreground",
};
const emptyFilterCopy: Record<NotificationCategory, string> = {
  all: "No notifications yet",
  unread: "No unread notifications",
  documents: "No document notifications",
  messages: "No message notifications",
  hearings: "No hearing notifications",
};

function formatNotificationTime(value: string, group: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    ...(group === "Today" ? {} : { day: "numeric", month: "short", year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatHearingTime(value?: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}

export default function ClientNotificationsPage() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const notificationQuery = useNotifications();
  const hearingsQuery = useHearingsQuery(clientRecord ? {} : "skip");
  const appointmentsQuery = useAppointments({});
  const { markRead, markAllRead } = useNotificationCommands();
  const [category, setCategory] = useState<NotificationCategory>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const notifications = notificationQuery.data as ClientNotification[];
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const filtered = filterClientNotifications(notifications, category);
  const now = new Date();
  const groups = groupClientNotifications(filtered, now);
  const nextHearing = nearestUpcomingHearing(hearingsQuery.data ?? [], now);
  const nextAppointment = nearestConfirmedAppointment(
    appointmentsQuery.data as ClientImportantAppointment[],
    now,
  );
  const datesLoading =
    clientRecord === undefined || hearingsQuery.isLoading || appointmentsQuery.isLoading;
  const datesError = hearingsQuery.isError || appointmentsQuery.isError;
  const shellProps = {
    portal: "client" as const,
    decorated: true,
    heroClassName: CASE_LIST_HERO_CLASS,
    eyebrow: "Client Portal",
    title: "Notifications",
    description: "Updates about your messages, hearings, documents and appointments.",
    icon: Bell,
  };

  if (!currentUser) {
    return (
      <PortalPageShell {...shellProps} loading loadingLabel="Loading your notifications…">
        <div />
      </PortalPageShell>
    );
  }

  async function activateNotification(item: ClientNotification, destination: string | null) {
    if (!item.isRead) {
      setPendingId(item.id);
      try {
        await markRead.mutateAsync({ notificationId: item.id });
      } catch {
        toast.error("Could not mark this notification as read. Please try again.");
        setPendingId(null);
        return;
      }
      setPendingId(null);
    }
    if (destination) window.location.href = destination;
  }

  return (
    <PortalPageShell
      {...shellProps}
      actions={
        unreadCount > 0 && !notificationQuery.isError ? (
          <DashboardButton
            size="sm"
            variant="secondary"
            disabled={markAllRead.isPending}
            aria-busy={markAllRead.isPending}
            onClick={async () => {
              try {
                await markAllRead.mutateAsync();
                toast.success("All recent notifications marked as read");
              } catch {
                toast.error("Could not mark notifications as read. Please try again.");
              }
            }}
          >
            {markAllRead.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : (
              <CheckCheck className="mr-2 size-4" aria-hidden />
            )}
            {markAllRead.isPending ? "Marking read…" : "Mark all read"}
          </DashboardButton>
        ) : undefined
      }
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)] lg:items-start">
        <ClientPanel className="min-w-0 overflow-hidden !p-0">
          <div className="border-b border-dashboard-border px-4 py-3 sm:px-5">
            <p className="text-sm text-muted-foreground" role="status">
              {notificationQuery.isLoading
                ? "Loading recent notifications…"
                : `${unreadCount} unread in your recent notifications`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your recent feed shows up to 50 notifications.
            </p>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Notification filters">
              {categories.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus",
                    category === value
                      ? "border-dashboard-primary bg-dashboard-primary text-white"
                      : "border-dashboard-border bg-dashboard-panel text-foreground hover:bg-dashboard-panel-hover",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {label}
                  {value === "unread" && unreadCount > 0 ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-xs",
                        category === value
                          ? "bg-white/20 text-white"
                          : "bg-dashboard-primary-soft text-dashboard-primary",
                      )}
                      aria-hidden="true"
                    >
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {notificationQuery.isLoading ? (
            <div className="p-4" aria-label="Loading notifications">
              <DashboardListSkeleton rows={4} />
            </div>
          ) : notificationQuery.isError ? (
            <div className="p-5" role="alert">
              <h2 className="text-base font-semibold">Notifications could not be loaded</h2>
              <p className="mt-1 text-sm text-muted-foreground">Please try again.</p>
              <DashboardButton
                className="mt-4"
                variant="outline"
                size="sm"
                onClick={() => void notificationQuery.refetch()}
              >
                Retry
              </DashboardButton>
            </div>
          ) : notifications.length === 0 || filtered.length === 0 ? (
            <div className="px-5 py-12 text-center" role="status">
              <Inbox className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <h2 className="mt-3 text-base font-semibold">{emptyFilterCopy[category]}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {notifications.length === 0
                  ? "Updates from your legal team will appear here."
                  : "Try another filter to see your recent notifications."}
              </p>
            </div>
          ) : (
            <section aria-label="Recent notifications">
              {groups.map((group) => (
                <div key={group.heading}>
                  <h2 className="border-b border-dashboard-border bg-dashboard-neutral-soft px-4 py-2 text-sm font-semibold sm:px-5">
                    {group.heading}
                  </h2>
                  <ul>
                    {group.items.map((item) => {
                      const Icon = notificationIcons[item.type] ?? Bell;
                      const destination = safeNotificationPath(item.link, currentUser.role);
                      const interactive = !item.isRead || Boolean(destination);
                      const content = (
                        <>
                          <span
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-lg",
                              notificationTones[item.type] ?? notificationTones.system,
                            )}
                          >
                            <Icon className="size-5" aria-hidden />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-1 [overflow-wrap:anywhere] sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                                {item.title || "Notification"}
                                {!item.isRead ? (
                                  <span className="rounded bg-dashboard-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-dashboard-primary">
                                    Unread
                                  </span>
                                ) : null}
                              </span>
                              {item.body ? (
                                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                                  {item.body}
                                </span>
                              ) : null}
                            </span>
                            <time
                              dateTime={item.createdAt}
                              className="block shrink-0 text-xs text-muted-foreground sm:whitespace-nowrap"
                              suppressHydrationWarning
                            >
                              {formatNotificationTime(item.createdAt, group.heading)}
                            </time>
                          </span>
                          {pendingId === item.id ? (
                            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                          ) : destination ? (
                            <ChevronRight
                              className="size-4 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                          ) : null}
                        </>
                      );
                      return (
                        <li
                          key={item.id}
                          className="border-b border-dashboard-border last:border-b-0"
                        >
                          {interactive ? (
                            <button
                              type="button"
                              disabled={pendingId !== null || markAllRead.isPending}
                              aria-busy={pendingId === item.id}
                              onClick={() => void activateNotification(item, destination)}
                              className={cn(
                                "flex w-full min-w-0 items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-dashboard-panel-hover focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-dashboard-focus sm:px-5",
                                !item.isRead && "bg-dashboard-primary-soft/30",
                              )}
                            >
                              {content}
                            </button>
                          ) : (
                            <div className="flex min-w-0 items-start gap-3 px-4 py-3 sm:px-5">
                              {content}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </ClientPanel>

        <aside className="min-w-0 space-y-4" aria-label="Notification context">
          <ClientPanel className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="size-5 text-dashboard-primary" aria-hidden />
              Important Dates
            </h2>
            {datesError ? (
              <p className="mt-4 text-sm text-muted-foreground" role="status">
                Important dates are unavailable right now.
              </p>
            ) : datesLoading ? (
              <p className="mt-4 text-sm text-muted-foreground" role="status">
                Loading important dates…
              </p>
            ) : !nextHearing && !nextAppointment ? (
              <p className="mt-4 text-sm text-muted-foreground">No upcoming important dates.</p>
            ) : (
              <ul className="mt-3 divide-y divide-dashboard-border">
                {nextHearing ? (
                  <li className="py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-dashboard-primary">
                      Next hearing
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatAppointmentDate(String(nextHearing.dateGregorian).slice(0, 10))}
                      {nextHearing.time ? `, ${formatHearingTime(nextHearing.time)}` : ""}
                    </p>
                    {nextHearing.court ? (
                      <p className="mt-1 text-xs text-muted-foreground">{nextHearing.court}</p>
                    ) : null}
                    <Link
                      href="/client/hearings"
                      className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-dashboard-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-dashboard-focus"
                    >
                      View hearings <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </li>
                ) : null}
                {nextAppointment ? (
                  <li className="py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-dashboard-primary">
                      Next confirmed appointment
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatAppointmentDate(nextAppointment.date)}, {nextAppointment.timeSlot}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {nextAppointment.practiceArea}
                    </p>
                    <Link
                      href="/client/booking"
                      className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-dashboard-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-dashboard-focus"
                    >
                      View appointments <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </li>
                ) : null}
              </ul>
            )}
          </ClientPanel>
          <ClientPanel variant="soft" className="min-w-0">
            <h2 className="text-base font-semibold">Need help?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask your legal team about an update in your matters.
            </p>
            <Link
              href="/client/messages"
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-dashboard-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus"
            >
              Message Legal Team <ArrowRight className="size-4" aria-hidden />
            </Link>
          </ClientPanel>
        </aside>
      </div>
    </PortalPageShell>
  );
}
