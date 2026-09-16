import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type HeroChipIcon = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const heroChipClass =
  "group flex h-full w-full items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-white backdrop-blur-sm transition-all";

export interface HeroStatChipProps {
  icon?: HeroChipIcon;
  value: React.ReactNode;
  label: string;
  /** When set, the chip navigates; otherwise it renders as a live stat. */
  href?: string;
}

/** Glass stat chip rendered inside dark dashboard heroes. */
export function HeroStatChip({ icon: Icon, value, label, href }: HeroStatChipProps) {
  const body = (
    <>
      {Icon ? <Icon className="size-4 shrink-0 text-white/80" aria-hidden /> : null}
      <span className="text-lg font-extrabold leading-none tabular-nums">{value}</span>
      <span className="text-[11px] font-medium leading-tight text-white/75">{label}</span>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          heroChipClass,
          "hover:border-white/35 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
        )}
      >
        {body}
      </Link>
    );
  }
  return <span className={heroChipClass}>{body}</span>;
}

/** Non-interactive glass health indicator for hero strips. */
export function HeroHealthChip({
  healthy,
  overdueCount,
  healthyLabel = "Work queue healthy",
}: {
  healthy: boolean;
  overdueCount: number;
  healthyLabel?: string;
}) {
  return (
    <span className={heroChipClass}>
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          healthy ? "bg-emerald-300" : "bg-rose-300 animate-pulse",
        )}
      />
      <span className="text-[11px] font-semibold leading-tight text-white/85">
        {healthy
          ? healthyLabel
          : overdueCount > 0
            ? `${overdueCount} overdue ${overdueCount === 1 ? "task" : "tasks"}`
            : "Urgent items present"}
      </span>
    </span>
  );
}
