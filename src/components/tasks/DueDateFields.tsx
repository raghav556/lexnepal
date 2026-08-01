import { Input } from "@/components/ui/input.tsx";
import { gregorianToBs, formatBs } from "@/lib/nepali-calendar.ts";

type DueDateFieldsProps = {
  dueDate: string;
  dueDateBs: string;
  onDueDateChange: (ad: string, bs: string) => void;
  onDueDateBsChange: (bs: string) => void;
  idPrefix?: string;
};

/** AD date input that auto-fills BS (same pattern as hearings). */
export function DueDateFields({
  dueDate,
  dueDateBs,
  onDueDateChange,
  onDueDateBsChange,
  idPrefix = "due",
}: DueDateFieldsProps) {
  const handleGregorianChange = (val: string) => {
    if (!val) {
      onDueDateChange("", "");
      return;
    }
    try {
      const parts = val.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      onDueDateChange(val, formatBs(gregorianToBs(d)));
    } catch {
      onDueDateChange(val, dueDateBs);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-ad`} className="text-xs font-medium text-foreground">Due Date (AD)</label>
        <Input
          id={`${idPrefix}-ad`}
          type="date"
          value={dueDate}
          onChange={(e) => handleGregorianChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-bs`} className="text-xs font-medium text-foreground">Due Date (BS)</label>
        <Input
          id={`${idPrefix}-bs`}
          readOnly
          className="bg-muted/40"
          placeholder="Auto from AD"
          value={dueDateBs}
          onChange={(e) => onDueDateBsChange(e.target.value)}
        />
      </div>
    </div>
  );
}
