"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Columns3, List, Search, SlidersHorizontal } from "lucide-react";
import { DashboardButton, DashboardFilterBar } from "@/components/dashboard";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFloatingPosition } from "@/lib/floating-position";
import {
  CASE_LIFECYCLE_LABELS,
  CASE_STATUS_FILTERS,
  type CaseStatusFilter,
} from "@/shared/contracts/case-ui";
import type { StaffCaseFilters, staffCaseFilterOptions } from "./staff-case-filters";

/** Reuse existing Select controls; keep their portal inside the Staff branding scope. */
function FilterSelect({
  label,
  value,
  onChange,
  disabled,
  children,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
  id?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | undefined>();
  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      onOpenChange={(open) => {
        if (open)
          setContainer(
            trigger.current?.closest<HTMLElement>(".staff-cases-workspace") ?? undefined,
          );
      }}
    >
      <SelectTrigger ref={trigger} id={id} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectPrimitive.Portal container={container}>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          onEscapeKeyDown={(event) => event.stopPropagation()}
          className="staff-cases-select-menu"
          data-slot="staff-cases-select-menu"
        >
          <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </Select>
  );
}

export function StaffCasesFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  counts,
  filters,
  onFiltersChange,
  options,
  viewMode,
  onViewChange,
  onReset,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  status: CaseStatusFilter;
  onStatusChange: (value: CaseStatusFilter) => void;
  counts: Partial<Record<CaseStatusFilter, number>>;
  filters: StaffCaseFilters;
  onFiltersChange: (value: StaffCaseFilters) => void;
  options: ReturnType<typeof staffCaseFilterOptions>;
  viewMode: "list" | "board";
  onViewChange: (value: "list" | "board") => void;
  onReset: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const panelBody = useRef<HTMLDivElement>(null);
  const additionalCount = Number(Boolean(filters.clientId)) + Number(Boolean(filters.practiceArea));
  const hasFilters = Boolean(search || status !== "all" || filters.lawyerId || additionalCount);
  const hasMoreOptions = options.practiceAreas.length > 0 || options.clients.length > 0;

  useLayoutEffect(() => {
    if (!moreOpen) return;
    const panel = panelBody.current?.closest<HTMLElement>('[role="dialog"]');
    const anchor = moreTrigger.current;
    if (!panel || !anchor) return;
    const position = () => {
      const rect = panel.getBoundingClientRect();
      const { left, top } = getFloatingPosition({
        anchor: anchor.getBoundingClientRect(),
        contentWidth: rect.width,
        contentHeight: rect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        padding: 16,
      });
      panel.style.setProperty("--staff-filter-left", `${left}px`);
      panel.style.setProperty("--staff-filter-top", `${top}px`);
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [moreOpen]);

  return (
    <>
      <DashboardFilterBar className="staff-cases-controls staff-cases-filter-toolbar">
        <div className="staff-cases-search relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="pl-9"
            placeholder="Search by case number, title, client or lawyer…"
            aria-label="Search cases by case number, title, client or lawyer"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <FilterSelect
          label="Case status"
          value={status}
          onChange={(value) => onStatusChange(value as CaseStatusFilter)}
        >
          {CASE_STATUS_FILTERS.map((value) => (
            <SelectItem key={value} value={value}>
              {value === "all" ? "All Statuses" : CASE_LIFECYCLE_LABELS[value]}
              <span className="staff-cases-option-count" aria-hidden>
                {" "}
                {counts[value] ?? 0}
              </span>
            </SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Assigned lawyer"
          value={filters.lawyerId || "all"}
          disabled={!options.lawyers.length && !options.hasUnassigned}
          onChange={(value) =>
            onFiltersChange({ ...filters, lawyerId: value === "all" ? "" : value })
          }
        >
          <SelectItem value="all">All Lawyers</SelectItem>
          {options.lawyers.map((lawyer) => (
            <SelectItem key={lawyer.id} value={lawyer.id}>
              {lawyer.label}
            </SelectItem>
          ))}
          {options.hasUnassigned ? <SelectItem value="unassigned">Unassigned</SelectItem> : null}
        </FilterSelect>
        <div className="staff-cases-toolbar-actions">
          <div role="group" aria-label="Case view" className="staff-cases-view-toggle">
            <button
              type="button"
              aria-pressed={viewMode === "list"}
              onClick={() => onViewChange("list")}
            >
              <List className="size-4" aria-hidden /> List View
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "board"}
              onClick={() => onViewChange("board")}
            >
              <Columns3 className="size-4" aria-hidden /> Board View
            </button>
          </div>
          <button
            ref={moreTrigger}
            type="button"
            className="staff-cases-more-trigger"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls={moreOpen ? "staff-cases-more-filters" : undefined}
            disabled={!hasMoreOptions && !hasFilters}
            onClick={() => setMoreOpen(true)}
          >
            <SlidersHorizontal className="size-4" aria-hidden /> More Filters
            {additionalCount ? (
              <span className="staff-cases-filter-count">
                {additionalCount}
                <span className="sr-only"> additional filters active</span>
              </span>
            ) : null}
          </button>
        </div>
      </DashboardFilterBar>
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent
          id="staff-cases-more-filters"
          className="staff-cases-filter-panel"
          aria-labelledby="staff-cases-filter-heading"
          aria-describedby="staff-cases-filter-description"
        >
          <DialogHeader>
            <h2 id="staff-cases-filter-heading" className="font-serif text-lg font-semibold">
              More Filters
            </h2>
            <p id="staff-cases-filter-description" className="text-sm text-muted-foreground">
              Refine the accessible matters. Changes apply immediately.
            </p>
          </DialogHeader>
          <div ref={panelBody} className="staff-cases-extra-fields">
            {options.practiceAreas.length ? (
              <div>
                <label htmlFor="staff-cases-practice">Practice Area</label>
                <FilterSelect
                  id="staff-cases-practice"
                  label="Practice Area"
                  value={filters.practiceArea ? `area:${filters.practiceArea}` : "all"}
                  onChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      practiceArea: value === "all" ? "" : value.slice(5),
                    })
                  }
                >
                  <SelectItem value="all">All Practice Areas</SelectItem>
                  {options.practiceAreas.map((area) => (
                    <SelectItem key={area} value={`area:${area}`}>
                      {area}
                    </SelectItem>
                  ))}
                </FilterSelect>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No practice areas are available on these matters.
              </p>
            )}
            {options.clients.length ? (
              <div>
                <label htmlFor="staff-cases-client">Client</label>
                <FilterSelect
                  id="staff-cases-client"
                  label="Filter by client"
                  value={filters.clientId || "all"}
                  onChange={(value) =>
                    onFiltersChange({ ...filters, clientId: value === "all" ? "" : value })
                  }
                >
                  <SelectItem value="all">All Clients</SelectItem>
                  {options.clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.label}
                    </SelectItem>
                  ))}
                </FilterSelect>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No named client options are available.
              </p>
            )}
          </div>
          <div className="staff-cases-filter-actions">
            <DashboardButton
              type="button"
              variant="outline"
              disabled={!hasFilters}
              onClick={onReset}
            >
              Reset filters
            </DashboardButton>
            <DashboardButton type="button" onClick={() => setMoreOpen(false)}>
              Show results
            </DashboardButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
