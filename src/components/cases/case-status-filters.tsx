import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";
import {
  CASE_CLOSURE_OUTCOMES,
  CASE_LIFECYCLE_LABELS,
  CASE_LIFECYCLE_STATUSES,
  CASE_OUTCOME_LABELS,
  CASE_STATUS_FILTERS,
  type CaseClosureOutcome,
  type CaseLifecycleStatus,
  type CaseStatusFilter,
} from "@/shared/contracts/case-ui";

export interface CaseStatusFiltersProps {
  value: CaseStatusFilter;
  onChange: (value: CaseStatusFilter) => void;
  counts?: Partial<Record<CaseStatusFilter, number>>;
  className?: string;
}

export function CaseStatusFilters({ value, onChange, counts, className }: CaseStatusFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Case status"
      className={cn(
        "flex flex-wrap gap-1 bg-dashboard-neutral-soft p-1 rounded-lg border border-dashboard-border",
        className,
      )}
    >
      {CASE_STATUS_FILTERS.map((filter) => {
        const selected = value === filter;
        const label = filter === "all" ? "All" : CASE_LIFECYCLE_LABELS[filter];
        const count = counts?.[filter];
        return (
          <button
            key={filter}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(filter)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold tracking-wide rounded-md transition-all duration-200",
              selected
                ? "bg-dashboard-panel shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {typeof count === "number" ? (
              <span className="ml-1.5 tabular-nums font-medium opacity-70">{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function CaseLifecycleSelect({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: CaseLifecycleStatus) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as CaseLifecycleStatus)}>
      <SelectTrigger id={id} className={cn("h-9 text-xs bg-background", className)}>
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {CASE_LIFECYCLE_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {CASE_LIFECYCLE_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const NONE_OUTCOME = "none";

export function CaseOutcomeSelect({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string | null;
  onChange: (value: CaseClosureOutcome | null) => void;
  className?: string;
}) {
  return (
    <Select
      value={value ?? NONE_OUTCOME}
      onValueChange={(next) =>
        onChange(next === NONE_OUTCOME ? null : (next as CaseClosureOutcome))
      }
    >
      <SelectTrigger id={id} className={cn("h-9 text-xs bg-background", className)}>
        <SelectValue placeholder="Outcome" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_OUTCOME}>None</SelectItem>
        {CASE_CLOSURE_OUTCOMES.map((outcome) => (
          <SelectItem key={outcome} value={outcome}>
            {CASE_OUTCOME_LABELS[outcome]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CaseStatusEditorFields({
  status,
  closureOutcome,
  onStatusChange,
  onOutcomeChange,
}: {
  status: string;
  closureOutcome: string | null;
  onStatusChange: (value: CaseLifecycleStatus) => void;
  onOutcomeChange: (value: CaseClosureOutcome | null) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label htmlFor="case-status" className="text-xs font-medium">
          Status
        </Label>
        <CaseLifecycleSelect id="case-status" value={status} onChange={onStatusChange} />
      </div>
      {status === "closed" ? (
        <div className="space-y-1">
          <Label htmlFor="case-outcome" className="text-xs font-medium">
            Closure outcome
          </Label>
          <CaseOutcomeSelect id="case-outcome" value={closureOutcome} onChange={onOutcomeChange} />
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}
