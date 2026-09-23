"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  FolderOpen,
  MessageSquare,
  Search,
} from "lucide-react";
import { useMyClient } from "@/client/queries/clients";
import { useClientCases } from "@/client/queries/cases";
import { useTasks } from "@/client/queries/tasks";
import type { ClientCaseDto, TaskDto } from "@/shared/contracts/domains";
import { CASE_LIST_HERO_CLASS } from "@/shared/contracts/case-ui";
import {
  DashboardButton,
  DashboardListSkeleton,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { localDateIso } from "@/lib/dashboard-format";
import {
  formatTaskDue,
  isTaskOverdue,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/task-constants.ts";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "overdue" | "due_soon" | "upcoming" | "completed";

/** UI presentation bucket only — never persisted. */
type PresentationBucket = "overdue" | "due_soon" | "upcoming" | "completed";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "due_soon", label: "Due Soon" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

const BUCKET_ORDER: PresentationBucket[] = ["overdue", "due_soon", "upcoming", "completed"];

const BUCKET_HEADINGS: Record<PresentationBucket, string> = {
  overdue: "Overdue",
  due_soon: "Due Soon",
  upcoming: "Upcoming",
  completed: "Completed",
};

function matterOf(cases: ClientCaseDto[], caseId: string | undefined): ClientCaseDto | undefined {
  if (!caseId) return undefined;
  return cases.find((matter) => matter._id === caseId || matter.id === caseId);
}

function dueDayIso(dueDate?: string | null): string | null {
  if (!dueDate) return null;
  const day = String(dueDate).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return localDateIso(parsed);
}

function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDateIso(date);
}

/**
 * Presentation-only classification. Persisted status remains todo | in_progress | done | cancelled.
 * Incomplete tasks without a valid dueDate return null (available under All only).
 */
function presentationBucket(task: TaskDto, today: string): PresentationBucket | null {
  if (task.status === "done") return "completed";
  if (task.status === "cancelled") return null;
  if (isTaskOverdue(task)) return "overdue";
  const due = dueDayIso(task.dueDate as string | null | undefined);
  if (!due) return null;
  const soonEnd = addDaysIso(today, 7);
  if (due >= today && due <= soonEnd) return "due_soon";
  if (due > soonEnd) return "upcoming";
  return null;
}

function matchesSearch(task: TaskDto, matter: ClientCaseDto | undefined, query: string): boolean {
  if (!query) return true;
  const haystack = [task.title, task.description, matter?.title, matter?.caseNumber]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function compareOpenTasks(left: TaskDto, right: TaskDto, today: string): number {
  const leftBucket = presentationBucket(left, today);
  const rightBucket = presentationBucket(right, today);
  const leftRank = leftBucket ? BUCKET_ORDER.indexOf(leftBucket) : BUCKET_ORDER.length;
  const rightRank = rightBucket ? BUCKET_ORDER.indexOf(rightBucket) : BUCKET_ORDER.length;
  if (leftRank !== rightRank) return leftRank - rightRank;
  const leftDue = dueDayIso(left.dueDate as string | null | undefined) || "9999-99-99";
  const rightDue = dueDayIso(right.dueDate as string | null | undefined) || "9999-99-99";
  return leftDue.localeCompare(rightDue);
}

/**
 * Client-visible checklist items only (tasks.clientVisible on the client's cases).
 * Clients cannot mutate tasks — read-only progress view.
 */
export default function ClientChecklistPage() {
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useClientCases(clientId ? { clientId } : {}) || [];
  const tasks = useTasks(clientRecord ? {} : "skip");

  const [filter, setFilter] = useState<FilterTab>("all");
  const [matterFilter, setMatterFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const today = localDateIso(new Date());
  const searchQuery = search.trim().toLowerCase();

  const caseIds = useMemo(() => new Set(cases.map((c) => c._id)), [cases]);

  const checklist = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(
      (task) =>
        task.clientVisible &&
        task.caseId &&
        caseIds.has(task.caseId) &&
        !task.archivedAt &&
        !task.parentTaskId,
    );
  }, [tasks, caseIds]);

  const scoped = useMemo(() => {
    return checklist.filter((task) => {
      if (matterFilter !== "all" && task.caseId !== matterFilter) return false;
      return matchesSearch(task, matterOf(cases, task.caseId), searchQuery);
    });
  }, [checklist, cases, matterFilter, searchQuery]);

  const bucketed = useMemo(() => {
    const groups: Record<PresentationBucket, TaskDto[]> = {
      overdue: [],
      due_soon: [],
      upcoming: [],
      completed: [],
    };
    const unbucketed: TaskDto[] = [];
    for (const task of scoped) {
      const bucket = presentationBucket(task, today);
      if (bucket) groups[bucket].push(task);
      else unbucketed.push(task);
    }
    for (const key of BUCKET_ORDER) {
      groups[key].sort((a, b) => compareOpenTasks(a, b, today));
    }
    unbucketed.sort((a, b) => compareOpenTasks(a, b, today));
    return { groups, unbucketed };
  }, [scoped, today]);

  const counts = useMemo(
    () => ({
      all: scoped.length,
      overdue: bucketed.groups.overdue.length,
      due_soon: bucketed.groups.due_soon.length,
      upcoming: bucketed.groups.upcoming.length,
      completed: bucketed.groups.completed.length,
    }),
    [scoped.length, bucketed],
  );

  const completedCount = checklist.filter((task) => task.status === "done").length;
  const totalCount = checklist.length;
  const openCount = totalCount - completedCount;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const displayed = useMemo(() => {
    if (filter === "all") {
      return [...BUCKET_ORDER.flatMap((bucket) => bucketed.groups[bucket]), ...bucketed.unbucketed];
    }
    if (filter === "overdue") return bucketed.groups.overdue;
    if (filter === "due_soon") return bucketed.groups.due_soon;
    if (filter === "upcoming") return bucketed.groups.upcoming;
    return bucketed.groups.completed;
  }, [filter, bucketed]);

  const nextOpenTask = useMemo(() => {
    const open = checklist
      .filter((task) => task.status !== "done" && task.status !== "cancelled")
      .sort((a, b) => compareOpenTasks(a, b, today));
    return open[0] ?? null;
  }, [checklist, today]);

  const nextMatter = nextOpenTask ? matterOf(cases, nextOpenTask.caseId) : undefined;

  const shellProps = {
    portal: "client" as const,
    decorated: true,
    className: "client-checklist",
    heroClassName: cn(CASE_LIST_HERO_CLASS, "client-checklist-hero"),
    eyebrow: "Client Portal",
    title: "Action Checklist",
    description:
      "Tasks your legal team has shared with you across your Matters. Track progress — completion is managed by the firm.",
    icon: ClipboardList,
    metricsClassName: "max-sm:hidden",
  };

  if (clientRecord === undefined) {
    return (
      <PortalPageShell {...shellProps} loading loadingLabel="Loading your checklist items…">
        <div />
      </PortalPageShell>
    );
  }

  if (clientRecord === null) {
    return (
      <PortalPageShell {...shellProps} showTodayDate>
        <EmptyState
          title="No client profile linked"
          description="Your portal account is not linked to a client profile yet. Contact the firm to view shared action checklists."
          icon={ClipboardList}
        />
      </PortalPageShell>
    );
  }

  const emptyTitle =
    searchQuery || matterFilter !== "all"
      ? "No checklist items match your filters"
      : filter === "overdue"
        ? "No overdue items"
        : filter === "due_soon"
          ? "No due-soon items"
          : filter === "upcoming"
            ? "No upcoming items"
            : filter === "completed"
              ? "No completed items"
              : "No shared action items yet";

  const emptyDescription =
    searchQuery || matterFilter !== "all"
      ? "Try another Matter, clear search, or switch filter tabs."
      : filter === "all"
        ? "When your legal team shares checklist items on your Matters, they will appear here."
        : "Nothing in this filter right now. Switch to All to see every shared item.";

  function renderTaskRow(task: TaskDto) {
    const matter = matterOf(cases, task.caseId);
    const due = formatTaskDue(task as { dueDateBs?: string | null; dueDate?: string | null });
    const bucket = presentationBucket(task, today);
    const isDone = task.status === "done";
    const priority = String(task.priority || "");
    const showPriority = priority === "high" || priority === "urgent";

    return (
      <li
        key={task._id}
        className={cn(
          "client-checklist-row",
          bucket === "overdue" && "client-checklist-row-overdue",
          bucket === "due_soon" && "client-checklist-row-soon",
          bucket === "upcoming" && "client-checklist-row-upcoming",
          isDone && "client-checklist-row-done",
        )}
        data-bucket={bucket || "none"}
      >
        <span
          className={cn(
            "client-checklist-status-icon",
            isDone && "client-checklist-status-icon-done",
            bucket === "overdue" && "client-checklist-status-icon-overdue",
            bucket === "due_soon" && "client-checklist-status-icon-soon",
            bucket === "upcoming" && "client-checklist-status-icon-upcoming",
          )}
          aria-hidden
        >
          {isDone ? <CheckSquare className="size-4" /> : <CheckCircle2 className="size-4" />}
        </span>
        <div className="client-checklist-row-copy">
          <div className="client-checklist-row-top">
            <p
              className={cn(
                "client-checklist-row-title",
                isDone && "client-checklist-row-title-done",
              )}
            >
              {task.title}
            </p>
            <DashboardStatusLabel
              status={task.status}
              label={TASK_STATUS_LABELS[task.status as TaskStatus] || task.status}
              className="text-[10px]"
            />
          </div>
          {task.description ? (
            <p className="client-checklist-row-desc">{String(task.description)}</p>
          ) : null}
          <p className="client-checklist-row-meta">
            {matter ? (
              <span>
                {matter.title}
                {matter.caseNumber ? ` · ${matter.caseNumber}` : ""}
              </span>
            ) : (
              <span>Matter unavailable</span>
            )}
            {due ? (
              <span
                className={cn(
                  "client-checklist-due",
                  bucket === "overdue" && "client-checklist-due-overdue",
                  bucket === "due_soon" && "client-checklist-due-soon",
                )}
              >
                Due {due}
              </span>
            ) : (
              <span className="client-checklist-due-none">No due date</span>
            )}
            {bucket && bucket !== "completed" ? (
              <span className="client-checklist-bucket-tag">{BUCKET_HEADINGS[bucket]}</span>
            ) : null}
            {showPriority ? (
              <DashboardStatusLabel status={priority} className="text-[10px] uppercase" />
            ) : null}
          </p>
        </div>
        <div className="client-checklist-row-actions">
          {matter ? (
            <DashboardButton
              asChild
              size="sm"
              variant="secondary"
              className="client-checklist-action"
            >
              <Link href={`/client/cases/${matter._id}`}>
                View Matter <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </DashboardButton>
          ) : null}
          {matter ? (
            <DashboardButton asChild size="sm" variant="ghost" className="client-checklist-action">
              <Link href={`/client/messages?caseId=${matter._id}`}>
                <MessageSquare className="size-3.5 mr-1" />
                <span className="client-checklist-msg-full">Message Legal Team</span>
                <span className="client-checklist-msg-short">Message</span>
              </Link>
            </DashboardButton>
          ) : null}
        </div>
      </li>
    );
  }

  function renderGroupedList() {
    if (filter !== "all") {
      return <ul className="client-checklist-list">{displayed.map(renderTaskRow)}</ul>;
    }

    return (
      <div className="client-checklist-groups">
        {BUCKET_ORDER.map((bucket) => {
          const items = bucketed.groups[bucket];
          if (items.length === 0) return null;
          return (
            <section key={bucket} className="client-checklist-group" data-bucket={bucket}>
              <h3 className="client-checklist-group-head">{BUCKET_HEADINGS[bucket]}</h3>
              <ul className="client-checklist-list">{items.map(renderTaskRow)}</ul>
            </section>
          );
        })}
        {bucketed.unbucketed.length > 0 ? (
          <section className="client-checklist-group" data-bucket="other">
            <h3 className="client-checklist-group-head">Other</h3>
            <ul className="client-checklist-list">{bucketed.unbucketed.map(renderTaskRow)}</ul>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <PortalPageShell
      {...shellProps}
      showTodayDate
      actions={
        <div className="client-checklist-hero-actions">
          <DashboardButton asChild size="sm" variant="secondary">
            <Link href="/client/cases">
              <FolderOpen className="size-4 mr-1" /> My Matters
            </Link>
          </DashboardButton>
          <DashboardButton asChild size="sm" variant="ghost">
            <Link href="/client/messages">
              <MessageSquare className="size-4 mr-1" />
              <span className="client-checklist-msg-full">Message Legal Team</span>
              <span className="client-checklist-msg-short">Message</span>
            </Link>
          </DashboardButton>
        </div>
      }
    >
      <div className="client-checklist-layout">
        <div className="client-checklist-main">
          <section className="client-checklist-progress" aria-label="Overall checklist progress">
            <div className="client-checklist-progress-top">
              <div>
                <p className="client-checklist-progress-label">Overall Progress</p>
                <p className="client-checklist-progress-copy">
                  {totalCount === 0
                    ? "No shared action items yet"
                    : `${completedCount} of ${totalCount} action item${totalCount === 1 ? "" : "s"} completed`}
                </p>
              </div>
              <div className="client-checklist-progress-stats">
                <span className="client-checklist-progress-pct">
                  {totalCount === 0 ? "—" : `${completionRate}%`}
                </span>
                <span className="client-checklist-progress-open">{openCount} open</span>
              </div>
            </div>
            <div
              className="client-checklist-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={totalCount === 0 ? 0 : completionRate}
              aria-label={
                totalCount === 0
                  ? "No checklist progress yet"
                  : `${completionRate}% of shared checklist items completed`
              }
            >
              <div
                className="client-checklist-progress-fill"
                style={{ width: `${totalCount === 0 ? 0 : completionRate}%` }}
              />
            </div>
            {completedCount > 0 ? (
              <div className="client-checklist-progress-actions">
                <DashboardButton
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setFilter("completed")}
                >
                  View Completed
                </DashboardButton>
              </div>
            ) : null}
          </section>

          <div className="client-checklist-toolbar" role="toolbar" aria-label="Checklist filters">
            <div className="client-checklist-views" role="tablist" aria-label="Due status filters">
              {FILTER_TABS.map((tab) => {
                const count = counts[tab.id];
                const selected = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={cn(
                      "client-checklist-view",
                      selected && "client-checklist-view-active",
                    )}
                    onClick={() => setFilter(tab.id)}
                  >
                    {tab.label}
                    <span className="client-checklist-view-count">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="client-checklist-controls">
              <label className="client-checklist-control">
                <span className="sr-only">Filter by Matter</span>
                <select
                  value={matterFilter}
                  onChange={(event) => setMatterFilter(event.target.value)}
                  aria-label="Filter by Matter"
                >
                  <option value="all">All Matters</option>
                  {cases.map((matter) => (
                    <option key={matter._id} value={matter._id}>
                      {matter.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="client-checklist-search">
                <Search className="size-3.5" aria-hidden />
                <span className="sr-only">Search checklist</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, Matter…"
                  aria-label="Search checklist by title, description or Matter"
                />
              </label>
            </div>
          </div>

          <section className="client-checklist-list-card" aria-label="Your action items">
            <div className="client-checklist-list-head">
              <h2>Your Action Items</h2>
              <span>
                {displayed.length} shown
                {filter !== "all" ? ` · ${FILTER_TABS.find((t) => t.id === filter)?.label}` : ""}
              </span>
            </div>
            {tasks === undefined ? (
              <DashboardListSkeleton rows={4} />
            ) : displayed.length === 0 ? (
              <EmptyState
                title={emptyTitle}
                description={emptyDescription}
                icon={ClipboardList}
                action={
                  totalCount === 0 ? (
                    <DashboardButton asChild size="sm" variant="outline">
                      <Link href="/client/messages">
                        <MessageSquare className="size-4 mr-1.5" />
                        Messages
                      </Link>
                    </DashboardButton>
                  ) : undefined
                }
              />
            ) : (
              renderGroupedList()
            )}
          </section>
        </div>

        <aside className="client-checklist-rail" aria-label="Checklist summary">
          <section className="client-checklist-rail-card">
            <h2>Priority Summary</h2>
            <ul className="client-checklist-summary">
              <li>
                <span className="client-checklist-summary-overdue">Overdue</span>
                <strong>{counts.overdue}</strong>
              </li>
              <li>
                <span className="client-checklist-summary-soon">Due Soon</span>
                <strong>{counts.due_soon}</strong>
              </li>
              <li>
                <span className="client-checklist-summary-upcoming">Upcoming</span>
                <strong>{counts.upcoming}</strong>
              </li>
              <li>
                <span className="client-checklist-summary-done">Completed</span>
                <strong>{counts.completed}</strong>
              </li>
            </ul>
          </section>

          <section className="client-checklist-rail-card">
            <h2>Next Due Item</h2>
            {nextOpenTask && nextMatter ? (
              <div className="client-checklist-next">
                <p className="client-checklist-next-title">{nextOpenTask.title}</p>
                <p className="client-checklist-next-meta">
                  {nextMatter.title}
                  {formatTaskDue(
                    nextOpenTask as { dueDateBs?: string | null; dueDate?: string | null },
                  )
                    ? ` · Due ${formatTaskDue(nextOpenTask as { dueDateBs?: string | null; dueDate?: string | null })}`
                    : ""}
                </p>
                <DashboardButton asChild size="sm" variant="secondary">
                  <Link href={`/client/cases/${nextMatter._id}`}>View Matter</Link>
                </DashboardButton>
              </div>
            ) : (
              <p className="client-checklist-next-empty">No open due items right now.</p>
            )}
          </section>

          <section className="client-checklist-help">
            <h2>Need Assistance?</h2>
            <p>Message your legal team if you need clarification on a shared action item.</p>
            <DashboardButton asChild size="sm" className="w-full">
              <Link href="/client/messages">
                <MessageSquare className="size-4 mr-1.5" /> Send a Message
              </Link>
            </DashboardButton>
          </section>

          {counts.overdue > 0 ? (
            <p className="client-checklist-rail-note">
              <AlertTriangle className="size-3.5" aria-hidden />
              Overdue means the due date has passed — the firm manages completion.
            </p>
          ) : null}
        </aside>
      </div>
    </PortalPageShell>
  );
}
