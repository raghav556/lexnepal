// Match the application locale provider added by Session17E; assertions are unchanged.
vi.mock("@/lib/i18n-context", () => ({ useI18n: () => ({ language: "en", t: (key: string) => key }) }));
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { useDocumentVersions, useDocumentVersionsQuery } from "@/client/queries/documents";
import { queryKeys } from "@/client/queries/query-keys";
import { calculatePagination } from "@/hooks/use-pagination";
import { Pagination } from "@/components/ui/pagination";
import { StaffPagedCollection } from "@/components/dashboard/staff-paged-collection";
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView";

vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn(), useQueryClient: vi.fn(), useMutation: vi.fn() }));
vi.mock("@/client/api/client", () => ({ apiClient: { request: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/lib/document-utils.ts", () => ({ computeSHA256: vi.fn() }));

const records = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `record-${i + 1}` }));
const children = (count: number) =>
  records(count).map((row) =>
    React.createElement("li", { key: row.id, "data-record": row.id }, row.id),
  );

describe("Staff collection windows", () => {
  it.each([0, 1, 8, 9, 53, 101])(
    "bounds %i records without fabricating totals",
    (count) => {
      const html = renderToStaticMarkup(
        React.createElement(
          StaffPagedCollection,
          {
            label: "Synthetic records",
            resetKey: "collection",
            footerAs: "li",
          },
          children(count),
        ),
      );
      expect((html.match(/data-record=/g) ?? []).length).toBe(
        Math.min(count, 8),
      );
      expect(html.includes('role="navigation"')).toBe(count > 8);
      expect(html.includes('data-collection="Synthetic records"')).toBe(
        count > 8,
      );
      if (count > 8) {
        expect(html).toContain(`of ${count}`);
        expect(html).toContain('aria-current="page"');
        expect(html).toContain('aria-live="polite"');
        expect(html).toContain('<li class="staff-collection-pagination"');
      }
    },
  );
  it("does not change other portal consumers unless explicitly enabled", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        StaffPagedCollection,
        {
          label: "Untouched portal",
          resetKey: "portal",
          enabled: false,
        },
        children(53),
      ),
    );
    expect((html.match(/data-record=/g) ?? []).length).toBe(53);
    expect(html).not.toContain("pagination");
  });
  it("uses incremental windows with full column totals", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        StaffPagedCollection,
        {
          label: "Column tasks",
          resetKey: "todo",
          pageSize: 12,
          incremental: true,
        },
        children(53),
      ),
    );
    expect((html.match(/data-record=/g) ?? []).length).toBe(12);
    expect(html).toContain("1–12 of 53");
    expect(html).toContain("41 remaining");
    expect(html).not.toContain('role="navigation"');
    expect(html).toContain('type="button"');
  });
  it("never gives pagination a submit action inside forms", () => {
    const html = renderToStaticMarkup(
      React.createElement(Pagination, {
        currentPage: 2,
        totalPages: 13,
        onPageChange() {},
        onNextPage() {},
        onPrevPage() {},
      }),
    );
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(3);
    expect(buttons.every((button) => button.includes('type="button"'))).toBe(
      true,
    );
    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain('aria-current="page"');
  });
  it("adds a real calendar overflow action only for the Staff opt-in", () => {
    const tasks = records(13).map((row) => ({
      _id: row.id,
      title: row.id,
      dueDate: new Date().toISOString(),
      priority: "medium",
    }));
    const staff = renderToStaticMarkup(
      React.createElement(TaskCalendarView, {
        tasks,
        onOpen() {},
        staffPaging: true,
      }),
    );
    const other = renderToStaticMarkup(
      React.createElement(TaskCalendarView, { tasks, onOpen() {} }),
    );
    expect(staff).toContain("View all 13 tasks on");
    expect(other).not.toContain("View all 13 tasks on");
    expect(other).toContain("+10");
  });
});

