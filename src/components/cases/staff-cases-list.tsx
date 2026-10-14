import { Link } from "@/client/navigation";
import type { useClients } from "@/client/queries/clients";
import type { useHearings } from "@/client/queries/hearings";
import type { useStaffDirectory } from "@/client/queries/identity";
import { CaseIdentity } from "@/components/cases/case-identity";
import {
  DashboardStatusLabel,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  DualDateDisplay,
} from "@/components/dashboard";
import {
  CASE_LIFECYCLE_LABELS,
  CASE_OUTCOME_LABELS,
  caseDetailPath,
  inferredClosureOutcome,
  toLifecycleStatus,
  type CaseWorkspaceBasePath,
} from "@/shared/contracts/case-ui";
import type { CaseDto } from "@/shared/contracts/domains";

/** Staff-only presentation. The workspace owns queries, filters and pagination. */
export function StaffCasesList({
  cases,
  clients,
  users,
  hearings,
  basePath,
}: {
  cases: CaseDto[];
  clients: NonNullable<ReturnType<typeof useClients>>;
  users: NonNullable<ReturnType<typeof useStaffDirectory>>;
  hearings: NonNullable<ReturnType<typeof useHearings>>;
  basePath: CaseWorkspaceBasePath;
}) {
  return (
    <DashboardTable className="staff-cases-table">
      <caption className="sr-only">Cases, clients, lifecycle status and hearing dates</caption>
      <DashboardTableHead>
        <tr>
          {["Case", "Client", "Status", "Next hearing", "Assigned lawyer"].map((label) => (
            <DashboardTableHeaderCell key={label} scope="col">
              {label}
            </DashboardTableHeaderCell>
          ))}
        </tr>
      </DashboardTableHead>
      <DashboardTableBody>
        {cases.map((matter) => {
          const client = clients.find((entry) => entry._id === matter.clientId);
          const lawyer = users.find((entry) => entry._id === matter.assignedLawyerId);
          const hearing = hearings.find(
            (entry) => entry.caseId === matter._id && entry.status === "scheduled",
          );
          // Preserve the workspace's stored date / first scheduled hearing fallback.
          const nextHearingDate = matter.nextHearing || hearing?.dateGregorian || hearing?.dateBs;
          const lifecycle = toLifecycleStatus(matter.status);
          const outcome = inferredClosureOutcome(matter.status, matter.closureOutcome);

          return (
            <DashboardTableRow key={matter._id}>
              <DashboardTableCell data-label="Case">
                <div className="staff-case-heading">
                  <CaseIdentity
                    caseNumber={matter.caseNumber}
                    status={matter.status}
                    closureOutcome={matter.closureOutcome}
                    practiceArea={matter.practiceArea}
                    filingDate={matter.filingDate}
                    showStatus={false}
                    className="staff-case-identity"
                  />
                  <Link href={caseDetailPath(basePath, matter._id)} className="staff-case-title">
                    {matter.title}
                  </Link>
                </div>
              </DashboardTableCell>
              <DashboardTableCell data-label="Client">
                <div className="staff-case-person">
                  <span aria-hidden className="staff-case-avatar">
                    {client ? client.fullName.charAt(0).toUpperCase() : "?"}
                  </span>
                  <span>{client ? client.fullName : "Unknown"}</span>
                </div>
              </DashboardTableCell>
              <DashboardTableCell data-label="Status">
                <div className="staff-case-status">
                  <DashboardStatusLabel
                    status={lifecycle}
                    label={CASE_LIFECYCLE_LABELS[lifecycle]}
                  />
                  {outcome ? (
                    <DashboardStatusLabel status={outcome} label={CASE_OUTCOME_LABELS[outcome]} />
                  ) : null}
                </div>
              </DashboardTableCell>
              <DashboardTableCell data-label="Next hearing">
                {nextHearingDate ? <DualDateDisplay isoDate={nextHearingDate} /> : "—"}
              </DashboardTableCell>
              <DashboardTableCell data-label="Assigned lawyer">
                <div className="staff-case-person">
                  <span aria-hidden className="staff-case-avatar">
                    {lawyer ? lawyer.name?.charAt(0).toUpperCase() : "?"}
                  </span>
                  <span>{lawyer ? lawyer.name : "Unassigned"}</span>
                </div>
              </DashboardTableCell>
            </DashboardTableRow>
          );
        })}
      </DashboardTableBody>
    </DashboardTable>
  );
}
