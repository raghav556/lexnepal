"use client";

import { Children, useState, type ReactNode } from "react";
import { usePagination } from "@/hooks/use-pagination";
import { Pagination } from "@/components/ui/pagination";
import { DashboardButton } from "@/components/dashboard/dashboard-primitives";

/** Staff-only display window over a verified complete collection.
 * Existing keyed children retain their handlers and original ordering/indices.
 * Shared workspaces explicitly opt in, leaving other portal presentations intact.
 */
export function StaffPagedCollection({
  children,
  label,
  resetKey,
  pageSize = 8,
  incremental = false,
  enabled = true,
  footerAs = "div",
  revealKey,
  revealIndex = -1,
  navigationLabel,
}: {
  children?: ReactNode;
  label: string;
  resetKey: string;
  pageSize?: number;
  incremental?: boolean;
  enabled?: boolean;
  footerAs?: "div" | "li";
  /** Reveal a route-linked record once it arrives, without following local selection. */
  revealKey?: string;
  revealIndex?: number;
  navigationLabel?: string;
}) {
  const items = Children.toArray(children);
  const paging = usePagination({ items, itemsPerPage: pageSize, resetKey });
  const [revealed, setRevealed] = useState<string | undefined>(undefined);
  if (revealKey && revealed !== revealKey && revealIndex >= 0) {
    setRevealed(revealKey);
    paging.goToPage(Math.floor(revealIndex / pageSize) + 1);
  }
  if (!enabled || items.length <= pageSize) return <>{children}</>;
  const Footer = footerAs;
  const start = incremental ? 1 : (paging.currentPage - 1) * pageSize + 1;
  const end = Math.min(paging.currentPage * pageSize, items.length);
  return (
    <>
      {incremental ? items.slice(0, end) : paging.paginatedItems}
      <Footer className="staff-collection-pagination" data-collection={label}>
        <p role="status" aria-live="polite" aria-atomic="true">
          {label}: {start}–{end} of {items.length}
          {!incremental &&
            ` · Page ${paging.currentPage} of ${paging.totalPages}`}
        </p>
        {incremental ? (
          paging.currentPage < paging.totalPages && (
            <DashboardButton
              type="button"
              size="sm"
              variant="outline"
              onClick={paging.nextPage}
            >
              Show more {label.toLowerCase()} ({items.length - end} remaining)
            </DashboardButton>
          )
        ) : (
          <Pagination
            ariaLabel={navigationLabel ?? `${label} pagination`}
            currentPage={paging.currentPage}
            totalPages={paging.totalPages}
            onPageChange={paging.goToPage}
            onNextPage={paging.nextPage}
            onPrevPage={paging.prevPage}
          />
        )}
      </Footer>
    </>
  );
}