describe("Complete collection slicing", () => {
  it.each(
    [6, 8, 10, 12].flatMap((limit) =>
      [0, 1, limit, limit + 1, 53, 101].map((count) => ({ limit, count })),
    ),
  )("keeps all $count identities at page size $limit", ({ count, limit }) => {
    const items = records(count),
      output: string[] = [];
    const { totalPages } = calculatePagination(items, 1, limit);
    for (let page = 1; page <= totalPages; page++) {
      const result = calculatePagination(items, page, limit);
      expect(result.totalItems).toBe(count);
      output.push(...result.paginatedItems.map((row) => row.id));
    }
    expect(output).toEqual(items.map((row) => row.id));
    expect(new Set(output).size).toBe(count);
  });
  it("clamps first/middle/last after deletion and returns surviving records", () => {
    expect(calculatePagination(records(53), 4, 8).paginatedItems[0].id).toBe(
      "record-25",
    );
    const result = calculatePagination(records(9), 7, 8);
    expect(result.safeCurrentPage).toBe(2);
    expect(result.paginatedItems.map((row) => row.id)).toEqual(["record-9"]);
  });
  it("handles invalid/fractional navigation without an empty existing page", () => {
    for (const page of [NaN, Infinity, -1, 0, 1.5, 99]) {
      const result = calculatePagination(records(53), page, 8);
      expect(result.safeCurrentPage).toBeGreaterThanOrEqual(1);
      expect(result.safeCurrentPage).toBeLessThanOrEqual(7);
      expect(result.paginatedItems.length).toBeGreaterThan(0);
    }
  });
});

describe("Version history read state without new query semantics", () => {
  it("keeps the legacy array return while exposing existing loading/error metadata", () => {
    const state = { data: undefined, isLoading: true, isError: false, refetch: vi.fn() } as unknown as ReturnType<typeof useQuery>;
    vi.mocked(useQuery).mockReturnValue(state);
    expect(useDocumentVersions(null)).toEqual([]);
    expect(useDocumentVersionsQuery(null)).toBe(state);
  });
  it("retains the exact query key and disabled-until-selected rule", () => {
    vi.mocked(useQuery).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useQuery>);
    useDocumentVersionsQuery(null);
    const input = vi.mocked(useQuery).mock.calls.at(-1)![0];
    expect(input.queryKey).toEqual(queryKeys.documents.versions("none"));
    expect(input.enabled).toBe(false);
  });
  it("uses the existing authenticated GET and abort signal", async () => {
    vi.mocked(useQuery).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useQuery>);
    useDocumentVersionsQuery("doc-1");
    const input = vi.mocked(useQuery).mock.calls.at(-1)![0];
    expect(input.enabled).toBe(true);
    expect(input.queryKey).toEqual(queryKeys.documents.versions("doc-1"));
    const signal = new AbortController().signal;
    expect(typeof input.queryFn).toBe("function");
    await Reflect.apply(input.queryFn as (...args: unknown[]) => unknown, undefined, [{ signal }]);
    expect(apiClient.request).toHaveBeenCalledWith("/api/v1/documents/doc-1/versions", { signal });
  });
});

describe("Capped profile activity windows", () => {
  it.each([0, 1, 30])("paginates only the %i returned events from a 53-event history", (returned) => {
    const loaded = records(53).slice(0, returned);
    const first = calculatePagination(loaded, 1, 6);
    expect(first.totalItems).toBe(returned);
    expect(first.totalPages).toBe(Math.max(1, Math.ceil(returned / 6)));
    const visible = Array.from({ length: first.totalPages }, (_, page) =>
      calculatePagination(loaded, page + 1, 6).paginatedItems,
    );
    expect(visible.every((page) => page.length <= 6)).toBe(true);
    expect(visible.flat()).toEqual(loaded);
    expect(visible.flat()).not.toContainEqual({ id: "record-53" });
  });
});
