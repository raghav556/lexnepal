import * as React from "react";
import { cn } from "@/lib/utils";

export function DashboardTable({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-w-0 overflow-x-auto rounded-lg border border-dashboard-border", className)}
      {...props}
    >
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function DashboardTableHead({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-900/90 border-b border-dashboard-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400 backdrop-blur-xs",
        className,
      )}
      {...props}
    />
  );
}

export function DashboardTableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn("divide-y divide-dashboard-border bg-dashboard-panel", className)}
      {...props}
    />
  );
}

export function DashboardTableRow({
  className,
  striped,
  ...props
}: React.ComponentProps<"tr"> & { striped?: boolean }) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/60",
        striped && "even:bg-slate-50/40 dark:even:bg-slate-900/40",
        className,
      )}
      {...props}
    />
  );
}

export function DashboardTableHeaderCell({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function DashboardTableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-4 py-3.5 align-middle text-foreground", className)} {...props} />;
}

export function DashboardFilterBar({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DashboardListRow({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-dashboard-border bg-dashboard-panel p-3 transition-colors hover:border-dashboard-primary/25 hover:bg-dashboard-panel-hover sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
