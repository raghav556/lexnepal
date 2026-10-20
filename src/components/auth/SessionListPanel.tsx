"use client";

import { useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { Laptop, MonitorX, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toSessionDisplay } from "@/shared/auth/session-display";
import type { SessionDto } from "@/shared/contracts/identity";

type SessionListPanelProps = {
  sessions: SessionDto[] | undefined;
  busy?: boolean;
  onRevokeSession: (sessionId: string) => void | Promise<void>;
  onRevokeAllOther: () => void | Promise<void>;
};

function DeviceIcon({ label }: { label: string }) {
  if (label === "Mobile device") return <Smartphone className="size-5" />;
  if (label === "Tablet") return <Tablet className="size-5" />;
  return <Laptop className="size-5" />;
}

export function SessionListPanel({
  sessions,
  busy = false,
  onRevokeSession,
  onRevokeAllOther,
}: SessionListPanelProps) {
  const currentSessions = sessions?.filter((session) => session.isCurrent) ?? [];
  const otherSessions = sessions?.filter((session) => !session.isCurrent) ?? [];
  const { currentPage, totalPages, paginatedItems, goToPage } = usePagination({
    items: otherSessions,
    itemsPerPage: 6,
  });
  const [previousCount, setPreviousCount] = useState(otherSessions.length);
  // Reconcile the hook's stored page with its clamped display after revocation.
  if (previousCount !== otherSessions.length) {
    setPreviousCount(otherSessions.length);
    goToPage(currentPage);
  }
  const visibleSessions = [...currentSessions, ...paginatedItems];

  return (
    <div className="portal-session-list space-y-4" aria-busy={busy}>
      {otherSessions.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Sign out all other sessions</p>
            <p className="text-xs text-muted-foreground">
              Revoke {otherSessions.length} other device{otherSessions.length === 1 ? "" : "s"}.
              Your current session stays active.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void onRevokeAllOther()}
          >
            Sign out everywhere else
          </Button>
        </div>
      ) : null}

      {sessions?.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No active sessions found.</p>
      ) : (
        visibleSessions.map((session) => {
          const display = toSessionDisplay(session);
          return (
            <div
              key={display.id}
              data-slot={display.isCurrent ? "current-session" : "other-session"}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className={`rounded-full p-2 ${
                    display.isCurrent
                      ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <DeviceIcon label={display.deviceLabel} />
                </div>
                <div className="min-w-0 break-words">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {display.deviceLabel} · {display.browserLabel}
                    {display.isCurrent ? (
                      <span
                        data-slot="session-current-status"
                        className="rounded border border-green-200 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-800 dark:border-green-800 dark:text-green-300"
                      >
                        Current session
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{display.locationHint}</span>
                    <span>&bull;</span>
                    <span>
                      {display.isCurrent
                        ? "Active now"
                        : `Last active ${new Date(display.lastActive).toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>
              {!display.isCurrent ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full shrink-0 text-destructive hover:bg-destructive/10 sm:w-auto"
                  disabled={busy}
                  onClick={() => void onRevokeSession(display.id)}
                >
                  <MonitorX className="mr-2 size-4" /> Revoke
                </Button>
              ) : null}
            </div>
          );
        })
      )}
      {otherSessions.length > 0 ? (
        <div className="portal-session-pages">
          <p role="status" className="text-center text-xs text-muted-foreground">
            Other sessions {(currentPage - 1) * 6 + 1}–
            {Math.min(currentPage * 6, otherSessions.length)} of {otherSessions.length}
            {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ""}
          </p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            onPrevPage={() => goToPage(currentPage - 1)}
            onNextPage={() => goToPage(currentPage + 1)}
            ariaLabel="Active sessions pages"
            className="portal-session-pagination"
          />
        </div>
      ) : null}
    </div>
  );
}
