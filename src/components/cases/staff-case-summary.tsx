import type { ReactNode } from "react";
import { DashboardSection, DualDateDisplay } from "@/components/dashboard";
import { Scale, User } from "lucide-react";

/** Keep the shared Admin DOM flat; Staff groups the existing supporting cards. */
export function StaffCaseOverviewAside({
  staff,
  children,
}: {
  staff: boolean;
  children: ReactNode;
}) {
  return staff ? <div className="staff-detail-overview-side">{children}</div> : <>{children}</>;
}

/** Read-only Staff presentation; the detail page owns every query and calculation. */
export function StaffCaseSummary({
  client,
  lawyer,
  court,
  judge,
  opposingCounsel,
  nextAction,
  nextHearing,
  nextTask,
  filingDate,
}: {
  client: ReactNode;
  lawyer: ReactNode;
  court: string;
  judge: string;
  opposingCounsel: string;
  nextAction: ReactNode;
  nextHearing: string | null;
  nextTask: string | null;
  filingDate?: string | null;
}) {
  const courtFields = [
    { label: "Jurisdiction", value: court },
    { label: "Presiding Judge", value: judge },
    { label: "Opposing counsel", value: opposingCounsel },
  ];
  const dates = [
    {
      label: "Next hearing",
      value: nextHearing ? <DualDateDisplay isoDate={nextHearing} /> : "None scheduled",
    },
    {
      label: "Next task date",
      value: nextTask ? <DualDateDisplay isoDate={nextTask} /> : "None due",
    },
    ...(filingDate
      ? [{ label: "Filing date", value: <DualDateDisplay isoDate={filingDate} /> }]
      : []),
  ];
  return (
    <DashboardSection title="Matter overview" icon={Scale} className="staff-detail-summary">
      <dl className="staff-detail-responsibility">
        <div>
          <dt>
            <User className="size-4" aria-hidden /> Client
          </dt>
          <dd>{client}</dd>
        </div>
        <div>
          <dt>
            <Scale className="size-4" aria-hidden /> Responsible Lawyer
          </dt>
          <dd>{lawyer}</dd>
        </div>
      </dl>
      <div className="staff-detail-summary-group">
        <h3>Court &amp; counsel</h3>
        <dl className="staff-detail-court-grid">
          {courtFields.map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="staff-detail-summary-group">
        <h3>Next steps &amp; dates</h3>
        <dl className="staff-detail-dates-grid">
          <div className="staff-detail-next-action">
            <dt>Next required action</dt>
            <dd>{nextAction}</dd>
          </div>
          {dates.map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </DashboardSection>
  );
}
