
import { useI18n } from "@/lib/i18n-context";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { StatusBadge, getDashboardStatusTone } from "@/components/dashboard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  eachDayOfInterval,
  format,
} from "date-fns";
import { calendarMonthBounds, calendarMonthLabel, calendarDayLabel, calendarDateLabel, calendarWeekdays, shiftCalendarMonth, canShiftCalendarMonth, nepalDateOnly, viewDateIso } from "@/lib/nepali-calendar";
import { isTaskOverdue } from "@/lib/task-constants.ts";
import { cn } from "@/lib/utils.ts";
import { StaffPagedCollection } from "@/components/dashboard/staff-paged-collection";

type Props = {
  tasks: any[];
  onOpen: (task: any) => void;
  staffPaging?: boolean;
};

export function TaskCalendarView({ tasks, onOpen, staffPaging = false }: Props) {
  const { language } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(() => new Date(`${nepalDateOnly()}T12:00:00`));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const days = useMemo(() => {
    const bounds = calendarMonthBounds(viewDateIso(currentMonth), language);
    const start = new Date(`${bounds.start}T12:00:00`);
    const end = new Date(`${bounds.end}T12:00:00`);
    return eachDayOfInterval({ start, end });
  }, [currentMonth, language]);

  const startPad = new Date(`${calendarMonthBounds(viewDateIso(currentMonth), language).start}T12:00:00`).getDay(); // 0=Sun

  const tasksByDay = (day: Date) =>
    tasks.filter((t) => {
      if (!t.dueDate) return false;
      try { return nepalDateOnly(t.dueDate) === viewDateIso(day); } catch { return false; }
    });

  return (
    <div
      className="staff-task-calendar space-y-3"
      role="region"
      aria-label="Task calendar"
      tabIndex={0}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold">{calendarMonthLabel(viewDateIso(currentMonth), language)}</h3>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            aria-label="Previous month"
            disabled={!canShiftCalendarMonth(viewDateIso(currentMonth), -1, language)}
            onClick={() => setCurrentMonth((m) => new Date(`${shiftCalendarMonth(viewDateIso(m), -1, language)}T12:00:00`))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(new Date(`${nepalDateOnly()}T12:00:00`))}>
            Today
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            aria-label="Next month"
            disabled={!canShiftCalendarMonth(viewDateIso(currentMonth), 1, language)}
            onClick={() => setCurrentMonth((m) => new Date(`${shiftCalendarMonth(viewDateIso(m), 1, language)}T12:00:00`))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted-foreground mb-1">
        {calendarWeekdays(language).map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[100px] rounded-lg bg-transparent" />
        ))}
        {days.map((day) => {
          const dayTasks = tasksByDay(day);
          const dayKey = viewDateIso(day);
          return (
            <div
              key={day.toISOString()} data-date={dayKey} data-calendar-system={language === "ne" ? "bs" : "ad"}
              className={cn(
                "min-h-[100px] rounded-lg border border-border/50 p-1.5 bg-card/40",
                viewDateIso(day) === nepalDateOnly() && "border-primary/50 bg-primary/5",
              )}
            >
              <div className="flex items-baseline justify-between gap-1 mb-1">
                <span className="text-xs font-bold">{calendarDayLabel(dayKey, language)}</span>

              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    data-overdue={isTaskOverdue(t) || undefined}
                    onClick={() => onOpen(t)}
                    className={cn(
                      "w-full text-left text-[10px] px-1 py-0.5 rounded truncate border border-transparent hover:border-border",
                      isTaskOverdue(t) ? "bg-destructive/15 text-destructive" : "bg-secondary/60",
                    )}
                  >
                    <StatusBadge
                      tone={getDashboardStatusTone(t.priority)}
                      className="mr-0.5 px-1 py-0 text-[8px] uppercase"
                    >
                      {t.priority?.[0]}
                    </StatusBadge>
                    {t.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (staffPaging ? (
                  <Button type="button" variant="ghost" size="sm" className="min-h-8 h-auto px-1 text-[10px]"
                    aria-label={`View all ${dayTasks.length} tasks on ${format(day, "yyyy-MM-dd")}`}
                    onClick={() => setSelectedDay(day)}>
                    +{dayTasks.length - 3} more
                  </Button>
                ) : (
                  <p className="text-[9px] text-muted-foreground px-1">
                    +{dayTasks.length - 3} more
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {staffPaging && selectedDay && (
        <section aria-label={`Tasks on ${format(selectedDay, "yyyy-MM-dd")}`} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Tasks on {calendarDateLabel(viewDateIso(selectedDay), language)}</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDay(null)}>Close day list</Button>
          </div>
          <StaffPagedCollection label="Calendar day tasks" resetKey={format(selectedDay, "yyyy-MM-dd")}>
            {tasksByDay(selectedDay).map((task) => (
              <Button type="button" variant="outline" key={task._id} className="block max-w-full whitespace-normal text-left h-auto min-h-10" onClick={() => onOpen(task)}>
                {task.title}
              </Button>
            ))}
          </StaffPagedCollection>
        </section>
      )}
    </div>
  );
}
