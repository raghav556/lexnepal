import { DualDateDisplay } from "@/components/dashboard";

/** Presentation only. The page supplies its unchanged, chronologically sorted events. */
export function StaffCaseHistory({
  events,
}: {
  events: Array<{ key: string; date: string; label: string; detail: string }>;
}) {
  return (
    <>
      <p className="staff-detail-history-description">
        Filing, hearing dates, task due dates and document uploads on this case.
      </p>
      <ol className="staff-detail-history" aria-label="Case history">
        {events.map((event, index) => (
          <li key={`${event.key}-${index}`}>
            <div className="staff-detail-history-date">
              <DualDateDisplay isoDate={event.date} />
            </div>
            <div className="staff-detail-history-event">
              <h3>{event.label}</h3>
              <p>{event.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
