import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { getBSDate } from "@/lib/bs-calendar.ts";
import { PRIORITY_COLORS, isTaskOverdue } from "@/lib/task-constants.ts";
import { cn } from "@/lib/utils.ts";

type Props = {
  tasks: any[];
  onOpen: (task: any) => void;
};

export function TaskCalendarView({ tasks, onOpen }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startPad = startOfMonth(currentMonth).getDay(); // 0=Sun

  const tasksByDay = (day: Date) =>
    tasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return !Number.isNaN(d.getTime()) && isSameDay(d, day);
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted-foreground mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[100px] rounded-lg bg-transparent" />
        ))}
        {days.map((day) => {
          const dayTasks = tasksByDay(day);
          const bs = getBSDate(format(day, "yyyy-MM-dd"));
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[100px] rounded-lg border border-border/50 p-1.5 bg-card/40",
                isSameDay(day, new Date()) && "border-primary/50 bg-primary/5",
                !isSameMonth(day, currentMonth) && "opacity-40",
              )}
            >
              <div className="flex items-baseline justify-between gap-1 mb-1">
                <span className="text-xs font-bold">{format(day, "d")}</span>
                {bs && <span className="text-[9px] text-muted-foreground truncate">{bs}</span>}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => onOpen(t)}
                    className={cn(
                      "w-full text-left text-[10px] px-1 py-0.5 rounded truncate border border-transparent hover:border-border",
                      isTaskOverdue(t) ? "bg-destructive/15 text-destructive" : "bg-secondary/60",
                    )}
                  >
                    <Badge className={`text-[8px] px-1 py-0 mr-0.5 ${PRIORITY_COLORS[t.priority]}`}>
                      {t.priority?.[0]}
                    </Badge>
                    {t.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[9px] text-muted-foreground px-1">
                    +{dayTasks.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
