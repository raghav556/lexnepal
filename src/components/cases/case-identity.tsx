import { DualDateDisplay, DashboardStatusLabel, StatusBadge } from "@/components/dashboard";
import {
  CASE_LIFECYCLE_LABELS,
  CASE_OUTCOME_LABELS,
  inferredClosureOutcome,
  toLifecycleStatus,
} from "@/shared/contracts/case-ui";
import { cn } from "@/lib/utils.ts";

export interface CaseIdentityProps {
  caseNumber: string;
  status: string;
  closureOutcome?: string | null;
  practiceArea?: string | null;
  filingDate?: string | null;
  /** A listing may place these same status labels in its own table column. */
  showStatus?: boolean;
  className?: string;
}

/** Case number + lifecycle status + optional outcome — shared Staff/Admin identity chips. */
export function CaseIdentity({
  caseNumber,
  status,
  closureOutcome,
  practiceArea,
  filingDate,
  showStatus = true,
  className,
}: CaseIdentityProps) {
  const lifecycle = toLifecycleStatus(status);
  const outcome = inferredClosureOutcome(status, closureOutcome);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-[10px] font-mono font-medium text-muted-foreground bg-dashboard-neutral-soft px-2 py-0.5 rounded-md border border-dashboard-border">
        {caseNumber}
      </span>
      {showStatus ? (
        <DashboardStatusLabel
          status={lifecycle}
          label={CASE_LIFECYCLE_LABELS[lifecycle]}
          className="text-[10px] uppercase tracking-wider"
        />
      ) : null}
      {showStatus && outcome ? (
        <DashboardStatusLabel
          status={outcome}
          label={CASE_OUTCOME_LABELS[outcome]}
          className="text-[10px] uppercase tracking-wider"
        />
      ) : null}
      {practiceArea ? (
        <StatusBadge tone="information" className="text-[10px] uppercase tracking-wider">
          {practiceArea}
        </StatusBadge>
      ) : null}
      {filingDate ? (
        <span className="text-[10px] text-muted-foreground">
          Filed <DualDateDisplay isoDate={filingDate} />
        </span>
      ) : null}
    </div>
  );
}
