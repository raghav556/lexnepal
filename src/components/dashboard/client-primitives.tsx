import * as React from "react";
import { cn } from "@/lib/utils";
import type { DashboardTone } from "@/lib/dashboard-semantics";
import {
  DashboardSegmentedControl,
  EmptyState,
  StatusBadge,
  type DashboardSegmentedControlProps,
} from "@/components/dashboard/dashboard-primitives";

export type ClientSurfaceVariant = "base" | "interactive" | "soft" | "attention";

export interface ClientPanelProps extends React.ComponentProps<"div"> {
  variant?: ClientSurfaceVariant;
  tone?: DashboardTone;
}

const surfaceVariantClass: Record<ClientSurfaceVariant, string> = {
  base: "bg-dashboard-panel text-foreground",
  interactive:
    "bg-dashboard-panel text-foreground transition-[background-color,border-color] duration-[var(--dashboard-duration-fast)] hover:bg-dashboard-panel-hover hover:border-dashboard-primary/30",
  soft: "bg-dashboard-neutral-soft text-foreground",
  attention: "bg-dashboard-warning-soft text-dashboard-warning-foreground",
};

/**
 * Client surface hierarchy. Presentation only — no queries or routing.
 */
export function ClientPanel({ variant = "base", tone, className, ...props }: ClientPanelProps) {
  return (
    <div
      data-slot="client-panel"
      data-variant={variant}
      data-tone={tone}
      className={cn(
        "rounded-[var(--dashboard-radius-card)] border border-dashboard-border p-[var(--dashboard-panel-padding)] shadow-[var(--dashboard-shadow-card)]",
        surfaceVariantClass[variant],
        tone === "danger" &&
          variant === "attention" &&
          "bg-dashboard-danger-soft text-dashboard-danger-foreground",
        tone === "information" &&
          variant === "attention" &&
          "bg-dashboard-information-soft text-dashboard-information-foreground",
        tone === "success" &&
          variant === "attention" &&
          "bg-dashboard-success-soft text-dashboard-success-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function ClientSoftPanel(props: Omit<ClientPanelProps, "variant">) {
  return <ClientPanel variant="soft" {...props} />;
}

export function ClientAttentionPanel(props: Omit<ClientPanelProps, "variant">) {
  return <ClientPanel variant="attention" {...props} />;
}

export function ClientFilterBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="client-filter-bar"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-[var(--dashboard-radius-card)] border border-dashboard-border bg-dashboard-panel p-3 shadow-[var(--dashboard-shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}

export function ClientSegmentedControl(props: DashboardSegmentedControlProps) {
  return <DashboardSegmentedControl {...props} />;
}

export interface ClientMetadataItem {
  label: React.ReactNode;
  value: React.ReactNode;
}

export interface ClientMetadataRowProps extends React.ComponentProps<"div"> {
  label: React.ReactNode;
  value: React.ReactNode;
}

export function ClientMetadataRow({ label, value, className, ...props }: ClientMetadataRowProps) {
  return (
    <div
      data-slot="client-metadata-row"
      className={cn(
        "grid gap-1 border-b border-dashboard-border py-2.5 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start sm:gap-4",
        className,
      )}
      {...props}
    >
      <span
        data-slot="client-metadata-label"
        className="text-[length:var(--dashboard-text-meta-size)] font-medium text-muted-foreground"
      >
        {label}
      </span>
      <span
        data-slot="client-metadata-value"
        className="min-w-0 break-words text-sm text-foreground"
      >
        {value}
      </span>
    </div>
  );
}

export interface ClientMatterSummaryProps extends Omit<React.ComponentProps<"article">, "title"> {
  title: React.ReactNode;
  type?: React.ReactNode;
  matterNumber?: React.ReactNode;
  status?: React.ReactNode;
  statusTone?: DashboardTone;
  advocate?: React.ReactNode;
  nextEvent?: React.ReactNode;
  lastUpdate?: React.ReactNode;
  action?: React.ReactNode;
}

export function ClientMatterSummary({
  title,
  type,
  matterNumber,
  status,
  statusTone = "information",
  advocate,
  nextEvent,
  lastUpdate,
  action,
  className,
  ...props
}: ClientMatterSummaryProps) {
  return (
    <article
      data-slot="client-matter-summary"
      className={cn(
        "rounded-[var(--dashboard-radius-card)] border border-dashboard-border bg-dashboard-panel p-[var(--dashboard-panel-padding)] shadow-[var(--dashboard-shadow-card)]",
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-sans text-base font-semibold text-foreground">{title}</h3>
          {type ? <p className="mt-1 text-[13px] text-muted-foreground">{type}</p> : null}
        </div>
        {status ? <StatusBadge tone={statusTone}>{status}</StatusBadge> : null}
      </div>
      <dl className="mt-3">
        {matterNumber ? <ClientMetadataRow label="Matter number" value={matterNumber} /> : null}
        {advocate ? <ClientMetadataRow label="Advocate" value={advocate} /> : null}
        {nextEvent ? <ClientMetadataRow label="Next event" value={nextEvent} /> : null}
        {lastUpdate ? <ClientMetadataRow label="Last update" value={lastUpdate} /> : null}
      </dl>
      {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
    </article>
  );
}

export interface ClientHearingSummaryProps extends React.ComponentProps<"article"> {
  date?: React.ReactNode;
  time?: React.ReactNode;
  matter?: React.ReactNode;
  court?: React.ReactNode;
  purpose?: React.ReactNode;
  status?: React.ReactNode;
  statusTone?: DashboardTone;
  action?: React.ReactNode;
}

export function ClientHearingSummary({
  date,
  time,
  matter,
  court,
  purpose,
  status,
  statusTone = "information",
  action,
  className,
  ...props
}: ClientHearingSummaryProps) {
  return (
    <article
      data-slot="client-hearing-summary"
      className={cn(
        "flex flex-col gap-3 rounded-[var(--dashboard-radius-card)] border border-dashboard-border bg-dashboard-panel p-[var(--dashboard-panel-padding)] shadow-[var(--dashboard-shadow-card)] sm:flex-row sm:items-start",
        className,
      )}
      {...props}
    >
      {date || time ? (
        <div
          data-slot="client-hearing-date"
          className="flex min-w-16 shrink-0 flex-col rounded-[var(--dashboard-radius-control)] border border-dashboard-border bg-dashboard-neutral-soft px-3 py-2 text-center"
        >
          {date ? <span className="text-sm font-semibold text-foreground">{date}</span> : null}
          {time ? (
            <span className="mt-0.5 text-[length:var(--dashboard-text-meta-size)] text-muted-foreground">
              {time}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {matter ? (
              <h3 className="font-sans text-base font-semibold text-foreground">{matter}</h3>
            ) : null}
            {purpose ? <p className="mt-1 text-[13px] text-muted-foreground">{purpose}</p> : null}
          </div>
          {status ? <StatusBadge tone={statusTone}>{status}</StatusBadge> : null}
        </div>
        {court ? (
          <p className="mt-2 text-[length:var(--dashboard-text-meta-size)] text-muted-foreground">
            {court}
          </p>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </article>
  );
}

export interface ClientDocumentItemProps extends React.ComponentProps<"article"> {
  name: React.ReactNode;
  fileType?: React.ReactNode;
  matter?: React.ReactNode;
  date?: React.ReactNode;
  size?: React.ReactNode;
  status?: React.ReactNode;
  statusTone?: DashboardTone;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function ClientDocumentItem({
  name,
  fileType,
  matter,
  date,
  size,
  status,
  statusTone = "neutral",
  icon,
  action,
  className,
  ...props
}: ClientDocumentItemProps) {
  return (
    <article
      data-slot="client-document-item"
      className={cn(
        "flex flex-col gap-3 rounded-[var(--dashboard-radius-card)] border border-dashboard-border bg-dashboard-panel p-[var(--dashboard-panel-padding-compact)] shadow-[var(--dashboard-shadow-card)] sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span
            data-slot="client-document-icon"
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--dashboard-radius-control)] border border-dashboard-border bg-dashboard-neutral-soft text-dashboard-primary"
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-sans text-sm font-semibold text-foreground">{name}</h3>
          <p className="mt-1 text-[length:var(--dashboard-text-meta-size)] text-muted-foreground">
            {[fileType, matter, date, size].filter(Boolean).map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 ? <span aria-hidden> · </span> : null}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {status ? <StatusBadge tone={statusTone}>{status}</StatusBadge> : null}
        {action}
      </div>
    </article>
  );
}

export interface ClientActionItemProps extends Omit<React.ComponentProps<"article">, "title"> {
  title: React.ReactNode;
  matter?: React.ReactNode;
  dueDate?: React.ReactNode;
  status?: React.ReactNode;
  statusTone?: DashboardTone;
  action?: React.ReactNode;
}

export function ClientActionItem({
  title,
  matter,
  dueDate,
  status,
  statusTone = "warning",
  action,
  className,
  ...props
}: ClientActionItemProps) {
  return (
    <article
      data-slot="client-action-item"
      className={cn(
        "flex flex-col gap-3 rounded-[var(--dashboard-radius-card)] border border-dashboard-border bg-dashboard-panel p-[var(--dashboard-panel-padding-compact)] shadow-[var(--dashboard-shadow-card)] sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        <h3 className="font-sans text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-[length:var(--dashboard-text-meta-size)] text-muted-foreground">
          {[matter, dueDate].filter(Boolean).map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 ? <span aria-hidden> · </span> : null}
              <span>{item}</span>
            </React.Fragment>
          ))}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {status ? <StatusBadge tone={statusTone}>{status}</StatusBadge> : null}
        {action}
      </div>
    </article>
  );
}

export interface ClientTimelineItemProps extends Omit<React.ComponentProps<"article">, "title"> {
  title: React.ReactNode;
  date?: React.ReactNode;
  category?: React.ReactNode;
  description?: React.ReactNode;
  matter?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function ClientTimelineItem({
  title,
  date,
  category,
  description,
  matter,
  icon,
  action,
  className,
  ...props
}: ClientTimelineItemProps) {
  return (
    <article
      data-slot="client-timeline-item"
      className={cn("relative flex gap-3 pb-5 last:pb-0", className)}
      {...props}
    >
      <div className="flex flex-col items-center">
        <span
          data-slot="client-timeline-marker"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashboard-border bg-dashboard-neutral-soft text-dashboard-primary"
        >
          {icon}
        </span>
        <span aria-hidden className="mt-1 w-px flex-1 bg-dashboard-border" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-sans text-sm font-semibold text-foreground">{title}</h3>
          {date ? (
            <time className="text-[length:var(--dashboard-text-meta-size)] text-muted-foreground">
              {date}
            </time>
          ) : null}
        </div>
        {category || matter ? (
          <p className="mt-1 text-[length:var(--dashboard-text-meta-size)] text-muted-foreground">
            {[category, matter].filter(Boolean).map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 ? <span aria-hidden> · </span> : null}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </p>
        ) : null}
        {description ? (
          <p className="mt-1.5 text-[13px] text-muted-foreground">{description}</p>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </article>
  );
}

export interface ClientStatePanelProps extends Omit<React.ComponentProps<"div">, "title"> {
  state: "loading" | "empty" | "error";
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

export function ClientStatePanel({
  state,
  title,
  description,
  action,
  icon,
  className,
  ...props
}: ClientStatePanelProps) {
  return (
    <div
      data-slot="client-state-panel"
      data-state={state}
      aria-busy={state === "loading" || undefined}
      className={className}
      {...props}
    >
      <EmptyState title={title} description={description} action={action} icon={icon} />
    </div>
  );
}
