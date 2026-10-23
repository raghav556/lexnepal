import { BsDateField } from "@/components/ui/bs-date-field";
import { gregorianToBs, formatBs } from "@/lib/nepali-calendar.ts";

type DueDateFieldsProps = {
  dueDate: string;
  dueDateBs: string;
  onDueDateChange: (ad: string, bs: string) => void;
  onDueDateBsChange: (bs: string) => void;
  idPrefix?: string;
};

/** Locale-aware entry; the existing callback still receives Gregorian + B.S. values. */
export function DueDateFields({ dueDate, onDueDateChange, idPrefix = "due" }: DueDateFieldsProps) {
  const handleGregorianChange = (val: string) => {
    if (!val) {
      onDueDateChange("", "");
      return;
    }
    try {
      onDueDateChange(val, formatBs(gregorianToBs(val)));
    } catch {
      return;
    }
  };

  return (
    <div className="min-w-0">
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-bs`} className="text-xs font-medium text-foreground">
          Due Date
        </label>
        <BsDateField id={`${idPrefix}-bs`} value={dueDate} onDateChange={handleGregorianChange} />
      </div>
    </div>
  );
}
