import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/dashboard-primitives";
import { getDashboardStatusTone, type DashboardTone } from "@/lib/dashboard-semantics";
import { cn } from "@/lib/utils";

import { useI18n } from "@/lib/i18n-context";

export interface DashboardStatusLabelProps extends React.ComponentProps<"span"> {
  status?: string | null;
  label?: React.ReactNode;
  tone?: DashboardTone;
  icon?: LucideIcon;
  className?: string;
}

/** Semantic status chip — replaces ad-hoc STATUS_COLORS maps. */
export function DashboardStatusLabel({
  status,
  label,
  tone,
  icon,
  className,
  children,
  ...props
}: DashboardStatusLabelProps) {
  const { t } = useI18n();
  const resolvedTone = tone ?? getDashboardStatusTone(status);

  let fallbackDisplay = "Unknown";
  if (status) {
    const key = `status.${String(status).toLowerCase().replace(/[-\s]/g, "_")}`;
    const translated = t(key);
    fallbackDisplay =
      translated !== key
        ? translated
        : String(status)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const display = children ?? label ?? fallbackDisplay;

  return (
    <StatusBadge tone={resolvedTone} icon={icon} className={cn("capitalize", className)} {...props}>
      {display}
    </StatusBadge>
  );
}
