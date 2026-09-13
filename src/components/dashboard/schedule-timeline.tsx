"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ScheduleTimelineEntry {
  id: string;
  /** Normalized display time, e.g. "9:00 AM". Provided by the caller. */
  time: string;
  title: React.ReactNode;
  /** Real secondary context (matter, client, location). */
  subtitle?: React.ReactNode;
  /** Truthful event-type/status cue. */
  badge?: React.ReactNode;
  /** Optional real destination for the entry. */
  href?: string;
}

export interface ScheduleTimelineProps {
  entries: ScheduleTimelineEntry[];
  className?: string;
}

/**
 * Generic day-schedule presentation: compact time column, event marker, and a
 * restrained connector line. Purely presentational — callers supply real,
 * already-sorted schedule entries.
 */
export function ScheduleTimeline({ entries, className }: ScheduleTimelineProps) {
  if (entries.length === 0) return null;
  return (
    <ol className={cn("relative space-y-1", className)}>
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;
        const body = (
          <>
            <span
              aria-hidden
              className="absolute left-[3.4rem] top-4 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-dashboard-primary bg-dashboard-panel"
            />
            {!isLast ? (
              <span
                aria-hidden
                className="absolute left-[3.4rem] top-7 bottom-[-0.25rem] w-px bg-dashboard-border"
              />
            ) : null}
            <span className="w-12 shrink-0 pt-3 text-xs font-medium tabular-nums text-muted-foreground">
              {entry.time}
            </span>
            <span className="min-w-0 flex-1 py-2.5 pl-5 pr-2">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-foreground">
                  {entry.title}
                </span>
                {entry.badge}
              </span>
              {entry.subtitle ? (
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {entry.subtitle}
                </span>
              ) : null}
            </span>
          </>
        );
        return (
          <li key={entry.id} className="relative">
            {entry.href ? (
              <Link
                href={entry.href}
                className={cn(
                  "relative flex rounded-lg transition-colors hover:bg-dashboard-panel-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus",
                )}
              >
                {body}
              </Link>
            ) : (
              <div className="relative flex">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export interface QuickActionTileProps {
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  description?: string;
  className?: string;
}

/** Compact navigation tile for dashboard quick actions. Navigation only. */
export function QuickActionTile({
  href,
  icon: Icon,
  label,
  description,
  className,
}: QuickActionTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col items-center gap-2 rounded-xl border border-dashboard-border bg-dashboard-panel px-3 py-4 text-center transition-all hover:border-dashboard-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-focus focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-canvas",
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-lg border border-dashboard-primary/25 bg-dashboard-primary-soft text-dashboard-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="text-xs font-semibold leading-tight text-foreground">{label}</span>
      {description ? (
        <span className="text-[10px] leading-tight text-muted-foreground">{description}</span>
      ) : null}
    </Link>
  );
}
