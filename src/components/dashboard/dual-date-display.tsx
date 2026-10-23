import {
  calendarDateLabel,
  formatDualDate,
  formatOperationalDate,
  nepalDateOnly,
} from "@/lib/nepali-calendar";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

export interface DualDateDisplayProps {
  isoDate?: string | null;
  /** Recorded B.S.-only legacy text is labelled, never parsed as Gregorian. */
  recordedBs?: string | null;
  className?: string;
  /** When false, only the active locale's primary date is shown. */
  alwaysDual?: boolean;
}

/** Locale-primary presentation; civil dates and source instants retain their meaning. */
export function DualDateDisplay({
  isoDate,
  recordedBs,
  className,
  alwaysDual = true,
}: DualDateDisplayProps) {
  const { language } = useI18n();
  if (!isoDate)
    return recordedBs ? (
      <span data-slot="dual-date-display" className={className}>
        {formatOperationalDate(null, recordedBs, language)}
      </span>
    ) : null;

  if (alwaysDual) {
    return (
      <span data-slot="dual-date-display" className={cn("tabular-nums", className)}>
        {formatDualDate(isoDate, language)}
      </span>
    );
  }

  let civil: string;
  try {
    civil = nepalDateOnly(isoDate);
  } catch {
    return <span className={className}>{formatDualDate(isoDate, language)}</span>;
  }
  return (
    <span data-slot="dual-date-display" className={cn("tabular-nums", className)}>
      {calendarDateLabel(civil, language)}
    </span>
  );
}
