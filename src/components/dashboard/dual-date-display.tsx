import { formatDualDate } from "@/lib/nepali-calendar";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

export interface DualDateDisplayProps {
  isoDate?: string | null;
  className?: string;
  /** When false, only BS date is shown if language is ne. */
  alwaysDual?: boolean;
}

/** Gregorian + Bikram Sambat date for portal surfaces. */
export function DualDateDisplay({ isoDate, className, alwaysDual = true }: DualDateDisplayProps) {
  const { language } = useI18n();
  if (!isoDate) return null;

  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return <span className={className}>{isoDate}</span>;

  if (language === "ne" || alwaysDual) {
    return (
      <span className={cn("tabular-nums", className)}>{formatDualDate(isoDate, language)}</span>
    );
  }

  return (
    <span className={cn("tabular-nums", className)}>
      {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
    </span>
  );
}
